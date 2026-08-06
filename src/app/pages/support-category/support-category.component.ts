import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { SupportCategoryService } from '../../service/support-category.service';
import { USER_ROLES } from '../../data/app_constants';
import { CompanyService } from '../../service/company.service';

interface OptionItem { id: number; name: string; }

@Component({
  selector: 'app-support-category',
  templateUrl: './support-category.component.html',
  styleUrls: ['./support-category.component.scss']
})
export class SupportCategoryComponent implements OnInit {
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Assignment';
  assignmentForm: FormGroup;
  assignments: any[] = [];
  filteredAssignments: any[] = [];
  searchValue = '';
  loading = false;
  isSubmitting = false;
  formError: Record<string, string> = {};
  submitSuccess = '';
  submitError = '';
  isEditMode = false;
  editingAssignmentId: number | null = null;
  selectionMode: 'internal' | 'bp' = 'internal';
  selectedContextOrgId = Number(localStorage.getItem('userOrgId') || 0);
  businessPartnerId: number | null = null;
  businessPartnerName: string | null = null;
  contextLabel = 'Using your organization configuration';
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;
  orgId = Number(localStorage.getItem('userOrgId') || 0);
  bpOptions: any[] = [];

  supportGroupQuery = '';
  supportGroupOptions: OptionItem[] = [];
  selectedSupportGroup: OptionItem | null = null;

  subCategoryQuery = '';
  subCategoryOptions: OptionItem[] = [];
  selectedSubCategory: OptionItem | null = null;

  constructor(
    private fb: FormBuilder,
    private supportCategoryService: SupportCategoryService,
    private companyService: CompanyService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private location: Location
  ) {
    this.assignmentForm = this.fb.group({
      assignmentId: [null],
      supportGroupId: [null, Validators.required],
      subCategoryId: [null, Validators.required]
    });
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
        ? `Using business partner configuration for ${this.businessPartnerName || this.businessPartnerId}`
        : 'Using your organization configuration';
    });
  }

  backToPrevious(): void { this.location.back(); }

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    if (tab === 'create') {
      if (!this.isEditMode) { this.resetForm(); }
      this.pageTitle = this.isEditMode ? 'Edit Assignment' : 'Create Assignment';
      return;
    }

    this.isEditMode = false;
    this.editingAssignmentId = null;
    this.pageTitle = 'Create Assignment';
    this.resetForm();
    this.loadAssignments();
  }

  resetForm(): void {
    this.isEditMode = false;
    this.editingAssignmentId = null;
    this.pageTitle = 'Create Assignment';
    this.assignmentForm.reset({ assignmentId: null, supportGroupId: null, subCategoryId: null });
    this.selectedSupportGroup = null;
    this.selectedSubCategory = null;
    this.supportGroupQuery = '';
    this.subCategoryQuery = '';
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
  }

  onSupportGroupSearch(): void {
    const q = (this.supportGroupQuery || '').trim();
    const orgId = this.businessPartnerId ?? this.selectedContextOrgId;
    if (!orgId) { this.supportGroupOptions = []; return; }
    this.supportCategoryService.getSupportGroups(orgId).subscribe({
      next: (res) => {
        const items = (res as any)?.attributes || res || [];
        this.supportGroupOptions = items.map((i: any) => ({ id: i.supportGroupId ?? i.id, name: i.groupName || i.supportGroupName || i.name || '' }))
          .filter((it: OptionItem) => it.name.toLowerCase().includes(q.toLowerCase()));
      }, error: () => { this.supportGroupOptions = []; }
    });
  }

  onSubCategorySearch(): void {
    const q = (this.subCategoryQuery || '').trim();
    const orgId = this.businessPartnerId ?? this.selectedContextOrgId;
    if (!orgId) { this.subCategoryOptions = []; return; }
    this.supportCategoryService.getSubCategories(orgId).subscribe({
      next: (res) => {
        const items = (res as any)?.attributes || res || [];
        this.subCategoryOptions = items.map((i: any) => ({ id: i.subCategoryId ?? i.id, name: i.subCategoryName || i.name || '' }))
          .filter((it: OptionItem) => it.name.toLowerCase().includes(q.toLowerCase()));
      }, error: () => { this.subCategoryOptions = []; }
    });
  }

  selectSupportGroup(option: OptionItem): void {
    this.selectedSupportGroup = option;
    this.assignmentForm.get('supportGroupId')?.setValue(option.id);
    this.supportGroupOptions = [];
    this.supportGroupQuery = option.name;
  }

  selectSubCategory(option: OptionItem): void {
    this.selectedSubCategory = option;
    this.assignmentForm.get('subCategoryId')?.setValue(option.id);
    this.subCategoryOptions = [];
    this.subCategoryQuery = option.name;
  }

  startEdit(item: any): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    this.isEditMode = true;
    this.editingAssignmentId = item.assignmentId ?? item.id ?? null;
    this.pageTitle = 'Edit Assignment';
    this.activeTab = 'create';

    const supportGroupId = item.supportGroupId ?? item.supportGroup?.supportGroupId ?? item.supportGroup?.id ?? null;
    const subCategoryId = item.subCategoryId ?? item.subCategory?.subCategoryId ?? item.subCategory?.id ?? null;

    this.assignmentForm.patchValue({ assignmentId: this.editingAssignmentId, supportGroupId, subCategoryId });
    this.selectedSupportGroup = supportGroupId != null ? { id: supportGroupId, name: item.supportGroupName || item.supportGroup?.groupName || item.supportGroup?.name || '' } as OptionItem : null;
    this.supportGroupQuery = this.selectedSupportGroup?.name || '';
    this.selectedSubCategory = subCategoryId != null ? { id: subCategoryId, name: item.subCategoryName || item.subCategory?.subCategoryName || item.subCategory?.name || '' } as OptionItem : null;
    this.subCategoryQuery = this.selectedSubCategory?.name || '';
  }

  openProceedDialog(): void {
    this.isSubmitting = false;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    const sg = this.assignmentForm.get('supportGroupId')?.value ?? this.selectedSupportGroup?.id ?? null;
    const sc = this.assignmentForm.get('subCategoryId')?.value ?? this.selectedSubCategory?.id ?? null;
    if (!sg) { this.formError['supportGroupId'] = 'Support group is required.'; }
    if (!sc) { this.formError['subCategoryId'] = 'Sub category is required.'; }
    if (Object.keys(this.formError).length > 0) { return; }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      disableClose: true,
      data: {
        title: this.isEditMode ? 'Confirm Update' : 'Confirm Save',
        message: this.isEditMode
          ? 'Please review the assignment details and add remarks before updating.'
          : 'Please review the assignment details and add remarks before saving.',
        confirmText: this.isEditMode ? 'Update' : 'Save',
        cancelText: 'Cancel',
        includeRemarks: true,
        remarksLabel: 'Remarks',
        remarksPlaceholder: 'Enter remarks for this action'
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result?.confirmed) { return; }
      this.onSave(result.remarks);
    });
  }

  onSave(remarks?: string): void {
    this.isSubmitting = true;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    const sg = this.assignmentForm.get('supportGroupId')?.value ?? this.selectedSupportGroup?.id ?? null;
    const sc = this.assignmentForm.get('subCategoryId')?.value ?? this.selectedSubCategory?.id ?? null;
    if (!sg) { this.formError['supportGroupId'] = 'Support group is required.'; }
    if (!sc) { this.formError['subCategoryId'] = 'Sub category is required.'; }
    if (Object.keys(this.formError).length > 0) { this.isSubmitting = false; return; }

    const payload: any = {
      assignmentId: this.editingAssignmentId,
      supportGroupId: sg,
      subCategoryId: sc,
      remarks: remarks || '',
      businessPartnerId: this.businessPartnerId,
      createdBy: Number(localStorage.getItem('userId') || 0),
      orgId: localStorage.getItem('userOrgId') ? Number(localStorage.getItem('userOrgId')) : null,
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isActive: true,
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };

    const request$ = this.isEditMode && this.editingAssignmentId
      ? this.supportCategoryService.updateAssignment(payload)
      : this.supportCategoryService.createAssignment(payload);

    request$.subscribe({ next: () => {
        this.isSubmitting = false;
        this.submitSuccess = this.isEditMode ? 'Assignment updated successfully.' : 'Assignment created successfully.';
        setTimeout(() => { this.loadAssignments(); this.resetForm(); this.activeTab = 'list'; }, 1000);
      }, error: (err) => {
        this.isSubmitting = false;
        console.error('Assignment save error', err);
        this.submitError = err.error?.description || err.error?.message || 'Failed to save assignment.';
      }
    });
  }

  loadAssignments(): void {
    this.loading = true;
    if(this.businessPartnerId == null && this.orgId != null) {
        this.companyService.getServiceProviderList(this.orgId).subscribe({
        next: (response) => {
          this.bpOptions = (response as any).attributes || response || [];
          const matchingRole = this.bpOptions.find((bp) => {
            return bp.company?.companyId != null && bp.mappedCompany?.companyId != null
              && bp.company.companyId === bp.mappedCompany.companyId;
          });

          this.businessPartnerId = matchingRole?.businessPartnerId ?? null;
        },
        error: () => {
          console.error('Failed to load business partners');
        }
      });
    }
    this.supportCategoryService.getAllAssignments(this.businessPartnerId).subscribe({
      next: (res) => { this.assignments = (res as any)?.attributes || res || []; this.filterBySearch(); this.loading = false; },
      error: (err) => { console.error('Failed to load assignments', err); this.assignments = []; this.filteredAssignments = []; this.loading = false; }
    });
  }

  deleteAssignment(item: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Assignment',
        message: 'Delete assignment?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        includeRemarks: true,
        remarksLabel: 'Remarks',
        remarksPlaceholder: 'Enter remarks for deletion'
      }
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result?.confirmed) { return; }
      const id = item.assignmentId ?? item.id;
      if (!id) { return; }
      this.loading = true;
      this.supportCategoryService.deleteAssignment(id, result.remarks).subscribe({ next: () => { this.loading = false; this.submitSuccess = 'Assignment deleted.'; this.loadAssignments(); }, error: (err) => { this.loading = false; console.error('Delete error', err); this.submitError = 'Failed to delete assignment.'; } });
    });
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) { this.filteredAssignments = this.assignments; }
    else { this.filteredAssignments = this.assignments.filter(a => ((a.supportGroupName || a.groupName || '') + ' ' + (a.subCategoryName || '')).toLowerCase().includes(term)); }
    this.totalRecords = this.filteredAssignments.length; this.currentPage = 0;
  }

  getPaginatedAssignments(): any[] { const start = this.currentPage * this.pageSize; return this.filteredAssignments.slice(start, start + this.pageSize); }

  onPageChange(event: PageEvent): void { this.currentPage = event.pageIndex; this.pageSize = event.pageSize; }

  getAssignmentOrganization(): string {
    const orgName = this.businessPartnerName || localStorage.getItem('userOrgName');
    return orgName || '-';
  }
}
