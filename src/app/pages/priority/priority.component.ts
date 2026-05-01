import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { PriorityService } from '../../service/priority.service';
import { CompanyMaster, PriorityMaster, PriorityRequest } from '../../models/priority-master';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-priority',
  templateUrl: './priority.component.html',
  styleUrls: ['./priority.component.scss']
})
export class PriorityComponent implements OnInit {
  priorityForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Priority';
  isEditMode = false;
  originalFormValue: any = null;

  companies: CompanyMaster[] = [];
  priorities: PriorityMaster[] = [];
  filteredPriorities: PriorityMaster[] = [];
  searchValue = '';
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;

  alphanumericPattern = '^[a-zA-Z0-9 ]+$';

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  constructor(
    private fb: FormBuilder,
    private priorityService: PriorityService,
    private dialog: MatDialog
  ) {
    this.priorityForm = this.fb.group({
      priorityId: [null],
      priorityName: ['', [Validators.required, Validators.pattern(this.alphanumericPattern)]],
      orgId: [null, Validators.required],
      rank: [null, [Validators.required, Validators.min(1)]],
      colorCode: ['', Validators.required],
      responseSla: [null, [Validators.required, Validators.min(1)]],
      resolutionSla: [null, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadAllData();

    this.priorityForm.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  loadAllData(): void {
    this.loading = true;
    this.priorityService.getAllCompanies().subscribe({
      next: (response) => { this.companies = (response as any).attributes || []; },
      error: () => { this.companies = []; }
    });

    this.priorityForm.patchValue({
        orgId: ""
    });
    this.loadPriorityList();
    this.loading = false;
  }

  loadPriorityList(): void {
    this.priorityService.getAllPriorities().subscribe({
      next: (result) => {
        this.priorities = (result as any).attributes || [];
        this.searchValue = '';
        this.filterBySearch();
        this.currentPage = 0; // Reset to first page
      },
      error: (err) => {
        console.error('Failed to load priorities:', err);
      }
    });
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      this.resetForm();
      this.pageTitle = this.isEditMode ? 'Edit Priority' : 'Create Priority';
      this.priorityForm.get('orgId')?.enable();
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.pageTitle = 'Create Priority';
      this.resetForm();
      this.loadPriorityList();
      this.priorityForm.get('orgId')?.disable();
    }
  }

  onColorPickerChange(event: any) {
    const color = event.target.value;
    this.priorityForm.get('colorCode')?.setValue(color);
  }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Create Priority';
    this.priorityForm.reset();
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
    this.priorityForm.patchValue({
        orgId: ""
    });
  }

  onSave(): void {
    this.isSubmitting = true;
    this.formError = {};

    Object.keys(this.priorityForm.controls).forEach(key => {
        const field = this.priorityForm.get(key);
        if (field?.hasError('required')) {
          this.formError[key] = key === 'priorityName' ? 'Priority Name is required' : `${key} is required`;
        }
        if (key === 'priorityName' && field?.hasError('pattern')) {
          this.formError[key] = 'Priority Name can contain only letters and numbers';
        }
        if ((key === 'rank' || key === 'responseSla' || key === 'resolutionSla') && field?.hasError('min')) {
          this.formError[key] = `${key} must be at least 1`;
        }
        return;
    });

     if (Object.keys(this.formError).length === 0) {
      console.log('No errors');
    } else {
      console.log('Errors:', this.formError);
      this.isSubmitting = false;
      return;
    }

    const payload: PriorityRequest = {
      priorityId: this.priorityForm.value.priorityId,
      priorityName: this.priorityForm.value.priorityName,
      orgId: Number(this.priorityForm.value.orgId),
      rank: Number(this.priorityForm.value.rank),
      colorCode: this.priorityForm.value.colorCode,
      responseSla: Number(this.priorityForm.value.responseSla),
      resolutionSla: Number(this.priorityForm.value.resolutionSla),
      createdBy: !this.isEditMode ? localStorage.getItem('userRole') || '' : '',
      updatedBy: this.isEditMode ? localStorage.getItem('userRole') || '' : ''
    };

    if (this.isEditMode) {
      if (!this.isFormChanged()) {
        this.submitError = 'No changes to update.';
        this.isSubmitting = false;
        return;
      }

      this.priorityService.updatePriority(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Priority updated successfully.';
          setTimeout(() => {
            this.priorityForm.markAsPristine();
            this.originalFormValue = this.priorityForm.getRawValue();
            this.loadPriorityList();
            this.activeTab = 'list';
            this.isEditMode = false;
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update priority error', err);
          this.submitError = err.error?.message || 'Failed to update priority.';
        }
      });
    } else {
      this.priorityService.createPriority(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Priority created successfully.';
          setTimeout(() => {
            this.loadPriorityList();
            this.resetForm();
            this.activeTab = 'list';
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Create priority error', err);
          this.submitError = err.error?.message || 'Failed to create priority.';
        }
      });
    }
  }

  isFormChanged(): boolean {
    if (!this.originalFormValue) {
      return true;
    }
    const current = this.priorityForm.getRawValue();
    return JSON.stringify(current) !== JSON.stringify(this.originalFormValue);
  }

  onViewPriority(priority: PriorityMaster): void {
    this.priorityService.getPriorityById(priority.priorityId).subscribe({
      next: (result) => {
        const priorityData = (result as any).attributes || result;
        this.formError = {};
        this.activeTab = 'create';
        this.isEditMode = true;
        this.pageTitle = 'Edit Priority';
        this.priorityForm.patchValue({
          priorityId: priorityData.priorityId,
          priorityName: priorityData.priorityName,
          orgId: priorityData.organization?.companyId || null,
          rank: priorityData.rank,
          colorCode: priorityData.colorCode,
          responseSla: priorityData.responseSla,
          resolutionSla: priorityData.resolutionSla,
          createdBy: priorityData.createdBy,
          updatedBy: priorityData.updatedBy || priorityData.createdBy
        });
        this.originalFormValue = this.priorityForm.getRawValue();
      },
      error: (err) => {
        console.error('Failed to load priority details:', err);
        this.submitError = 'Failed to load priority details.';
      }
    });
  }

  onDeletePriority(priority: PriorityMaster): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Priority',
      message: `Are you sure you want to delete priority "${priority.priorityName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      type: 'delete'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }
      this.priorityService.deletePriority(priority.priorityId).subscribe({
        next: () => {
          this.loadPriorityList();
          this.submitSuccess = 'Priority deleted successfully.';
          setTimeout(() => {  
            this.submitSuccess = '';
          }, 1500);
        },
        error: (err) => {
          console.error('Delete priority error', err);
          this.submitError = err.error?.message || 'Failed to delete priority.';
        }
      });
    });
  }

  getPaginatedPriorities(): PriorityMaster[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredPriorities.slice(startIndex, endIndex);
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) {
      this.filteredPriorities = this.priorities;
    } else {
      this.filteredPriorities = this.priorities.filter(priority =>
        priority.priorityName.toLowerCase().includes(term) ||
        priority.organization?.companyName.toLowerCase().includes(term)
      );
    }
    this.totalRecords = this.filteredPriorities.length;
    this.currentPage = 0;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}
