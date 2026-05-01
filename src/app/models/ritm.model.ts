export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  location?: string;
  role?: string;
}

export interface RitmFormValue {
  ritmNumber: string;
  openedBy: string;
  requestedFor: string;
  location: string;
  configurationItem: string;
  category: string;
  openedDate: string;
  state: string;
  assignmentGroup: string;
  priority: number | null;
  workStart: string;
  workEnd: string;
  customerResolution: string;
  workDuration: string;
}

export interface NoteItem {
  id: number;
  userId: string;
  comment: string;
  createdAt: string;
}

export interface ApproverItem {
  id: number;
  name: string;
  status: string;
  comment?: string;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  status?: string;
}

export interface WorkflowStage {
  id: number;
  step: string;
  status: string;
  owner: string;
  updatedAt: string;
}

export interface CatalogTask {
  id: number;
  title: string;
  assignedTo: string;
  dueDate: string;
  status: string;
}

export interface TaskSlaItem {
  id: number;
  metric: string;
  threshold: string;
  status: string;
}

export interface ChangeRequestItem {
  id: number;
  title: string;
  status: string;
  requestedBy: string;
}
