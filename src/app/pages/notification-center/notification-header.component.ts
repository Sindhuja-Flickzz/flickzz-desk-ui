import { Component, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-notification-header',
  template: `
    <div class="nc-header">
      <div class="left">
        <mat-icon class="nc-icon">notifications</mat-icon>
        <div class="title-group">
          <div class="title">Notifications</div>
          <div class="subtitle">Stay updated with the latest activities and approvals</div>
        </div>
      </div>
      <div class="right">
        <button mat-button color="primary" class="mark-all" (click)="markAllRead.emit()">Mark All as Read</button>
        <button mat-icon-button class="icon-btn" (click)="refresh.emit()"><mat-icon>refresh</mat-icon></button>
        <!-- <button mat-icon-button class="icon-btn"><mat-icon>settings</mat-icon></button> -->
      </div>
    </div>
  `,
  styles: [`
    .nc-header{display:flex;justify-content:space-between;align-items:center;background:#ffffff;border-radius:24px;padding:15px 10px;box-shadow:0 24px 60px rgba(15,23,42,0.08)}
    .left{display:flex;align-items:center;gap:16px}
    .nc-icon{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;font-size:32px;color:#304ffe;background:#e8f0ff;border-radius:18px;padding:12px;line-height:1;font-family:'Material Icons';font-feature-settings:'liga';}
    .title{font-weight:700;font-size:22px;color:#101828}
    .subtitle{font-size:14px;color:#667085;margin-top:4px}
    .right{display:flex;gap:12px;align-items:center}
    .mark-all{border-radius:999px;font-weight:600;box-shadow:0 8px 24px rgba(16,24,40,0.08)}
    .icon-btn{background:#f8fafc;border:1px solid rgba(15,23,42,0.08);border-radius:12px}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationHeaderComponent {
  @Output() refresh = new EventEmitter<void>();
  @Output() markAllRead = new EventEmitter<void>();
}
