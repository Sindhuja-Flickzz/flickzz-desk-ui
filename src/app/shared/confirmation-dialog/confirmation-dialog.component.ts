import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmationDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  type?: 'info' | 'error' | 'delete';
  includeRemarks?: boolean;
  remarksLabel?: string;
  remarksPlaceholder?: string;
  remarksValue?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  remarks = '';

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {
    this.data = {
      title: 'Confirm',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      showCancel: true,
      includeRemarks: false,
      remarksLabel: 'Remarks',
      remarksPlaceholder: 'Enter remarks',
      remarksValue: '',
      ...data
    };
    this.remarks = this.data.remarksValue || '';
  }

  onConfirm(): void {
    if (this.data.includeRemarks) {
      this.dialogRef.close({ confirmed: true, remarks: this.remarks.trim() });
      return;
    }

    this.dialogRef.close(true);
  }

  onCancel(): void {
    if (this.data.includeRemarks) {
      this.dialogRef.close({ confirmed: false, remarks: this.remarks.trim() });
      return;
    }

    this.dialogRef.close(false);
  }
}
