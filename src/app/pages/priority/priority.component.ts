import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import { PriorityService } from '../../service/priority.service';
import { CompanyMaster, PriorityMaster, PriorityRequest, TicketTypeMaster } from '../../models/priority-master';
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

  ticketTypes: TicketTypeMaster[] = [];
  selectionMode: 'internal' | 'bp' = 'internal';
  selectedContextOrgId = Number(localStorage.getItem('userOrgId') || 0);
  contextLabel = 'Using your organization configuration';
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  constructor(
    private fb: FormBuilder,
    private priorityService: PriorityService,
    private dialog: MatDialog,
    private route: ActivatedRoute
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

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      const orgId = params.get('orgId');
      this.selectionMode = mode === 'bp' ? 'bp' : 'internal';
      this.selectedContextOrgId = orgId ? Number(orgId) : Number(localStorage.getItem('userOrgId') || 0);
      this.contextLabel = this.selectionMode === 'bp'
        ? `Using business partner configuration for org ${this.selectedContextOrgId}`
        : 'Using your organization configuration';
    });

    this.loadAllData();
  }

  loadAllData(): void {
    this.loadTicketTypes();
    this.loading = true;
    this.priorityService.getAllCompanies().subscribe({
      next: (response) => { this.companies = (response as any).attributes || []; },
      error: () => { this.companies = []; }
    });

    this.loadPriorityList();
    this.loading = false;
  }

  loadTicketTypes(): void {
    this.priorityService.getTicketTypes().subscribe({
      next: (response) => {
        this.ticketTypes = (response as any).attributes || response || [];
        if (this.ticketTypes.length && !this.priorityForm.get('ticketType')?.value) {
          this.priorityForm.patchValue({ ticketType: this.ticketTypes[0].ticketTypeId });
        }
      },
      error: (err) => {
        console.error('Failed to load ticket types:', err);
        this.ticketTypes = [];
      }
    });
  }

  loadPriorityList(): void {
    this.priorityService.getAllPriorities().subscribe({
      next: (result) => {
        this.priorities = (result as any).attributes || [];
        this.searchValue = '';
        this.filterBySearch();
        this.currentPage = 0;
      },
      error: (err) => {
        console.error('Failed to load priorities:', err);
      }
    });
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'list';
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      this.resetForm();
      this.pageTitle = this.isEditMode ? 'Edit Priority' : 'Create Priority';
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.pageTitle = 'Create Priority';
      this.resetForm();
      this.loadPriorityList();
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Create Priority';
    this.priorityForm.reset({
      priorityId: null,
      level: null,
      code: '',
      description: '',
      ticketType: this.ticketTypes[0]?.ticketTypeId || null,
      orgId: null
    });
    this.originalFormValue = null;
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

    const payload: PriorityRequest = {
      priorityId: this.priorityForm.value.priorityId,
      priorityName: this.priorityForm.value.code,
      orgId: Number(this.selectedContextOrgId || this.priorityForm.value.orgId || localStorage.getItem('userOrgId') || 0),
      level: this.priorityForm.value.level,
      description: this.priorityForm.value.description,
      ticketTypeId: this.priorityForm.value.ticketType,
      colorCode: '',
      responseSla: 0,
      resolutionSla: 0,
      createdBy: Number(localStorage.getItem('userId') || 0),
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };

    this.priorityService.createPriority(payload as any).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = 'Priority created successfully.';
        setTimeout(() => {
          this.loadPriorityList();
          this.resetForm();
          this.activeTab = 'list';
        }, 1000);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Create priority error', err);
        this.submitError = err.error?.message || 'Failed to create priority.';
      }
    });
  }

  getPaginatedPriorities(): PriorityMaster[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredPriorities.slice(startIndex, endIndex);
  }

  getPriorityField(priority: PriorityMaster, key: string): string {
  const value = (priority as any)[key];

  if (key === 'ticketType') {
    return value?.ticketTypeName || '-';
  }

  return value ?? '-';
}

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) {
      this.filteredPriorities = this.priorities;
    } else {
      this.filteredPriorities = this.priorities.filter(priority =>
        (priority.priorityName || '').toLowerCase().includes(term) ||
        (priority.organization?.companyName || '').toLowerCase().includes(term)
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
