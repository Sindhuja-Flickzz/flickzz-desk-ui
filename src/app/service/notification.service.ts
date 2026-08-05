import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import type { Client, IMessage } from '@stomp/stompjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { NotificationPayload } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly MAX_NOTIFICATIONS = 200;
  private readonly wsBaseUrl = `${APP_CONSTANTS.API_BASE_URL.replace(/\/$/, '')}/ws`;
  private readonly notificationEndpoints = [
    '/notification/list',
    '/notifications',
    '/notification/history',
    '/notifications/user'
  ];
  private readonly readEndpoints = [
    '/notification/read',
    '/notifications/read',
    '/notification/mark-read'
  ];

  private client: Client | null = null;
  private connected = false;
  private connecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private manualDisconnect = false;
  private subscriptionActive = false;

  private notificationsSubject = new BehaviorSubject<NotificationPayload[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private queueSubject = new Subject<NotificationPayload>();

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  queuedNotifications$ = this.queueSubject.asObservable();

  constructor(
    private http: HttpClient
  ) {
    this.setupAutoReconnectHooks();
  }

  connect(): void {
    if (this.connected || this.connecting) {
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      this.errorSubject.next('Authentication token not available');
      return;
    }

    this.connecting = true;
    this.manualDisconnect = false;
    this.shouldReconnect = true;
    this.loadingSubject.next(true);

    void this.initializeClient();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    this.connected = false;
    this.connecting = false;
    this.manualDisconnect = true;
    this.shouldReconnect = false;
    this.subscriptionActive = false;
    this.loadingSubject.next(false);
  }

  reconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.shouldReconnect = true;
    this.manualDisconnect = false;
    this.disconnect();
    this.reconnectTimer = setTimeout(() => {
      this.connect();
      this.reconnectTimer = null;
    }, 3000);
  }

  getNotifications(): NotificationPayload[] {
    return this.notificationsSubject.getValue();
  }

  getUnreadCount(): number {
    return this.unreadCountSubject.getValue();
  }

  markAsRead(notificationId: string | number): void {
    const normalizedId = String(notificationId);
    const current = this.getNotifications();
    const updated = current.map((entry) => {
      const entryId = String(entry.notificationId ?? entry.notificationId ?? '');
      if (entryId === normalizedId) {
        return {
          ...entry,
          isRead: true,
          status: 'READ',
          readOn: new Date().toISOString()
        };
      }
      return entry;
    });

    this.storeNotifications(updated);

    this.http.put<any>(this.buildReadUrl(normalizedId), {}, { responseType: 'json' as any }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 400) {
          return of(null);
        }
        return throwError(() => error);
      })
    ).subscribe();
  }

  markAllAsRead(): void {
    const updated = this.getNotifications().map((entry) => ({
      ...entry,
      isRead: true,
      status: 'READ',
      readOn: new Date().toISOString()
    }));

    this.storeNotifications(updated);

    this.http.put<any>(`${this.getBaseUrl()}/notification/read/all`, {}, { responseType: 'json' as any }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 400) {
          return of(null);
        }
        return throwError(() => error);
      })
    ).subscribe();
  }

  private setupAutoReconnectHooks(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const tryConnect = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      if (!this.connected && !this.connecting) {
        this.connect();
      }
    };

    window.addEventListener('focus', tryConnect);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        tryConnect();
      }
    });

    queueMicrotask(() => tryConnect());
  }

  private async initializeClient(): Promise<void> {
    try {
      if (typeof WebSocket === 'undefined') {
        throw new Error('Browser WebSocket API is unavailable');
      }

      const { Client: StompClient } = await import('@stomp/stompjs');
      const socketFactory = await this.createSocketFactory();

      const connectHeaders = this.buildAuthHeaders();

      this.client = new StompClient({
        webSocketFactory: socketFactory,
        connectHeaders,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        reconnectDelay: 5000,
        debug: (message: string) => console.debug('STOMP debug:', message)
      }) as Client;

      this.client.onConnect = (frame: any) => {
        console.log('NotificationService: Connected to notification service', frame?.headers);
        this.connected = true;
        this.connecting = false;
        this.loadingSubject.next(false);
        this.errorSubject.next(null);
        this.subscriptionActive = false;
        // Load persisted notifications first, then subscribe for real-time updates
        this.loadInitialNotifications();
        this.subscribeToBroker();
      };

      this.client.onDisconnect = (frame: any) => {
        console.log('NotificationService: Disconnected from notification service', frame?.command || frame);
        this.connected = false;
        this.connecting = false;
        this.subscriptionActive = false;
        if (!this.manualDisconnect && this.shouldReconnect) {
          this.reconnect();
        }
      };

      this.client.onStompError = (frame: any) => {
        const errorMessage = frame?.headers?.['message'] || 'STOMP error';
        console.error('NotificationService: STOMP error', {
          message: errorMessage,
          frame
        });
        this.handleConnectionError(errorMessage);
      };

      this.client.onWebSocketClose = (event: CloseEvent) => {
        console.warn('NotificationService: WebSocket close', event);
        if (!this.manualDisconnect && this.shouldReconnect) {
          this.reconnect();
        }
      };

      this.client.onWebSocketError = (event: Event) => {
        console.error('NotificationService: WebSocket error', event);
        this.handleConnectionError('Unable to connect to the notification server');
      };

      this.client.activate();
    } catch (error) {
      this.connecting = false;
      this.loadingSubject.next(false);
      this.errorSubject.next('WebSocket support is unavailable in this browser');
      console.error('Unable to initialize notification websocket', error);
    }
  }

  private async createSocketFactory(): Promise<() => WebSocket> {
    try {
      const sockjsModule: any = await import('sockjs-client');
      // normalize possible module shapes (ESM default, CJS export, named exports)
      let SockJS: any = sockjsModule;
      if (sockjsModule && typeof sockjsModule === 'object') {
        SockJS = sockjsModule.default ?? sockjsModule.SockJS ?? sockjsModule;
      }

      // some bundlers wrap again; try to unwrap one more level
      if (SockJS && typeof SockJS === 'object' && SockJS.default) {
        SockJS = SockJS.default;
      }

      if (typeof SockJS === 'function') {
        return () => new SockJS(this.wsBaseUrl) as WebSocket;
      }

      console.warn('NotificationService: loaded sockjs-client but could not find constructor, falling back to native WebSocket', sockjsModule);
      // fall through to native websocket fallback below
    } catch {
      const rawWsUrl = `${this.wsBaseUrl.replace(/\/$/, '')}/websocket`;
      return () => new WebSocket(rawWsUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:'));
    }
    const rawWsUrl = `${this.wsBaseUrl.replace(/\/$/, '')}/websocket`;
    return () => new WebSocket(rawWsUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:'));
  }

  private subscribeToBroker(): void {
    if (!this.client || this.subscriptionActive) {
      return;
    }

    const destination = "/user/" + localStorage.getItem('userEmail') + "/queue/notifications";
    console.log('NotificationService: Subscribing to broker destination', destination);
    this.client.subscribe(destination, (message: IMessage) => {
      this.handleIncomingNotification(message);
    });

    this.subscriptionActive = true;
  }

  private handleIncomingNotification(message: IMessage): void {
    try {
      const rawBody = message.body ?? '';
      const payload = this.normalizePayload(rawBody);
      if (payload) {
        this.mergeNotifications([payload]);
        this.queueSubject.next(payload);
      }
    } catch (error) {
      console.error('Error handling incoming notification:', error);
      this.errorSubject.next('Received an invalid notification payload');
    }
  }

  private normalizePayload(payload: unknown): NotificationPayload | null {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'string') {
      try {
        return this.normalizePayload(JSON.parse(payload));
      } catch {
        return null;
      }
    }

    if (Array.isArray(payload)) {
      return null;
    }

    const record = payload as Record<string, any>;
    return {
      notificationId: this.getRecordValue(record, ['notificationId', 'id', 'notification_id']),
      title: this.getRecordValue(record, ['title', 'subject']) ?? 'New notification',
      message: this.getRecordValue(record, ['message', 'body']) ?? 'You have a new update',
      notificationType: this.getRecordValue(record, ['notificationType', 'type']),
      actionUrl: this.getRecordValue(record, ['actionUrl', 'action_url']),
      status: this.getRecordValue(record, ['status']) ?? (this.getRecordValue(record, ['isRead']) ? 'READ' : 'UNREAD'),
      isRead: this.getRecordValue(record, ['isRead', 'read']) ?? false,
      readOn: this.getRecordValue(record, ['readOn', 'read_on']) ?? null,
      createdOn: this.getRecordValue(record, ['createdOn', 'created_on']) ?? new Date().toISOString(),
      companyName: this.getRecordValue(record, ['triggeredUserOrg', 'companyName']),
      initiatedBy: this.getRecordValue(record, ['triggeredByUser', 'initiatedBy']),
      payload: record
    } as NotificationPayload;
  }

  private mergeNotifications(newEntries: NotificationPayload[]): void {
    const existing = this.getNotifications();
    const merged = [...existing];

    newEntries.forEach((entry) => {
      const normalizedEntry = this.normalizePayload(entry) ?? entry;
      const id = String(normalizedEntry.notificationId ?? normalizedEntry.notificationId ?? '');
      const index = merged.findIndex((item) => String(item.notificationId ?? item.notificationId ?? '') === id);

      if (index >= 0) {
        merged[index] = { ...merged[index], ...normalizedEntry };
      } else if (id) {
        merged.push(normalizedEntry);
      } else {
        merged.push(normalizedEntry);
      }
    });

    this.storeNotifications(merged);
  }

  fetchNotifications(recipientId?: string): void {
    const userId = recipientId ?? localStorage.getItem('userId') ?? '';
    const url = `${this.getBaseUrl()}${this.notificationEndpoints[0]}${userId ? `/${userId}` : ''}`;
    this.loadingSubject.next(true);
    this.http.get<unknown>(url).pipe(
      catchError((err: any) => {
        console.warn('NotificationService: unable to fetch notifications', err);
        return of([] as NotificationPayload[]);
      }),
      map((items: unknown) => this.normalizeNotificationList(items)),
      finalize(() => this.loadingSubject.next(false))
    ).subscribe((items) => {
      this.storeNotifications(items);
    });
  }

  private loadInitialNotifications(): void {
    this.fetchNotifications();
  }

  private normalizeNotificationList(payload: unknown): NotificationPayload[] {
    if (!payload) {
      return [];
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.normalizePayload(item) ?? (item as NotificationPayload)).filter(Boolean as any);
    }

    let data = (payload as any).attributes ?? (payload as any).data ?? payload;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return [];
      }
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.normalizePayload(item) ?? (item as NotificationPayload)).filter(Boolean as any);
    }

    const record = data as Record<string, any>;
    const arrayCandidates = ['attributes', 'data', 'notifications', 'items'];
    for (const key of arrayCandidates) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        return candidate.map((item) => this.normalizePayload(item) ?? (item as NotificationPayload)).filter(Boolean as any);
      }
    }

    return [];
  }

  private storeNotifications(entries: NotificationPayload[]): void {
    // entries = (entries as any).attributes;
    console.log('NotificationService: storing notifications', entries);
    const sorted = [...entries]
      .filter(Boolean)
      .sort((left, right) => this.compareDates(left.createdOn, right.createdOn))
      .slice(0, this.MAX_NOTIFICATIONS);

    this.notificationsSubject.next(sorted);
    this.unreadCountSubject.next(sorted.filter((entry) => !entry.isRead).length);
  }

  private compareDates(left: unknown, right: unknown): number {
    const leftTime = this.toTime(left);
    const rightTime = this.toTime(right);
    return rightTime - leftTime;
  }

  private toTime(value: unknown): number {
    if (!value) {
      return 0;
    }

    const date = new Date(value as string | number | Date);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private getRecordValue(record: Record<string, any>, keys: string[]): any {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null) {
        return value;
      }
    }
    return undefined;
  }

  private buildAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token') || '';
    const userEmail = localStorage.getItem('userEmail') || '';
    const userId = localStorage.getItem('userId') || '';

    return {
      Authorization: `Bearer ${token}`,
      ...(userEmail ? { 'X-User-Email': userEmail } : {}),
      ...(userId ? { 'X-User-Id': userId } : {})
    };
  }

  private handleConnectionError(message: string): void {
    this.connected = false;
    this.connecting = false;
    this.loadingSubject.next(false);
    this.errorSubject.next(message);
    this.reconnect();
  }

  private getBaseUrl(): string {
    return APP_CONSTANTS.API_BASE_URL.replace(/\/$/, '');
  }

  private buildReadUrl(notificationId: string): string {
    return `${this.getBaseUrl()}${this.readEndpoints[0]}/${notificationId}`;
  }
}
