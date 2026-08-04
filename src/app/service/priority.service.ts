import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { PriorityMaster, TicketTypeMaster } from '../models/priority-master';
import { USER_ROLES } from 'src/app/data/app_constants';

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
    const url = `${this.baseUrl}/bp/priority/update`;
    return this.http.post(url, request);
  }

  deletePriority(priorityId: number, remarks?: string): Observable<any> {
    const payload = {
      priorityId,
      remarks: remarks || '',
      deletedBy: Number(localStorage.getItem('userId') || 0),
      isDeletedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };
    return this.http.delete(`${this.baseUrl}/bp/priority/delete`, { body: payload });
  }

  getPriorityById(priorityId: number): Observable<PriorityMaster> {
    return this.http.get<PriorityMaster>(`${this.baseUrl}/bp/priority/${priorityId}`);
  }
}