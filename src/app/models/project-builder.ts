import { CompanyMaster } from "./company-master";

export interface ProgressStatusVO {
  progressId: number;
  companyId?: any;
  progressName: string;
  progressSequence: number;
  colorCode: string;
}

export interface EpicVO {
  epicId: number;
  projectId: ProjectVO;
  epicName: string;
  epicSequence: number;
  progress?: ProgressStatusVO;
  maxProgress?: number;
  startDate?: string;
  endDate?: string;
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
}

export interface ProjectTaskRequest {
  taskId?: string;
  taskName: string;
  leadIds: number[];
  startDate: string;
  endDate: string;
  predecessorTaskName?: string | null;
  predecessorId?: string | null;
}

export interface ProjectEpicRequest {
  epicName: string;
  epicDesc: string;
  epicSequence: number;
  tasks: ProjectTaskRequest[];
}

export interface ProjectCreateRequest {
  projectName: string;
  orgId: number;
  epics: ProjectEpicRequest[];
  createdBy: string;
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
}

export interface LeadAssignment {
  assignmentId: number;
  company: CompanyMaster;
  story: UserStory | null;
  companyId: number | null;
}