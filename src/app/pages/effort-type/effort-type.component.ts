import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EffortType, EffortTypeRequest, EffortTypeRowErrors } from '../../models/effort-type.model';
import { EffortTypeService } from '../../service/effort-type.service';
import { USER_ROLES } from '../../data/app_constants';

@Component({
  selector: 'app-effort-type',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, MatPaginatorModule],
  templateUrl: './effort-type.component.html',
  styleUrls: ['./effort-type.component.scss']
})
export class EffortTypeComponent implements OnInit {
  effortTypeForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  effortTypes: EffortType[] = [];
  filteredEffortTypes: EffortType[] = [];
  searchValue = '';
  loading = false;
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';
  rowErrors: EffortTypeRowErrors[] = [];
  effortTypesLoaded = false;
  userOrgId = Number(localStorage.getItem('userOrgId') || 0);
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;
  pendingDelete: EffortType | null = null;
  updatingEffortTypeId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private effortTypeService: EffortTypeService,
    private router: Router
  ) {
    this.effortTypeForm = this.fb.group({
      rows: this.fb.array([this.createEffortTypeRow()])
    });
    this.rowErrors = [{}];
  }

  ngOnInit(): void {
    this.loadEffortTypes();
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

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.rowErrors = [];
    this.submitError = '';
    this.submitSuccess = '';
    if (tab === 'create') {
      this.resetForm();
    } else {
      this.loadEffortTypes();
    }
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
