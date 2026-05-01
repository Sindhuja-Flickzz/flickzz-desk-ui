import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { BusinessService, BusinessServiceRequest } from '../models/business-offering';

@Injectable({
  providedIn: 'root'
})
export class BusinessOfferingService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getAllBusinessServices(): Observable<BusinessService[]> {
    return this.http.get<BusinessService[]>(`${this.baseUrl}/settings/business/service/list`);
  }

  createBusinessService(request: BusinessServiceRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/settings/business/service/create`, request);
  }

  updateBusinessService(request: BusinessServiceRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/settings/business/service/update`, request);
  }

  deleteBusinessService(serviceId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/settings/business/service/delete/${serviceId}`);
  }
}
