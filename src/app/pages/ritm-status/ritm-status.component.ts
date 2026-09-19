import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RitmService, RitmStatusCreateRequest } from '../../service/ritm.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { USER_ROLES } from '../../data/app_constants';

interface RitmStatus {
  statusId: number;
  companyId: number;
  statusCode: string;
  sequenceNo: number;
  isActive: boolean;
  createdBy: number;
  isCreatorAdmin: boolean;
}

interface RitmStatusFormError {
  statusCode?: string;
  sequenceNo?: string;
}

interface PendingRitmStatus {
  statusCode: string;
  sequenceNo: number;
}

@Component({
  selector: 'app-ritm-status',
  templateUrl: './ritm-status.component.html',
  styleUrls: ['./ritm-status.component.scss']
})
export class RitmStatusComponent implements OnInit {
  ritmStatusForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create RITM Status';

  statuses: RitmStatus[] = [];
  statusList: PendingRitmStatus[] = [];
  formError: RitmStatusFormError = {};
  submitError = '';
  submitSuccess = '';
  isSubmitting = false;
  loading = false;
  userOrgId = '';

  constructor(
    private fb: FormBuilder,
    private ritmService: RitmService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.ritmStatusForm = this.fb.group({
      statusCode: ['', [Validators.required, Validators.maxLength(100)]],
      sequenceNo: [null, [Validators.required, Validators.min(0), Validators.pattern('^[0-9]+$')]]
    });
    this.userOrgId = localStorage.getItem('userOrgId') || '';
  }

  ngOnInit(): void {
    this.loadStatusList();
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    this.submitError = '';
    this.submitSuccess = '';

    if (tab === 'list') {
      this.resetForm();
      this.loadStatusList();
    }
  }

  resetForm(): void {
    this.pageTitle = 'Create RITM Status';
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    this.statusList = [];
    this.ritmStatusForm.reset({ statusCode: '', sequenceNo: null });
  }

  backToHome(): void {
    this.router.navigate(['/settings']);
  }

  addStatus(): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    const statusCode = (this.ritmStatusForm.get('statusCode')?.value || '').trim();
    const sequenceNo = this.ritmStatusForm.get('sequenceNo')?.value;

    if (!statusCode) {
      this.formError.statusCode = 'Status Code is required';
    }
    if (sequenceNo === null || sequenceNo === '' || sequenceNo === undefined) {
      this.formError.sequenceNo = 'Sequence is required';
    } else if (!Number.isInteger(Number(sequenceNo)) || Number(sequenceNo) < 0) {
      this.formError.sequenceNo = 'Sequence must be a non-negative number';
    }
    if (Object.keys(this.formError).length > 0) {
      return;
    }

    const normalizedStatusCode = statusCode.toLowerCase();
    const numericSequence = Number(sequenceNo);
    const duplicateStatusCode = this.statusList.some(status =>
      status.statusCode.toLowerCase() === normalizedStatusCode
    ) || this.statuses.some(status =>
      status.statusCode.toLowerCase() === normalizedStatusCode
    );
    const duplicateSequence = this.statusList.some(status =>
      status.sequenceNo === numericSequence
    ) || this.statuses.some(status =>
      Number(status.sequenceNo) === numericSequence
    );

    if (duplicateStatusCode) {
      this.formError.statusCode = 'Status Code already added';
    }
    if (duplicateSequence) {
      this.formError.sequenceNo = 'Sequence already added';
    }
    if (Object.keys(this.formError).length > 0) {
      return;
    }

    this.statusList.push({ statusCode, sequenceNo: numericSequence });
    this.ritmStatusForm.patchValue({ statusCode: '', sequenceNo: null });
  }

  removeStatus(status: PendingRitmStatus): void {
    this.statusList = this.statusList.filter(item => item !== status);
    this.submitError = '';
    this.submitSuccess = '';
  }

  onSave(): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    if (this.statusList.length === 0) {
      this.formError.statusCode = 'Add at least one RITM status';
      return;
    }

    const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
    const userId = Number(localStorage.getItem('userId') || 0);
    const companyId = Number(this.userOrgId || 0);
    this.isSubmitting = true;
    const createRequests: RitmStatusCreateRequest[] = this.statusList.map(status => ({
      companyId,
      statusCode: status.statusCode,
      sequenceNo: status.sequenceNo,
      createdBy: userId,
      isCreatorAdmin: isAdmin
    }));

    this.ritmService.createRitmStatus(createRequests).subscribe({
      next: () => this.finishSave('RITM status created successfully.'),
      error: (err) => this.handleSaveError(err, 'Failed to create RITM status.')
    });
  }

  onDelete(status: RitmStatus): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete RITM Status',
      message: `Are you sure you want to delete status "${status.statusCode}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      type: 'delete'
    };

    this.dialog.open(ConfirmationDialogComponent, { width: '420px', data: dialogData })
      .afterClosed().subscribe(confirmed => {
        if (!confirmed) {
          return;
        }
        this.ritmService.deleteRitmStatus(status.statusId).subscribe({
          next: () => {
            this.submitSuccess = 'RITM status deleted successfully.';
            this.loadStatusList();
          },
          error: (err) => {
            this.submitError = err.error?.message || 'Failed to delete RITM status.';
          }
        });
      });
  }

  private loadStatusList(): void {
    this.loading = true;
    this.submitError = '';
    this.ritmService.getRitmStatuses(this.userOrgId).subscribe({
      next: (response) => {
        const data = (response as any)?.attributes || response || [];
        this.statuses = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: (err) => {
        this.statuses = [];
        this.loading = false;
        this.submitError = err.error?.message || 'Failed to load RITM statuses.';
      }
    });
  }

  private finishSave(message: string): void {
    this.isSubmitting = false;
    this.submitSuccess = message;
    this.loadStatusList();
    this.resetForm();
    this.activeTab = 'list';
  }

  private handleSaveError(err: any, fallback: string): void {
    this.isSubmitting = false;
    this.submitError = err.error?.message || err.error?.description || fallback;
  }
}
