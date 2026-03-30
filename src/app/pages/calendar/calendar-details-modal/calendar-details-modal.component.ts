import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CalendarMasterVO, WorkdayVO } from '../../../models/calendar-master';
import { CalendarHolidayVO } from '../../../models/calendar-holiday';

export interface CalendarDetailsModalData {
  calendar: CalendarMasterVO;
  listType: 'workdays' | 'holidays';
}

@Component({
  selector: 'app-calendar-details-modal',
  templateUrl: './calendar-details-modal.component.html',
  styleUrls: ['./calendar-details-modal.component.scss']
})
export class CalendarDetailsModalComponent {
  title!: string;
  displayedColumns!: string[];
  dataSource!: any[];

  constructor(
    public dialogRef: MatDialogRef<CalendarDetailsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CalendarDetailsModalData
  ) {
    this.initializeModal();
  }

  private initializeModal(): void {
    if (this.data.listType === 'workdays') {
      this.title = `Workdays for ${this.data.calendar.calendarCode}`;
      this.displayedColumns = ['workday', 'isActive'];
      this.dataSource = this.data.calendar.workdays || [];
    } else if (this.data.listType === 'holidays') {
      this.title = `Holidays for ${this.data.calendar.calendarCode}`;
      this.displayedColumns = ['holidayDate', 'description', 'isActive'];
      this.dataSource = this.data.calendar.holidays || [];
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
}