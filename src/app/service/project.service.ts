import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { ProjectCreateRequest, ProjectVO } from '../models/project-builder';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) {}

  getProjects(orgId: string): Observable<ProjectVO[]> {
    return this.http.get<ProjectVO[]>(`${this.baseUrl}/project/list/${orgId}`);
  }

  getProjectInfo(projectId: string): Observable<ProjectVO> {
    return this.http.get<ProjectVO>(`${this.baseUrl}/project/${projectId}`);
  }

  createProject(request: ProjectCreateRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/project/create`, request);
  }

  updateProject(request: ProjectCreateRequest): Observable<any> {
    return this.http.put(`${this.baseUrl}/project/update`, request);
  }

  deleteProject(projectId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/project/delete/${projectId}`);
  }
}
