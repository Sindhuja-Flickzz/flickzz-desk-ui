import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { APP_CONSTANTS, USER_ROLES } from '../data/app_constants';

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

  getSupportGroupById(supportGroupId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/bp/support-group/${supportGroupId}`);
  }

  getSupportGroupInfo(supportGroupId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/bp/support-group/info/${supportGroupId}`);
  }

  getSupportGroupBySubCategory(subCategoryId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/bp/get/support-group/${subCategoryId}`);
  }

  getSupportGroupIdsForAgent(agentId: number, orgId: number): Observable<number[]> {
    return this.http.get<any>(`${this.baseUrl}/agent/support-group/list/${agentId}/${orgId}`).pipe(
      map((response: any) => this.extractNumberList(response))
    );
  }

  getSupportGroupUsers(supportGroupIds: number[]): Observable<any[]> {
    const payload = this.normalizeNumberList(supportGroupIds);
    return this.http.post<any>(`${this.baseUrl}/agent/support-group/users`, payload).pipe(
      map((response: any) => this.extractAttributes(response, true))
    );
  }

  getUnassignedRequestsForSupportGroups(supportGroupIds: number[]): Observable<any[]> {
    const payload = { supportGroupIds: this.normalizeNumberList(supportGroupIds) };
    return this.http.post<any>(`${this.baseUrl}/ritm/assigned`, payload).pipe(
      map((response: any) => this.extractAttributes(response, true))
    );
  }

  getAssignedRequestsForAgent(agentId: number): Observable<any[]> {
    const payload = { agentId : agentId };
    return this.http.post<any>(`${this.baseUrl}/ritm/assigned`, payload).pipe(
      map((response: any) => this.extractAttributes(response, true))
    );
  }

  getUnassignedRequestsForSupportGroup(supportGroupId: number): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/ritm/unassigned/${supportGroupId}`).pipe(
      map((response: any) => this.extractAttributes(response, true))
    );
  }

  getRequestsByStatus(statusId: number, supportGroupId: number): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/ritm/status/list/${statusId}/${supportGroupId}`).pipe(
      map((response: any) => this.extractAttributes(response, true))
    );
  }

  createSupportGroup(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bp/support-group/create`, request);
  }

  updateSupportGroup(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bp/support-group/update`, request);
  }

  deleteSupportGroup(supportGroupId: number, remarks?: string): Observable<any> {
    const payload = {
      supportGroupId,
      remarks: remarks || '',
      deletedBy: Number(localStorage.getItem('userId') || 0),
      isDeletedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };
    return this.http.delete(`${this.baseUrl}/bp/support-group/delete/${supportGroupId}`, { body: payload });
  }

  private normalizeNumberList(values: Array<number | null | undefined>): number[] {
    return Array.from(new Set((values || []).filter((value): value is number => value != null && !Number.isNaN(Number(value))))).map(Number);
  }

  private extractNumberList(response: any): number[] {
    const attributes = Array.isArray(response?.attributes) ? response.attributes : Array.isArray(response) ? response : [];
    return this.normalizeNumberList(attributes.map((item: any) => Number(item)));
  }

  private extractAttributes(response: any, allowRawArray = false): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.attributes)) {
      return response.attributes;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (allowRawArray && response && Array.isArray(response?.items)) {
      return response.items;
    }
    return response ? [response] : [];
  }
}
