import { CalendarHolidayVO } from './calendar-holiday';

export interface CalendarMasterVO {
  calendarId?: number;
  calendarCode: string;
  calendarType: CalendarType;
  validFrom: string; // Full date string (ISO format)
  validTo: string; // Full date string (ISO format)
  workdays: WorkdayVO[]; // Array of workday objects
  holidays: CalendarHolidayVO[];
  workFrom: string; // Time format HH:MM
  workTo: string; // Time format HH:MM
  timezone: string;
  isActive: boolean;
}

export interface WorkdayVO {
  workdayId?: number;
  workday: string; // Day name (Monday, Tuesday, etc.)
  isActive: boolean;
}

export interface CalendarRequest {
  calendarCode: string;
  calendarType: number;
  company: number;
  validFrom: String;
  validTo: String;
  workingDays: string[];
  holidays: CalendarHolidayVO[];
  workFrom: string;
  workTo: string;
  timezone: string;
  createdBy: string;
  updatedBy: string;
}

export interface CalendarType {
  calendarTypeId: number;
  typeName: string;
  createdBy: string;
}

export interface CalendarTypeRequest {
  calendarTypeList: string[];
  company: string;
  createdBy: string;
  updatedBy: string;
}
