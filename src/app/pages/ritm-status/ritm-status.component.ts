import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RitmService, RitmStatusCreateRequest, RitmStatusVisibilityUpdateRequest } from '../../service/ritm.service';
import { VariantService } from '../../service/variant.service';
import { WorkItem } from '../../models/variant.model';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { USER_ROLES } from '../../data/app_constants';

interface RitmStatus {
  statusId: number;
  companyId: number;
  requestType?: string;
  statusCode: string;
  sequenceNo: number;
  statusColor: string;
  visibleStatuses?: Array<VisibleStatus | string>;
  isActive: boolean;
  createdBy: number;
  isCreatorAdmin: boolean;
}

interface VisibleStatus {
  statusId: number;
  statusCode: string;
}

interface RitmStatusFormError {
  requestType?: string;
  statusCode?: string;
  sequenceNo?: string;
  statusColor?: string;
}

interface PendingRitmStatus {
  statusCode: string;
  sequenceNo: number;
  statusColor: string;
}

@Component({
  selector: 'app-ritm-status',
  templateUrl: './ritm-status.component.html',
  styleUrls: ['./ritm-status.component.scss']
})
export class RitmStatusComponent implements OnInit {
  ritmStatusForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  creationStep: 1 | 2 = 1;
  pageTitle = 'Create RITM Status';
  isEditMode = false;
  editingStatus: RitmStatus | null = null;

  statuses: RitmStatus[] = [];
  workItems: WorkItem[] = [];
  statusList: PendingRitmStatus[] = [];
  visibilityRules: Record<string, string[]> = {};
  formError: RitmStatusFormError = {};
  submitError = '';
  submitSuccess = '';
  isSubmitting = false;
  loading = false;
  workItemsLoading = false;
  userOrgId = '';
  selectedColor = '#00246b';
  searchValue = '';
  selectedRequestType = '';
  selectedStatusFilter: 'all' | 'active' | 'inactive' = 'all';
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  visibleStatusesPopupId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private ritmService: RitmService,
    private variantService: VariantService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.ritmStatusForm = this.fb.group({
      requestType: ['', Validators.required],
      statusCode: ['', [Validators.required, Validators.maxLength(100)]],
      sequenceNo: [null, [Validators.required, Validators.min(0), Validators.pattern('^[0-9]+$')]],
      statusColor: [this.selectedColor, [Validators.required]]
    });
    this.userOrgId = localStorage.getItem('userOrgId') || '';
  }

  ngOnInit(): void {
    this.loadWorkItems();
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
    this.isEditMode = false;
    this.editingStatus = null;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    this.statusList = [];
    this.visibilityRules = {};
    this.creationStep = 1;
    this.selectedColor = '#00246b';
    this.ritmStatusForm.reset({ requestType: '', statusCode: '', sequenceNo: null, statusColor: this.selectedColor });
  }

  backToHome(): void {
    this.router.navigate(['/settings']);
  }

  addStatus(): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    const requestType = this.ritmStatusForm.get('requestType')?.value;
    const statusCode = (this.ritmStatusForm.get('statusCode')?.value || '').trim();
    const sequenceNo = this.ritmStatusForm.get('sequenceNo')?.value;
    const statusColor = (this.ritmStatusForm.get('statusColor')?.value || '').trim();

    if (!requestType) {
      this.formError.requestType = 'Request Type is required';
    }
    if (!statusCode) {
      this.formError.statusCode = 'Status Code is required';
    }
    if (sequenceNo === null || sequenceNo === '' || sequenceNo === undefined) {
      this.formError.sequenceNo = 'Sequence is required';
    } else if (!Number.isInteger(Number(sequenceNo)) || Number(sequenceNo) < 0) {
      this.formError.sequenceNo = 'Sequence must be a non-negative number';
    }
    if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(statusColor)) {
      this.formError.statusColor = 'Enter a valid hex color code';
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

    this.statusList.push({ statusCode, sequenceNo: numericSequence, statusColor });
    this.visibilityRules[statusCode] = [];
    this.ritmStatusForm.patchValue({ statusCode: '', sequenceNo: null, statusColor: this.selectedColor });
  }

  goToVisibilityStep(): void {
    this.formError = {};
    if (!this.ritmStatusForm.get('requestType')?.value) {
      this.formError.requestType = 'Request Type is required';
      return;
    }
    if (this.statusList.length === 0) {
      this.formError.statusCode = 'Add at least one status before continuing';
      return;
    }
    this.creationStep = 2;
  }

  goToStatusStep(): void {
    this.creationStep = 1;
  }

  isStatusVisible(currentStatusCode: string, visibleStatusCode: string): boolean {
    return (this.visibilityRules[currentStatusCode] || []).includes(visibleStatusCode);
  }

  setStatusVisibility(currentStatusCode: string, visibleStatusCode: string, event: Event): void {
    const isVisible = (event.target as HTMLInputElement).checked;
    const visibleStatuses = this.visibilityRules[currentStatusCode] || [];
    this.visibilityRules[currentStatusCode] = isVisible
      ? [...new Set([...visibleStatuses, visibleStatusCode])]
      : visibleStatuses.filter(statusCode => statusCode !== visibleStatusCode);
  }

  areAllVisibilityRulesSelected(currentStatusCode: string): boolean {
    const possibleStatuses = this.statusList.length - 1;
    return possibleStatuses > 0 && this.getVisibleStatusCount(currentStatusCode) === possibleStatuses;
  }

  setAllVisibilityRules(currentStatusCode: string, event: Event): void {
    const isVisible = (event.target as HTMLInputElement).checked;
    this.visibilityRules[currentStatusCode] = isVisible
      ? this.statusList.filter(status => status.statusCode !== currentStatusCode).map(status => status.statusCode)
      : [];
  }

  getVisibleStatusCount(currentStatusCode: string): number {
    return this.statusList.filter(status =>
      status.statusCode !== currentStatusCode && this.isStatusVisible(currentStatusCode, status.statusCode)
    ).length;
  }

  onColorCodeInput(): void {
    const statusColor = this.ritmStatusForm.get('statusColor')?.value || '';
    if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(statusColor)) {
      this.selectedColor = statusColor.length === 4
        ? `#${statusColor.slice(1).split('').map((value: string) => value + value).join('')}`
        : statusColor;
    }
  }

  onColorPickerChange(event: Event): void {
    const statusColor = (event.target as HTMLInputElement).value;
    this.selectedColor = statusColor;
    this.ritmStatusForm.patchValue({ statusColor });
  }

  removeStatus(status: PendingRitmStatus): void {
    this.statusList = this.statusList.filter(item => item !== status);
    delete this.visibilityRules[status.statusCode];
    Object.keys(this.visibilityRules).forEach(statusCode => {
      this.visibilityRules[statusCode] = this.visibilityRules[statusCode].filter(visibleStatusCode => visibleStatusCode !== status.statusCode);
    });
    this.submitError = '';
    this.submitSuccess = '';
  }

  onSave(): void {
    if (this.creationStep === 1) {
      this.goToVisibilityStep();
      return;
    }

    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    if (this.statusList.length === 0) {
      this.formError.statusCode = 'Add at least one RITM status';
      return;
    }

    const statusColor = (this.ritmStatusForm.get('statusColor')?.value || '').trim();
    if (this.isEditMode && !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(statusColor)) {
      this.formError.statusColor = 'Enter a valid hex color code';
      return;
    }

    const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
    const userId = Number(localStorage.getItem('userId') || 0);
    const companyId = Number(this.userOrgId || 0);
    this.isSubmitting = true;

    if (this.isEditMode && this.editingStatus) {
      const updateRequest: RitmStatusVisibilityUpdateRequest = {
        statusId: this.editingStatus.statusId,
        companyId: this.editingStatus.companyId,
        requestType: this.editingStatus.requestType || '',
        statusCode: this.editingStatus.statusCode,
        sequenceNo: this.editingStatus.sequenceNo,
        statusColor,
        visibleStatuses: this.visibilityRules[this.editingStatus.statusCode] || [],
        isActive: this.editingStatus.isActive,
        createdBy: this.editingStatus.createdBy,
        isCreatorAdmin: this.editingStatus.isCreatorAdmin,
        updatedBy: userId,
        isUpdaterAdmin: isAdmin
      };

      this.ritmService.updateRitmStatusVisibility(updateRequest).subscribe({
        next: () => this.finishSave('RITM status updated successfully.'),
        error: (err) => this.handleSaveError(err, 'Failed to update RITM status.')
      });
      return;
    }

    const createRequests: RitmStatusCreateRequest[] = this.statusList.map(status => ({
      companyId,
      requestType: this.ritmStatusForm.get('requestType')?.value,
      statusCode: status.statusCode,
      sequenceNo: status.sequenceNo,
      statusColor: status.statusColor,
      visibleStatuses: this.visibilityRules[status.statusCode] || [],
      createdBy: userId,
      isCreatorAdmin: isAdmin
    }));

    this.ritmService.createRitmStatus(createRequests).subscribe({
      next: () => this.finishSave('RITM status created successfully.'),
      error: (err) => this.handleSaveError(err, 'Failed to create RITM status.')
    });
  }

  onEditVisibility(status: RitmStatus): void {
    this.resetForm();
    this.isEditMode = true;
    this.editingStatus = status;
    this.pageTitle = 'Edit RITM Status';
    this.activeTab = 'create';
    this.creationStep = 2;
    this.selectedColor = status.statusColor || '#00246b';
    this.ritmStatusForm.patchValue({ statusColor: this.selectedColor });

    const relatedStatuses = this.statuses.filter(candidate =>
      status.requestType ? candidate.requestType === status.requestType : true
    );
    this.statusList = relatedStatuses.map(candidate => ({
      statusCode: candidate.statusCode,
      sequenceNo: candidate.sequenceNo,
      statusColor: candidate.statusColor
    }));

    relatedStatuses.forEach(candidate => {
      this.visibilityRules[candidate.statusCode] = (candidate.visibleStatuses || [])
        .map(visibleStatus => typeof visibleStatus === 'string' ? visibleStatus : visibleStatus.statusCode)
        .filter(statusCode => this.statusList.some(item => item.statusCode === statusCode));
    });
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'list';
  }

  getVisibilityStatuses(): PendingRitmStatus[] {
    return this.isEditMode && this.editingStatus
      ? this.statusList.filter(status => status.statusCode === this.editingStatus?.statusCode)
      : this.statusList;
  }

  getVisibleStatusCode(visibleStatus: VisibleStatus | string): string {
    return typeof visibleStatus === 'string' ? visibleStatus : visibleStatus.statusCode;
  }

  toggleStatusActive(status: RitmStatus): void {
    const action = status.isActive ? 'Deactivate' : 'Activate';
    const dialogData: ConfirmationDialogData = {
      title: `${action} RITM Status`,
      message: `Are you sure you want to ${action.toLowerCase()} status "${status.statusCode}"?`,
      confirmText: action,
      cancelText: 'Cancel',
      showCancel: true,
      type: 'delete'
    };

    this.dialog.open(ConfirmationDialogComponent, { width: '420px', data: dialogData })
      .afterClosed().subscribe(confirmed => {
        if (!confirmed) {
          return;
        }

        const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
        const userId = Number(localStorage.getItem('userId') || 0);

        this.ritmService.changeStatusActive({
          statusId: status.statusId,
          isActive: !status.isActive,
          updatedBy: userId,
          isUpdaterAdmin: isAdmin
        }).subscribe({
          next: () => {
            this.submitSuccess = status.isActive ? 'RITM status deactivated successfully.' : 'RITM status activated successfully.';
            this.loadStatusList();
            setTimeout(() => {
              this.submitSuccess = '';
            }, 3000);
          },
          error: (err) => {
            this.submitError = err.error?.description || `Failed to ${action.toLowerCase()} RITM status.`;
          }
        });
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

  getStatusText(status: RitmStatus): string {
    return status.isActive === true ? 'Active' : 'Inactive';
  }

  getStatusClass(status: RitmStatus): string {
    return status.isActive === true ? 'status-pill active' : 'status-pill inactive';
  }

  getRequestTypes(): string[] {
    return [...new Set([
      ...this.workItems.map(workItem => workItem.code),
      ...this.statuses.map(status => status.requestType || '')
    ].filter(Boolean))].sort((left, right) => left.localeCompare(right));
  }

  getFilteredStatuses(): RitmStatus[] {
    const term = this.searchValue.trim().toLowerCase();
    return this.statuses.filter(status => {
      const matchesSearch = !term || [
        status.requestType || '',
        status.statusCode || '',
        String(status.sequenceNo ?? '')
      ].some(value => value.toLowerCase().includes(term));
      const matchesRequestType = !this.selectedRequestType || status.requestType === this.selectedRequestType;
      const matchesStatus = this.selectedStatusFilter === 'all'
        || (this.selectedStatusFilter === 'active' && status.isActive === true)
        || (this.selectedStatusFilter === 'inactive' && status.isActive === false);
      return matchesSearch && matchesRequestType && matchesStatus;
    });
  }

  getPaginatedStatuses(): RitmStatus[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.getFilteredStatuses().slice(startIndex, startIndex + this.pageSize);
  }

  onListFilterChange(): void {
    this.currentPage = 0;
    this.visibleStatusesPopupId = null;
  }

  clearListFilters(): void {
    this.searchValue = '';
    this.selectedRequestType = '';
    this.selectedStatusFilter = 'all';
    this.onListFilterChange();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  toggleVisibleStatuses(status: RitmStatus): void {
    this.visibleStatusesPopupId = this.visibleStatusesPopupId === status.statusId ? null : status.statusId;
  }

  showVisibleStatuses(status: RitmStatus): void {
    this.visibleStatusesPopupId = status.statusId;
  }

  hideVisibleStatuses(status: RitmStatus): void {
    if (this.visibleStatusesPopupId === status.statusId) {
      this.visibleStatusesPopupId = null;
    }
  }

  private loadStatusList(): void {
    this.loading = true;
    this.submitError = '';
    this.ritmService.getAllStatuses(this.userOrgId).subscribe({
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

  private loadWorkItems(): void {
    if (!this.userOrgId) {
      this.workItems = [];
      return;
    }

    this.workItemsLoading = true;
    this.variantService.getWorkItemList(this.userOrgId).subscribe({
      next: (response) => {
        const data = (response as any)?.attributes || response || [];
        this.workItems = Array.isArray(data) ? data.filter((item: WorkItem) => item?.code) : [];
        this.workItemsLoading = false;
      },
      error: (err) => {
        this.workItems = [];
        this.workItemsLoading = false;
        this.submitError = err.error?.message || 'Failed to load request types.';
      }
    });
  }

  private finishSave(message: string): void {
    this.isSubmitting = false;
    this.resetForm();
    this.activeTab = 'list';
    this.submitSuccess = message;
    this.loadStatusList();
  }

  private handleSaveError(err: any, fallback: string): void {
    this.isSubmitting = false;
    this.submitError = err.error?.message || err.error?.description || fallback;
  }
}
