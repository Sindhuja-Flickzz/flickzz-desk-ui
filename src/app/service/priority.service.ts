import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { PriorityMaster, TicketTypeMaster } from '../models/priority-master';

@Injectable({
  providedIn: 'root'
})
export class PriorityService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getAllPriorities(businessPartnerId?: number | null): Observable<PriorityMaster[]> {
    const url = `${this.baseUrl}/bp/config/priority/${businessPartnerId}`;
    return this.http.get<PriorityMaster[]>(url);
  }

  getTicketTypes(): Observable<TicketTypeMaster[]> {
    return this.http.get<TicketTypeMaster[]>(`${this.baseUrl}/ticket/type/list`);
  }

  createPriority(request: any, businessPartnerId?: number | null): Observable<any> {
    const url = `${this.baseUrl}/bp/priority/create`;
    return this.http.post(url, request);
  }

  updatePriority(request: any, businessPartnerId?: number | null): Observable<any> {
    const url = businessPartnerId ? `${this.baseUrl}/priority/update/${businessPartnerId}` : `${this.baseUrl}/priority/update`;
    return this.http.post(url, request);
  }

  deletePriority(priorityId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/priority/delete/${priorityId}`);
  }

  getPriorityById(priorityId: number): Observable<PriorityMaster> {
    return this.http.get<PriorityMaster>(`${this.baseUrl}/priority/${priorityId}`);
  }
}