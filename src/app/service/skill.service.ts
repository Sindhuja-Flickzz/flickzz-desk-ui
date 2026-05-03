import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { SkillMaster, SkillRequest } from '../models/skill-master';

@Injectable({
  providedIn: 'root'
})
export class SkillService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getAllSkills(userOrgId: string): Observable<SkillMaster[]> {
    return this.http.get<SkillMaster[]>(`${this.baseUrl}/skills/list/${userOrgId}`);
  }

  createSkills(requests: SkillRequest[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/skills/create`, requests);
  }

  updateSkill(request: SkillRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/skills/update`, request);
  }

  deleteSkill(skillId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/skills/delete/${skillId}`);
  }
}