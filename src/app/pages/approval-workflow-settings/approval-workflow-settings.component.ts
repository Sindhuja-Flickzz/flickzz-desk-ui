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
      approvalPendingStatusId: [null, Validators.required],
      configureAutoApprovalOnTimeout: [false],
      autoActionTimeline: [null],
      autoActionTimeUnit: ['DAYS'],
      statusAfterAutoAction: [null],
      statusOnApproval: ['', Validators.required],
      statusOnDecline: ['', Validators.required],
      statusOnClarify: ['', Validators.required]
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
    this.workflowForm.get('configureAutoApprovalOnTimeout')?.valueChanges.subscribe(configured => {
      this.setAutoApprovalTimeoutConfiguration(configured);
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
      approvalPendingStatusId: null,
      configureAutoApprovalOnTimeout: false,
      autoActionTimeline: null,
      autoActionTimeUnit: 'DAYS',
      statusAfterAutoAction: null,
      statusOnApproval: '',
      statusOnDecline: '',
      statusOnClarify: ''
    });
  }

  onSave(): void {
    this.submitError = '';
    this.submitSuccess = '';
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
      approvalPendingStatusId: Number(formValue.approvalPendingStatusId),
      autoActionTimeline: formValue.configureAutoApprovalOnTimeout ? Number(formValue.autoActionTimeline) : null,
      autoActionTimeUnit: formValue.configureAutoApprovalOnTimeout ? formValue.autoActionTimeUnit : null,
      statusAfterAutoAction: formValue.configureAutoApprovalOnTimeout ? Number(formValue.statusAfterAutoAction) : null,
      statusOnApproval: Number(formValue.statusOnApproval),
      statusOnDecline: Number(formValue.statusOnDecline),
      statusOnClarify: Number(formValue.statusOnClarify),
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
    this.workflowForm.patchValue({
      configId: workflow.configId,
      workItemId: workflow.workItemId,
      approvalPendingStatusId: workflow.approvalPendingStatusId,
      configureAutoApprovalOnTimeout: workflow.autoActionTimeline != null || workflow.statusAfterAutoAction != null,
      autoActionTimeline: workflow.autoActionTimeline,
      autoActionTimeUnit: workflow.autoActionTimeUnit ?? 'DAYS',
      statusAfterAutoAction: workflow.statusAfterAutoAction ?? null,
      statusOnApproval: workflow.statusOnApproval ?? '',
      statusOnDecline: workflow.statusOnDecline ?? '',
      statusOnClarify: workflow.statusOnClarify ?? ''
    }, { emitEvent: false });
    this.setAutoApprovalTimeoutConfiguration(this.workflowForm.get('configureAutoApprovalOnTimeout')?.value);
    this.loadStatuses(
      workflow.workItemId,
      workflow.approvalPendingStatusId,
      workflow.statusAfterAutoAction,
      workflow.statusOnApproval,
      workflow.statusOnDecline,
      workflow.statusOnClarify
    );
  }

  private setAutoApprovalTimeoutConfiguration(configured: boolean): void {
    const timelineControl = this.workflowForm.get('autoActionTimeline');
    const timeUnitControl = this.workflowForm.get('autoActionTimeUnit');
    const statusControl = this.workflowForm.get('statusAfterAutoAction');

    if (configured) {
      timelineControl?.setValidators([Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]);
      timeUnitControl?.setValidators(Validators.required);
      statusControl?.setValidators(Validators.required);
    } else {
      timelineControl?.clearValidators();
      timeUnitControl?.clearValidators();
      statusControl?.clearValidators();
      timelineControl?.reset(null, { emitEvent: false });
      timeUnitControl?.reset('DAYS', { emitEvent: false });
      statusControl?.reset(null, { emitEvent: false });
    }

    timelineControl?.updateValueAndValidity({ emitEvent: false });
    timeUnitControl?.updateValueAndValidity({ emitEvent: false });
    statusControl?.updateValueAndValidity({ emitEvent: false });
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
    selectedAutoActionStatus: number | string | null = null,
    selectedApprovalStatus: number | string | null = null,
    selectedDeclineStatus: number | string | null = null,
    selectedClarifyStatus: number | string | null = null
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
        const statusSelections = [
          ['statusAfterAutoAction', selectedAutoActionStatus],
          ['statusOnApproval', selectedApprovalStatus],
          ['statusOnDecline', selectedDeclineStatus],
          ['statusOnClarify', selectedClarifyStatus]
        ] as const;
        statusSelections.forEach(([controlName, selectedStatus]) => {
          if (selectedStatus == null) {
            return;
          }
          const status = this.statuses.find(item =>
            item.statusCode === String(selectedStatus) || item.statusId === Number(selectedStatus)
          );
          if (status) {
            this.workflowForm.patchValue({ [controlName]: status.statusId }, { emitEvent: false });
          }
        });
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

}
