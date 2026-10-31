import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { ApprovalWorkflowRequest } from '../models/approval-workflow.model';

@Injectable({
  providedIn: 'root'
})
export class ApprovalWorkflowService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) {}

  createWorkflow(request: ApprovalWorkflowRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/ticket/approval/workflow/create`, request);
  }

  getWorkflows(orgId: string): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/ticket/approval/workflow/list/${orgId}`);
  }

  getWorkflowsForWorkItem(workItemId: number, orgId: string): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/ticket/approval/workflow/list/${workItemId}/${orgId}`);
  }

  updateWorkflow(request: ApprovalWorkflowRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/ticket/approval/workflow/update`, request);
  }

  deleteWorkflow(request: any): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/ticket/approval/workflow/delete`, { body: request });
  }
}
