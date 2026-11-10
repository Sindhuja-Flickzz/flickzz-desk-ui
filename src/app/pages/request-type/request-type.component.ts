import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { USER_ROLES } from '../../data/app_constants';
import { RequestType, RequestTypeRequest } from '../../models/request-type.model';
import { WorkItem } from '../../models/variant.model';
import {
  RequestTypeAssignmentDeleteRequest,
  RequestTypeAssignmentRequest,
  RequestTypeService
} from '../../service/request-type.service';
import { VariantService } from '../../service/variant.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

interface RequestTypeAssignmentRow {
  assignmentId: number | null;
  workItemId: number;
  workItem: string;
  requestTypes: string;
}

@Component({
  selector: 'app-request-type',
  templateUrl: './request-type.component.html',
  styleUrls: ['./request-type.component.scss']
})
export class RequestTypeComponent implements OnInit {
  requestTypeForm: FormGroup;
  assignmentForm: FormGroup;
  activeTab: 'create' | 'list' | 'assign' = 'create';
  requestTypes: RequestType[] = [];
  filteredRequestTypes: RequestType[] = [];
  requestTypeList: { name: string }[] = [];
  workItems: WorkItem[] = [];
  assignments: RequestTypeAssignmentRow[] = [];
  filteredAssignments: RequestTypeAssignmentRow[] = [];
  private assignmentRecords: any[] = [];
  selectedRequestTypeIds: number[] = [];
  searchValue = '';
  assignmentSearchValue = '';
  assignmentWorkItemFilter: number | '' = '';
  loading = false;
  error: string | null = null;
  assignmentLoading = false;
  deletingAssignmentId: number | null = null;
  workItemsLoading = false;
  assignmentError = '';
  workItemsError = '';
  formError: { requestType?: string } = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;
  isAssigning = false;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;
  assignmentPageSize = 10;
  assignmentTotalRecords = 0;
  assignmentCurrentPage = 0;
  userOrgId: string = '';

  constructor(
    private fb: FormBuilder,
    private requestTypeService: RequestTypeService,
    private variantService: VariantService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.requestTypeForm = this.fb.group({
      requestType: ['', Validators.required]
    });
    this.assignmentForm = this.fb.group({
      workItemId: ['', Validators.required],
      requestTypeId: ['']
    });
  }

  ngOnInit(): void {    
    this.userOrgId = localStorage.getItem('userOrgId') || '';
    this.loadRequestTypeList();
    this.loadWorkItems();
  }

  loadRequestTypeList(): void {
    this.loading = true;
    this.requestTypeService.getRequestTypes(Number(this.userOrgId)).subscribe({
      next: (result) => {
        // result = (result as any)?.attributes || result; // Handle both array and object responses
        this.requestTypes = Array.isArray(result) ? result : result?.attributes || [];
        this.filterBySearch();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.description || 'Failed to load request types. Please try again.';
      }
    });
  }

  selectTab(tab: 'create' | 'list' | 'assign'): void {
    this.activeTab = tab;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    if (tab === 'list') {
      this.resetForm();
      this.loadRequestTypeList();
    } else if (tab === 'assign') {
      this.resetAssignmentForm();
      this.assignmentWorkItemFilter = '';
      this.filterAssignments();
      this.loadAssignments();
    }
  }

  private loadAssignments(): void {
    this.assignmentLoading = true;
    this.requestTypeService.getRequestTypeAssignments(this.userOrgId).subscribe({
      next: (result) => {
        const data = Array.isArray(result) ? result : result?.attributes;
        if (!Array.isArray(data)) {
          this.assignmentRecords = [];
          this.refreshAssignmentRows();
          this.assignmentError = 'Failed to load request type assignments.';
          this.assignmentLoading = false;
          return;
        }
        this.assignmentRecords = data;
        this.refreshAssignmentRows();
        this.assignmentLoading = false;
      },
      error: (err) => {
        this.assignmentRecords = [];
        this.refreshAssignmentRows();
        this.assignmentLoading = false;
        this.assignmentError = err.error?.description || err.error?.message || 'Failed to load request type assignments.';
      }
    });
  }

  private refreshAssignmentRows(): void {
    this.assignments = this.assignmentRecords.map((item: any) => this.toAssignmentRow(item));
    this.filterAssignments();
  }

  filterAssignments(): void {
    const term = this.assignmentSearchValue.trim().toLowerCase();
    this.filteredAssignments = this.assignments.filter(assignment => {
      const matchesSearch = !term
        || assignment.workItem.toLowerCase().includes(term)
        || assignment.requestTypes.toLowerCase().includes(term);
      const matchesWorkItem = this.assignmentWorkItemFilter === ''
        || assignment.workItemId === Number(this.assignmentWorkItemFilter);
      return matchesSearch && matchesWorkItem;
    });
    this.assignmentTotalRecords = this.filteredAssignments.length;
    this.assignmentCurrentPage = 0;
  }

  getPaginatedAssignments(): RequestTypeAssignmentRow[] {
    const startIndex = this.assignmentCurrentPage * this.assignmentPageSize;
    return this.filteredAssignments.slice(startIndex, startIndex + this.assignmentPageSize);
  }

  onAssignmentPageChange(event: PageEvent): void {
    this.assignmentCurrentPage = event.pageIndex;
    this.assignmentPageSize = event.pageSize;
  }

  private loadWorkItems(): void {
    if (!this.userOrgId) {
      this.workItemsError = 'Organization information is unavailable.';
      return;
    }

    this.workItemsLoading = true;
    this.workItemsError = '';
    this.variantService.getWorkItemList(this.userOrgId).subscribe({
      next: response => {
        const data = response?.attributes ?? response ?? [];
        this.workItems = Array.isArray(data)
          ? data.filter((item: WorkItem) => item?.code && item.isActive !== false)
          : [];
        this.workItemsLoading = false;
        this.refreshAssignmentRows();
      },
      error: err => {
        this.workItems = [];
        this.workItemsLoading = false;
        this.workItemsError = err.error?.message || err.error?.description || 'Failed to load work items.';
        this.refreshAssignmentRows();
      }
    });
  }

  getAvailableRequestTypes(): RequestType[] {
    const workItemId = Number(this.assignmentForm.get('workItemId')?.value);
    if (!workItemId) {
      return [];
    }

    const assignedIds = this.getAssignedRequestTypeIds(workItemId);
    return this.requestTypes.filter(requestType =>
      !assignedIds.has(requestType.requestTypeId)
      && !this.selectedRequestTypeIds.includes(requestType.requestTypeId)
    );
  }

  onWorkItemChange(): void {
    this.selectedRequestTypeIds = [];
    this.assignmentForm.patchValue({ requestTypeId: '' }, { emitEvent: false });
  }

  addSelectedRequestType(): void {
    const requestTypeId = Number(this.assignmentForm.get('requestTypeId')?.value);
    if (!Number.isFinite(requestTypeId) || !requestTypeId) {
      return;
    }
    if (!this.selectedRequestTypeIds.includes(requestTypeId)
      && !this.getAssignedRequestTypeIds(Number(this.assignmentForm.get('workItemId')?.value)).has(requestTypeId)) {
      this.selectedRequestTypeIds = [...this.selectedRequestTypeIds, requestTypeId];
    }
    this.assignmentForm.patchValue({ requestTypeId: '' }, { emitEvent: false });
  }

  removeSelectedRequestType(requestTypeId: number): void {
    this.selectedRequestTypeIds = this.selectedRequestTypeIds.filter(id => id !== requestTypeId);
  }

  getRequestTypeName(requestTypeId: number): string {
    return this.requestTypes.find(item => item.requestTypeId === requestTypeId)?.requestTypeName
      || `Request type ${requestTypeId}`;
  }

  private getAssignedRequestTypeIds(workItemId: number): Set<number> {
    const assignedIds = new Set<number>();
    this.assignmentRecords
      .filter(assignment => this.getAssignmentWorkItemId(assignment) === workItemId)
      .forEach(assignment => this.getAssignmentRequestTypeIds(assignment).forEach(id => assignedIds.add(id)));
    return assignedIds;
  }

  private getAssignmentWorkItemId(assignment: any): number {
    return Number(assignment?.workItemId ?? assignment?.workItem?.itemId);
  }

  private getAssignmentRequestTypeIds(assignment: any): number[] {
    const values = assignment?.requestTypes
      ?? assignment?.requestTypeList
      ?? assignment?.requestTypeNames
      ?? assignment?.requestTypeName
      ?? assignment?.requestType
      ?? assignment?.requestTypeIds
      ?? (assignment?.requestTypeId !== undefined ? [assignment.requestTypeId] : []);
    const requestTypes = Array.isArray(values) ? values : [values];

    return requestTypes.map(value => {
      if (typeof value === 'string') {
        const numericId = Number(value);
        if (Number.isFinite(numericId) && numericId) {
          return numericId;
        }
        return this.requestTypes.find(item => item.requestTypeName.toLowerCase() === value.toLowerCase())?.requestTypeId;
      }
      const requestTypeId = Number(value?.requestTypeId ?? value?.id ?? value);
      if (Number.isFinite(requestTypeId) && requestTypeId) {
        return requestTypeId;
      }
      const name = value?.requestTypeName ?? value?.name;
      return typeof name === 'string'
        ? this.requestTypes.find(item => item.requestTypeName.toLowerCase() === name.toLowerCase())?.requestTypeId
        : undefined;
    }).filter((id): id is number => id !== undefined);
  }

  private toAssignmentRow(assignment: any): RequestTypeAssignmentRow {
    const workItemId = Number(assignment?.workItemId ?? assignment?.workItem?.itemId);
    const workItem = this.workItems.find(item => item.itemId === workItemId);
    const workItemLabel = assignment?.workItemLabel
      || assignment?.workItem?.description
      || assignment?.workItemCode
      || workItem?.description
      || (Number.isFinite(workItemId) ? `Work item ${workItemId}` : 'Unknown work item');

    const requestTypeValues = assignment?.requestTypes
      ?? assignment?.requestTypeList
      ?? assignment?.requestTypeNames
      ?? assignment?.requestTypeName
      ?? assignment?.requestType?.requestTypeName
      ?? assignment?.requestTypeIds
      ?? (assignment?.requestTypeId !== undefined ? [assignment.requestTypeId] : []);
    const values = Array.isArray(requestTypeValues) ? requestTypeValues : [requestTypeValues];
    const requestTypeNames = values.map(value => {
      if (typeof value === 'string') {
        return value;
      }
      const requestTypeId = Number(value?.requestTypeId ?? value?.id ?? value);
      return value?.requestTypeName
        || this.requestTypes.find(item => item.requestTypeId === requestTypeId)?.requestTypeName
        || (Number.isFinite(requestTypeId) ? `Request type ${requestTypeId}` : '');
    }).filter(Boolean);

    return {
      assignmentId: this.getAssignmentId(assignment),
      workItemId,
      workItem: workItemLabel,
      requestTypes: requestTypeNames.join(', ') || 'No request types'
    };
  }

  private getAssignmentId(assignment: any): number | null {
    const idCandidates = [
      assignment?.mappingId
    ];

    for (const candidate of idCandidates) {
      const assignmentId = Number(candidate);
      if (Number.isFinite(assignmentId) && assignmentId > 0) {
        return assignmentId;
      }
    }

    return null;
  }

  deleteAssignment(assignment: RequestTypeAssignmentRow): void {
    if (assignment.assignmentId === null) {
      this.assignmentError = 'Unable to delete assignment: assignment ID is unavailable.';
      return;
    }
    const assignmentId = assignment.assignmentId;

    const dialogData: ConfirmationDialogData = {
      title: 'Delete Assignment',
      message: `Are you sure you want to delete the request type assignment for "${assignment.workItem}"?`,
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

        const deletedBy = Number(localStorage.getItem('userId') || 0);
        const isDeletedByAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
        const request: RequestTypeAssignmentDeleteRequest = {
          companyId: Number(this.userOrgId),
          mappingid: assignmentId,
          deletedBy,
          isDeletedByAdmin
        };
        this.deletingAssignmentId = assignmentId;
        this.assignmentError = '';
        this.submitSuccess = '';

        this.requestTypeService.deleteRequestTypeAssignment(request).subscribe({
          next: () => {
            this.deletingAssignmentId = null;
            this.submitSuccess = 'Request type assignment deleted successfully.';
            this.loadAssignments();
          },
          error: err => {
            this.deletingAssignmentId = null;
            this.assignmentError = err.error?.description || err.error?.message
              || 'Failed to delete request type assignment.';
          }
        });
      });
  }

  onAssign(): void {
    this.assignmentError = '';
    this.submitSuccess = '';
    if (this.assignmentForm.get('workItemId')?.invalid || this.selectedRequestTypeIds.length === 0) {
      this.assignmentForm.markAllAsTouched();
      this.assignmentError = 'Select a work item and at least one request type.';
      return;
    }

    const userId = Number(localStorage.getItem('userId') || 0);
    const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
    const raw = this.assignmentForm.getRawValue();
    const workItemId = Number(raw.workItemId);
    const assignedIds = this.getAssignedRequestTypeIds(workItemId);
    const requestTypeIds = [...new Set(this.selectedRequestTypeIds)]
      .filter(requestTypeId => !assignedIds.has(requestTypeId));
    if (requestTypeIds.length === 0) {
      this.assignmentError = 'All selected request types are already assigned to this work item.';
      return;
    }
    const request: RequestTypeAssignmentRequest = {
      workItemId,
      requestTypeIds,
      companyId: Number(this.userOrgId),
      createdBy: userId,
      updatedBy: userId,
      isCreatedByAdmin: isAdmin,
      isUpdatedByAdmin: isAdmin
    };

    this.isAssigning = true;
    this.requestTypeService.createRequestTypeAssignment(request).subscribe({
      next: () => {
        this.isAssigning = false;
        this.submitSuccess = 'Request types assigned successfully.';
        this.resetAssignmentForm();
        this.loadAssignments();
      },
      error: (err) => {
        this.isAssigning = false;
        this.assignmentError = err.error?.description || err.error?.message || 'Failed to assign request types.';
      }
    });
  }

  resetAssignmentForm(): void {
    this.assignmentForm.reset({ workItemId: '', requestTypeId: '' });
    this.selectedRequestTypeIds = [];
  }

  addRequestType(): void {
    this.formError = {};
    this.submitError = '';
    const requestType = this.requestTypeForm.value.requestType?.trim();
    if (!requestType) {
      this.formError.requestType = 'Request type is required';
      return;
    }
    if (this.requestTypeList.some(item => item.name.toLowerCase() === requestType.toLowerCase())) {
      this.formError.requestType = 'Request type already added';
      return;
    }
    this.requestTypeList.push({ name: requestType });
    this.requestTypeForm.patchValue({ requestType: '' });
  }

  removeRequestType(requestType: { name: string }): void {
    this.requestTypeList = this.requestTypeList.filter(item => item !== requestType);
  }

  onSave(): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    if (this.requestTypeList.length === 0) {
      this.formError.requestType = 'At least one request type is required';
      return;
    }

    const userId = Number(localStorage.getItem('userId') || 0);
    const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
    const requests: RequestTypeRequest[] = this.requestTypeList.map(item => ({
      requestTypeName: item.name,
      companyId: Number(localStorage.getItem('userOrgId') || 0),
      createdBy: userId,
      updatedBy: userId,
      isCreatedByAdmin: isAdmin,
      isUpdatedByAdmin: isAdmin
    }));

    this.isSubmitting = true;
    this.requestTypeService.createRequestTypes(requests).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = 'Request types created successfully.';
        this.requestTypeList = [];
        this.requestTypeForm.reset();
        setTimeout(() => {
          this.activeTab = 'list';
          this.loadRequestTypeList();
          this.submitSuccess = '';
        }, 1500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err.error?.description || err.error?.message || 'Failed to create request types.';
      }
    });
  }

  onDeleteRequestType(requestType: RequestType): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Request Type',
      message: `Are you sure you want to delete request type "${requestType.requestTypeName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      type: 'delete'
    };
    this.dialog.open(ConfirmationDialogComponent, { width: '420px', data: dialogData }).afterClosed().subscribe(result => {
      if (!result) {
        return;
      }
      const deletedBy = Number(localStorage.getItem('userId') || 0);
      const isDeletedByAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();

      this.requestTypeService.deleteRequestType(requestType.requestTypeId, deletedBy, isDeletedByAdmin).subscribe({
        next: () => {
          this.loadRequestTypeList();
          this.submitSuccess = 'Request type deleted successfully.';
        },
        error: (err) => {
          this.submitError = err.error?.description || err.error?.message || 'Failed to delete request type.';
        }
      });
    });
  }

  resetForm(): void {
    this.requestTypeList = [];
    this.requestTypeForm.reset();
    this.formError = {};
    this.submitError = '';
  }

  filterBySearch(): void {
    const term = this.searchValue.trim().toLowerCase();
    this.filteredRequestTypes = term
      ? this.requestTypes.filter(item => item.requestTypeName.toLowerCase().includes(term))
      : this.requestTypes;
    this.totalRecords = this.filteredRequestTypes.length;
    this.currentPage = 0;
  }

  getPaginatedRequestTypes(): RequestType[] {
    return this.filteredRequestTypes.slice(this.currentPage * this.pageSize, (this.currentPage + 1) * this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  backToSettings(): void {
    this.router.navigate(['/settings']);
  }
}
