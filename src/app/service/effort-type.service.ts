import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { EffortTypeRequest, EffortTypeStatusChangeRequest } from '../models/effort-type.model';

@Injectable({
  providedIn: 'root'
})
export class EffortTypeService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  createEffortType(request: EffortTypeRequest[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket/effort/type/create`, request);
  }

  getEffortTypes(orgId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/effort/type/list/${orgId}`);
  }  

  getActiveEffortTypes(orgId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/effort/type/active/list/${orgId}`);
  }

  deleteEffortType(effortId: number, orgId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/ticket/effort/type/delete`, {
      params: { effortId: String(effortId), orgId: String(orgId) }
    });
  }

  changeEffortTypeStatus(request: EffortTypeStatusChangeRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket/effort/type/status/change`, request);
  }
}
