import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { AgentRequest, AgentMaster, AgentSkillsMapping } from '../models/agent-master';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getCompanyList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/company/list`);
  }

  getCalendarList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/settings/calendar/list`);
  }

  getSkillsList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/skills/list`);
  }

  getCountryList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/country/list`);
  }

  createAgent(request: AgentRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/agent/create`, request);
  }

  updateAgent(request: AgentRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/agent/update`, request);
  }

  getAgentList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/agent/list`);
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
}
