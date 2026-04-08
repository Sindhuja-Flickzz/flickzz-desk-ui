import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../service/company.service';
import { CountryMaster, CompanyMaster, CompanyRequest } from '../../models/company-master';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.scss']
})
export class CompanyComponent implements OnInit {
  companyForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = '';
  isEditMode = false;
  originalFormValue: any = null;
  isRequestor = true; // Default to Requestor
  routeType: 'requestor' | 'service-provider' | null = null; // Store the route type

  countries: CountryMaster[] = [];
  companies: CompanyMaster[] = [];
  filteredCompanies: CompanyMaster[] = []; // For filtered display
  searchValue = '';
  typeFilter = 'all'; // Default to 'all'
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private dialog: MatDialog,
    public route: ActivatedRoute
  ) {
    this.companyForm = this.fb.group({
      companyId: [null],
      companyName: ['', Validators.required],
      registeredNumber: ['', Validators.required],
      countryId: [null, Validators.required],
      address: ['', Validators.required],
      mail: ['', [Validators.required, Validators.email]],
      markAsServiceProvider: [false]
    });
  }

  ngOnInit(): void {
    // Check route data to set initial type
    const routeData = this.route.snapshot.data;
    if (routeData && routeData['type']) {
      this.routeType = routeData['type'];
      this.isRequestor = routeData['type'] === 'requestor';
    }
    this.updatePageTitle();

    this.loadAllData();
    this.updateFormValidators();

    this.companyForm.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  loadAllData(): void {
    this.loading = true;
    this.companyService.getAllCountries().subscribe({
      next: (response) => {
        this.companyForm.patchValue({
            countryId: ""
        });
        this.countries = (response as any).attributes; },
      error: () => { this.countries = []; }
    });

    this.loadCompanyList();
    this.loading = false;
  }

  loadCompanyList(): void {
    this.companyService.getAllCompanies().subscribe({
      next: (result) => {
        this.companies = (result as any).attributes || [];
        this.applyFilters();
      },
      error: (err) => {
        console.error('Failed to load companies:', err);
      }
    });
  }

  applyFilters(): void {
    let filtered = this.companies;

    // Apply type filter based on route
    if (this.routeType === 'requestor') {
      // Display records where isRequestor = true or isBoth = true
      filtered = filtered.filter(c => c.isRequestor || c.isBoth);
    } else if (this.routeType === 'service-provider') {
      // Display records where isServiceProvider = true
      filtered = filtered.filter(c => c.isServiceProvider);
    }

    // Apply type filter based on radio button selection
    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(c => {
        if (this.typeFilter === 'both' && c.isBoth) return true;
        if (this.typeFilter === 'requestor' && c.isRequestor) return true;
        return false;
      });
    }

    // Apply search filter
    const searchTerm = (this.searchValue || '').trim().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.companyName.toLowerCase().includes(searchTerm) ||
        (c.registeredNumber && c.registeredNumber.toLowerCase().includes(searchTerm)) ||
        (c.address && c.address.toLowerCase().includes(searchTerm))
      );
    }

    this.filteredCompanies = filtered;
    this.totalRecords = this.filteredCompanies.length;
    this.currentPage = 0; // Reset to first page when filtering
  }

  onTypeFilterChange(): void {
    this.applyFilters();
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    this.submitError = '';
    this.submitSuccess = '';
    if (tab === 'create') {
      this.updatePageTitle();
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.updatePageTitle();
      this.resetForm();
      this.typeFilter = 'all'; // Reset to 'all' when switching to list tab
      this.loadCompanyList();
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    // Restore the route type if it was set, otherwise default to requestor
    if (this.routeType) {
      this.isRequestor = this.routeType === 'requestor';
    } else {
      this.isRequestor = false;
    }
    this.updatePageTitle();
    this.companyForm.reset({ markAsServiceProvider: false });
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
    this.updateFormValidators();
  }

  cancelForm(): void {    
    this.activeTab = 'list';
    this.isEditMode = false;
  }

  updateFormValidators(): void {
    const markAsServiceProviderControl = this.companyForm.get('markAsServiceProvider');
    if (this.isRequestor) {
      markAsServiceProviderControl?.setValidators(null);
    } else {
      markAsServiceProviderControl?.setValidators(null); // Not required for Service Provider
    }
    markAsServiceProviderControl?.updateValueAndValidity();
  }

  toggleType(): void {
    this.isRequestor = !this.isRequestor;
    this.updatePageTitle();
    this.updateFormValidators();
  }

  updatePageTitle(): void {
    this.pageTitle = this.isEditMode ? (this.isRequestor ? 'Edit Requestor' : 'Edit Service Provider') : (this.isRequestor ? 'Create Requestor' : 'Create Service Provider');
  }

  onSave(): void {
    this.isSubmitting = true;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    Object.keys(this.companyForm.controls).forEach(key => {
      const field = this.companyForm.get(key);
      if (field?.hasError('required')) {
        this.formError[key] = `${key} is required`;
      }
      if (field?.hasError('email')) {
        this.formError[key] = 'Invalid email format';
      }
      return;
    });

    if (Object.keys(this.formError).length > 0) {
      this.isSubmitting = false;
      return;
    }

    const payload: CompanyRequest = {
      companyId: this.companyForm.value.companyId,
      companyName: this.companyForm.value.companyName,
      registeredNumber: this.companyForm.value.registeredNumber,
      countryId: Number(this.companyForm.value.countryId),
      address: this.companyForm.value.address,
      mail: this.companyForm.value.mail,
      markAsServiceProvider: this.companyForm.value.markAsServiceProvider,
      isServiceProvider: !this.isRequestor,
      isRequestor: this.isRequestor,
      createdBy: !this.isEditMode ? localStorage.getItem('userRole') || '' : '',
      updatedBy: this.isEditMode ? localStorage.getItem('userRole') || '' : ''
    };

    if (this.isEditMode) {
      if (!this.isFormChanged()) {
        this.submitError = 'No changes to update.';
        this.isSubmitting = false;
        return;
      }

      this.companyService.updateCompany(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Company updated successfully.';
          setTimeout(() => {
            this.companyForm.markAsPristine();
            this.originalFormValue = this.companyForm.getRawValue();
            this.loadCompanyList();
            this.activeTab = 'list';
            this.isEditMode = false;
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update company error', err);
          this.submitError = err.error?.message || 'Failed to update company.';
        }
      });
    } else {
      this.companyService.createCompany(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Company created successfully.';
          setTimeout(() => {
            this.originalFormValue = this.companyForm.getRawValue();
            this.loadCompanyList();
            this.resetForm();
            this.activeTab = 'list';
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Create company error', err);
          this.submitError = err.error?.message || 'Failed to create company.';
        }
      });
    }
  }

  isFormChanged(): boolean {
    if (!this.originalFormValue) {
      return true;
    }
    const current = this.companyForm.getRawValue();
    return JSON.stringify(current) !== JSON.stringify(this.originalFormValue);
  }

  onViewCompany(company: CompanyMaster): void {
    this.companyService.getCompanyById(company.companyId).subscribe({
      next: (response) => {
        const result = (response as any).attributes;
        this.formError = {};
        this.activeTab = 'create';
        this.isEditMode = true;
        this.isRequestor = result.isBoth || result.isRequestor;
        this.updatePageTitle();
        this.companyForm.patchValue({
          companyId: result.companyId,
          companyName: result.companyName,
          registeredNumber: result.registeredNumber,
          countryId: result.country.countryId,
          address: result.address,
          mail: result.mail,
          markAsServiceProvider: result.isBoth
        });
        this.originalFormValue = this.companyForm.getRawValue();
      },
      error: (err) => {
        console.error('Failed to load company details:', err);
      }
    });
  }

  onDeleteCompany(company: CompanyMaster): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Company',
      message: `Are you sure you want to delete company "${company.companyName}"?`,
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
      this.companyService.deleteCompany(company.companyId).subscribe({
        next: () => {
          this.loadCompanyList();
          this.submitSuccess = 'Company deleted successfully.';
          setTimeout(() => {  
            this.submitSuccess = '';
          }, 1500);
        },
        error: (err) => {
          console.error('Delete company error', err);
          this.submitError = err.error?.message || 'Failed to delete company.';
        }
      });
    });
  }

  getCompanyType(company: CompanyMaster): string {
    if (company.isBoth) {
      return 'Both';
    } else if (company.isServiceProvider) {
      return 'Service Provider';
    } else {
      return 'Requestor';
    }
  }

  getPaginatedCompanies(): CompanyMaster[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredCompanies.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}