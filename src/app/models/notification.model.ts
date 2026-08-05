export interface NotificationPayload {
  notificationId?: string | number;
  changeRequestId?: string | number;
  title?: string;
  message?: string;
  notificationType?: string;
  action: string;
  referenceType?: string;
  referenceId?: string | number;
  triggeredUserOrg?: string;
  triggeredByUser?: string;
  recipientUserId?: string | number;
  recipientUserName?: string;
  recipientOrgId?: string | number;
  isRead?: boolean;
  readOn?: string | null;
  createdBy?: string | number;
  createdOn?: string | null;
  updatedBy?: string | number;
  updatedOn?: string | null;
  actionUrl?: string;
  status?: string;
  payload?: any;
  companyName?: string;
  initiatedBy?: string;
  configurationDetails?: any;
  approvalWorkflow?: any;
}
