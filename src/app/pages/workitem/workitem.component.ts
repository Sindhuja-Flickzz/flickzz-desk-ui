import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { USER_ROLES } from '../../data/app_constants';
import { WorkItem } from '../../models/variant.model';
import { VariantService } from '../../service/variant.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-workitemcomponent',
  templateUrl: './workitem.component.html',
  styleUrls: ['./workitem.component.scss']
})
export class WorkitemComponent implements OnInit {
  workItemForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  workItems: WorkItem[] = [];
  filteredWorkItems: WorkItem[] = [];
  searchValue = '';
  loading = false;
  listError = '';
  submitError = '';
  submitSuccess = '';
  isSubmitting = false;
  deletingItemId: number | null = null;
  userOrgId = '';
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  constructor(
    private fb: FormBuilder,
    private variantService: VariantService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.workItemForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/\S/)]],
      description: ['', [Validators.required, Validators.pattern(/\S/)]],
      isParent: [true],
      isSR: [true],
      parentWorkItemId: [null]
    });
  }

  ngOnInit(): void {
    this.userOrgId = localStorage.getItem('userOrgId') || '';
    this.loadWorkItems();
  }

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.submitError = '';
    this.submitSuccess = '';
    if (tab === 'list') {
      this.loadWorkItems();
    }
  }

  onSave(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (!this.userOrgId) {
      this.submitError = 'Organization information is unavailable.';
      return;
    }

    this.workItemForm.markAllAsTouched();
    const code = String(this.workItemForm.get('code')?.value || '').trim();
    const description = String(this.workItemForm.get('description')?.value || '').trim();
    const isParent = this.workItemForm.get('isParent')?.value;
    const isSR = this.workItemForm.get('isSR')?.value;
    const selectedParentId = this.workItemForm.get('parentWorkItemId')?.value;
    if (!code || !description) {
      this.submitError = 'Work item code and description are required.';
      return;
    }
    if (typeof isParent !== 'boolean') {
      this.submitError = 'Select Parent or Child.';
      return;
    }
    if (typeof isSR !== 'boolean') {
      this.submitError = 'Select SR or User story.';
      return;
    }
    const parentWorkItemId = !isParent ? Number(selectedParentId) : null;
    if (!isParent && (selectedParentId === null || selectedParentId === ''
      || !Number.isInteger(parentWorkItemId)
      || !this.workItems.some(item => item.itemId === parentWorkItemId))) {
      this.workItemForm.get('parentWorkItemId')?.markAsTouched();
      this.submitError = 'Select a valid parent work item.';
      return;
    }
    if (this.workItemForm.invalid) {
      this.submitError = 'Correct the highlighted fields before saving.';
      return;
    }
    if (this.workItems.some(item => item.code.trim().toLowerCase() === code.toLowerCase())) {
      this.submitError = 'A work item with this code already exists.';
      return;
    }

    this.isSubmitting = true;
    const request = {
      code,
      description,
      companyId: Number(this.userOrgId),
      createdBy: Number(localStorage.getItem('userId') || 0),
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isParent,
      isSR,
      parentWorkItemId
    };
    this.variantService.createWorkItem(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.resetForm();
        this.submitSuccess = 'Work item created successfully.';
        this.activeTab = 'list';
        this.loadWorkItems();
      },
      error: err => {
        this.isSubmitting = false;
        console.error('Create work item error', err);
        this.submitError = err.error?.description || err.error?.message || 'Failed to create work item.';
      }
    });
  }

  onHierarchyTypeChange(): void {
    const parentControl = this.workItemForm.get('parentWorkItemId');
    if (this.workItemForm.get('isParent')?.value === false) {
      parentControl?.setValidators(Validators.required);
    } else {
      parentControl?.clearValidators();
      parentControl?.setValue(null);
    }
    parentControl?.updateValueAndValidity();
  }

  onHierarchySwitchChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.workItemForm.get('isParent')?.setValue(!target.checked);
      this.onHierarchyTypeChange();
    }
  }

  onWorkItemTypeSwitchChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.workItemForm.get('isSR')?.setValue(!target.checked);
    }
  }

  resetForm(): void {
    this.workItemForm.reset({
      code: '',
      description: '',
      isParent: true,
      isSR: true,
      parentWorkItemId: null
    });
    this.onHierarchyTypeChange();
    this.submitError = '';
    this.submitSuccess = '';
  }

  loadWorkItems(): void {
    if (!this.userOrgId) {
      this.workItems = [];
      this.filterBySearch();
      this.listError = 'Organization information is unavailable.';
      return;
    }

    this.loading = true;
    this.listError = '';
    this.variantService.getWorkItemList(this.userOrgId).subscribe({
      next: response => {
        const data = response?.attributes ?? response;
        if (!Array.isArray(data)) {
          this.workItems = [];
          this.filterBySearch();
          this.listError = 'Failed to load work items.';
          this.loading = false;
          return;
        }
        this.workItems = data
          .filter((item: any): item is WorkItem => item && typeof item.code === 'string')
          .map((item: WorkItem) => ({
            ...item,
            label: typeof item.label === 'string' ? item.label : (typeof item.description === 'string' ? item.description : ''),
            description: typeof item.description === 'string' ? item.description : '',
            isParent: item.isParent === true,
            isServiceRequest: item.isServiceRequest === true,
            parentItem: item.parentItem && typeof item.parentItem.code === 'string'
              ? { code: item.parentItem.code }
              : null
          }));
        this.filterBySearch();
        this.loading = false;
      },
      error: err => {
        this.workItems = [];
        this.filterBySearch();
        this.loading = false;
        console.error('Load work items error', err);
        this.listError = err.error?.description || err.error?.message || 'Failed to load work items.';
      }
    });
  }

  onDeleteWorkItem(workItem: WorkItem): void {
    if (!workItem.itemId || !this.userOrgId) {
      this.listError = !this.userOrgId
        ? 'Organization information is unavailable.'
        : 'Unable to delete work item: item ID is unavailable.';
      return;
    }

    const dialogData: ConfirmationDialogData = {
      title: 'Delete Work Item',
      message: `Are you sure you want to delete work item "${workItem.code}"?`,
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
        const request = {
          itemId: workItem.itemId,
          orgId: Number(this.userOrgId),
          deletedBy: Number(localStorage.getItem('userId') || 0),
          isDeletedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
        };
        this.deletingItemId = workItem.itemId;
        this.listError = '';
        this.submitSuccess = '';
        this.variantService.deleteWorkItem(request).subscribe({
          next: () => {
            this.deletingItemId = null;
            this.submitSuccess = 'Work item deleted successfully.';
            this.loadWorkItems();
          },
          error: err => {
            this.deletingItemId = null;
            console.error('Delete work item error', err);
            this.listError = err.error?.description || err.error?.message || 'Failed to delete work item.';
          }
        });
      });
  }

  filterBySearch(): void {
    const term = this.searchValue.trim().toLowerCase();
    this.filteredWorkItems = this.workItems.filter(item =>
      !term || item.code.toLowerCase().includes(term)
      || (item.description || '').toLowerCase().includes(term)
      || (item.label || '').toLowerCase().includes(term)
      || (item.isParent ? 'parent' : 'child').includes(term)
      || (item.isServiceRequest ? 'service request yes' : 'no').includes(term)
      || (item.parentItem?.code || '').toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredWorkItems.length;
    this.currentPage = 0;
  }

  getPaginatedWorkItems(): WorkItem[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.filteredWorkItems.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  backToSettings(): void {
    this.router.navigate(['/settings']);
  }
}
