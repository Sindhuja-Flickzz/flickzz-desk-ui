import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { USER_ROLES } from '../../data/app_constants';
import { RequestType, RequestTypeRequest } from '../../models/request-type.model';
import { RequestTypeService } from '../../service/request-type.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-request-type',
  templateUrl: './request-type.component.html',
  styleUrls: ['./request-type.component.scss']
})
export class RequestTypeComponent implements OnInit {
  requestTypeForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  requestTypes: RequestType[] = [];
  filteredRequestTypes: RequestType[] = [];
  requestTypeList: { name: string }[] = [];
  searchValue = '';
  loading = false;
  error: string | null = null;
  formError: { requestType?: string } = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;
  userOrgId: string = '';

  constructor(
    private fb: FormBuilder,
    private requestTypeService: RequestTypeService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.requestTypeForm = this.fb.group({
      requestType: ['', Validators.required]
    });
  }

  ngOnInit(): void {    
    this.userOrgId = localStorage.getItem('userOrgId') || '';
    this.loadRequestTypeList();
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

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    if (tab === 'list') {
      this.resetForm();
      this.loadRequestTypeList();
    }
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
