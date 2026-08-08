import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigChangeApprovalVO } from '../models/config-change-approval.model';
import { APP_CONSTANTS } from '../data/app_constants';

@Injectable({
  providedIn: 'root'
})
export class ConfigApprovalService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;
  // private readonly apiUrl = '/bp/config/approval';

  constructor(private http: HttpClient) {}

  /**
   * Get list of approval requests for a specific user
   * @param userId - The ID of the user
   * @returns Observable of array of ConfigChangeApprovalVO
   */
  getApprovalsList(userId: number): Observable<ConfigChangeApprovalVO[]> {
    return this.http.get<ConfigChangeApprovalVO[]>(`${this.baseUrl}/bp/config/approval/list/${userId}`);
  }

  /**
   * Approve a configuration change
   * @param approvalId - The ID of the approval
   * @param remark - Optional remark
   * @returns Observable of the response
   */
  applyAction(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bp/config/approval/action`, payload);
  }

  /**
   * Decline a configuration change
   * @param approvalId - The ID of the approval
   * @param remark - Optional remark
   * @returns Observable of the response
   */
  // declineConfiguration(payload: any): Observable<any> {
    // const payload = { approvalId, remark };
  //   return this.http.post(`${this.baseUrl}/bp/config/approval/action`, { ...payload, action: 'decline' });
  // }

  /**
   * Request clarification for a configuration change
   * @param approvalId - The ID of the approval
   * @param remark - Clarification remark
   * @returns Observable of the response
   */
  // requestClarification(payload: any): Observable<any> {
  //   return this.http.post(`${this.apiUrl}/clarify`, payload);
  // }

  /**
   * Get detailed information about a specific approval
   * @param approvalId - The ID of the approval
   * @returns Observable of ConfigChangeApprovalVO
   */
  // getApprovalDetails(approvalId: number): Observable<ConfigChangeApprovalVO> {
  //   return this.http.get<ConfigChangeApprovalVO>(`${this.apiUrl}/${approvalId}`);
  // }

  /**
   * Get approval history/tracking for a specific approval
   * @param approvalId - The ID of the approval
   * @returns Observable of the history
   */
  // getApprovalHistory(approvalId: number): Observable<any> {
  //   return this.http.get(`${this.apiUrl}/${approvalId}/history`);
  // }
}
