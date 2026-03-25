import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { CalendarService } from '../../../serives/calendar.service';
import { DateUtilsService } from '../../../serives/date.util.Service ';
import { CalendarRequest } from '../../../models/calendar-master';
import { CalendarHolidayVO } from '../../../models/calendar-holiday';
import { DAYS_OF_WEEK, TIMEZONES } from 'src/app/data/app_constants';

@Component({
  selector: 'app-create-support-calendar',
  templateUrl: './create-support-calendar.component.html',
  styleUrls: ['./create-support-calendar.component.scss']
})
export class CreateSupportCalendarComponent implements OnInit, OnDestroy {
  calendarForm!: FormGroup;
  submitting = false;
  submitError = '';
  submitSuccess = false;
  formSubmitted = false;
  disableValidTo = true;
  disableholiday = true;

  daysOfWeek = DAYS_OF_WEEK;
  timezones = TIMEZONES;
  // Date restrictions
  minValidFromDate: string = new Date().toISOString().split('T')[0];
  minValidToDate: string = new Date().toISOString().split('T')[0];
  maxValidToDate: string = new Date().toISOString().split('T')[0];
  holidayMinDate: string = new Date().toISOString().split('T')[0];
  holidayMaxDate: string = new Date().toISOString().split('T')[0];

  newHoliday!: FormGroup;
  newHolidayErrors: { [key: string]: string } = {};
  fieldErrors: any = {};
  dateValidator: any;

  constructor(
    private fb: FormBuilder,
    private calendarService: CalendarService,
    private dateUtils: DateUtilsService
  ) {
    this.dateValidator = this.dateUtils.dateValidator.bind(this.dateUtils);
   }
  ngOnDestroy(): void {
    this.formSubmitted = false;
    this.calendarForm.reset();
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.calendarForm = this.fb.group({
      calendarCode: ['', [Validators.required, this.alphanumericValidator.bind(this)]],
      calendarType: ['Support', Validators.required],
      validFrom: ['', [Validators.required, this.dateValidator.bind(this)]],
      validTo: ['', [Validators.required, this.dateValidator.bind(this)]],
      workingDays: this.fb.array(this.createDaysCheckboxes()),
      holidayDate: ['', [Validators.required, this.dateValidator.bind(this)]],
      description: ['', Validators.required],
      holidays: this.fb.array([]),
      timeFrom: ['', Validators.required],
      timeTo: ['', Validators.required],
      timezone: ['', Validators.required],
    });

    this.newHoliday = this.fb.group({
      holidayDate: ['', [Validators.required, this.dateValidator.bind(this)]],
      description: ['', Validators.required]
    });
  }

  createDaysCheckboxes(): any[] {
    return this.daysOfWeek.map(() => this.fb.control(false));
  }

  createHolidayGroup(): FormGroup {
    return this.fb.group({
      holidayDate: ['', [Validators.required, this.dateValidator.bind(this)]],
      description: ['', Validators.required]
    });
  }

  calculateValidToDates(): void {
    this.fieldErrors['validFrom'] = null;
    this.disableValidTo = false;
    this.disableholiday = true;
    this.calendarForm.get('validTo')?.reset();
    const validFromControl = this.calendarForm.get('validFrom');
    this.minValidToDate = validFromControl?.value ? this.dateUtils.getNextDate(new Date(validFromControl.value)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    this.maxValidToDate = validFromControl?.value ? this.dateUtils.getNextYearDate(new Date(validFromControl.value)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  }
  
  calculateHolidayDates(): void {
    this.fieldErrors['validTo'] = null;
    this.disableholiday = false;
    this.calendarForm.get('holidayDate')?.reset();
    const validFromControl = this.calendarForm.get('validFrom');
    const validToControl = this.calendarForm.get('validTo');
    this.holidayMinDate = validFromControl?.value ? this.dateUtils.getCurrentDate(new Date(validFromControl.value)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    this.holidayMaxDate = validToControl?.value ? this.dateUtils.getCurrentDate(new Date(validToControl.value)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  }

  get holidaysArray(): FormArray {
    return this.calendarForm.get('holidays') as FormArray;
  }

  get workingDaysArray(): FormArray {
    return this.calendarForm.get('workingDays') as FormArray;
  }

  getDayControl(index: number): FormControl {
    return this.workingDaysArray.at(index) as FormControl;
  }

  addHoliday(): void {
    // Clear previous errors
    this.newHolidayErrors = {};    

    // Get values
    const holidayDate = this.newHoliday.get('holidayDate')?.value?.trim();
    const description = this.newHoliday.get('description')?.value?.trim();

    // Validate required fields
    let hasErrors = false;

    if (!holidayDate) {
      this.newHolidayErrors['holidayDate'] = 'Date is required';
      hasErrors = true;
    }

    if (!description) {
      this.newHolidayErrors['description'] = 'Description is required';
      hasErrors = true;
    }

    // Check for date uniqueness
    if (holidayDate) {
      this.newHolidayErrors['holidayDate'] = '';
      this.fieldErrors['holidays'] = null;
      const existingDates = this.holidaysArray.value.map((h: any) => h.holidayDate);
      if (existingDates.includes(holidayDate)) {
        this.newHolidayErrors['holidayDate'] = 'Holiday already added for this date';
        hasErrors = true;
      }
    }

    // If there are errors, don't proceed
    if (hasErrors) {
      return;
    }

    // Create and add the holiday
    const holiday = this.createHolidayGroup();
    holiday.patchValue({
      holidayDate: holidayDate,
      description: description
    });

    this.holidaysArray.push(holiday);
    this.newHoliday.reset();
    this.newHolidayErrors = {};
  }

  removeHoliday(index: number): void {
    if (index >= 0 && index < this.holidaysArray.length) {
      this.holidaysArray.removeAt(index);
    }
  }

  // Custom Validators
  alphanumericValidator(control: any): { [key: string]: any } | null {
    if (!control.value) {
      return null;
    }
    const regex = /^[a-zA-Z0-9]+$/;
    return regex.test(control.value) ? null : { 'alphanumeric': { value: control.value } };
  }

  onTimeChange(event: Event) {
    this.fieldErrors[(event.target as HTMLInputElement).id] = null;
    const input = event.target as HTMLInputElement;
    const rawValue = input.value; // e.g. "09:30" or "09:30:00"
    // Force to HH:MM only
    const formatted = rawValue.substring(0,5);
    // Update the appropriate time field
    if (input.id === 'timeFrom') {
      this.calendarForm.get('timeFrom')?.setValue(formatted);
    } else if (input.id === 'timeTo') {
      this.calendarForm.get('timeTo')?.setValue(formatted);
    }

    // Validate timeFrom is earlier than timeTo
    this.validateTimeRange();
  }

  validateTimeRange(): void {
    const timeFrom = this.calendarForm.get('timeFrom')?.value;
    const timeTo = this.calendarForm.get('timeTo')?.value;

    // Clear previous time validation errors
    this.fieldErrors['timeFrom'] = null;
    this.fieldErrors['timeTo'] = null;

    if (timeFrom && timeTo) {
      const fromTime = new Date(`1970-01-01T${timeFrom}:00`);
      const toTime = new Date(`1970-01-01T${timeTo}:00`);

      if (fromTime >= toTime) {
        this.calendarForm.get('timeTo')?.reset();
        this.fieldErrors['timeFrom'] = 'From time must be earlier than To time';
        this.fieldErrors['timeTo'] = 'To time must be later than From time';
      }      
    }
  }


  onSubmit(): void {
    this.formSubmitted = true;
    this.fieldErrors = {};

    this.getFieldError();

    const selectedDays = this.daysOfWeek.filter((_, index) =>
      this.workingDaysArray.at(index).value
    );

    if (selectedDays.length === 0) {
      this.fieldErrors['workingDays'] = 'Please select at least one working day';
    }

    const holidays: CalendarHolidayVO[] = this.holidaysArray.value;
    if (holidays.length === 0) {
      this.fieldErrors['holidays'] = 'Please add at least one holiday';
    }

    if (Object.keys(this.fieldErrors).length === 0) {
      console.log('No errors');
    } else {
      console.log('Errors:', this.fieldErrors);
      return
    }

    const calendarData: CalendarRequest = {
      calendarCode: this.calendarForm.get('calendarCode')?.value,
      calendarType: this.calendarForm.get('calendarType')?.value,
      validFrom: this.dateUtils.formatToDDMMYYYY(new Date(this.calendarForm.get('validFrom')?.value)),
      validTo: this.dateUtils.formatToDDMMYYYY(new Date(this.calendarForm.get('validTo')?.value)),
      workingDays: selectedDays,
      holidays: holidays,
      workFrom: this.calendarForm.get('timeFrom')?.value,
      workTo: this.calendarForm.get('timeTo')?.value,
      timezone: this.calendarForm.get('timezone')?.value
    };

    this.submitting = true;
    this.submitError = '';
    this.submitSuccess = false;

    this.calendarService.createCalendar(calendarData).subscribe({
      next: () => {
        this.formSubmitted = false;
        this.submitting = false;
        this.submitSuccess = true;
        this.submitError = '';
        // Reset form after successful submission
        setTimeout(() => {
          this.calendarForm.reset();
          this.initializeForm();
        }, 2000);
      },
      error: (error) => {
        this.submitting = false;
        this.submitError = error.error?.description || 'Failed to create calendar. Please try again.';
      }
    });
  }

  getFieldError(): string {    
    this.formSubmitted = false; // Reset formSubmitted to avoid showing errors on initial load
    Object.keys(this.calendarForm.controls).forEach(key => {
      const field = this.calendarForm.get(key);
      if (key != 'holidayDate' && key != 'description') {
        if (field?.hasError('required')) {
          this.fieldErrors[key] = `${key} is required`;
          return `${key} is required`;
        }
        if (field?.hasError('alphanumeric')) {
          return 'Calendar code must be alphanumeric';
        }
        if (field?.hasError('invalidDateFormat')) {
          return 'Date format must be DD.MM.YYYY';
        }
        if (field?.hasError('invalidDate')) {
          return 'Invalid date';
        }
        if (field?.hasError('pastDate')) {
          return 'Date must be in the future';
        }
      }
      
      return '';
    });
    return '';
  }
}
