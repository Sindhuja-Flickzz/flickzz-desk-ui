import { AgentMaster } from "./agent-master";
import { CompanyMaster } from "./company-master";

export interface ProgressStatusVO {
  progressId: number;
  companyId?: any;
  progressName: string;
  progressSequence: number;
  colorCode: string;
}

export interface ProgressStatusRequestVO {
  progressId?: number;
  company?: CompanyMaster;
  progressName: string;
  progressSequence: number;
  colorCode: string;
  updatedBy?: string;
  createdBy?: string;
  orgId: number;
}

export interface ProgressStatusMoveRequest {
  itemId: number;
  projectId: number;
  currentStatusId: number;
  newStatusId: number;
  itemType: 'epic' | 'story' | 'task' | 'subtask';
}

export interface EpicVO {
  epicId: number;
  project: ProjectVO;
  epicName: string;
  epicSequence: number;
  progress?: ProgressStatusVO;
  maxProgress?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  userStories: UserStory[];
}

export interface ProjectVO {
  projectId: number;
  company: CompanyMaster;
  projectCode?: string;
  projectName: string;
  projectDesc?: string;
  epics?: EpicVO[];
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  isSaved?: boolean;
  isSubmitted?: boolean;
}

export interface ProjectTaskRequest {
  taskId?: string;
  taskName: string;
  leadIds: number[];
  startDate: string;
  endDate: string;
  predecessorTaskName?: string | null;
  predecessorId?: string | null;
  userStoryId?: string;
  userStoryName?: string;
  taskSequence?: number;
}

export interface ProjectUserStoryRequest {
  userStoryId: string;
  userStoryName: string;
  leadIds: number[];
  plannedStartDate: string;
  plannedEndDate: string;
  predecessorUserStoryName?: string | null;
  tasks: ProjectTaskRequest[];
}

export interface ProjectEpicRequest {
  epicName: string;
  epicDesc: string;
  epicSequence: number;
  userStories: ProjectUserStoryRequest[];
}

export interface ProjectCreateRequest {
  projectId?: number;
  projectName: string;
  projectDesc: string;
  orgId: number;
  epics: ProjectEpicRequest[];
  createdBy: string;
  isSave?: boolean;
  isSubmit?: boolean;
}

export interface UserStory {
  storyId: number;
  epicId: number | null;
  progress: ProgressStatusVO;
  maxProgress?: number;
  storyCode: string;
  title: string;
  description: string;
  storySequence: number;
  agentId: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  predecessorId: number | null;
  leads: LeadAssignment[];
  priorityId: number | null;
  storyPoints: number | null;
  mappingStoryId: number | null;
  mappingPredecessorId: number | null;
  tasks: Task[];
}

export interface LeadAssignment {
  assignmentId: number;
  company: CompanyMaster;
  story: UserStory | null;
  companyId: number | null;
}

export interface Task {
  taskId: number;
  storyId: UserStory | null;
  agentId: AgentMaster | null;
  progress: ProgressStatusVO;
  maxProgress?: number;
  title: string;
  description: string;
  taskSequence: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  subTasks: SubTask[] | null;
}

export interface SubTask {
  subTaskId: number;
  taskId: Task | null;
  agentId: AgentMaster | null;
  progress: ProgressStatusVO;
  maxProgress?: number;
  title: string;
  description: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
}