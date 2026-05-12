import { CompanyMaster } from "./company-master";
import { PriorityMaster } from "./priority-master";

/**
 * Progress Status for Kanban columns
 */
export interface ProgressStatus {
  progressId: number;
  progressName: string;
  progressSequence: number;
  colorCode: string;
}

/**
 * Kanban Task Card representation
 */
export interface KanbanTask {
  storyId: number;
  storyCode: string;
  title: string;
  description: string;
  progressId: number;
  progressStatus?: ProgressStatus;
  epicName?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  leads: CompanyMaster[];
  priority?: PriorityMaster;
  storyPoints?: number;
  predecessorId?: number;
  workDays?: number;
  completionPercentage?: number;
}

/**
 * Kanban Column representation
 */
export interface KanbanColumn {
  progressId: number;
  progressName: string;
  progressSequence: number;
  colorCode: string;
  tasks: KanbanTask[];
  taskCount: number;
}

/**
 * Kanban Board state
 */
export interface KanbanBoardState {
  projectId: number;
  projectName: string;
  columns: KanbanColumn[];
  allTasks: KanbanTask[];
  filteredTasks: KanbanTask[];
  isLoading: boolean;
  error?: string;
}

/**
 * Status update payload
 */
export interface UpdateStoryStatusPayload {
  progressId: number;
  storySequence?: number;
}

/**
 * Kanban Filter options
 */
export interface KanbanFilters {
  searchText: string;
  selectedEpic?: string;
  selectedLead?: number;
  selectedPriority?: number;
  selectedStatus?: number;
  showOverdue?: boolean;
  showCurrentUserTasks?: boolean;
}

/**
 * Drag and drop event payload
 */
export interface KanbanDropEvent {
  storyId: number;
  sourceProgressId: number;
  targetProgressId: number;
  sourceIndex: number;
  targetIndex: number;
  storySequence?: number;
}
