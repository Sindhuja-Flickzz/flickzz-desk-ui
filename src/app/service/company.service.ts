import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { CountryMaster, CompanyMaster, CompanyRequest, EnquiryRegistration, StateMaster, CompanyRole } from '../models/company-master';
import { CityMaster } from '../models/city-master';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getAllCountries(): Observable<CountryMaster[]> {
    return this.http.get<CountryMaster[]>(`${this.baseUrl}/country/list`);
  }

  getStateList(countryId: number): Observable<StateMaster[]> {
    return this.http.get<StateMaster[]>(`${this.baseUrl}/state/${countryId}`);
  }

  getCitiesByState(stateId: number): Observable<CityMaster[]> {
    return this.http.get<CityMaster[]>(`${this.baseUrl}/city/state/list/${stateId}`);
  }
  getAllStates(): Observable<StateMaster[]> {
    return this.http.get<StateMaster[]>(`${this.baseUrl}/state/list`);
  }

  getAllCities(): Observable<CityMaster[]> {
    return this.http.get<CityMaster[]>(`${this.baseUrl}/city/list`);
  }

  getAllCompanies(): Observable<CompanyMaster[]> {
    return this.http.get<CompanyMaster[]>(`${this.baseUrl}/company/list`);
  }

  getServiceProviderList(orgId: number): Observable<CompanyRole[]> {
     return this.http.get<CompanyRole[]>(`${this.baseUrl}/company/provider/list/${orgId}`);
  }

  // getEnquiryByUserEmail(userEmail: string): Observable<EnquiryRegistration> {
  //   return this.http.get<EnquiryRegistration>(`${this.baseUrl}/enquiry/${userEmail}`);
  // }

  getCompanyInfoByUserEmail(userEmail: string): Observable<EnquiryRegistration> {
    return this.http.get<EnquiryRegistration>(`${this.baseUrl}/enquiry/company/${userEmail}`);
  }

  createCompany(request: CompanyRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/company/create`, request);
  }

  updateCompany(request: CompanyRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/company/update`, request);
  }

  deleteCompany(companyId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/company/delete/${companyId}`);
  }

  getCompanyById(companyId: number): Observable<CompanyMaster> {
    return this.http.get<CompanyMaster>(`${this.baseUrl}/company/${companyId}`);
  }
}