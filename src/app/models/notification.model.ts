export interface NotificationPayload {
  notificationId?: string | number;
  changeRequestId?: string | number;
  title?: string;
  message?: string;
  notificationType?: string;
  referenceType?: string;
  referenceId?: string | number;
  recipientUserId?: string | number;
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
}
