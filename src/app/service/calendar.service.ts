import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarRequest, CalendarMasterVO, CalendarType, CalendarTypeRequest } from '../models/calendar-master';
import { APP_CONSTANTS } from '../data/app_constants';
import { FlickzzDeskResponse } from '../models/authentication-response';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  /**
   * Create a new calendar
   */
  createCalendar(calendarData: CalendarRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/calendar/create`, calendarData);
  }

  /**
   * Get all calendars
   */
  getAllCalendars(userOrgId: string): Observable<FlickzzDeskResponse> {
    return this.http.get<FlickzzDeskResponse>(`${this.baseUrl}/calendar/list/${userOrgId}`);
  }

  /**
   * Get calendar by code
   */
  getCalendarByCode(calendarCode: string): Observable<FlickzzDeskResponse> {
    return this.http.get<FlickzzDeskResponse>(`${this.baseUrl}/calendar/${calendarCode}`);
  }

  /**
   * Update calendar
   */
  updateCalendar(calendarCode: string, calendarData: CalendarRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/calendar/update/${calendarCode}`, calendarData);
  }

  /**
   * Delete calendar
   */
  deleteCalendar(calendarCode: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/calendar/delete/${calendarCode}`);
  }

  /**
   * Get calendar types by orgId
   */
  getCalendarTypes(orgId: number): Observable<CalendarType[]> {
    return this.http.get<CalendarType[]>(`${this.baseUrl}/calendar/type/list/${orgId}`);
  }

  /**
   * Create new calendar type
   */
  createCalendarType(request: CalendarTypeRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/calendar/type/create`, request);
  }

  /**
   * Delete calendar type
   */
  deleteCalendarType(calendarTypeId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/calendar/type/delete/${calendarTypeId}`);
  }
}
