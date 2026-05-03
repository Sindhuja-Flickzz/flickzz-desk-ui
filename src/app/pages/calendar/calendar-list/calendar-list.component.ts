import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { CalendarService } from '../../../service/calendar.service';
import { CalendarMasterVO } from '../../../models/calendar-master';
import { CalendarDetailsModalComponent } from '../calendar-details-modal/calendar-details-modal.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-calendar-list',
  templateUrl: './calendar-list.component.html',
  styleUrls: ['./calendar-list.component.scss']
})
export class CalendarListPageComponent implements OnInit {
  calendars: CalendarMasterVO[] = [];
  filteredCalendars: CalendarMasterVO[] = [];
  searchTerm = '';
  selectedTypeFilter: 'all' | 'support' | 'requestor' = 'all';
  loading = false;
  error: string | null = null;

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  constructor(
    private calendarService: CalendarService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCalendars();
  }

  loadCalendars(): void {
    const userOrgId = localStorage.getItem('userOrgId') || '';
    this.loading = true;
    this.error = null;
    this.calendarService.getAllCalendars(userOrgId).subscribe({
      next: (calendars) => {
        this.calendars = (calendars as any).attributes as CalendarMasterVO[]; // Handle case where response might not have 'object'
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.description || 'Failed to load calendars. Please try again.';
        this.loading = false;
        console.error('Error loading calendars:', err);
      }
    });
  }

  onViewCalendar(calendar: CalendarMasterVO): void {
    this.router.navigate(['/calendar'], {
      queryParams: { mode: 'edit', code: calendar.calendarCode },
      state: { calendar: calendar }
    });
  }

  createSupportCalendar(): void {
    this.router.navigate(['/calendar'], {
      queryParams: { type: 'support' }
    });
  }

  createRequestorCalendar(): void {
    this.router.navigate(['/calendar'], {
      queryParams: { type: 'requestor' }
    });
  }

  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredCalendars = this.calendars.filter(calendar => {
      const typeText = calendar.calendarType?.toString().toLowerCase() || '';
      let termMatch = true;
      if (term) {
        termMatch = (calendar.calendarCode || '').toLowerCase().includes(term)
          || typeText.includes(term);
      }
      return termMatch;
    });

    this.totalRecords = this.filteredCalendars.length;
    this.currentPage = 0; // Reset to first page when filtering
  }

  onDeleteCalendar(calendar: CalendarMasterVO): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Calendar',
      message: `Are you sure you want to delete calendar "${calendar.calendarCode}"?`,
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
      if (result) {
        this.calendarService.deleteCalendar(calendar.calendarCode).subscribe({
          next: () => {
            this.openInfoDialog('Calendar deleted successfully.', 'Success');
            this.loadCalendars();
          },
          error: (err) => {
            this.error = 'Failed to delete calendar. Please try again.';
            console.error('Error deleting calendar:', err);
            this.openInfoDialog(this.error, 'Error');
          }
        });
      }
    });
  }

  onViewDetails(calendar: CalendarMasterVO, listType: 'workdays' | 'holidays'): void {
    this.dialog.open(CalendarDetailsModalComponent, {
      data: { calendar, listType },
      width: '600px'
    });
  }

  openInfoDialog(message: string, title = 'Info'): void {
    this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: {
        title,
        message,
        confirmText: 'OK',
        showCancel: false,
        type: 'info'
      } as ConfirmationDialogData
    });
  }

  getPaginatedCalendars(): CalendarMasterVO[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredCalendars.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}