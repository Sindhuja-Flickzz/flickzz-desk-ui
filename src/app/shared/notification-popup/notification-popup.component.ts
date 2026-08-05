import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationPayload } from '../../models/notification.model';

@Component({
  selector: 'app-notification-popup',
  templateUrl: './notification-popup.component.html',
  styleUrls: ['./notification-popup.component.scss']
})
export class NotificationPopupComponent implements OnInit, OnDestroy {
  @Input() notification!: NotificationPayload;
  @Output() closed = new EventEmitter<void>();

  animationState = 'enter';

  constructor(private router: Router) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.closed.emit();
  }

  action(): void {
    if (!this.notification?.actionUrl) {
      this.close();
      return;
    }

    try {
      void this.router.navigateByUrl(this.notification.actionUrl as string);
    } catch {
      window.open(String(this.notification.actionUrl), '_blank');
    }
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  get accentClass(): string {
    const type = (this.notification?.action || '') as string;
    const key = String(type).trim().toLowerCase();
    switch (key) {
      case 'create':
      case 'created':
        return 'accent-create';
      case 'update':
      case 'updated':
        return 'accent-update';
      case 'delete':
      case 'deleted':
        return 'accent-delete';
      case 'approval':
        return 'accent-approval';
      case 'approved':
        return 'accent-approved';
      case 'rejected':
        return 'accent-rejected';
      case 'reminder':
        return 'accent-reminder';
      case 'information':
      case 'info':
        return 'accent-information';
      default:
        return 'accent-information';
    }
  }
}
