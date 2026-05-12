import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { CompanyMaster } from '../models/company-master';
import { ImpactMasterVO, ImpactRequest } from '../models/impact-master';

@Injectable({
  providedIn: 'root'
})
export class ImpactService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getCompanyList(): Observable<CompanyMaster[]> {
    return this.http.get<CompanyMaster[]>(`${this.baseUrl}/company/list`);
  }

  getImpactList(orgId: number): Observable<ImpactMasterVO[]> {
    return this.http.get<ImpactMasterVO[]>(`${this.baseUrl}/impact/list/${orgId}`);
  }

  getImpactById(impactId: number): Observable<ImpactMasterVO> {
    return this.http.get<ImpactMasterVO>(`${this.baseUrl}/impact/${impactId}`);
  }

  createImpact(request: ImpactRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/impact/create`, request);
  }

  updateImpact(request: ImpactRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/impact/update`, request);
  }

  deleteImpact(impactId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/impact/delete/${impactId}`);
  }
}
