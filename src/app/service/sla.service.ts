import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';

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

  deleteSlaType(slaId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bp/sla/delete/${slaId}`);
  }
}
