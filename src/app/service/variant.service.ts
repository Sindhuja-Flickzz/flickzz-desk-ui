import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { VariantRequest } from '../models/variant.model';

@Injectable({
  providedIn: 'root'
})
export class VariantService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  createTemplate(request: VariantRequest): Observable<any> {
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

  getTemplateDetails(orgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/template/details/${orgId}`);
  }

  getWorkItemTemplates(workItemCode: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/template/workItem/list/${workItemCode}`);
  }

  createTemplateDetail(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/template/details/create`, request);
  }

  updateTemplateDetail(request: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/template/details/update`, request);
  }

  deleteTemplateDetail(fieldId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/template/details/${fieldId}`);
  }

  getTemplateById(templateId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/template/get/${templateId}`);
  }

  updateTemplate(request: VariantRequest & { templateId: number }): Observable<any> {
    return this.http.put(`${this.baseUrl}/template/update`, request);
  }

  deleteTemplate(templateId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/template/${templateId}`);
  }
  
  getDefaultTemplateList(orgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/template/details/default/${orgId}`);
  }
  
  deleteDefaultTemplateDetail(request: {
    fieldId: number;
    companyId: number;
    updatedBy: number;
    isUpdatedByAdmin: boolean;
  }): Observable<any> {
    return this.http.delete(`${this.baseUrl}/template/details/default`, { body: request });
  }
}
