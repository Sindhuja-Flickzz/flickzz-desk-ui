import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { NumberRangeService } from '../../service/number-range.service';
import { PlantService } from '../../service/plant.service';
import { RequestConfigRequest, RequestConfigVO } from '../../models/number-range';
import { PlantMaster } from '../../models/plant-master';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

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
  originalFormValue: any = null;

  plants: PlantMaster[] = [];
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
    private plantService: PlantService,
    private dialog: MatDialog
  ) {
    this.numberRangeForm = this.fb.group({
      configId: [null],
      requestType: ['', Validators.required],
      requestPrefix: ['', [Validators.required, Validators.pattern(this.alphanumericPattern)]],
      revision: [{ value: 1, disabled: true }, Validators.required],
      rangeFrom: [null, Validators.required],
      rangeTo: [null, Validators.required],
      calculateBackward: [false],
      plant: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadAllData();

    this.numberRangeForm.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  loadAllData(): void {
    this.loading = true;
    this.loadPlantList();
    this.loadConfigList();
    this.numberRangeForm.patchValue({ revision: 1 });
    this.loading = false;
  }

  loadPlantList(): void {
    this.plantService.getAllPlants().subscribe({
      next: (result) => {
        this.plants = (result as any).attributes || result || [];
      },
      error: () => {
        this.plants = [];
      }
    });
  }

  loadConfigList(): void {
    this.numberRangeService.getAllConfigs().subscribe({
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
    this.pageTitle = 'Create Number Range';
    this.numberRangeForm.reset({
      revision: 1,
      calculateBackward: false
    });
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
  }

  onSave(): void {
    this.formError = {};

    Object.keys(this.numberRangeForm.controls).forEach(key => {
      const field = this.numberRangeForm.get(key);
      if (field?.hasError('required')) {
        const label = key === 'requestType' ? 'Request Type' : key === 'requestPrefix' ? 'Request Prefix' : key === 'plant' ? 'Plant' : key;
        this.formError[key] = `${label} is required`;
      }
      if (key === 'requestPrefix' && field?.hasError('pattern')) {
        this.formError[key] = 'Request Prefix can contain only letters and numbers';
      }
    });

    if (Object.keys(this.formError).length > 0) {
      return;
    }

    const selectedPlant = this.numberRangeForm.value.plant as PlantMaster;
    const payload: RequestConfigRequest = {
      configId: this.numberRangeForm.value.configId,
      requestType: this.numberRangeForm.value.requestType,
      requestPrefix: this.numberRangeForm.value.requestPrefix,
      revision: this.numberRangeForm.get('revision')?.value || 1,
      rangeFrom: Number(this.numberRangeForm.value.rangeFrom),
      rangeTo: Number(this.numberRangeForm.value.rangeTo),
      calculateBackward: this.numberRangeForm.value.calculateBackward,
      plantId: selectedPlant?.plantId,
      createdBy: !this.isEditMode ? localStorage.getItem('userRole') || '' : '',
      updatedBy: this.isEditMode ? localStorage.getItem('userRole') || '' : ''
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
          this.submitError = err.error?.message || 'Failed to update number range.';
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
          this.submitError = err.error?.message || 'Failed to create number range.';
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

  onViewConfig(config: RequestConfigVO): void {
    this.formError = {};
    if (!config.plant?.plantId) {
      this.submitError = 'Unable to load the selected configuration because plant information is missing.';
      return;
    }

    this.numberRangeService.getConfigByTypeAndPlant(config.requestType, config.plant.plantId).subscribe({
      next: (result) => {
        result = (result as any).attributes || result;
        this.activeTab = 'create';
        this.isEditMode = true;
        this.pageTitle = 'Edit Number Range';
        this.numberRangeForm.patchValue({
          configId: result.configId,
          requestType: result.requestType,
          requestPrefix: result.requestPrefix,
          revision: result.revision ?? 1,
          rangeFrom: result.rangeFrom,
          rangeTo: result.rangeTo,
          calculateBackward: result.calculateBackward,
          plant: result.plant?.plantId ? this.plants.find(p => p.plantId === result.plant?.plantId) : null
        });
        this.originalFormValue = this.numberRangeForm.getRawValue();
      },
      error: (err) => {
        console.error('Get config error', err);
        this.submitError = err.error?.message || 'Failed to load number range details.';
      }
    });
  }

  onDeleteConfig(config: RequestConfigVO): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Number Range',
      message: `Are you sure you want to delete configuration for ${config.requestType} / ${config.plant?.plantName || 'selected plant'}?`,
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

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) {
      this.filteredConfigs = this.configs;
    } else {
      this.filteredConfigs = this.configs.filter(config =>
        config.requestType.toLowerCase().includes(term) ||
        config.requestPrefix.toLowerCase().includes(term) ||
        config.plant?.plantName.toLowerCase().includes(term)
      );
    }
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
