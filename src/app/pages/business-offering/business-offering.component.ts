import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { BusinessOfferingService } from '../../service/business-offering.service';
import { BusinessService, BusinessServiceRequest, ServiceOffering } from '../../models/business-offering';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-business-offering',
  templateUrl: './business-offering.component.html',
  styleUrls: ['./business-offering.component.scss']
})
export class BusinessOfferingComponent implements OnInit {
  businessServiceForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Business Service';
  isEditMode = false;
  originalFormValue: any = null;

  businessServices: BusinessService[] = [];
  filteredBusinessServices: BusinessService[] = [];
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

  currentOfferingName = '';

  constructor(
    private fb: FormBuilder,
    private businessOfferingService: BusinessOfferingService,
    private dialog: MatDialog
  ) {
    this.businessServiceForm = this.fb.group({
      serviceId: [null],
      serviceName: ['', [Validators.required, Validators.pattern(this.alphanumericPattern)]],
      serviceOfferings: [[]]
    });
  }

  ngOnInit(): void {
    this.loadAllData();

    this.businessServiceForm.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  loadAllData(): void {
    this.loading = true;
    this.loadBusinessServiceList();
    this.loading = false;
  }

  loadBusinessServiceList(): void {
    this.businessOfferingService.getAllBusinessServices().subscribe({
      next: (result) => {
        this.businessServices = (result as any).attributes || [];
        this.searchValue = '';
        this.filterBySearch();
        this.currentPage = 0;
      },
      error: (err) => {
        console.error('Failed to load business services:', err);
      }
    });
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      this.resetForm();
      this.pageTitle = this.isEditMode ? 'Edit Business Service' : 'Create Business Service';
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.pageTitle = 'Create Business Service';
      this.resetForm();
      this.loadBusinessServiceList();
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Create Business Service';
    this.businessServiceForm.reset();
    this.businessServiceForm.patchValue({ serviceOfferings: [] });
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
    this.currentOfferingName = '';
  }

  cancelEdit(): void {
    this.isEditMode = false;   
    this.activeTab = 'list';
  }

  addServiceOffering(): void {
    this.formError.serviceOfferings = '';
    const offeringName = this.currentOfferingName.trim();
    if (!offeringName) {
      return;
    }

    const offerings: ServiceOffering[] = this.businessServiceForm.get('serviceOfferings')?.value || [];
    const offeringExists = offerings.some(offering => offering.offeringName.toLowerCase() === offeringName.toLowerCase());

    if (!offeringExists) {
      const newOffering: ServiceOffering = {
        offeringId: 0,
        serviceId: this.businessServiceForm.value.serviceId || 0,
        offeringName
      };
      offerings.push(newOffering);
      this.businessServiceForm.patchValue({ serviceOfferings: offerings });
      this.currentOfferingName = '';
      this.formError.serviceOfferings = undefined;
    } else {
        this.formError.serviceOfferings = 'Offering already exists in the list.';
    }
  }

  removeServiceOffering(index: number): void {
    const offerings: ServiceOffering[] = this.businessServiceForm.get('serviceOfferings')?.value || [];
    offerings.splice(index, 1);
    this.businessServiceForm.patchValue({ serviceOfferings: offerings });
  }

  onSave(): void {
    this.formError = {};

    const serviceNameControl = this.businessServiceForm.get('serviceName');
    const serviceOfferings: ServiceOffering[] = this.businessServiceForm.get('serviceOfferings')?.value || [];

    if (serviceNameControl?.hasError('required')) {
      this.formError.serviceName = 'Business Service is required';
    }
    if (serviceNameControl?.hasError('pattern')) {
      this.formError.serviceName = 'Business Service can contain only letters and numbers';
    }
    if (!serviceOfferings.length) {
      this.formError.serviceOfferings = 'At least one Service Offering is required';
    }

    if (Object.keys(this.formError).length > 0) {
      return;
    }

    const payload: BusinessServiceRequest = {
      serviceId: this.businessServiceForm.value.serviceId,
      serviceName: this.businessServiceForm.value.serviceName,
      serviceOfferings: serviceOfferings.map(offering => ({
        // offeringId: offering.offeringId || 0,
        // serviceId: this.businessServiceForm.value.serviceId || null,
        offeringName: offering.offeringName
      })),
      createdBy: localStorage.getItem('userRole') || '',
      updatedBy: localStorage.getItem('userRole') || ''
    };

    if (this.isEditMode) {
      if (!this.isFormChanged()) {
        this.submitError = 'No changes to update.';
        return;
      }

      this.isSubmitting = true;
      this.submitError = '';
      this.submitSuccess = '';
      this.businessOfferingService.updateBusinessService(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Business Service updated successfully.';
          setTimeout(() => {
            this.businessServiceForm.markAsPristine();
            // Deep copy to prevent reference issues
            this.originalFormValue = JSON.parse(JSON.stringify(this.businessServiceForm.getRawValue()));
            this.loadBusinessServiceList();
            this.activeTab = 'list';
            this.isEditMode = false;
          }, 1000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update business service error', err);
          this.submitError = err.error?.message || 'Failed to update business service.';
        }
      });
    } else {
      this.isSubmitting = true;
      this.submitError = '';
      this.submitSuccess = '';
      this.businessOfferingService.createBusinessService(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Business Service created successfully.';
          setTimeout(() => {
            this.loadBusinessServiceList();
            this.resetForm();
            this.activeTab = 'list';
          }, 1000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Create business service error', err);
          this.submitError = err.error?.message || 'Failed to create business service.';
        }
      });
    }
  }

  isFormChanged(): boolean {
    if (!this.originalFormValue) {
      return true;
    }
    const current = this.businessServiceForm.getRawValue();
    
    // Check if service name changed
    if (current.serviceName !== this.originalFormValue.serviceName) {
      return true;
    }
    
    // Deep comparison of service offerings
    const currentOfferings = current.serviceOfferings || [];
    const originalOfferings = this.originalFormValue.serviceOfferings || [];
    
    if (currentOfferings.length !== originalOfferings.length) {
      return true;
    }
    
    // Check each offering
    for (let i = 0; i < currentOfferings.length; i++) {
      const current_offering = currentOfferings[i];
      const original_offering = originalOfferings[i];
      
      if (current_offering.offeringName !== original_offering.offeringName ||
          current_offering.offeringId !== original_offering.offeringId) {
        return true;
      }
    }
    
    return false;
  }

  onViewBusinessService(service: BusinessService): void {
    this.formError = {};
    this.activeTab = 'create';
    this.isEditMode = true;
    this.pageTitle = 'Edit Business Service';
    this.businessServiceForm.patchValue({
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      serviceOfferings: service.serviceOfferings || []
    });
    // Deep copy to prevent reference issues when form values change
    this.originalFormValue = JSON.parse(JSON.stringify(this.businessServiceForm.getRawValue()));
  }

  onDeleteBusinessService(service: BusinessService): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Business Service',
      message: `Are you sure you want to delete business service "${service.serviceName}"?`,
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
      this.businessOfferingService.deleteBusinessService(service.serviceId).subscribe({
        next: () => {
          this.loadBusinessServiceList();
          this.submitSuccess = 'Business Service deleted successfully.';
          setTimeout(() => {
            this.submitSuccess = '';
          }, 1500);
        },
        error: (err) => {
          console.error('Delete business service error', err);
          this.submitError = err.error?.message || 'Failed to delete business service.';
        }
      });
    });
  }

  getPaginatedServices(): BusinessService[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredBusinessServices.slice(startIndex, endIndex);
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) {
      this.filteredBusinessServices = this.businessServices;
    } else {
      this.filteredBusinessServices = this.businessServices.filter(service =>
        service.serviceName.toLowerCase().includes(term) ||
        service.serviceOfferings.some(offering =>
          offering.offeringName.toLowerCase().includes(term)
        )
      );
    }
    this.totalRecords = this.filteredBusinessServices.length;
    this.currentPage = 0;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}
