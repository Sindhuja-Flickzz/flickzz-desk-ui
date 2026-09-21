import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { UserProfile, NoteItem, ApproverItem, LogEntry, WorkflowStage, CatalogTask, TaskSlaItem, ChangeRequestItem } from '../models/ritm.model';
import { PriorityMaster } from '../models/priority-master';
import { AgentMaster } from '../models/agent-master';

export interface RitmStatusCreateRequest {
  companyId: number;
  statusCode: string;
  sequenceNo: number;
  statusColor: string;
  createdBy: number;
  isCreatorAdmin: boolean;
}

export interface RitmStatusUpdateRequest {
  statusId: number;
  isActive: boolean;
  updatedBy?: number;
  isUpdaterAdmin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RitmService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getAgents(orgId: string): Observable<AgentMaster[]> {
    return this.http.get<AgentMaster[]>(`${this.baseUrl}/agent/list/active/${orgId}`);
  }

  getAllActivePriorities(businessPartnerId?: number | null): Observable<PriorityMaster[]> {
    return this.http.get<PriorityMaster[]>(`${this.baseUrl}/bp/config/priority/active/${businessPartnerId}`);
  }

  getRequestNumber(requestType: string): Observable<{ attributes: string }> {
    return this.http.get<{ attributes: string }>(`${this.baseUrl}/request/number/${requestType}`);
  }

  createRitm(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ritm/create`, payload);
  }

  createRitmStatus(payload: RitmStatusCreateRequest[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/ritm/status/create`, payload);
  }

  getRitmStatuses(orgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ritm/get/status/${orgId}`);
  }

  getRitmActiveStatuses(orgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ritm/get/status/active/${orgId}`);
  }

  deleteRitmStatus(statusId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/ritm/status/delete`, { body: { statusId } });
  }

  updateRitmStatusActive(request: RitmStatusUpdateRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/ritm/status/update`, request);
  }

  updateRitm(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ritm/update`, payload);
  }

  assignRitm(payload: { ritmId: number; assignedTo: number; assignedBy: number }): Observable<any> {
    return this.http.put(`${this.baseUrl}/ritm/assign`, payload);
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

  getRequestedByMe(agentId: number | null): Observable<any> {
    return this.http.get(`${this.baseUrl}/ritm/agent/${agentId}/requestedByMe`);
  }

  getAssignedToMe(agentId: number | null): Observable<any> {
    return this.http.get(`${this.baseUrl}/ritm/agent/${agentId}/assignedToMe`);
  }

  getRitmWorkNotes(ritmId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ritm/${ritmId}/comments`);
  }

  getRitmHistory(ritmId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ritm/${ritmId}/audits`);
  }

  getRitmSla(ritmId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ritm/${ritmId}/sla`);
  }

  addRitmComment(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ritm/comment`, payload);
  }

  updateRitmComment(payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/ritm/comment`, payload);
  }

  escalateRitm(ritmId: string, reason: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/ritm/${ritmId}/escalate`, { reason });
  }
}
