import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS, USER_ROLES } from '../data/app_constants';

@Injectable({ providedIn: 'root' })
export class SlaService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getAllSlaTypes(businessPartnerId?: number | null): Observable<any> {
    const url = businessPartnerId ? `${this.baseUrl}/bp/config/sla/${businessPartnerId}` : `${this.baseUrl}/bp/sla/list`;
    return this.http.get<any>(url);
  }

  createSlaType(request: any): Observable<any> {
    const url = `${this.baseUrl}/bp/sla/create`;
    return this.http.post(url, request);
  }

  updateSlaType(request: any): Observable<any> {
    const url = `${this.baseUrl}/bp/sla/update`;
    return this.http.post(url, request);
  }

  deleteSlaType(slaId: number, remarks?: string): Observable<any> {
    const payload = {
      slaId,
      remarks: remarks || '',
      deletedBy: Number(localStorage.getItem('userId') || 0),
      isDeletedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };
    return this.http.delete(`${this.baseUrl}/bp/sla/delete/${slaId}`, { body: payload });
  }
}
