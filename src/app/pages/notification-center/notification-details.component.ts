import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationPayload } from '../../models/notification.model';
import { ApprovalWorkflowComponent } from './approval-workflow.component';

@Component({
  selector: 'app-notification-details',
  template: `
    <mat-card *ngIf="notification; else empty">
      <div class="details-header">
        <div class="header-top">
          <div class="detail-title">Notification Details</div>
          <button mat-icon-button class="settings-btn"><mat-icon>settings</mat-icon></button>
        </div>
        <div class="detail-summary">
          <div class="detail-pills">
            <span class="pill type-pill">{{notification?.notificationType}}</span>
            <span class="pill status-pill">{{notification?.status}}</span>
          </div>
          <div class="detail-name">{{notification?.title}}</div>
        </div>
      </div>

      <div class="message">{{notification?.message}}</div>

      <div class="meta-grid">
        <div class="meta-item"><span>Company / BP</span><strong>{{notification?.companyName}}</strong></div>
        <div class="meta-item"><span>Initiated By</span><strong>{{notification?.initiatedBy}}</strong></div>
        <div class="meta-item"><span>Created On</span><strong>{{notification?.createdOn | date:'medium'}}</strong></div>
        <div class="meta-item"><span>Status</span><strong>{{notification?.status}}</strong></div>
      </div>

      <div class="config-section">
        <div class="section-title">Configuration Details</div>
        <div class="config-grid">
          <div><span>Configuration Type</span><strong>{{notification?.notificationType}}</strong></div>
          <div><span>Priority Name</span><strong>{{notification?.payload?.priorityName || '—'}}</strong></div>
          <div class="wide"><span>Description</span><strong>{{notification?.message}}</strong></div>
          <div class="wide"><span>Created By</span><strong>{{notification?.initiatedBy}}</strong></div>
        </div>
      </div>

      <!-- <div class="workflow-section">
        <div class="section-title">Approval Workflow</div>
        <approval-workflow [workflow]="notification?.payload?.approvalWorkflow"></approval-workflow>
      </div>

      <div class="actions">
        <button mat-raised-button color="primary">Approve</button>
        <button mat-stroked-button color="warn">Reject</button>
      </div> -->
    </mat-card>
    <ng-template #empty>
      <mat-card><div style="padding:16px">Select a notification to view details</div></mat-card>
    </ng-template>
  `,
  styles: [`
    mat-card{border-radius:24px;padding:24px;background:#ffffff;box-shadow:0 20px 50px rgba(15,23,42,0.08)}
    .details-header{display:flex;flex-direction:column}
    .header-top{display:flex;justify-content:space-between;align-items:center}
    .detail-title{font-size:16px;font-weight:700;color:#101828}
    .settings-btn{background:#f8fafc;border:1px solid rgba(15,23,42,0.08);border-radius:12px}
    .detail-summary{display:flex;flex-direction:column;gap:16px;padding: 0 0 10px 0;border-bottom:1px solid rgba(15,23,42,0.08)}
    .detail-pills{display:flex;gap:10px;flex-wrap:wrap}
    .pill{padding:8px 14px;border-radius:999px;font-size:12px;font-weight:700}
    .type-pill{background:#e0f2fe;color:#0369a1}
    .status-pill{background:#ecfdf5;color:#15803d}
    .detail-name{font-size:20px;font-weight:700;color:#101828}
    .message{margin-top:20px;font-size:14px;color:#475569;line-height:1.7}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .meta-item{background:#f8fafc;border-radius:18px;padding:10px;display:flex;flex-direction:column;gap:5px}
    .meta-item span{font-size:12px;color:#667085}
    .meta-item strong{font-size:14px;color:#0f172a}
    .config-section{margin-top:24px}
    .section-title{font-size:14px;font-weight:700;color:#101828;margin-bottom:10px}
    .config-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .config-grid .wide{grid-column:1 / -1}
    .config-grid div{background:#f8fafc;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:6px}
    .config-grid span{font-size:12px;color:#667085}
    .config-grid strong{font-size:14px;color:#0f172a}
    .workflow-section{margin-top:24px}
    .actions{display:flex;gap:12px;justify-content:flex-end;margin-top:24px}
    button[mat-raised-button]{border-radius:999px;padding:12px 28px}
    button[mat-stroked-button]{border-radius:999px;padding:12px 28px}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationDetailsComponent {
  @Input() notification: NotificationPayload | null = null;
  @Output() action = new EventEmitter<string>();
}
