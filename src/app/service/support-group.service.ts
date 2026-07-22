import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';

@Injectable({
  providedIn: 'root'
})
export class SupportGroupService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) {}

  getAllSupportGroups(businessPartnerId?: number | null): Observable<any> {
    const url = `${this.baseUrl}/bp/config/support-group/${businessPartnerId}`;
    return this.http.get(url);
  }

  createSupportGroup(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bp/support-group/create`, request);
  }

  updateSupportGroup(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bp/support-group/update`, request);
  }

  deleteSupportGroup(supportGroupId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bp/support-group/delete/${supportGroupId}`);
  }
}
