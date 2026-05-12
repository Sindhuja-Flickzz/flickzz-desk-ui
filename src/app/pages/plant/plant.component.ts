import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { PlantService } from '../../service/plant.service';
import { CountryMasterVO, PlantMaster, PlantMasterRequest } from '../../models/plant-master';
import { CalendarMasterVO } from '../../models/calendar-master';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-plant',
  templateUrl: './plant.component.html',
  styleUrls: ['./plant.component.scss']
})
export class PlantComponent implements OnInit {
  plantForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Plant';
  isEditMode = false;
  originalFormValue: any = null;

  countries: CountryMasterVO[] = [];
  calendars: CalendarMasterVO[] = [];
  plants: PlantMaster[] = [];
  filteredPlants: PlantMaster[] = [];
  searchValue = '';
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;
  userOrgId: string = '';
  error: string | null = null;  

  alphanumericPattern = '^[a-zA-Z0-9 ]+$';

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  constructor(
    private fb: FormBuilder,
    private plantService: PlantService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.plantForm = this.fb.group({
      plantId: [null],
      plantName: ['', Validators.required],
      countryId: [null, Validators.required],
      calendarId: [null, Validators.required]
    });
    this.userOrgId = localStorage.getItem('userOrgId') || '';
  }

  ngOnInit(): void {
    this.loadAllData();

    this.plantForm.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  loadAllData(): void {
    this.loading = true;
    this.plantService.getAllCountries().subscribe({
      next: (response) => { this.countries = (response as any).attributes || []; },
      error: () => { this.countries = []; }
    });

    this.plantService.getAllCalendars(this.userOrgId).subscribe({
      next: (response) => { this.calendars = (response as any).attributes || []; },
      error: () => { this.calendars = []; }
    });

    this.plantForm.patchValue({
        countryId: "",
        calendarId: ""
    });
    this.loadPlantList();
    this.loading = false;
  }

  loadPlantList(): void {
    this.error = null;
    this.plantService.getAllPlants(this.userOrgId).subscribe({
      next: (result) => {
        this.plants = (result as any).attributes || [];
        this.searchValue = '';
        this.filterBySearch();
        this.currentPage = 0; // Reset to first page
      },
      error: (err) => {        
        this.error = err.error?.description || 'Failed to load plants. Please try again.';
        console.error('Failed to load plants:', err);
      }
    });
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'list';  
  }

  backToHome(): void {
    this.router.navigate(['/settings']);
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      this.resetForm();
      this.pageTitle = this.isEditMode ? 'Edit Plant' : 'Create Plant';
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.pageTitle = 'Create Plant';
      this.resetForm();
      this.loadPlantList();
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Create Plant';
    this.plantForm.reset({ isActive: true });
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
    this.plantForm.patchValue({
        countryId: "",
        calendarId: ""
    });
  }

  onSave(): void {
    // this.isSubmitting = true;
    this.formError = {};

    Object.keys(this.plantForm.controls).forEach(key => {
        const field = this.plantForm.get(key);
        if (field?.hasError('required')) {
          this.formError[key] = key === 'plantName' ? 'Plant Name is required' : `${key} is required`;
        }
        if (key === 'plantName' && field?.hasError('pattern')) {
          this.formError[key] = 'Plant Name can contain only letters and numbers';
        }
        return;
    });

     if (Object.keys(this.formError).length === 0) {
      console.log('No errors');
    } else {
      console.log('Errors:', this.formError);
      return
    }

    const payload: PlantMasterRequest = {
      plantId: this.plantForm.value.plantId,
      plantName: this.plantForm.value.plantName,
      countryId: Number(this.plantForm.value.countryId),
      calendarId: Number(this.plantForm.value.calendarId),
      companyId: Number(localStorage.getItem('userOrgId') || 0),
      createdBy: !this.isEditMode ? localStorage.getItem('userRole') || '' : '',
      updatedBy: this.isEditMode ? localStorage.getItem('userRole') || '' : ''
    };

    if (this.isEditMode) {
      if (!this.isFormChanged()) {
        this.submitError = 'No changes to update.';
        return;
      }

      this.plantService.updatePlant(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Plant updated successfully.';
          setTimeout(() => {
            this.plantForm.markAsPristine();
            this.originalFormValue = this.plantForm.getRawValue();
            this.loadPlantList();
            this.activeTab = 'list';
            this.isEditMode = false;
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update plant error', err);
          this.submitError = err.error?.message || 'Failed to update plant.';
        }
      });
    } else {
      this.plantService.createPlant(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Plant created successfully.';
          setTimeout(() => {
            this.loadPlantList();
            this.resetForm();
            this.activeTab = 'list';
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Create plant error', err);
          this.submitError = err.error?.message || 'Failed to create plant.';
        }
      });
    }
  }

  isFormChanged(): boolean {
    if (!this.originalFormValue) {
      return true;
    }
    const current = this.plantForm.getRawValue();
    return JSON.stringify(current) !== JSON.stringify(this.originalFormValue);
  }

  onViewPlant(plant: PlantMaster): void {
    this.formError = {};
    this.activeTab = 'create';
    this.isEditMode = true;
    this.pageTitle = 'Edit Plant';
    this.plantForm.patchValue({
      plantId: plant.plantId,
      plantName: plant.plantName,
      countryId: plant.region?.countryId || null,
      calendarId: plant.calendar?.calendarId || null,
      isActive: plant.isActive,
      createdBy: plant.createdBy,
      updatedBy: plant.updatedBy || plant.createdBy
    });
    this.originalFormValue = this.plantForm.getRawValue();
  }

  onDeletePlant(plant: PlantMaster): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Plant',
      message: `Are you sure you want to delete plant "${plant.plantName}"?`,
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
      this.plantService.deletePlant(plant.plantId).subscribe({
        next: () => {
          this.loadPlantList();
          this.submitSuccess = 'Plant deleted successfully.';
          setTimeout(() => {  
            this.submitSuccess = '';
          }, 1500);
        },
        error: (err) => {
          console.error('Delete plant error', err);
          this.submitError = err.error?.message || 'Failed to delete plant.';
        }
      });
    });
  }

  getPaginatedPlants(): PlantMaster[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredPlants.slice(startIndex, endIndex);
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) {
      this.filteredPlants = this.plants;
    } else {
      this.filteredPlants = this.plants.filter(plant =>
        plant.plantName.toLowerCase().includes(term) ||
        plant.calendar?.calendarCode.toLowerCase().includes(term) ||
        (plant.region && plant.region.countryName && plant.region.countryName.toLowerCase().includes(term))
      );
    }
    this.totalRecords = this.filteredPlants.length;
    this.currentPage = 0;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}
