import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationPayload } from '../models/notification.model';
import { NotificationService } from '../service/notification.service';
import { trigger, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  styleUrls: ['./notification-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('panelAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('220ms cubic-bezier(.2,.8,.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('160ms cubic-bezier(.2,.8,.2,1)', style({ opacity: 0, transform: 'translateY(-8px)' }))
      ])
    ])
  ]
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  @ViewChild('bellBtn', { static: true }) bellBtn!: ElementRef<HTMLButtonElement>;

  notifications: NotificationPayload[] = [];
  loading = false;
  unreadCount = 0;
  isOpen = false;

  private subs: Subscription[] = [];

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.notificationService.notifications$.subscribe((items) => {
        // sort newest first by createdOn desc
        this.notifications = [...(items || [])].sort((a, b) => {
          const ta = new Date(a.createdOn || '').getTime() || 0;
          const tb = new Date(b.createdOn || '').getTime() || 0;
          return tb - ta;
        });
        this.cdr.markForCheck();
      })
    );

    this.subs.push(
      this.notificationService.unreadCount$.subscribe((c) => {
        this.unreadCount = c ?? 0;
        this.cdr.markForCheck();
      })
    );

    this.subs.push(
      this.notificationService.loading$.subscribe((l) => {
        this.loading = !!l;
        this.cdr.markForCheck();
      })
    );

    // new notifications arrive
    this.subs.push(
      this.notificationService.queuedNotifications$.subscribe((n) => {
        if (!n) return;
        // if panel open insert at top; otherwise rely on service to update badge
        if (this.isOpen) {
          this.notifications = [n, ...this.notifications];
          this.unreadCount = (this.unreadCount || 0) + (n.isRead ? 0 : 1);
          this.cdr.markForCheck();
        } else {
          // still update badge count only
          this.unreadCount = (this.unreadCount || 0) + (n.isRead ? 0 : 1);
          this.cdr.markForCheck();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  togglePanel(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isOpen = !this.isOpen;
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) return;
    const target = event.target as HTMLElement;
    const bellEl = this.bellBtn?.nativeElement;
    const panel = document.querySelector('.notification-dropdown-panel');
    if (bellEl && bellEl.contains(target)) return;
    if (panel && panel.contains(target)) return;
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  markAll(): void {
    this.notificationService.markAllAsRead();
  }

  openAll(): void {
    try {
      void this.router.navigateByUrl('/notifications');
      this.isOpen = false;
    } catch (e) {
      console.warn('Unable to navigate to notifications page', e);
    }
  }

  openNotification(n: NotificationPayload, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (!n) return;
    if (!n.isRead) {
      this.notificationService.markAsRead(n.notificationId ?? n.referenceId ?? '');
    }

    if (n.actionUrl) {
      try {
        void this.router.navigateByUrl(n.actionUrl as string);
      } catch {
        window.open(String(n.actionUrl), '_blank');
      }
    } else if (n.referenceType && n.referenceId) {
      // try to navigate to a reference-based route
      try {
        void this.router.navigateByUrl(`/${n.referenceType}/${n.referenceId}`);
      } catch {
        // noop
      }
    }

    // close panel on selection
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  trackById(index: number, item: NotificationPayload): string | number | undefined {
    return item.notificationId ?? item.referenceId ?? index;
  }

  getIconForType(type?: string | null): string {
    if (!type) return 'notifications';
    const key = String(type).trim().toLowerCase();
    switch (key) {
      case 'priority':
      case 'priority create':
        return 'priority_high';
      case 'sla':
        return 'timer';
      case 'category':
        return 'category';
      case 'support group':
      case 'support-group':
        return 'group';
      case 'assignment':
        return 'assignment_ind';
      case 'approval':
        return 'verified_user';
      case 'approved':
        return 'check_circle';
      case 'rejected':
        return 'highlight_off';
      case 'reminder':
        return 'alarm';
      case 'information':
      case 'info':
        return 'info';
      default:
        return 'notifications';
    }
  }

  timeAgo(iso?: string | null): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec} sec${sec !== 1 ? 's' : ''} ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min${min !== 1 ? 's' : ''} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr${hr !== 1 ? 's' : ''} ago`;
    const day = Math.floor(hr / 24);
    return `${day} day${day !== 1 ? 's' : ''} ago`;
  }
}
