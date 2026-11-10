import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { EffortType, EffortTypeRequest, EffortTypeRowErrors } from '../../models/effort-type.model';
import {
  EffortTypeAssignmentDeleteRequest,
  EffortTypeAssignmentRequest,
  EffortTypeService
} from '../../service/effort-type.service';
import { USER_ROLES } from '../../data/app_constants';
import { WorkItem } from '../../models/variant.model';
import { VariantService } from '../../service/variant.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

interface EffortTypeAssignmentRow {
  assignmentId: number | null;
  workItemId: number;
  workItem: string;
  effortTypes: string;
}

@Component({
  selector: 'app-effort-type',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, MatPaginatorModule],
  templateUrl: './effort-type.component.html',
  styleUrls: ['./effort-type.component.scss']
})
export class EffortTypeComponent implements OnInit {
  effortTypeForm: FormGroup;
  activeTab: 'create' | 'list' | 'assign' = 'create';
  effortTypes: EffortType[] = [];
  filteredEffortTypes: EffortType[] = [];
  workItems: WorkItem[] = [];
  assignments: EffortTypeAssignmentRow[] = [];
  filteredAssignments: EffortTypeAssignmentRow[] = [];
  private assignmentRecords: any[] = [];
  selectedEffortTypeIds: number[] = [];
  searchValue = '';
  assignmentSearchValue = '';
  assignmentWorkItemFilter: number | '' = '';
  loading = false;
  assignmentLoading = false;
  workItemsLoading = false;
  workItemsError = '';
  assignmentError = '';
  deletingAssignmentId: number | null = null;
  isSubmitting = false;
  isAssigning = false;
  submitError = '';
  submitSuccess = '';
  rowErrors: EffortTypeRowErrors[] = [];
  effortTypesLoaded = false;
  assignmentForm: FormGroup;
  userOrgId = Number(localStorage.getItem('userOrgId') || 0);
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;
  assignmentPageSize = 10;
  assignmentTotalRecords = 0;
  assignmentCurrentPage = 0;
  pendingDelete: EffortType | null = null;
  updatingEffortTypeId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private effortTypeService: EffortTypeService,
    private variantService: VariantService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.effortTypeForm = this.fb.group({
      rows: this.fb.array([this.createEffortTypeRow()])
    });
    this.assignmentForm = this.fb.group({
      workItemId: ['', Validators.required],
      effortTypeId: ['']
    });
    this.rowErrors = [{}];
  }

  ngOnInit(): void {
    this.loadEffortTypes();
    this.loadWorkItems();
  }

  get effortTypeRows(): FormArray {
    return this.effortTypeForm.get('rows') as FormArray;
  }

  private createEffortTypeRow(): FormGroup {
    return this.fb.group({
      typeName: ['', [Validators.required, Validators.maxLength(100)]],
      sequence: [null, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]]
    });
  }

  addEffortTypeRow(): void {
    this.effortTypeRows.push(this.createEffortTypeRow());
    this.rowErrors.push({});
  }

  removeEffortTypeRow(index: number): void {
    if (this.effortTypeRows.length <= 1) {
      return;
    }
    this.effortTypeRows.removeAt(index);
    this.rowErrors.splice(index, 1);
  }

  backToSettings(): void {
    this.router.navigate(['/settings']);
  }

  selectTab(tab: 'create' | 'list' | 'assign'): void {
    this.activeTab = tab;
    this.rowErrors = [];
    this.submitError = '';
    this.submitSuccess = '';
    if (tab === 'create') {
      this.resetForm();
    } else if (tab === 'list') {
      this.loadEffortTypes();
    } else {
      this.resetAssignmentForm();
      this.filterAssignments();
      this.loadEffortTypes();
      this.loadAssignments();
    }
  }

  private loadWorkItems(): void {
    const orgId = String(this.userOrgId);
    if (!orgId || this.userOrgId <= 0) {
      this.workItemsError = 'Organization information is unavailable.';
      return;
    }

    this.workItemsLoading = true;
    this.workItemsError = '';
    this.variantService.getWorkItemList(orgId).subscribe({
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

  private loadAssignments(): void {
    this.assignmentLoading = true;
    this.assignmentError = '';
    this.effortTypeService.getEffortTypeAssignments(this.userOrgId).subscribe({
      next: response => {
        const data = Array.isArray(response) ? response : response?.attributes;
        if (!Array.isArray(data)) {
          this.assignmentRecords = [];
          this.refreshAssignmentRows();
          this.assignmentError = 'Failed to load effort type assignments.';
          this.assignmentLoading = false;
          return;
        }
        this.assignmentRecords = data;
        this.refreshAssignmentRows();
        this.assignmentLoading = false;
      },
      error: err => {
        this.assignmentRecords = [];
        this.refreshAssignmentRows();
        this.assignmentLoading = false;
        this.assignmentError = err.error?.description || err.error?.message
          || 'Failed to load effort type assignments.';
      }
    });
  }

  private refreshAssignmentRows(): void {
    this.assignments = this.assignmentRecords.map(assignment => this.toAssignmentRow(assignment));
    this.filterAssignments();
  }

  filterAssignments(): void {
    const term = this.assignmentSearchValue.trim().toLowerCase();
    this.filteredAssignments = this.assignments.filter(assignment => {
      const matchesSearch = !term
        || assignment.workItem.toLowerCase().includes(term)
        || assignment.effortTypes.toLowerCase().includes(term);
      const matchesWorkItem = this.assignmentWorkItemFilter === ''
        || assignment.workItemId === Number(this.assignmentWorkItemFilter);
      return matchesSearch && matchesWorkItem;
    });
    this.assignmentTotalRecords = this.filteredAssignments.length;
    this.assignmentCurrentPage = 0;
  }

  getPaginatedAssignments(): EffortTypeAssignmentRow[] {
    const startIndex = this.assignmentCurrentPage * this.assignmentPageSize;
    return this.filteredAssignments.slice(startIndex, startIndex + this.assignmentPageSize);
  }

  onAssignmentPageChange(event: PageEvent): void {
    this.assignmentCurrentPage = event.pageIndex;
    this.assignmentPageSize = event.pageSize;
  }

  getAvailableEffortTypes(): EffortType[] {
    const workItemId = Number(this.assignmentForm.get('workItemId')?.value);
    if (!workItemId) {
      return [];
    }
    const assignedIds = this.getAssignedEffortTypeIds(workItemId);
    return this.effortTypes.filter(effortType => {
      const id = this.getEffortTypeId(effortType);
      return id !== null && !assignedIds.has(id) && !this.selectedEffortTypeIds.includes(id);
    });
  }

  onAssignmentWorkItemChange(): void {
    this.selectedEffortTypeIds = [];
    this.assignmentForm.patchValue({ effortTypeId: '' }, { emitEvent: false });
  }

  addSelectedEffortType(): void {
    const effortTypeId = Number(this.assignmentForm.get('effortTypeId')?.value);
    const workItemId = Number(this.assignmentForm.get('workItemId')?.value);
    if (!Number.isFinite(effortTypeId) || !effortTypeId || !workItemId) {
      return;
    }
    if (!this.selectedEffortTypeIds.includes(effortTypeId)
      && !this.getAssignedEffortTypeIds(workItemId).has(effortTypeId)) {
      this.selectedEffortTypeIds = [...this.selectedEffortTypeIds, effortTypeId];
    }
    this.assignmentForm.patchValue({ effortTypeId: '' }, { emitEvent: false });
  }

  removeSelectedEffortType(effortTypeId: number): void {
    this.selectedEffortTypeIds = this.selectedEffortTypeIds.filter(id => id !== effortTypeId);
  }

  getEffortTypeName(effortTypeId: number): string {
    return this.effortTypes.find(item => this.getEffortTypeId(item) === effortTypeId)?.typeName
      || `Effort type ${effortTypeId}`;
  }

  private getEffortTypeId(effortType: EffortType): number | null {
    const id = Number(effortType.effortTypeId ?? effortType.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private getAssignedEffortTypeIds(workItemId: number): Set<number> {
    const assignedIds = new Set<number>();
    this.assignmentRecords
      .filter(assignment => this.getAssignmentWorkItemId(assignment) === workItemId)
      .forEach(assignment => this.getAssignmentEffortTypeIds(assignment).forEach(id => assignedIds.add(id)));
    return assignedIds;
  }

  private getAssignmentWorkItemId(assignment: any): number {
    return Number(assignment?.workItemId ?? assignment?.workItem?.itemId);
  }

  private getAssignmentEffortTypeIds(assignment: any): number[] {
    const values = assignment?.effortTypes
      ?? assignment?.effortTypeList
      ?? assignment?.effortTypeNames
      ?? assignment?.effortTypeName
      ?? assignment?.effortTypeIds
      ?? (assignment?.effortTypeId !== undefined ? [assignment.effortTypeId] : []);
    const effortTypes = Array.isArray(values) ? values : [values];
    return effortTypes.map(value => {
      if (typeof value === 'string') {
        const numericId = Number(value);
        if (Number.isFinite(numericId) && numericId > 0) {
          return numericId;
        }
        const matchingEffortType = this.effortTypes.find(
          item => item.typeName.toLowerCase() === value.toLowerCase()
        );
        return matchingEffortType ? this.getEffortTypeId(matchingEffortType) : null;
      }
      const id = Number(value?.effortTypeId ?? value?.id ?? value);
      if (Number.isFinite(id) && id > 0) {
        return id;
      }
      const name = value?.typeName ?? value?.effortTypeName ?? value?.name;
      const matchingEffortType = typeof name === 'string'
        ? this.effortTypes.find(item => item.typeName.toLowerCase() === name.toLowerCase())
        : undefined;
      return matchingEffortType ? this.getEffortTypeId(matchingEffortType) : null;
    }).filter((id): id is number => id !== null);
  }

  private toAssignmentRow(assignment: any): EffortTypeAssignmentRow {
    const workItemId = this.getAssignmentWorkItemId(assignment);
    const workItem = this.workItems.find(item => item.itemId === workItemId);
    const workItemLabel = assignment?.workItemLabel
      || assignment?.workItem?.description
      || assignment?.workItemCode
      || workItem?.description
      || (Number.isFinite(workItemId) ? `Work item ${workItemId}` : 'Unknown work item');
    const values = assignment?.effortTypes
      ?? assignment?.effortTypeList
      ?? assignment?.effortTypeNames
      ?? assignment?.effortTypeName
      ?? assignment?.effortTypeIds
      ?? (assignment?.effortTypeId !== undefined ? [assignment.effortTypeId] : []);
    const effortTypes = (Array.isArray(values) ? values : [values]).map(value => {
      if (typeof value === 'string') {
        const numericId = Number(value);
        return Number.isFinite(numericId) && numericId > 0
          ? this.getEffortTypeName(numericId)
          : value;
      }
      const id = Number(value?.effortTypeId ?? value?.id ?? value);
      return value?.typeName
        || value?.effortTypeName
        || (Number.isFinite(id) && id > 0 ? this.getEffortTypeName(id) : '');
    }).filter(Boolean);

    return {
      assignmentId: this.getAssignmentId(assignment),
      workItemId,
      workItem: workItemLabel,
      effortTypes: [...new Set(effortTypes)].join(', ') || 'No effort types'
    };
  }

  private getAssignmentId(assignment: any): number | null {
    const id = Number(assignment?.mappingId ?? assignment?.assignmentId ?? assignment?.effortTypeMappingId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  onAssignEffortTypes(): void {
    this.assignmentError = '';
    this.submitSuccess = '';
    if (this.assignmentForm.get('workItemId')?.invalid || this.selectedEffortTypeIds.length === 0) {
      this.assignmentForm.markAllAsTouched();
      this.assignmentError = 'Select a work item and at least one effort type.';
      return;
    }

    const workItemId = Number(this.assignmentForm.get('workItemId')?.value);
    const assignedIds = this.getAssignedEffortTypeIds(workItemId);
    const effortTypeIds = [...new Set(this.selectedEffortTypeIds)]
      .filter(id => !assignedIds.has(id));
    if (effortTypeIds.length === 0) {
      this.assignmentError = 'All selected effort types are already assigned to this work item.';
      return;
    }

    const userId = Number(localStorage.getItem('userId') || 0);
    const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
    const request: EffortTypeAssignmentRequest = {
      workItemId,
      effortTypeIds,
      companyId: this.userOrgId,
      createdBy: userId,
      updatedBy: userId,
      isCreatedByAdmin: isAdmin,
      isUpdatedByAdmin: isAdmin
    };
    this.isAssigning = true;
    this.effortTypeService.createEffortTypeAssignment(request).subscribe({
      next: () => {
        this.isAssigning = false;
        this.submitSuccess = 'Effort types assigned successfully.';
        this.assignmentWorkItemFilter = workItemId;
        this.resetAssignmentForm();
        this.loadAssignments();
      },
      error: err => {
        this.isAssigning = false;
        this.assignmentError = err.error?.description || err.error?.message || 'Failed to assign effort types.';
      }
    });
  }

  resetAssignmentForm(): void {
    this.assignmentForm.reset({ workItemId: '', effortTypeId: '' });
    this.selectedEffortTypeIds = [];
  }

  deleteAssignment(assignment: EffortTypeAssignmentRow): void {
    if (assignment.assignmentId === null) {
      this.assignmentError = 'Unable to delete assignment: assignment ID is unavailable.';
      return;
    }
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Assignment',
      message: `Are you sure you want to delete the effort type assignment for "${assignment.workItem}"?`,
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
        const request: EffortTypeAssignmentDeleteRequest = {
          companyId: this.userOrgId,
          mappingid: assignment.assignmentId as number,
          deletedBy,
          isDeletedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
        };
        this.deletingAssignmentId = assignment.assignmentId;
        this.assignmentError = '';
        this.submitSuccess = '';
        this.effortTypeService.deleteEffortTypeAssignment(request).subscribe({
          next: () => {
            this.deletingAssignmentId = null;
            this.submitSuccess = 'Effort type assignment deleted successfully.';
            this.loadAssignments();
          },
          error: err => {
            this.deletingAssignmentId = null;
            this.assignmentError = err.error?.description || err.error?.message
              || 'Failed to delete effort type assignment.';
          }
        });
      });
  }

  resetForm(): void {
    this.effortTypeForm.setControl('rows', this.fb.array([this.createEffortTypeRow()]));
    this.rowErrors = [{}];
    this.submitError = '';
    this.submitSuccess = '';
  }

  onSave(): void {
    this.rowErrors = this.effortTypeRows.controls.map(() => ({}));
    this.submitError = '';
    this.submitSuccess = '';
    this.effortTypeForm.markAllAsTouched();

    if (!this.effortTypesLoaded) {
      this.submitError = 'Effort types are not available for duplicate validation. Please retry loading the list.';
      return;
    }

    this.effortTypeRows.controls.forEach((row, index) => {
      const nameControl = row.get('typeName');
      const sequenceControl = row.get('sequence');
      const name = String(nameControl?.value || '').trim();

      if (!name || nameControl?.hasError('required')) {
        this.rowErrors[index].typeName = 'Type name is required';
      } else if (nameControl?.hasError('maxlength')) {
        this.rowErrors[index].typeName = 'Type name cannot exceed 100 characters';
      }
      if (sequenceControl?.hasError('required')) {
        this.rowErrors[index].sequence = 'Sequence is required';
      } else if (sequenceControl?.hasError('min')) {
        this.rowErrors[index].sequence = 'Sequence cannot be negative';
      } else if (sequenceControl?.hasError('pattern')) {
        this.rowErrors[index].sequence = 'Sequence must be a whole number';
      }
    });
    this.validateEffortTypeUniqueness();
    if (this.rowErrors.some(errors => errors.typeName || errors.sequence)) {
      return;
    }

    const currentUser = Number(localStorage.getItem('userId') || 0);
    const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
    const payload: EffortTypeRequest[] = this.effortTypeRows.controls.map(row => ({
        typeName: String(row.value.typeName).trim(),
        sequence: Number(row.value.sequence),
        orgId: this.userOrgId,
        createdBy: currentUser,
        updatedBy: currentUser,
        isCreatedByAdmin: isAdmin,
        isUpdatedByAdmin: isAdmin
      }));

    this.isSubmitting = true;
    this.effortTypeService.createEffortType(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.resetForm();
        this.submitSuccess = 'Effort types created successfully.';
        this.loadEffortTypes();
        setTimeout(() => {
          this.activeTab = 'list';
          this.submitSuccess = '';
        }, 1500);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Create effort type error', err);
        this.submitError = err.error?.description || err.error?.message || 'Failed to create effort type.';
      }
    });
  }

  validateEffortTypeUniqueness(): void {
    this.rowErrors = this.effortTypeRows.controls.map((_, index) => {
      const errors = this.rowErrors[index] || {};
      if (errors.typeName === 'Type name must be unique') {
        delete errors.typeName;
      }
      if (errors.sequence === 'Sequence must be unique') {
        delete errors.sequence;
      }
      return errors;
    });

    const names = new Map<string, number[]>();
    const sequences = new Map<number, number[]>();
    this.effortTypeRows.controls.forEach((row, index) => {
      const name = String(row.get('typeName')?.value || '').trim().toLowerCase();
      if (name && !row.get('typeName')?.hasError('maxlength')) {
        names.set(name, [...(names.get(name) || []), index]);
      }

      const sequenceControl = row.get('sequence');
      const sequence = Number(sequenceControl?.value);
      if (sequenceControl?.value !== null && sequenceControl?.value !== '' &&
          sequenceControl?.valid && Number.isFinite(sequence)) {
        sequences.set(sequence, [...(sequences.get(sequence) || []), index]);
      }
    });

    names.forEach((indexes, name) => {
      const alreadyExists = this.effortTypes.some(item => (item.typeName || '').trim().toLowerCase() === name);
      if (alreadyExists || indexes.length > 1) {
        indexes.forEach(index => this.rowErrors[index].typeName = 'Type name must be unique');
      }
    });
    sequences.forEach((indexes, sequence) => {
      const alreadyExists = this.effortTypes.some(item => Number(item.sequence) === sequence);
      if (alreadyExists || indexes.length > 1) {
        indexes.forEach(index => this.rowErrors[index].sequence = 'Sequence must be unique');
      }
    });
  }

  loadEffortTypes(): void {
    this.loading = true;
    this.effortTypeService.getEffortTypes(this.userOrgId).subscribe({
      next: (response) => {
        const result = response?.attributes ?? response;
        const uniqueEffortTypes = new Map<string, EffortType>();
        (Array.isArray(result) ? result : []).forEach((effortType: EffortType) => {
          const normalizedName = (effortType.typeName || '').trim().toLowerCase();
          const normalizedSequence = Number(effortType.sequence);
          uniqueEffortTypes.set(`${normalizedName}:${normalizedSequence}`, effortType);
        });
        this.effortTypes = Array.from(uniqueEffortTypes.values());
        this.effortTypesLoaded = true;
        this.filterBySearch();
        this.refreshAssignmentRows();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.effortTypes = [];
        this.filteredEffortTypes = [];
        this.totalRecords = 0;
        this.effortTypesLoaded = false;
        console.error('Failed to load effort types:', err);
        this.submitError = err.error?.description || err.error?.message || 'Failed to load effort types.';
      }
    });
  }

  filterBySearch(): void {
    const term = this.searchValue.trim().toLowerCase();
    this.filteredEffortTypes = this.effortTypes.filter(effortType =>
      effortType.typeName?.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredEffortTypes.length;
    this.currentPage = 0;
  }

  getPaginatedEffortTypes(): EffortType[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.filteredEffortTypes.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  toggleEffortTypeStatus(effortType: EffortType): void {
    const effortTypeId = effortType.id ?? effortType.effortTypeId;
    if (effortTypeId == null) {
      this.submitError = 'Unable to change effort type status: missing identifier.';
      return;
    }

    if (this.updatingEffortTypeId !== null) {
      return;
    }

    this.submitError = '';
    this.submitSuccess = '';
    this.updatingEffortTypeId = effortTypeId;

    this.effortTypeService.changeEffortTypeStatus({
      effortTypeId,
      orgId: this.userOrgId,
      isActive: effortType.isActive !== true,
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isUpdaterAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    }).subscribe({
      next: () => {
        effortType.isActive = effortType.isActive !== true;
        this.updatingEffortTypeId = null;
        this.submitSuccess = `Effort type ${effortType.isActive ? 'activated' : 'deactivated'} successfully.`;
      },
      error: (err) => {
        this.updatingEffortTypeId = null;
        console.error('Change effort type status error', err);
        this.submitError = err.error?.description || err.error?.message || 'Failed to change effort type status.';
      }
    });
  }

  onDeleteEffortType(effortType: EffortType): void {
    const id = effortType.id ?? effortType.effortTypeId;
    if (id == null) {
      this.submitError = 'Unable to delete effort type: missing identifier.';
      return;
    }
    this.pendingDelete = effortType;
  }

  cancelDelete(): void {
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    if (!this.pendingDelete) {
      return;
    }
    const id = this.pendingDelete.id ?? this.pendingDelete.effortTypeId;
    if (id == null) {
      this.submitError = 'Unable to delete effort type: missing identifier.';
      this.pendingDelete = null;
      return;
    }
    this.effortTypeService.deleteEffortType(id, this.userOrgId).subscribe({
      next: () => {
        this.pendingDelete = null;
        this.submitError = '';
        this.submitSuccess = 'Effort type deleted successfully.';
        this.loadEffortTypes();
        setTimeout(() => this.submitSuccess = '', 1500);
      },
      error: (err) => {
        this.pendingDelete = null;
        console.error('Delete effort type error', err);
        this.submitError = err.error?.description || err.error?.message || 'Failed to delete effort type.';
      }
    });
  }
}
