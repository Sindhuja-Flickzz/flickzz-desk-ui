import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { DetailsTemplateRequest } from '../models/details-template.model';

@Injectable({
  providedIn: 'root'
})
export class DetailsTemplateService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  createTemplate(request: DetailsTemplateRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/template/create`, request);
  }

  getWorkItemList(orgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/settings/work/item/list/${orgId}`);
  }

  getFieldTypeList(orgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/settings/field/type/list/${orgId}`);
  }

  getTemplateList(orgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/template/list/${orgId}`);
  }

  getTemplateById(templateId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/template/get/${templateId}`);
  }

  updateTemplate(request: DetailsTemplateRequest & { templateId: number }): Observable<any> {
    return this.http.put(`${this.baseUrl}/template/update`, request);
  }

  deleteTemplate(templateId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/template/${templateId}`);
  }
}
