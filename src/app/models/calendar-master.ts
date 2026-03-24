import { CalendarHolidayVO } from './calendar-holiday';

// export interface CalendarMasterVO {
//   calendarId?: number;
//   calendarCode: string;
//   calendarType: string;
//   validFrom: number; // Year only (YYYY format)
//   validTo: number; // Year only (YYYY format)
//   workingDays: string[]; // Array of weekday names (Monday, Tuesday, etc.)
//   holidays: CalendarHolidayVO[];
//   workFrom: string; // DateTime format
//   workTo: string; // DateTime format
//   timezone: string;
// }

export interface CalendarRequest {
  calendarCode: string;
  calendarType: string;
  validFrom: Date;
  validTo: Date;
  workingDays: string[];
  holidays: CalendarHolidayVO[];
  workFrom: string;
  workTo: string;
  timezone: string;
}
