import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { ProjectCreateRequest, ProjectVO } from '../models/project-builder';
import { UpdateStoryStatusPayload } from '../models/kanban-models';

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

  deleteProject(projectId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/project/delete/${projectId}`);
  }

  /**
   * Update user story status/progress
   * @param storyId Story ID to update
   * @param payload Status update payload with progressId
   */
  updateStoryStatus(storyId: number, payload: UpdateStoryStatusPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/user-story/${storyId}/status`, payload);
  }

  /**
   * Reorder stories within a column or across columns
   * @param storyId Story ID to reorder
   * @param progressId Target progress/status ID
   * @param sequence New sequence number
   */
  reorderStory(storyId: number, progressId: number, sequence: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/user-story/${storyId}/reorder`, {
      progressId,
      storySequence: sequence
    });
  }
}
