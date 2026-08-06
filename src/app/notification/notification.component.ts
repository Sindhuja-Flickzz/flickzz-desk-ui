import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationPayload } from '../models/notification.model';
import { NotificationService } from '../service/notification.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  notifications: NotificationPayload[] = [];
  unreadCount = 0;
  loading = false;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.notificationService.notifications$.pipe(takeUntil(this.destroy$)).subscribe((items) => {
      this.notifications = items;
    });

    this.notificationService.unreadCount$.pipe(takeUntil(this.destroy$)).subscribe((count) => {
      this.unreadCount = count;
    });

    this.notificationService.loading$.pipe(takeUntil(this.destroy$)).subscribe((l) => (this.loading = l));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openNotification(n: NotificationPayload): void {
    if (!n) {
      return;
    }

    if (!n.isRead) {
      this.notificationService.markAsRead(n.notificationId ?? n.referenceId ?? '');
    }

    if (n.actionUrl) {
      try {
        this.router.navigateByUrl(n.actionUrl as string);
      } catch (e) {
        console.warn('Unable to navigate to notification url', n.actionUrl, e);
      }
    }
  }

  markAll(): void {
    this.notificationService.markAllAsRead();
  }

  openAll(): void {
    try {
      void this.router.navigateByUrl('/notifications');
    } catch (e) {
      console.warn('Unable to navigate to notifications page', e);
    }
  }

  trackById(index: number, item: NotificationPayload): string | number | undefined {
    return item.notificationId ?? item.referenceId ?? index;
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
