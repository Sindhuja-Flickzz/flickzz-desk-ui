import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { AgentRequest, AgentMaster, AgentSkillsMapping, CountryMasterVO } from '../models/agent-master';
import { CountryMaster, EnquiryRegistration } from '../models/company-master';
import { CityMaster } from '../models/city-master';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  
  getAllCountries(): Observable<CountryMaster[]> {
    return this.http.get<CountryMaster[]>(`${this.baseUrl}/country/list`);
  }
  
  getAllCities(): Observable<CityMaster[]> {
    return this.http.get<CityMaster[]>(`${this.baseUrl}/city/list`);
  }

  getCompanyList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/company/list`);
  }

  getCalendarList(userOrgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/calendar/list/${userOrgId}`);
  }

  getSkillsList(userOrgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/skills/list/${userOrgId}`);
  }
  getCountryList(): Observable<CountryMasterVO[]> {
    return this.http.get<CountryMasterVO[]>(`${this.baseUrl}/country/list`);
  }
  getCityListByCountry(countryId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/city/country/list/${countryId}`);
  }

  getLanguageList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/language/list`);
  }

  createAgent(request: AgentRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/agent/create`, request);
  }

  updateAgent(request: AgentRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/agent/update`, request);
  }

  getAgentList(userOrgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/agent/list/${userOrgId}`);
  }

  getAgentInfoByName(agentName: string): Observable<AgentMaster> {
    return this.http.get<AgentMaster>(`${this.baseUrl}/agent/get/${agentName}`);
  }

  getAgentSkills(agentId: number): Observable<AgentSkillsMapping[]> {
    return this.http.get<AgentSkillsMapping[]>(`${this.baseUrl}/agent/skills/${agentId}`);
  }

  deleteAgent(agentId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/agent/delete/${agentId}`);
  }

  getEnquiryByEmail(userEmail: string): Observable<EnquiryRegistration> {
    return this.http.get<EnquiryRegistration>(`${this.baseUrl}/enquiry/${userEmail}`);
  }

  getAgentInfoByEmail(userEmail: string): Observable<AgentMaster> {
    return this.http.get<AgentMaster>(`${this.baseUrl}/agent/email/${userEmail}`);
  }
}
