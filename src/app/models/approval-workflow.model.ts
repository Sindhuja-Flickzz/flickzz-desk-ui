export type ApprovalWorkflowTimeUnit = 'DAYS' | 'HOURS' | 'MINUTES';

export interface ApprovalWorkflow {
  configId: number;
  companyId: number;
  workItemId: number;
  approvalPendingStatusId: number | null;
  approvalPendingStatusCode?: string;
  statusCode?: string;
  autoActionTimeline: number | null;
  autoActionTimeUnit: ApprovalWorkflowTimeUnit | null;
  statusAfterAutoAction: number | null;
  statusAfterAutoActionCode?: string;
  statusOnApproval: number;
  statusOnApprovalCode?: string;
  statusOnDecline: number;
  statusOnDeclineCode?: string;
  statusOnClarify: number;
  statusOnClarifyCode?: string;
}

export interface ApprovalWorkflowRequest {
  configId?: number;
  companyId: number;
  workItemId: number;
  approvalPendingStatusId: number | null;
  autoActionTimeline: number | null;
  autoActionTimeUnit: ApprovalWorkflowTimeUnit | null;
  statusAfterAutoAction: number | null;
  statusOnApproval: number;
  statusOnDecline: number;
  statusOnClarify: number;
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
}
