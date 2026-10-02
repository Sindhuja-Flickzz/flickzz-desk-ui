import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfigChangeApprovalVO } from '../../../models/config-change-approval.model';

@Component({
  selector: 'app-approval-dialog',
  templateUrl: './approval-dialog.component.html',
  styleUrls: ['./approval-dialog.component.scss']
})
export class ApprovalDialogComponent {
  remark = '';
  maxCharacters = 500;

  constructor(
    public dialogRef: MatDialogRef<ApprovalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { approval: ConfigChangeApprovalVO; action: 'approve' | 'decline' | 'clarify' }
  ) {}

  getDialogTitle(): string {
    switch (this.data.action) {
      case 'approve':
        return 'Approve Request';
      case 'decline':
        return 'Decline Request';
      case 'clarify':
        return 'Request Clarification';
      default:
        return 'Approval Action';
    }
  }

  getDialogDescription(): string {
    switch (this.data.action) {
      case 'approve':
        return 'Please provide any additional remarks before approving this request.';
      case 'decline':
        return 'Please provide the reason for declining this request.';
      case 'clarify':
        return 'Please specify what clarification you need for this request.';
      default:
        return '';
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.remark.trim()) {
      this.dialogRef.close({ remark: this.remark });
    }
  }

  get remainingCharacters(): number {
    return this.maxCharacters - this.remark.length;
  }

  get isValid(): boolean {
    return this.remark.trim().length > 0;
  }
}
