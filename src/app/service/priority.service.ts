import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { PriorityMaster, PriorityRequest } from '../models/priority-master';
import { CompanyMaster } from '../models/company-master';

@Injectable({
  providedIn: 'root'
})
export class PriorityService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getAllCompanies(): Observable<CompanyMaster[]> {
    return this.http.get<CompanyMaster[]>(`${this.baseUrl}/company/list`);
  }

  getAllPriorities(): Observable<PriorityMaster[]> {
    return this.http.get<PriorityMaster[]>(`${this.baseUrl}/priority/list`);
  }

  createPriority(request: PriorityRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/priority/create`, request);
  }

  updatePriority(request: PriorityRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/priority/update`, request);
  }

  deletePriority(priorityId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/priority/delete/${priorityId}`);
  }

  getPriorityById(priorityId: number): Observable<PriorityMaster> {
    return this.http.get<PriorityMaster>(`${this.baseUrl}/priority/${priorityId}`);
  }
}