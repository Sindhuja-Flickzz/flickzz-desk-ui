import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS, USER_ROLES } from '../data/app_constants';

@Injectable({
  providedIn: 'root'
})
export class SupportCategoryService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) {}

  getSupportGroups(businessPartnerId?: number | null): Observable<any> {
    const url = `${this.baseUrl}/bp/config/support-group/${businessPartnerId}`;
    return this.http.get(url);
  }

  getSubCategories(businessPartnerId?: number | null): Observable<any> {
    const url = `${this.baseUrl}/bp/config/sub-category/${businessPartnerId}`;
    return this.http.get(url);
  }

  getAllAssignments(businessPartnerId?: number | null): Observable<any> {
    const url = `${this.baseUrl}/bp/config/assignment/${businessPartnerId}`;
    return this.http.get(url);
  }

  createAssignment(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bp/assignment/create`, request);
  }

  updateAssignment(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bp/assignment/update`, request);
  }

  deleteAssignment(assignmentId: number, remarks?: string): Observable<any> {
    const payload = {
      assignmentId,
      remarks: remarks || '',
      deletedBy: Number(localStorage.getItem('userId') || 0),
      isDeletedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };
    return this.http.delete(`${this.baseUrl}/bp/assignment/delete/${assignmentId}`, { body: payload });
  }
}
