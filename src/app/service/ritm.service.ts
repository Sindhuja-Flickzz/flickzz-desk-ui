import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { RitmApproverResponse } from '../models/approval.model';
import { UserProfile, NoteItem, ApproverItem, LogEntry, WorkflowStage, CatalogTask, TaskSlaItem, ChangeRequestItem } from '../models/ritm.model';
import { PriorityMaster } from '../models/priority-master';
import { AgentMaster } from '../models/agent-master';

export interface RitmStatusCreateRequest {
  companyId: number;
  requestType: string;
  statusCode: string;
  sequenceNo: number;
  statusColor: string;
  visibleStatuses: string[];
  createdBy: number;
  isCreatorAdmin: boolean;
}

export interface RitmStatusUpdateRequest {
  statusId: number;
  isActive: boolean;
  updatedBy?: number;
  isUpdaterAdmin?: boolean;
}

export interface RitmStatusVisibilityUpdateRequest {
  statusId: number;
  companyId: number;
  requestType: string;
  statusCode: string;
  sequenceNo: number;
  statusColor: string;
  visibleStatuses: string[];
  isActive: boolean;
  createdBy: number;
  isCreatorAdmin: boolean;
  updatedBy: number;
  isUpdaterAdmin: boolean;
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

  getResolutionDate(priorityId: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/ticket/resolution/date/${priorityId}`);
  }

  getRequestNumber(requestType: string): Observable<{ attributes: string }> {
    return this.http.get<{ attributes: string }>(`${this.baseUrl}/request/number/${requestType}`);
  }

  createRitm(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket/create`, payload);
  }

  createRitmSubtask(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket/create`, payload);
  }

  createRitmStatus(payload: RitmStatusCreateRequest[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/status/create`, payload);
  }

  getAllStatuses(orgId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/status/get/${orgId}`);
  }

  getRitmActiveStatuses(orgId: string, requestType: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/status/get/active/${requestType}/${orgId}`);
  }  

  getVisibleStatuses(orgId: number, statusId: number, requestType: string): Observable<any> {
    const params = {
      companyId: orgId.toString(),
      statusId: statusId.toString(),
      requestType: requestType
    }
    return this.http.get(`${this.baseUrl}/status/visible`, { params });
  }

  deleteRitmStatus(statusId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/status/delete/${statusId}`);
  }

  updateRitmStatusActive(request: RitmStatusUpdateRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/status/update`, request);
  }

  changeStatusActive(request: RitmStatusUpdateRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/status/change`, request);
  }

  updateRitmStatusVisibility(request: RitmStatusVisibilityUpdateRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/status/update`, request);
  }

  updateRitm(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket/update`, payload);
  }

  assignRitm(payload: { ritmId: number; assignedTo: number; assignedBy: number }): Observable<any> {
    return this.http.put(`${this.baseUrl}/ticket/assign`, payload);
  }

  assignApprover(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket/approver/assign`, payload);
  }

  getRitmApprovers(ritmId: string | number, companyId: number): Observable<any> {
    const params = new HttpParams().set('companyId', companyId);
    return this.http.get(`${this.baseUrl}/ticket/approver/list/${ritmId}`, { params });
  }

  getRitmApprover(requestId: number): Observable<RitmApproverResponse> {
    return this.http.get<RitmApproverResponse>(`${this.baseUrl}/ticket/approver/${requestId}`);
  }

  updateApprover(payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/ticket/approver/update`, payload);
  }

  deleteRitmApprovers(ritmId: string | number, companyId: number, deletedBy: number, isDeletedByAdmin: boolean): Observable<any> {
    const params = new HttpParams()
      .set('companyId', companyId)
      .set('deletedBy', deletedBy)
      .set('isDeletedByAdmin', isDeletedByAdmin);
    return this.http.delete(`${this.baseUrl}/ticket/approver/delete/${ritmId}`, { params });
  }

  getNotes(userId: string): Observable<NoteItem[]> {
    return this.http.get<NoteItem[]>(`${this.baseUrl}/notes/get/${userId}`);
  }

  getApprovers(): Observable<ApproverItem[]> {
    return this.http.get<ApproverItem[]>(`${this.baseUrl}/approvers/get`);
  }

  getLogs(ritmId: string): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.baseUrl}/ticket/logs/${ritmId}`);
  }

  getWorkflow(ritmId: string): Observable<WorkflowStage[]> {
    return this.http.get<WorkflowStage[]>(`${this.baseUrl}/ticket/workflow/${ritmId}`);
  }

  getTaskSlas(ritmId: string): Observable<TaskSlaItem[]> {
    return this.http.get<TaskSlaItem[]>(`${this.baseUrl}/ticket/task-slas/${ritmId}`);
  }

  getChangeRequests(ritmId: string): Observable<ChangeRequestItem[]> {
    return this.http.get<ChangeRequestItem[]>(`${this.baseUrl}/ticket/change-requests/${ritmId}`);
  }

  createCatalogTask(task: CatalogTask): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket/tasks/create`, task);
  }

  getTicketsByReference(ticketReferenceId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/reference/${ticketReferenceId}`);
  }

  getRitmById(ritmId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/${ritmId}`);
  }

  getRequestedByMe(agentId: number | null): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/agent/${agentId}/requestedByMe`);
  }

  getAssignedToMe(agentId: number | null): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/agent/${agentId}/assignedToMe`);
  }

  getRitmWorkNotes(ritmId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/${ritmId}/comments`);
  }

  getRitmHistory(ritmId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/${ritmId}/audits`);
  }

  getRitmSla(ritmId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ticket/${ritmId}/sla`);
  }

  addRitmComment(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket/comment`, payload);
  }

  updateRitmComment(payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/ticket/comment`, payload);
  }

  escalateRitm(ritmId: string, reason: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket/${ritmId}/escalate`, { reason });
  }
}
