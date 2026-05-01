import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { RequestConfigRequest, RequestConfigVO } from '../models/number-range';

@Injectable({
  providedIn: 'root'
})
export class NumberRangeService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getAllConfigs(): Observable<RequestConfigVO[]> {
    return this.http.get<RequestConfigVO[]>(`${this.baseUrl}/request/config/list`);
  }

  getConfigByTypeAndPlant(requestType: string, plantId: number): Observable<RequestConfigVO> {
    return this.http.get<RequestConfigVO>(`${this.baseUrl}/request/config/${requestType}/${plantId}`);
  }

  createConfig(request: RequestConfigRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/request/config/create`, request);
  }

  updateConfig(request: RequestConfigRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/request/config/update`, request);
  }

  deleteConfig(configId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/request/config/delete/${configId}`);
  }
}
