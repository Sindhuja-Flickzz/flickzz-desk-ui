import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationPayload } from './notification.model';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-notification',
  template: `
    <button mat-icon-button type="button" (click)="toggleMenu()" aria-label="Notifications" style="position: relative;">
      <mat-icon>notifications</mat-icon>
      <span *ngIf="unreadCount > 0" style="position: absolute; top: 2px; right: 2px; background: #f44336; color: white; border-radius: 999px; padding: 2px 6px; font-size: 10px; line-height: 1;">
        {{ unreadCount }}
      </span>
    </button>
  `,
  styles: []
})
export class NotificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  unreadCount = 0;
  isMenuOpen = false;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.notificationService.notifications$.pipe(takeUntil(this.destroy$)).subscribe((items) => {
      this.unreadCount = items.filter((item) => !item.isRead).length;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
