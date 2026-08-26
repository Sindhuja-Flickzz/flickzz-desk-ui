import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { NumberRangeService } from '../../service/number-range.service';
import { RequestConfigRequest, RequestConfigVO } from '../../models/number-range';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { USER_ROLES } from 'src/app/data/app_constants';
import { Router } from '@angular/router';

@Component({
  selector: 'app-number-range',
  templateUrl: './number-range.component.html',
  styleUrls: ['./number-range.component.scss']
})
export class NumberRangeComponent implements OnInit {
  numberRangeForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Number Range';
  isEditMode = false;
  editingConfig: RequestConfigVO | null = null;
  originalFormValue: any = null;

  configs: RequestConfigVO[] = [];
  filteredConfigs: RequestConfigVO[] = [];
  searchValue = '';
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;

  requestTypes = ['RITM', 'INC'];
  alphanumericPattern = '^[a-zA-Z0-9 ]+$';

  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  constructor(
    private fb: FormBuilder,
    private numberRangeService: NumberRangeService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.numberRangeForm = this.fb.group({
      configId: [null],
      requestType: ['', Validators.required],
      requestPrefix: ['', [Validators.required, Validators.pattern(this.alphanumericPattern)]],
      rangeFrom: [null, Validators.required],
      rangeTo: [null, [Validators.required, this.rangeToValidator.bind(this)]],
      calculateBackward: [false],
      callHorizon: [null, Validators.required],
      callHorizonPercentage: [{ value: '', disabled: true }]
    });
  }

  ngOnInit(): void {
    this.loadAllData();

    this.numberRangeForm.valueChanges.subscribe(() => {
      this.calculateCallHorizonPercentage();
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });

    // Listen for rangeFrom changes and clear rangeTo if it's now invalid
    this.numberRangeForm.get('rangeFrom')?.valueChanges.subscribe((rangeFromValue) => {
      const rangeToControl = this.numberRangeForm.get('rangeTo');
      const rangeToValue = rangeToControl?.value;
      
      if (rangeFromValue !== null && rangeToValue !== null && rangeToValue <= rangeFromValue) {
        rangeToControl?.setValue(null, { emitEvent: false });
      }
      
      // Trigger validation on rangeTo control
      rangeToControl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  rangeToValidator(control: any): { [key: string]: any } | null {
    const rangeFrom = this.numberRangeForm?.get('rangeFrom')?.value;
    const rangeTo = control.value;

    if (rangeTo === null || rangeTo === undefined || rangeFrom === null || rangeFrom === undefined) {
      return null;
    }

    if (rangeTo <= rangeFrom) {
      return { 'rangeToInvalid': { value: control.value } };
    }

    return null;
  }

  calculateCallHorizonPercentage(): void {
    const rangeFrom = this.numberRangeForm.get('rangeFrom')?.value;
    const rangeTo = this.numberRangeForm.get('rangeTo')?.value;
    const callHorizon = this.numberRangeForm.get('callHorizon')?.value;
    const calculateBackward = this.numberRangeForm.get('calculateBackward')?.value;

    if(rangeFrom === null || rangeTo === null || callHorizon === null || callHorizon === undefined) {
      this.numberRangeForm.get('callHorizonPercentage')?.setValue('', { emitEvent: false });
      return;
    }

    const percentage = Math.min(100, Math.max(0, callHorizon));

    var callHorizonPercentage = 0;

    if (calculateBackward) {
    callHorizonPercentage = Math.round(rangeTo - ((rangeTo - rangeFrom) * percentage / 100));
  } else {
    callHorizonPercentage = Math.round(rangeFrom + ((rangeTo - rangeFrom) * percentage / 100));
  }

    this.numberRangeForm.get('callHorizonPercentage')?.setValue(callHorizonPercentage, { emitEvent: false });
  }

  loadAllData(): void {
    this.loading = true;
    this.loadConfigList();
    this.loading = false;
  }

  loadConfigList(): void {
    const orgId = localStorage.getItem('userOrgId') ? Number(localStorage.getItem('userOrgId')) : 0;
    this.numberRangeService.getAllConfigs(orgId).subscribe({
      next: (result) => {
        this.configs = (result as any).attributes || result || [];
        this.searchValue = '';
        this.filterBySearch();
        this.currentPage = 0;
      },
      error: (err) => {
        console.error('Failed to load configs:', err);
      }
    });
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      this.resetForm();
      this.pageTitle = this.isEditMode ? 'Edit Number Range' : 'Create Number Range';
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.pageTitle = 'Create Number Range';
      this.resetForm();
      this.loadConfigList();
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.editingConfig = null;
    this.pageTitle = 'Create Number Range';
    this.numberRangeForm.reset({
      calculateBackward: false
    });
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
  }

  onSave(): void {
    this.formError = {};
    this.submitError = '';
    Object.keys(this.numberRangeForm.controls).forEach(key => {
      const field = this.numberRangeForm.get(key);
      if (field?.hasError('required')) {
        const label = key === 'requestType' ? 'Request Type' : key === 'requestPrefix' ? 'Request Prefix' : key;
        this.formError[key] = `${label} is required`;
      }
      if (key === 'requestPrefix' && field?.hasError('pattern')) {
        this.formError[key] = 'Request Prefix can contain only letters and numbers';
      }
      if (key === 'rangeTo' && field?.hasError('rangeToInvalid')) {
        this.formError[key] = 'Range To must be greater than Range From';
      }
    });

    if (Object.keys(this.formError).length > 0) {
      return;
    }

    const callHorizonPercentageStr = this.numberRangeForm.get('callHorizonPercentage')?.value || '0%';
    const callHorizonPercentage = parseFloat(callHorizonPercentageStr.toString().replace('%', '')) || 0;

    const formValue = this.numberRangeForm.getRawValue();
    const payload: RequestConfigRequest = {
      configId: formValue.configId,
      requestType: formValue.requestType,
      requestPrefix: formValue.requestPrefix,
      rangeFrom: Number(formValue.rangeFrom),
      rangeTo: Number(formValue.rangeTo),
      calculateBackward: formValue.calculateBackward,
      callHorizonPercentage: Number(formValue.callHorizon),
      callHorizonDays: callHorizonPercentage,
      orgId: localStorage.getItem('userOrgId') ? Number(localStorage.getItem('userOrgId')) : 0,
      createdBy: Number(localStorage.getItem('userId')),
      updatedBy: Number(localStorage.getItem('userId')),
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };

    if (this.isEditMode) {
      if (!this.isFormChanged()) {
        this.submitError = 'No changes to update.';
        return;
      }

      this.numberRangeService.updateConfig(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Number range updated successfully.';
          setTimeout(() => {
            this.numberRangeForm.markAsPristine();
            this.originalFormValue = this.numberRangeForm.getRawValue();
            this.loadConfigList();
            this.activeTab = 'list';
            this.isEditMode = false;
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update config error', err);
          this.submitError = err.error?.description || 'Failed to update number range.';
        }
      });
    } else {
      this.numberRangeService.createConfig(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Number range created successfully.';
          setTimeout(() => {
            this.loadConfigList();
            this.resetForm();
            this.activeTab = 'list';
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Create config error', err);
          this.submitError = err.error?.description || 'Failed to create number range.';
        }
      });
    }
  }

  isFormChanged(): boolean {
    if (!this.originalFormValue) {
      return true;
    }
    const current = this.numberRangeForm.getRawValue();
    return JSON.stringify(current) !== JSON.stringify(this.originalFormValue);
  }

  backToHome(): void {
    this.router.navigate(['/settings']);
  }

  onViewConfig(config: RequestConfigVO): void {
    this.formError = {};
    this.activeTab = 'create';
    this.isEditMode = true;
    this.editingConfig = config;
    this.pageTitle = 'Edit Number Range';
    this.numberRangeForm.patchValue({
      configId: config.configId,
      requestType: config.requestType,
      requestPrefix: config.requestPrefix,
      rangeFrom: config.rangeFrom,
      rangeTo: config.rangeTo,
      calculateBackward: config.calculateBackward,
      callHorizon: config.callHorizonPercentage,
      callHorizonPercentage: config.callHorizonPercentage.toFixed(2) + '%'
    });
    this.originalFormValue = this.numberRangeForm.getRawValue();
  }

  canEditRangeFrom(): boolean {
    return !this.isEditMode || !this.editingConfig?.isEnabled || this.editingConfig.calculateBackward === true;
  }

  canEditRangeTo(): boolean {
    return !this.isEditMode || !this.editingConfig?.isEnabled || this.editingConfig.calculateBackward === false;
  }

  canEditCalculateBackward(): boolean {
    return !this.isEditMode || !this.editingConfig?.isEnabled;
  }

  onDeleteConfig(config: RequestConfigVO): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Number Range',
      message: `Are you sure you want to delete configuration for ${config.requestType}?`,
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
      this.numberRangeService.deleteConfig(config.configId).subscribe({
        next: () => {
          this.loadConfigList();
          this.submitSuccess = 'Number range deleted successfully.';
          setTimeout(() => {
            this.submitSuccess = '';
          }, 1500);
        },
        error: (err) => {
          console.error('Delete config error', err);
          this.submitError = err.error?.message || 'Failed to delete number range.';
        }
      });
    });
  }

  getPaginatedConfigs(): RequestConfigVO[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredConfigs.slice(startIndex, endIndex);
  }

  getConfigStatus(config: RequestConfigVO): string {
    return config.isActive === true ? 'Active' : 'Inactive';
  }

  getConfigStatusClass(config: RequestConfigVO): string {
    return config.isActive === true ? 'status-pill active' : 'status-pill inactive';
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    this.filteredConfigs = !term ? this.configs : this.configs.filter(config =>
      config.requestType.toLowerCase().includes(term) ||
      config.requestPrefix.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredConfigs.length;
    this.currentPage = 0;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.activeTab = 'list';
  }
}
