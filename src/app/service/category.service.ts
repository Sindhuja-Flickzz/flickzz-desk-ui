import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) {}

  getAllCategories(businessPartnerId?: number | null): Observable<any> {
    const url = businessPartnerId
      ? `${this.baseUrl}/bp/config/category/${businessPartnerId}`
      : `${this.baseUrl}/bp/category/list`;
    return this.http.get(url);
  }

  createCategory(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bp/category/create`, request);
  }

  updateCategory(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bp/category/update`, request);
  }

  deleteCategory(categoryId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bp/category/delete/${categoryId}`);
  }
}
