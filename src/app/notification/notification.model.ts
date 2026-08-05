export interface NotificationPayload {
  id?: string | number;
  notificationId?: string | number;
  title?: string;
  message?: string;
  notificationType?: string;
  isRead?: boolean;
  readOn?: string | null;
  createdOn?: string | null;
  payload?: any;
}
