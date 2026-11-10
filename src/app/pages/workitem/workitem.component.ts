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
      description: ['', [Validators.required, Validators.pattern(/\S/)]]
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
    if (!code || !description) {
      this.submitError = 'Work item code and description are required.';
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
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };
    this.variantService.createWorkItem(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = 'Work item created successfully.';
        this.workItemForm.reset();
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
            label: typeof item.description === 'string' ? item.description : '',
            description: typeof item.description === 'string' ? item.description : ''
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
