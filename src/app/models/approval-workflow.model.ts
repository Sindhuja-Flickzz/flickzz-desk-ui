export type ApprovalWorkflowTimeUnit = 'DAYS' | 'HOURS' | 'MINUTES';

export interface ApprovalWorkflow {
  configId: number;
  companyId: number;
  workItemId: number;
  isApprovalRequired: boolean;
  approvalPendingStatusId: number | null;
  approvalPendingStatusCode?: string;
  statusCode?: string;
  autoActionTimeline: number;
  autoActionTimeUnit: ApprovalWorkflowTimeUnit;
  statusAfterAutoAction: number;
  statusAfterAutoActionCode?: string;
}

export interface ApprovalWorkflowRequest {
  configId?: number;
  companyId: number;
  workItemId: number;
  isApprovalRequired: boolean;
  approvalPendingStatusId: number | null;
  autoActionTimeline: number;
  autoActionTimeUnit: ApprovalWorkflowTimeUnit;
  statusAfterAutoAction: number;
  createdBy: number;
  updatedBy: number;
  isCreatedByAdmin: boolean;
  isUpdatedByAdmin: boolean;
}
