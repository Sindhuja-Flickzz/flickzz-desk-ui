import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { RequestType, RequestTypeRequest } from '../models/request-type.model';

@Injectable({
  providedIn: 'root'
})
export class RequestTypeService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getRequestTypes(userOrgId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ritm/request/type/list/${userOrgId}`);
  }

  createRequestTypes(requests: RequestTypeRequest[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/ritm/request/type/create`, requests);
  }

  deleteRequestType(requestTypeId: number, deletedBy: number, isDeletedByAdmin: boolean): Observable<any> {
    const params = new HttpParams()
      .set('deletedBy', deletedBy)
      .set('isDeletedByAdmin', isDeletedByAdmin);

    return this.http.delete(`${this.baseUrl}/ritm/request/type/${requestTypeId}`, { params });
  }
}
