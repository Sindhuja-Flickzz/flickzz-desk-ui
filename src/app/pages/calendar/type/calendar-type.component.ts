import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { CalendarService } from '../../../service/calendar.service';
import { CalendarType, CalendarTypeRequest } from '../../../models/calendar-master';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-calendar-type',
  templateUrl: './calendar-type.component.html',
  styleUrls: ['./calendar-type.component.scss']
})
export class CalendarTypeComponent implements OnInit {
  calendarTypeForm!: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Add Calendar Type';
  isEditMode = false;
  
  calendarTypes: CalendarType[] = [];
  filteredCalendarTypes: CalendarType[] = [];
  searchValue = '';
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;
  
  typeNameList: string[] = [];

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;
  error: string | null = null;

  alphanumericPattern = '^[a-zA-Z0-9 ]+$';

  constructor(
    private fb: FormBuilder,
    private calendarService: CalendarService,
    private dialog: MatDialog,
    private router: Router  ) {
    this.calendarTypeForm = this.fb.group({
      typeName: ['', [Validators.required, Validators.pattern(this.alphanumericPattern)]]
    });
  }

  ngOnInit(): void {
    this.loadAllData();

    this.calendarTypeForm.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  loadAllData(): void {
    this.loading = true;
    this.loadCalendarTypeList();
    this.loading = false;
  }

  loadCalendarTypeList(): void {
    const orgId = Number(localStorage.getItem('userOrgId') || '0');
    if (orgId) {
      this.calendarService.getCalendarTypes(orgId).subscribe({
        next: (result) => {
          this.calendarTypes = (result as any).attributes || [];
          this.searchValue = '';
          this.filterBySearch();
          this.currentPage = 0;        },
        error: (err) => {
          this.error = err.error?.description || 'Failed to load calendar types. Please try again.';
          console.error('Failed to load calendar types:', err);
          this.calendarTypes = [];
        }
      });
    }
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      this.resetForm();
      this.pageTitle = 'Add Calendar Type';
    }
    if (tab === 'list') {
      this.resetForm();
      this.loadCalendarTypeList();
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Add Calendar Type';
    this.calendarTypeForm.reset();
    this.typeNameList = [];
    this.submitError = '';
    this.submitSuccess = '';
    this.formError = {};
  }

  addTypeName(): void {
    this.submitError = '';
    this.submitSuccess = '';
    const typeName = this.calendarTypeForm.get('typeName')?.value?.trim();
    
    if (!typeName) {
      this.formError['typeName'] = 'Type name is required';
      return;
    }

    if (this.calendarTypeForm.get('typeName')?.hasError('pattern')) {
      this.formError['typeName'] = 'Type name can contain only letters and numbers';
      return;
    }

    // Check for duplicates in the added list
    if (this.typeNameList.some(name => name.toLowerCase() === typeName.toLowerCase())) {
      this.submitError = 'This type name already exists in the list';
      return;
    }

    // Check against existing calendar types
    if (this.calendarTypes.some(type => type.typeName.toLowerCase() === typeName.toLowerCase())) {
      this.submitError = 'This calendar type already exists';
      return;
    }

    this.typeNameList.push(typeName);
    this.calendarTypeForm.get('typeName')?.setValue('');
    this.formError = {};
    this.submitError = '';
  }

  removeTypeName(typeName: string ): void {
    this.submitError = '';
    this.submitSuccess = '';
    this.typeNameList = this.typeNameList.filter(s => s !== typeName);
  }

  onSave(): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    if (this.typeNameList.length === 0) {
      this.submitError = 'Please add at least one calendar type';
      return;
    }

    this.isSubmitting = true;

    const orgId = localStorage.getItem('userOrgId') || '0';
    const userRole = localStorage.getItem('userRole') || '';

    const payload: CalendarTypeRequest = {
      calendarTypeList: this.typeNameList,
      company: orgId,
      createdBy: userRole,
      updatedBy: userRole
    };

    this.calendarService.createCalendarType(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = 'Calendar types created successfully.';
        setTimeout(() => {
          this.resetForm();
          this.loadCalendarTypeList();
          this.activeTab = 'list';
        }, 2000);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Create calendar type error', err);
        this.submitError = err.error?.message || 'Failed to create calendar types.';
      }
    });
  }

  onDeleteCalendarType(calendarType: CalendarType): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Calendar Type',
      message: `Are you sure you want to delete calendar type "${calendarType.typeName}"?`,
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
      this.calendarService.deleteCalendarType(calendarType.calendarTypeId).subscribe({
        next: () => {
          this.loadCalendarTypeList();
          this.submitSuccess = 'Calendar type deleted successfully.';
          setTimeout(() => {
            this.submitSuccess = '';
          }, 1500);
        },
        error: (err) => {
          console.error('Delete calendar type error', err);
          this.submitError = err.error?.message || 'Failed to delete calendar type.';
        }
      });
    });
  }

  getPaginatedCalendarTypes(): CalendarType[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredCalendarTypes.slice(startIndex, endIndex);
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) {
      this.filteredCalendarTypes = this.calendarTypes;
    } else {
      this.filteredCalendarTypes = this.calendarTypes.filter(type =>
        type.typeName.toLowerCase().includes(term) ||
        type.createdBy.toLowerCase().includes(term)
      );
    }
    this.totalRecords = this.filteredCalendarTypes.length;
    this.currentPage = 0;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }  
  cancelForm(): void {
    this.router.navigate(['/calendar']);
  }
}
