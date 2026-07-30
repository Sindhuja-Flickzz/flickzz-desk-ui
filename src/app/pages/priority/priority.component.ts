import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { PriorityService } from '../../service/priority.service';
import { PriorityMaster, TicketTypeMaster } from '../../models/priority-master';
import { USER_ROLES } from 'src/app/data/app_constants';

@Component({
  selector: 'app-priority',
  templateUrl: './priority.component.html',
  styleUrls: ['./priority.component.scss']
})
export class PriorityComponent implements OnInit {
  priorityForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Priority';
  editingPriorityId: number | null = null;
  isEditMode = false;

  priorities: PriorityMaster[] = [];
  filteredPriorities: PriorityMaster[] = [];
  searchValue = '';
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;

  ticketTypes: TicketTypeMaster[] = [];
  selectionMode: 'internal' | 'bp' = 'internal';
  selectedContextOrgId = Number(localStorage.getItem('userOrgId') || 0);
  businessPartnerId: number | null = null;
  businessPartnerName: string | null = null;
  contextLabel = 'Using your organization configuration';
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  constructor(
    private fb: FormBuilder,
    private priorityService: PriorityService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private location: Location
  ) {
    this.priorityForm = this.fb.group({
      priorityId: [null],
      level: [null, [Validators.required, Validators.min(1), Validators.pattern(/^[1-9]\d*$/)]],
      code: ['', Validators.required],
      description: ['', Validators.required],
      ticketType: [null, Validators.required],
      orgId: [null]
    });
  }

  backToPrevious(): void {
    this.location.back();
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      const orgId = params.get('orgId');
      const bpId = params.get('businessPartnerId');
      const bpName = params.get('companyName');
      this.selectionMode = mode === 'bp' ? 'bp' : 'internal';
      this.selectedContextOrgId = orgId ? Number(orgId) : Number(localStorage.getItem('userOrgId') || 0);
      this.businessPartnerId = bpId ? Number(bpId) : null;
      this.businessPartnerName = bpName || null;
      this.contextLabel = this.selectionMode === 'bp'
        ? `Using business partner configuration for ${this.businessPartnerName || this.selectedContextOrgId}`
        : 'Using your organization configuration';
    });

    this.loadAllData();
  }

  loadAllData(): void {
    this.loadTicketTypes();
  }

  loadTicketTypes(): void {
    this.priorityService.getTicketTypes().subscribe({
      next: (response) => {
        this.ticketTypes = (response as any).attributes || response || [];
      },
      error: (err) => {
        console.error('Failed to load ticket types:', err);
        this.ticketTypes = [];
      }
    });
  }

  loadPriorityList(): void {
    this.loading = true;
    this.priorityService.getAllPriorities(this.businessPartnerId).subscribe({
      next: (result) => {
        this.priorities = (result as any).attributes || [];
        this.searchValue = '';
        this.filterBySearch();
        this.currentPage = 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load priorities:', err);
        this.loading = false;
      }
    });
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'list';
  }

  startEdit(priority: PriorityMaster): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    this.isEditMode = true;
    this.editingPriorityId = priority.priorityId;
    this.pageTitle = 'Edit Priority';
    this.activeTab = 'create';
    this.priorityForm.patchValue({
      priorityId: priority.priorityId,
      level: priority.level,
      code: priority.code ?? (priority as any).priorityName ?? '',
      description: priority.description || '',
      ticketType: priority.ticketType?.ticketTypeId ?? null,
      orgId: this.selectedContextOrgId
    });
    this.priorityForm.get('ticketType')?.disable();
    this.priorityForm.get('level')?.disable();
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      if (!this.isEditMode) {
        this.resetForm();
      }
      this.pageTitle = this.isEditMode ? 'Edit Priority' : 'Create Priority';
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.editingPriorityId = null;
      this.pageTitle = 'Create Priority';
      this.resetForm();
      this.loadPriorityList();
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.editingPriorityId = null;
    this.pageTitle = 'Create Priority';
    this.priorityForm.reset({
      priorityId: null,
      level: null,
      code: '',
      description: '',
      ticketType: null,
      orgId: null
    });
    this.priorityForm.get('ticketType')?.enable();
    this.priorityForm.get('level')?.enable();
    this.submitError = '';
    this.submitSuccess = '';
  }

  onLevelInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (!value) {
      this.priorityForm.get('level')?.setValue(null);
      return;
    }

    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue < 1) {
      this.priorityForm.get('level')?.setValue(1);
      input.value = '1';
      return;
    }

    this.priorityForm.get('level')?.setValue(numericValue);
  }

  onSave(): void {
    this.isSubmitting = true;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    Object.keys(this.priorityForm.controls).forEach((key) => {
      const field = this.priorityForm.get(key);
      if (field?.hasError('required')) {
        this.formError[key] = `${key} is required`;
      }
      if (key === 'level' && field?.hasError('pattern')) {
        this.formError[key] = 'Level must be a whole number greater than or equal to 1';
      }
      if (key === 'level' && field?.hasError('min')) {
        this.formError[key] = 'Level must be greater than or equal to 1';
      }
    });

    if (Object.keys(this.formError).length > 0) {
      this.isSubmitting = false;
      return;
    }

    const rawForm = this.priorityForm.getRawValue();
    const payload: any = {
      priorityId: rawForm.priorityId,
      businessPartnerId: this.businessPartnerId,
      bpConfigId: this.businessPartnerId,
      code: rawForm.code,
      level: rawForm.level,
      description: rawForm.description,
      ticketTypeId: rawForm.ticketType,
      isActive: true,
      orgId: localStorage.getItem('userOrgId') ? Number(localStorage.getItem('userOrgId')) : null,
      createdBy: Number(localStorage.getItem('userId') || 0),
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };

    const request$ = this.isEditMode && this.editingPriorityId
      ? this.priorityService.updatePriority(payload as any, this.businessPartnerId)
      : this.priorityService.createPriority(payload as any, this.businessPartnerId);
    
    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = this.isEditMode ? 'Priority updated successfully.' : 'Priority created successfully.';
        setTimeout(() => {
          this.loadPriorityList();
          this.resetForm();
          this.activeTab = 'list';
        }, 1000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err.error?.description || (this.isEditMode ? 'Failed to update priority.' : 'Failed to create priority.');
      }
    });
  }

  getPaginatedPriorities(): PriorityMaster[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredPriorities.slice(startIndex, endIndex);
  }

  getPriorityLevel(priority: PriorityMaster): number | string {
    return priority.level ?? '-';
  }

  getPriorityTicketType(priority: PriorityMaster): string {
    return priority.ticketType?.ticketTypeName || '-';
  }

  getPriorityDescription(priority: PriorityMaster): string {
    return priority.description || '-';
  }

  getPriorityOrganization(priority: PriorityMaster): string {
    if (this.selectionMode === 'bp') {
      return this.businessPartnerName || (priority as any).organization?.companyName || '-';
    }

    return localStorage.getItem('userOrgName') || (priority as any).organization?.companyName || '-';
  }

  deletePriority(priority: PriorityMaster): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Priority',
        message: `Are you sure you want to delete priority "${priority.code}"?`
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed || !priority.priorityId) {
        return;
      }

      this.loading = true;
      this.priorityService.deletePriority(priority.priorityId).subscribe({
        next: () => {
          this.loading = false;
          this.submitSuccess = 'Priority deleted successfully.';
          this.loadPriorityList();
        },
        error: (err) => {
          this.loading = false;
          console.error('Delete priority error', err);
          this.submitError = err.error?.message || err?.error?.description || 'Failed to delete priority.';
        }
      });
    });
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) {
      this.filteredPriorities = this.priorities;
    } else {
      this.filteredPriorities = this.priorities.filter(priority =>
        (priority.code || '').toLowerCase().includes(term) ||
        (priority.description || '').toLowerCase().includes(term)
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
