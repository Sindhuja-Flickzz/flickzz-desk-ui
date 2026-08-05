import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'approval-workflow',
  template: `
    <div class="workflow" *ngIf="workflow?.length">
      <div *ngFor="let step of workflow" class="step" [class.completed]="step.status==='COMPLETED'" [class.pending]="step.status==='PENDING'" [class.rejected]="step.status==='REJECTED'">
        <div class="marker"></div>
        <div class="content">
          <div class="name">{{step.name}}</div>
          <div class="status">{{step.status}}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workflow{margin-top:16px;border-left:2px solid rgba(0,0,0,0.06);padding-left:12px}
    .step{display:flex;gap:8px;align-items:center;padding:8px 0}
    .marker{width:12px;height:12px;border-radius:50%;background:grey}
    .step.completed .marker{background:green}
    .step.pending .marker{background:#1976d2}
    .step.rejected .marker{background:red}
    .name{font-weight:600}
    .status{font-size:12px;color:rgba(0,0,0,0.6)}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApprovalWorkflowComponent {
  @Input() workflow: any[] | null = null;
}
