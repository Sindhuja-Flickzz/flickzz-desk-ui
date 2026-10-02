import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';

@Injectable({
  providedIn: 'root'
})
export class RequestApproverService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getConfigurations(orgId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/request/approver/config/list/${orgId}`);
  }

  getApproverConfigurations(companyId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/request/approver/config/list/${companyId}`);
  }

  createConfiguration(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/request/approver/config/create`, request);
  }

  updateConfiguration(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/request/approver/config/update`, request);
  }

  deleteConfiguration(configurationId: number, deletedBy: number, isDeletedByAdmin: boolean): Observable<any> {
    const params = new HttpParams()
          .set('deletedBy', deletedBy)
          .set('isDeletedByAdmin', isDeletedByAdmin);
    return this.http.delete(`${this.baseUrl}/request/approver/config/delete/${configurationId}`, { params });
  }
}
