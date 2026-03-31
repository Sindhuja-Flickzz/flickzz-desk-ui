import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
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
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private plantService: PlantService,
    private dialog: MatDialog
  ) {
    this.plantForm = this.fb.group({
      plantId: [null],
      plantName: ['', Validators.required],
      countryId: [null, Validators.required],
      calendarId: [null, Validators.required]
    });
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

    this.plantService.getAllCalendars().subscribe({
      next: (response) => { this.calendars = (response as any).attributes || []; },
      error: () => { this.calendars = []; }
    });

    this.loadPlantList();
    this.loading = false;
  }

  loadPlantList(): void {
    this.plantService.getAllPlants().subscribe({
      next: (result) => {
        this.plants = (result as any).attributes || [];
      },
      error: (err) => {
        console.error('Failed to load plants:', err);
      }
    });
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
  }

  onSave(): void {
    // this.isSubmitting = true;
    this.formError = {};

    Object.keys(this.plantForm.controls).forEach(key => {
        const field = this.plantForm.get(key);
        if (field?.hasError('required')) {
          this.formError[key] = `${key} is required`;
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
          });
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
        },
        error: (err) => {
          console.error('Delete plant error', err);
          this.submitError = err.error?.message || 'Failed to delete plant.';
        }
      });
    });
  }
}
