import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NotificationPayload } from '../../models/notification.model';

@Component({
  selector: 'app-notification-card',
  template: `
    <mat-card class="nc-card" [class.unread]="!notification?.isRead" (click)="onSelect()">
      <div class="card-sidebar" [style.background]="getSidebarColor(notification?.notificationType)"></div>
      <div class="card-body">
        <div class="card-top">
          <div class="title-row">
            <div class="card-title">{{notification?.title}}</div>
            <span class="badge" [ngClass]="getBadgeClass(notification?.notificationType)">{{notification?.notificationType}}</span>
          </div>
          <div class="card-action">{{notification?.action}}</div>
        </div>
        <div class="card-message">{{notification?.message}}</div>
        <div class="card-meta" *ngIf="notification">
          <span class="meta-item" *ngIf="notification.companyName || notification.triggeredUserOrg">
            <mat-icon class="meta-icon">business</mat-icon>
            <span>{{notification.companyName || notification.triggeredUserOrg}}</span>
          </span>
          <span class="meta-item" *ngIf="notification.initiatedBy || notification.createdBy || notification.triggeredByUser">
            <mat-icon class="meta-icon">person</mat-icon>
            <span>{{notification.initiatedBy || notification.createdBy || notification.triggeredByUser}}</span>
          </span>
        </div>
      </div>
      <div class="card-right">
        <div class="timestamp">{{notification?.createdOn | date:'shortTime'}}</div>
        <button mat-stroked-button color="primary" class="view-btn" type="button">View</button>
      </div>
    </mat-card>
  `,
  styles: [`
    .nc-card{display:grid;grid-template-columns:6px minmax(0,1fr) auto;gap:16px;align-items:center;padding:18px;border-radius:24px;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease;border:1px solid rgba(15,23,42,0.08);background:#ffffff}
    .nc-card:hover{transform:translateY(-1px);box-shadow:0 18px 50px rgba(15,23,42,0.08)}
    .nc-card.unread{background:#f8fbff;border-color:#d8e7ff}
    .card-sidebar{border-radius:999px}
    .card-body{display:flex;flex-direction:column;gap:12px;min-width:0}
    .card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}
    .card-title{font-size:16px;font-weight:700;color:#0f172a;min-width:0}
    .badge{font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;color:#fff;text-transform:capitalize;white-space:nowrap}
    .badge.priority{background:#fb7185}
    .badge.sla{background:#60a5fa}
    .badge.category{background:#a78bfa}
    .badge.support-group{background:#34d399}
    .badge.assignment{background:#38bdf8}
    .badge.default{background:#c7d2fe}
    .card-action{font-size:13px;color:#2563eb;font-weight:600}
    .card-message{font-size:14px;color:#475569;line-height:1.6}
    .card-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#667085;align-items:center}
    .meta-item{display:flex;align-items:center;gap:6px;white-space:nowrap}
    .meta-icon{font-size:16px;color:#667085}
    .card-right{display:flex;flex-direction:column;align-items:flex-end;gap:12px;min-width:100px}
    .timestamp{font-size:12px;color:#98a2b3}
    .view-btn{border-radius:999px;padding:8px 18px;font-size:12px;text-transform:none}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationCardComponent {
  @Input() notification!: NotificationPayload | null;
  @Output() select = new EventEmitter<NotificationPayload>();

  onSelect() {
    if (this.notification) {
      this.select.emit(this.notification);
    }
  }

  getSidebarColor(type?: string | null): string {
    switch ((type ?? '').toLowerCase()) {
      case 'priority': return '#fee2e2';
      case 'sla': return '#eff6ff';
      case 'category': return '#faf5ff';
      case 'support group': return '#ecfdf5';
      case 'assignment': return '#eff6ff';
      default: return '#e2e8f0';
    }
  }

  getBadgeClass(type?: string | null): string {
    switch ((type ?? '').toLowerCase()) {
      case 'priority': return 'priority';
      case 'sla': return 'sla';
      case 'category': return 'category';
      case 'support group': return 'support-group';
      case 'assignment': return 'assignment';
      default: return 'default';
    }
  }
}
