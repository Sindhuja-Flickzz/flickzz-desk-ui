import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { UserProfile, NoteItem, ApproverItem, LogEntry, WorkflowStage, CatalogTask, TaskSlaItem, ChangeRequestItem } from '../models/ritm.model';
import { PriorityMaster } from '../models/priority-master';

@Injectable({
  providedIn: 'root'
})
export class RitmService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getUsers(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(`${this.baseUrl}/user/list`);
  }

  getPriorities(): Observable<PriorityMaster[]> {
    return this.http.get<PriorityMaster[]>(`${this.baseUrl}/priority/list`);
  }

  createRitm(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ritm/create`, payload);
  }

  getNotes(userId: string): Observable<NoteItem[]> {
    return this.http.get<NoteItem[]>(`${this.baseUrl}/notes/get/${userId}`);
  }

  getApprovers(): Observable<ApproverItem[]> {
    return this.http.get<ApproverItem[]>(`${this.baseUrl}/approvers/get`);
  }

  getLogs(ritmId: string): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.baseUrl}/ritm/logs/${ritmId}`);
  }

  getWorkflow(ritmId: string): Observable<WorkflowStage[]> {
    return this.http.get<WorkflowStage[]>(`${this.baseUrl}/ritm/workflow/${ritmId}`);
  }

  getTaskSlas(ritmId: string): Observable<TaskSlaItem[]> {
    return this.http.get<TaskSlaItem[]>(`${this.baseUrl}/ritm/task-slas/${ritmId}`);
  }

  getChangeRequests(ritmId: string): Observable<ChangeRequestItem[]> {
    return this.http.get<ChangeRequestItem[]>(`${this.baseUrl}/ritm/change-requests/${ritmId}`);
  }

  createCatalogTask(task: CatalogTask): Observable<any> {
    return this.http.post(`${this.baseUrl}/ritm/tasks/create`, task);
  }

  getRitmById(ritmId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ritm/${ritmId}`);
  }
}
