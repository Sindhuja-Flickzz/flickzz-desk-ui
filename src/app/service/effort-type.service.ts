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

  getActiveEffortTypesByWorkItem(workItem: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/work/item/effort/type/active/list/${workItem}`);
  }

  getEffortTypeAssignments(orgId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/effort/type/assignment/list/${orgId}`);
  }

  createEffortTypeAssignment(request: EffortTypeAssignmentRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket/effort/type/assignment/create`, request);
  }

  deleteEffortTypeAssignment(request: EffortTypeAssignmentDeleteRequest): Observable<any> {
    return this.http.delete(`${this.baseUrl}/ticket/effort/type/assignment/delete`, { body: request });
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

export interface EffortTypeAssignmentRequest {
  workItemId: number;
  effortTypeIds: number[];
  companyId: number;
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
}

export interface EffortTypeAssignmentDeleteRequest {
  companyId: number;
  mappingid: number;
  deletedBy: number;
  isDeletedByAdmin: boolean;
}
