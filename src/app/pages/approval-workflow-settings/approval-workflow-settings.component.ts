import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ApprovalWorkflow, ApprovalWorkflowRequest, ApprovalWorkflowTimeUnit } from '../../models/approval-workflow.model';
import { WorkItem } from '../../models/variant.model';
import { RitmService } from '../../service/ritm.service';
import { VariantService } from '../../service/variant.service';
import { ApprovalWorkflowService } from '../../service/approval-workflow.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

interface WorkflowStatus {
  statusId: number;
  statusCode: string;
}

@Component({
  selector: 'app-approval-workflow-settings',
  templateUrl: './approval-workflow-settings.component.html',
  styleUrls: ['./approval-workflow-settings.component.scss']
})
export class ApprovalWorkflowSettingsComponent implements OnInit {
  workflowForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Approval Workflow';
  isEditMode = false;
  workItems: WorkItem[] = [];
  statuses: WorkflowStatus[] = [];
  workflows: ApprovalWorkflow[] = [];
  userOrgId = '';
  isLoading = false;
  isSubmitting = false;
  isLoadingStatuses = false;
  submitError = '';
  submitSuccess = '';
  workItemsError = '';
  listError = '';
  readonly timeUnits: { value: ApprovalWorkflowTimeUnit; label: string }[] = [
    { value: 'DAYS', label: 'Days' },
    { value: 'HOURS', label: 'Hours' },
    { value: 'MINUTES', label: 'Minutes' }
  ];
  constructor(
    private fb: FormBuilder,
    private workflowService: ApprovalWorkflowService,
    private ritmService: RitmService,
    private variantService: VariantService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.userOrgId = localStorage.getItem('userOrgId') || '';
    this.workflowForm = this.fb.group({
      configId: [null],
      workItemId: [null, Validators.required],
      isApprovalRequired: [false],
      approvalPendingStatusId: [null],
      autoActionTimeline: [null, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]],
      autoActionTimeUnit: ['DAYS', Validators.required],
      statusAfterAutoAction: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadWorkItems();
    this.loadWorkflows();
    this.workflowForm.get('workItemId')?.valueChanges.subscribe(workItemId => {
      this.statuses = [];
      this.workflowForm.patchValue({ approvalPendingStatusId: null }, { emitEvent: false });
      if (workItemId) {
        this.loadStatuses(Number(workItemId));
      }
    });
    this.workflowForm.get('isApprovalRequired')?.valueChanges.subscribe(isRequired => {
      this.setShootingStatusValidation(isRequired);
    });
  }

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.submitError = '';
    if (tab === 'create') {
      if (!this.isEditMode) {
        this.resetForm();
      }
    } else {
      this.resetForm();
      this.loadWorkflows();
    }
  }

  backToHome(): void {
    const settingsView = window.history.state?.settingsView;
    if (settingsView) {
      this.router.navigate(['/settings'], { state: { settingsView } });
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    this.router.navigate(['/settings']);
  }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Create Approval Workflow';
    this.submitError = '';
    this.submitSuccess = '';
    this.statuses = [];
    this.workflowForm.reset({
      configId: null,
      workItemId: null,
      isApprovalRequired: false,
      approvalPendingStatusId: null,
      autoActionTimeline: null,
      autoActionTimeUnit: 'DAYS',
      statusAfterAutoAction: ''
    });
    this.setShootingStatusValidation(false);
  }

  onSave(): void {
    this.submitError = '';
    this.submitSuccess = '';
    this.setShootingStatusValidation(this.workflowForm.get('isApprovalRequired')?.value);
    this.workflowForm.markAllAsTouched();
    if (this.workflowForm.invalid) {
      return;
    }

    const userId = Number(localStorage.getItem('userId') || 0);
    const formValue = this.workflowForm.getRawValue();
    const request: ApprovalWorkflowRequest = {
      ...(this.isEditMode ? { configId: Number(formValue.configId) } : {}),
      companyId: Number(this.userOrgId),
      workItemId: Number(formValue.workItemId),
      isApprovalRequired: Boolean(formValue.isApprovalRequired),
      approvalPendingStatusId: formValue.isApprovalRequired
        ? Number(formValue.approvalPendingStatusId)
        : null,
      autoActionTimeline: Number(formValue.autoActionTimeline),
      autoActionTimeUnit: formValue.autoActionTimeUnit,
      statusAfterAutoAction: Number(formValue.statusAfterAutoAction),
      createdBy: userId,
      updatedBy: userId,
      isCreatedByAdmin: localStorage.getItem('isAdmin') === 'true',
      isUpdatedByAdmin: localStorage.getItem('isAdmin') === 'true'
    };

    this.isSubmitting = true;
    const request$ = this.isEditMode
      ? this.workflowService.updateWorkflow(request)
      : this.workflowService.createWorkflow(request);
    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        const successMessage = this.isEditMode
          ? 'Approval workflow updated successfully.'
          : 'Approval workflow created successfully.';
        this.activeTab = 'list';
        this.resetForm();
        this.submitSuccess = successMessage;
        this.loadWorkflows();
      },
      error: err => {
        this.isSubmitting = false;
        this.submitError = err.error?.message || err.error?.description || 'Failed to save approval workflow.';
        console.error('Approval workflow save error:', err);
      }
    });
  }

  editWorkflow(workflow: ApprovalWorkflow): void {
    this.activeTab = 'create';
    this.isEditMode = true;
    this.pageTitle = 'Edit Approval Workflow';
    this.submitError = '';
    this.submitSuccess = '';
    this.setShootingStatusValidation(workflow.isApprovalRequired);
    this.workflowForm.patchValue({
      configId: workflow.configId,
      workItemId: workflow.workItemId,
      isApprovalRequired: workflow.isApprovalRequired,
      approvalPendingStatusId: workflow.approvalPendingStatusId,
      autoActionTimeline: workflow.autoActionTimeline,
      autoActionTimeUnit: workflow.autoActionTimeUnit,
      statusAfterAutoAction: workflow.statusAfterAutoAction ?? ''
    }, { emitEvent: false });
    this.loadStatuses(
      workflow.workItemId,
      workflow.approvalPendingStatusId,
      workflow.statusAfterAutoAction
    );
  }

  deleteWorkflow(workflow: ApprovalWorkflow): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Approval Workflow',
      message: 'Are you sure you want to delete this approval workflow?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      type: 'delete'
    };
    this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: dialogData
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
      const request ={
        configId: workflow.configId,
        companyId: Number(this.userOrgId),
        deletedBy: Number(localStorage.getItem('userId') || 0)
      };
      this.workflowService.deleteWorkflow(request).subscribe({
        next: () => {
          this.submitSuccess = 'Approval workflow deleted successfully.';
          this.loadWorkflows();
        },
        error: err => {
          this.submitError = err.error?.message || err.error?.description || 'Failed to delete approval workflow.';
          console.error('Approval workflow delete error:', err);
        }
      });
    });
  }

  getWorkItemLabel(workItemId: number): string {
    const workItem = this.workItems.find(item => item.itemId === workItemId);
    return workItem?.label ? `${workItem.label} (${workItem.code})` : String(workItemId);
  }

  private loadWorkItems(): void {
    if (!this.userOrgId) {
      this.workItemsError = 'Organization information is unavailable.';
      return;
    }

    this.workItemsError = '';
    this.variantService.getWorkItemList(this.userOrgId).subscribe({
      next: response => {
        const data = response?.attributes ?? response ?? [];
        this.workItems = Array.isArray(data) ? data.filter((item: WorkItem) => item?.code && item.isActive !== false) : [];
      },
      error: err => {
        this.workItems = [];
        this.workItemsError = err.error?.message || err.error?.description || 'Failed to load work items.';
        console.error('Approval workflow work-item load error:', err);
      }
    });
  }

  private loadStatuses(
    workItemId: number,
    selectedStatusId: number | null = null,
    selectedAutoActionStatus: number | string | null = null
  ): void {
    const workItemCode = this.workItems.find(item => item.itemId === workItemId)?.code;
    if (!workItemCode) {
      this.statuses = [];
      this.submitError = 'Unable to load statuses: work item code is unavailable.';
      return;
    }

    this.isLoadingStatuses = true;
    this.ritmService.getActiveStatuses(this.userOrgId, workItemCode).subscribe({
      next: response => {
        const data = response?.attributes ?? response ?? [];
        this.statuses = Array.isArray(data) ? data : [];
        this.isLoadingStatuses = false;
        if (selectedStatusId != null) {
          this.workflowForm.patchValue({ approvalPendingStatusId: selectedStatusId }, { emitEvent: false });
        }
        if (selectedAutoActionStatus != null) {
          const autoActionStatus = this.statuses.find(status =>
            status.statusCode === String(selectedAutoActionStatus) ||
            status.statusId === Number(selectedAutoActionStatus)
          );
          if (autoActionStatus) {
            this.workflowForm.patchValue(
              { statusAfterAutoAction: autoActionStatus.statusId },
              { emitEvent: false }
            );
          }
        }
      },
      error: err => {
        this.statuses = [];
        this.isLoadingStatuses = false;
        this.submitError = err.error?.message || err.error?.description || 'Failed to load active statuses.';
        console.error('Approval workflow status load error:', err);
      }
    });
  }

  private loadWorkflows(): void {
    if (!this.userOrgId) {
      this.workflows = [];
      this.listError = 'Organization information is unavailable.';
      return;
    }

    this.isLoading = true;
    this.listError = '';
    this.workflowService.getWorkflows(this.userOrgId).subscribe({
      next: response => {
        const data = (response as any)?.attributes ?? response ?? [];
        this.workflows = Array.isArray(data) ? data : [];
        this.isLoading = false;
      },
      error: err => {
        this.workflows = [];
        this.isLoading = false;
        this.listError = err.error?.message || err.error?.description || 'Failed to load approval workflows.';
        console.error('Approval workflow list load error:', err);
      }
    });
  }

  private setShootingStatusValidation(isRequired: boolean): void {
    const control = this.workflowForm.get('approvalPendingStatusId');
    if (!control) {
      return;
    }
    control.setValidators(isRequired ? [Validators.required] : []);
    control.updateValueAndValidity({ emitEvent: false });
  }
}
