import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ProjectVO } from '../../../models/project-builder';
import { KanbanColumn, KanbanTask, KanbanFilters, ProgressStatus } from '../../../models/kanban-models';
import { ProjectService } from '../../../service/project.service';

@Component({
  selector: 'app-kanban-board',
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.scss']
})
export class KanbanBoardComponent implements OnInit, OnDestroy {
  @Input() project?: ProjectVO;

  columns: KanbanColumn[] = [];
  allTasks: KanbanTask[] = [];
  filteredTasks: Map<number, KanbanTask[]> = new Map();

  isLoading = false;
  isDragging = false;
  error: string = '';

  // Filters
  filters: KanbanFilters = {
    searchText: '',
    selectedEpic: undefined,
    selectedLead: undefined,
    selectedPriority: undefined,
    selectedStatus: undefined,
    showOverdue: false,
    showCurrentUserTasks: false
  };

  // Available filter options
  epicOptions: string[] = [];
  leadOptions: any[] = [];
  priorityOptions: any[] = [];
  statusOptions: ProgressStatus[] = [];

  // Collapse state
  collapsedColumns: Set<number> = new Set();
  columnExpandStates: Map<number, boolean> = new Map();

  private destroy$ = new Subject<void>();

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    if (this.project) {
      this.initializeBoard();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize Kanban board from project data
   */
  private initializeBoard(): void {
    if (!this.project?.epics) {
      return;
    }

    try {
      // Extract all user stories and statuses
      this.extractAllTasks();
      this.buildColumns();
      this.extractFilterOptions();
      this.applyFilters();
    } catch (err) {
      this.error = 'Failed to initialize Kanban board';
      console.error(err);
    }
  }

  /**
   * Extract all user stories from epics
   */
  private extractAllTasks(): void {
    this.allTasks = [];

    if (!this.project?.epics) {
      return;
    }

    this.project.epics.forEach((epic: any) => {
      if (epic.userStories && Array.isArray(epic.userStories)) {
        epic.userStories.forEach((story: any) => {
          const task: KanbanTask = {
            storyId: story.storyId,
            storyCode: story.storyCode,
            title: story.title,
            description: story.description,
            progressId: story.progress.progressId,
            progressStatus: story.progress,
            epicName: epic.epicName,
            plannedStartDate: story.plannedStartDate || '',
            plannedEndDate: story.plannedEndDate || '',
            leads: story.leads?.map((l: any) => l.company) || [],
            priority: undefined, // Add if available in your data
            storyPoints: story.storyPoints,
            predecessorId: story.predecessorId,
            workDays: this.calculateWorkDays(
              story.plannedStartDate,
              story.plannedEndDate
            ),
            completionPercentage: this.calculateCompletion(story.progress)
          };
          this.allTasks.push(task);
        });
      }
    });
  }

  /**
   * Build Kanban columns from statuses
   */
  private buildColumns(): void {
    const statusMap = new Map<number, ProgressStatus>();

    // Collect all unique statuses
    this.allTasks.forEach((task) => {
      if (
        task.progressStatus &&
        !statusMap.has(task.progressStatus.progressId)
      ) {
        statusMap.set(task.progressStatus.progressId, task.progressStatus);
      }
    });

    // Sort by sequence
    const sortedStatuses = Array.from(statusMap.values()).sort(
      (a, b) => a.progressSequence - b.progressSequence
    );

    // Create columns
    this.columns = sortedStatuses.map((status) => {
      const tasks = this.allTasks.filter(
        (t) => t.progressId === status.progressId
      );

      return {
        progressId: status.progressId,
        progressName: status.progressName,
        progressSequence: status.progressSequence,
        colorCode: status.colorCode,
        tasks: tasks,
        taskCount: tasks.length
      };
    });

    // Initialize expanded state for all columns
    this.columns.forEach((col) => {
      this.columnExpandStates.set(col.progressId, true);
    });
  }

  /**
   * Extract filter options from tasks
   */
  private extractFilterOptions(): void {
    // Extract unique epics
    this.epicOptions = Array.from(
      new Set(this.allTasks.map((t) => t.epicName).filter(Boolean))
    ) as string[];

    // Extract unique leads
    const leadsMap = new Map();
    this.allTasks.forEach((task) => {
      task.leads?.forEach((lead: any) => {
        if (!leadsMap.has(lead.companyId)) {
          leadsMap.set(lead.companyId, lead);
        }
      });
    });
    this.leadOptions = Array.from(leadsMap.values());

    // Extract statuses
    this.statusOptions = Array.from(
      new Map(
        this.allTasks
          .filter((t) => t.progressStatus)
          .map((t) => [
            t.progressStatus!.progressId,
            t.progressStatus!
          ])
      ).values()
    ).sort((a, b) => a.progressSequence - b.progressSequence);
  }

  /**
   * Apply filters to tasks
   */
  applyFilters(): void {
    let filtered = [...this.allTasks];

    // Search filter
    if (this.filters.searchText) {
      const searchLower = this.filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchLower) ||
          t.storyCode.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower)
      );
    }

    // Epic filter
    if (this.filters.selectedEpic) {
      filtered = filtered.filter((t) => t.epicName === this.filters.selectedEpic);
    }

    // Lead filter
    if (this.filters.selectedLead) {
      filtered = filtered.filter((t) =>
        t.leads?.some((l: any) => l.companyId === this.filters.selectedLead)
      );
    }

    // Priority filter
    if (this.filters.selectedPriority) {
      filtered = filtered.filter((t) => t.priority?.priorityId === this.filters.selectedPriority);
    }

    // Status filter
    if (this.filters.selectedStatus) {
      filtered = filtered.filter(
        (t) => t.progressId === this.filters.selectedStatus
      );
    }

    // Overdue filter
    if (this.filters.showOverdue) {
      const today = new Date();
      filtered = filtered.filter((t) => {
        if (t.plannedEndDate) {
          const endDate = new Date(t.plannedEndDate);
          return endDate < today && t.progressId !== this.getCompletedStatusId();
        }
        return false;
      });
    }

    // Update filtered map
    this.filteredTasks.clear();
    this.columns.forEach((col) => {
      const colTasks = filtered.filter((t) => t.progressId === col.progressId);
      this.filteredTasks.set(col.progressId, colTasks);
    });
  }

  /**
   * Handle drag and drop between columns
   */
  drop(event: CdkDragDrop<KanbanTask[]>, targetColumnId: number): void {
    const task = event.item.data as KanbanTask;

    if (event.previousContainer === event.container) {
      // Reordering within same column
      this.reorderTaskInColumn(targetColumnId, event.previousIndex, event.currentIndex);
    } else {
      // Moving between columns
      this.moveTaskBetweenColumns(task, targetColumnId, event.currentIndex);
    }
  }

  /**
   * Reorder task within the same column
   */
  private reorderTaskInColumn(
    columnId: number,
    previousIndex: number,
    currentIndex: number
  ): void {
    const tasks = this.filteredTasks.get(columnId);
    if (!tasks) return;

    const [movedTask] = tasks.splice(previousIndex, 1);
    tasks.splice(currentIndex, 0, movedTask);

    // Update backend
    this.projectService
      .reorderStory(movedTask.storyId, columnId, currentIndex + 1)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isDragging = false))
      )
      .subscribe({
        error: (err: any) => {
          console.error('Failed to reorder task:', err);
          this.error = 'Failed to reorder task';
          this.initializeBoard(); // Refresh on error
        }
      });
  }

  /**
   * Move task between columns
   */
  private moveTaskBetweenColumns(
    task: KanbanTask,
    newProgressId: number,
    newIndex: number
  ): void {
    const oldProgressId = task.progressId;

    // Update local state
    const oldTasks = this.filteredTasks.get(oldProgressId);
    if (oldTasks) {
      const index = oldTasks.indexOf(task);
      if (index > -1) {
        oldTasks.splice(index, 1);
      }
    }

    task.progressId = newProgressId;
    const newTasks = this.filteredTasks.get(newProgressId) || [];
    newTasks.splice(newIndex, 0, task);
    this.filteredTasks.set(newProgressId, newTasks);

    // Update backend
    this.projectService
      .updateStoryStatus(task.storyId, {
        progressId: newProgressId
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isDragging = false))
      )
      .subscribe({
        error: (err: any) => {
          console.error('Failed to update task status:', err);
          this.error = 'Failed to update task status';
          this.initializeBoard(); // Refresh on error
        }
      });
  }

  /**
   * Toggle column collapse/expand
   */
  toggleColumnCollapse(columnId: number): void {
    const isExpanded = this.columnExpandStates.get(columnId);
    this.columnExpandStates.set(columnId, !isExpanded);
  }

  /**
   * Check if column is expanded
   */
  isColumnExpanded(columnId: number): boolean {
    return this.columnExpandStates.get(columnId) !== false;
  }

  /**
   * Get tasks for a specific column
   */
  getColumnTasks(columnId: number): KanbanTask[] {
    return this.filteredTasks.get(columnId) || [];
  }

  /**
   * Calculate work days between two dates
   */
  private calculateWorkDays(startDate: string | null, endDate: string | null): number {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    let workDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        workDays++;
      }
    }

    return workDays;
  }

  /**
   * Calculate completion percentage based on progress sequence
   */
  private calculateCompletion(progress: ProgressStatus): number {
    // This is a simplified calculation
    // In real scenario, you'd need maxProgress from epic/project
    return (progress.progressSequence / 10) * 100;
  }

  /**
   * Get completed status ID (typically the last status)
   */
  private getCompletedStatusId(): number {
    if (this.statusOptions.length === 0) return -1;
    return this.statusOptions[this.statusOptions.length - 1].progressId;
  }

  /**
   * Get lead names for display
   */
  getLeadNames(leads: any[]): string {
    if (!leads || leads.length === 0) return 'Unassigned';
    return leads.map((l) => l.companyName).join(', ');
  }

  /**
   * Track by function for ngFor optimization
   */
  trackByStoryId(index: number, task: KanbanTask): number {
    return task.storyId;
  }

  trackByColumnId(index: number, column: KanbanColumn): number {
    return column.progressId;
  }
}
