import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ImpactService } from '../../service/impact.service';
import { CompanyMaster } from '../../models/company-master';
import { ImpactMasterVO, ImpactRequest } from '../../models/impact-master';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-impact',
  templateUrl: './impact.component.html',
  styleUrls: ['./impact.component.scss']
})
export class ImpactComponent implements OnInit {
  impactForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Impact';
  isEditMode = false;
  originalFormValue: any = null;

  companies: CompanyMaster[] = [];
  impacts: ImpactMasterVO[] = [];
  filteredImpacts: ImpactMasterVO[] = [];
  searchValue = '';
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;

  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  alphanumericPattern = '^[a-zA-Z0-9 ]+$';

  constructor(
    private fb: FormBuilder,
    private impactService: ImpactService,
    private dialog: MatDialog
  ) {
    this.impactForm = this.fb.group({
      impactId: [null],
      impactCode: ['', [Validators.required, Validators.pattern(this.alphanumericPattern)]],
      rank: [null, [Validators.required, Validators.min(1)]],
      slaMultiplier: [0.00, [Validators.required, Validators.min(0)]],
      orgId: [null, Validators.required],
      createdBy: [''],
      updatedBy: ['']
    });
  }

  ngOnInit(): void {
    this.loadAllData();

    this.impactForm.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  loadAllData(): void {
    this.loading = true;
    this.impactService.getCompanyList().subscribe({
      next: (response) => { this.companies = (response as any).attributes || response || []; },
      error: () => { this.companies = []; }
    });

    this.impactForm.patchValue({
      slaMultiplier: 0.00,
      orgId: ''
    });
    this.loadImpactList();
    this.loading = false;
  }

  loadImpactList(): void {
    let orgId = this.getUserOrganizationId();
    if (orgId === null) {
    //   this.impacts = [];
    //   this.filteredImpacts = [];
    //   this.totalRecords = 0;
    //   this.submitError = 'Organization context not available. Cannot load impact list.';
    //   return;
    orgId = 0; // Fallback to 0 if organization ID is not available
    }

    this.impactService.getImpactList(orgId).subscribe({
      next: (result) => {
        this.impacts = (result as any).attributes || result || [];
        this.searchValue = '';
        this.filterBySearch();
        this.currentPage = 0;
      },
      error: (err) => {
        console.error('Failed to load impacts:', err);
        this.submitError = 'Failed to load impact list.';
      }
    });
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      this.resetForm();
      this.pageTitle = this.isEditMode ? 'Edit Impact' : 'Create Impact';
      this.impactForm.get('impactCode')?.enable();
      this.impactForm.get('orgId')?.enable();
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.pageTitle = 'Create Impact';
      this.resetForm();
      this.loadImpactList();
    }
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'list';  
   }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Create Impact';
    this.impactForm.reset();
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
    this.impactForm.patchValue({
      slaMultiplier: 0.00,
      orgId: ''
    });
    this.impactForm.get('impactCode')?.enable();
    this.impactForm.get('orgId')?.enable();
  }

  onSave(): void {
    this.isSubmitting = true;
    this.formError = {};

    const formValue = this.impactForm.getRawValue();

    Object.keys(this.impactForm.controls).forEach(key => {
      const field = this.impactForm.get(key);
      if (field?.hasError('required')) {
        this.formError[key] = key === 'impactCode' ? 'Impact Code is required' : `${key} is required`;
      }
      if (key === 'impactCode' && field?.hasError('pattern')) {
        this.formError[key] = 'Impact Code can contain only letters and numbers';
      }
      if ((key === 'rank' || key === 'slaMultiplier') && field?.hasError('min')) {
        this.formError[key] = `${key} must be a positive number`;
      }
    });

    if (Object.keys(this.formError).length > 0) {
      this.isSubmitting = false;
      return;
    }

    const payload: ImpactRequest = {
      impactId: formValue.impactId,
      impactCode: formValue.impactCode,
      impactLevel: Number(formValue.rank),
      slaMultiplier: Number(formValue.slaMultiplier),
      orgId: Number(formValue.orgId),
      createdBy: !this.isEditMode ? localStorage.getItem('userRole') || '' : '',
      updatedBy: this.isEditMode ? localStorage.getItem('userRole') || '' : ''
    };

    if (this.isEditMode) {
      if (!this.isFormChanged()) {
        this.submitError = 'No changes to update.';
        this.isSubmitting = false;
        return;
      }

      this.impactService.updateImpact(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Impact updated successfully.';
          setTimeout(() => {
            this.impactForm.markAsPristine();
            this.originalFormValue = this.impactForm.getRawValue();
            this.loadImpactList();
            this.activeTab = 'list';
            this.isEditMode = false;
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update impact error', err);
          this.submitError = err.error?.message || 'Failed to update impact.';
        }
      });
    } else {
      this.impactService.createImpact(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Impact created successfully.';
          setTimeout(() => {
            this.loadImpactList();
            this.resetForm();
            this.activeTab = 'list';
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Create impact error', err);
          this.submitError = err.error?.message || 'Failed to create impact.';
        }
      });
    }
  }

  isFormChanged(): boolean {
    if (!this.originalFormValue) {
      return true;
    }
    const current = this.impactForm.getRawValue();
    return JSON.stringify(current) !== JSON.stringify(this.originalFormValue);
  }

  onViewImpact(impact: ImpactMasterVO): void {
    this.impactService.getImpactById(impact.impactId).subscribe({
      next: (result) => {
        const impactData = (result as any).attributes || result;
        this.formError = {};
        this.activeTab = 'create';
        this.isEditMode = true;
        this.pageTitle = 'Edit Impact';
        this.impactForm.patchValue({
          impactId: impactData.impactId,
          impactCode: impactData.impactCode,
          rank: impactData.impactLevel,
          slaMultiplier: impactData.slaMultiplier,
          orgId: impactData.organization?.companyId || null,
          createdBy: impactData.createdBy,
          updatedBy: impactData.updatedBy || impactData.createdBy
        });
        this.impactForm.get('impactCode')?.disable();
        this.impactForm.get('orgId')?.disable();
        this.originalFormValue = this.impactForm.getRawValue();
      },
      error: (err) => {
        console.error('Failed to load impact details:', err);
        this.submitError = 'Failed to load impact details.';
      }
    });
  }

  onDeleteImpact(impact: ImpactMasterVO): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Impact',
      message: `Are you sure you want to delete impact "${impact.impactCode}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      type: 'delete'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.impactService.deleteImpact(impact.impactId).subscribe({
        next: () => {
          this.submitSuccess = 'Impact deleted successfully.';
          this.loadImpactList();
        },
        error: (err) => {
          console.error('Delete impact error', err);
          this.submitError = err.error?.message || 'Failed to delete impact.';
        }
      });
    });
  }

  filterBySearch(): void {
    const term = this.searchValue.trim().toLowerCase();
    if (!term) {
      this.filteredImpacts = [...this.impacts];
    } else {
      this.filteredImpacts = this.impacts.filter((impact) =>
        impact.impactCode?.toLowerCase().includes(term) ||
        impact.organization?.companyName?.toLowerCase().includes(term)
      );
    }
    this.totalRecords = this.filteredImpacts.length;
    this.currentPage = 0;
  }

  getPaginatedImpacts(): ImpactMasterVO[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.filteredImpacts.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
  }

  private getUserOrganizationId(): number | null {
    const organizationValue = localStorage.getItem('userOrg');
    return organizationValue ? Number(organizationValue) : null;
  }
}
