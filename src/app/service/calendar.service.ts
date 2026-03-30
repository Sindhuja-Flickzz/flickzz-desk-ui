import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarRequest, CalendarMasterVO } from '../models/calendar-master';
import { APP_CONSTANTS } from '../data/app_constants';
import { FlickzzDeskResponse } from '../models/authentication-response';

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

  /**
   * Get all calendars
   */
  getAllCalendars(): Observable<FlickzzDeskResponse> {
    return this.http.get<FlickzzDeskResponse>(`${this.settingsApiUrl}/calendar/list`);
  }

  /**
   * Get calendar by code
   */
  getCalendarByCode(calendarCode: string): Observable<FlickzzDeskResponse> {
    return this.http.get<FlickzzDeskResponse>(`${this.settingsApiUrl}/calendar/${calendarCode}`);
  }

  /**
   * Update calendar
   */
  updateCalendar(calendarCode: string, calendarData: CalendarRequest): Observable<any> {
    return this.http.post(`${this.settingsApiUrl}/calendar/update/${calendarCode}`, calendarData);
  }

  /**
   * Delete calendar
   */
  deleteCalendar(calendarCode: string): Observable<any> {
    return this.http.delete(`${APP_CONSTANTS.API_BASE_URL}/settings/calendar/delete/${calendarCode}`);
  }
}
