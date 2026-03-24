import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarRequest } from '../models/calendar-master';
import { APP_CONSTANTS } from '../data/app_constants';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  
  private settingsApiUrl = APP_CONSTANTS.API_BASE_URL + '/settings'

  constructor(private http: HttpClient) { }

  /**
   * Create a new calendar
   */
  createCalendar(calendarData: CalendarRequest): Observable<any> {
    return this.http.post(`${this.settingsApiUrl}/calendar/create`, calendarData);
  }

  // /**
  //  * Get all calendars
  //  */
  // getAllCalendars(): Observable<CalendarMasterVO[]> {
  //   return this.http.get<CalendarMasterVO[]>(`${this.apiUrl}`);
  // }

  // /**
  //  * Get calendar by ID
  //  */
  // getCalendarById(calendarId: number): Observable<CalendarMasterVO> {
  //   return this.http.get<CalendarMasterVO>(`${this.apiUrl}/${calendarId}`);
  // }

  // /**
  //  * Update calendar
  //  */
  // updateCalendar(calendarId: number, calendarData: CalendarRequest): Observable<any> {
  //   return this.http.put(`${this.apiUrl}/${calendarId}/update`, calendarData);
  // }

  // /**
  //  * Delete calendar
  //  */
  // deleteCalendar(calendarId: number): Observable<any> {
  //   return this.http.delete(`${this.apiUrl}/${calendarId}`);
  // }
}
