import { Component, OnInit } from '@angular/core';
import { ProjectService } from '../../service/project.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ProjectVO, ProgressStatusVO, ProgressStatusRequestVO, ProgressStatusMoveRequest, EpicVO, UserStory, Task, SubTask } from '../../models/project-builder';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectStatusCreateDialogComponent } from './project-status-create-dialog/project-status-create-dialog.component';
import { ProjectStatusEpicDetailComponent } from './project-status-epic-detail/project-status-epic-detail.component';
import { ProjectStatusItemDetailComponent } from './project-status-item-detail/project-status-item-detail.component';

interface ColumnState {
  [key: number]: {
    isMinimized: boolean;
  };
}

@Component({
  selector: 'app-project-status',
  templateUrl: './project-status.component.html',
  styleUrls: ['./project-status.component.scss']
})
export class ProjectStatusComponent implements OnInit {
  projects: ProjectVO[] = [];
  progressStatuses: ProgressStatusVO[] = [];
  selectedProject: ProjectVO | null = null;
  
  // Store all items by progress status
  itemsByStatus: { [key: number]: any[] } = {};
  columnStates: ColumnState = {};
  connectedDropListIds: string[] = [];

  orgId: string = '';
  isLoading = false;
  error: string | null = null;

  constructor(
    private projectService: ProjectService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.getOrgIdAndLoadData();
  }

  getOrgIdAndLoadData(): void {
    // Get orgId from localStorage or session (adjust based on your auth service)
    this.orgId = localStorage.getItem('userOrgId') || '1';
    this.loadProjects();
    this.loadProgressStatuses();
  }

  loadProjects(): void {
    this.isLoading = true;
    this.projectService.getProjects(this.orgId).subscribe({
      next: (data: ProjectVO[]) => {
        this.projects = (data as any).attributes || data || [];
        this.isLoading = false;
        // Auto-select the first project when the page loads
        if (!this.selectedProject && this.projects && this.projects.length) {
          this.onProjectSelected(this.projects[0]);
        }
      },
      error: (err) => {
        this.error = 'Failed to load projects';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  loadProgressStatuses(): void {
    this.projectService.getProgressStatuses(this.orgId).subscribe({
      next: (data: ProgressStatusVO[]) => {
        this.progressStatuses = (data as any).attributes || data || [];
        this.progressStatuses.sort((a, b) => a.progressSequence - b.progressSequence);
        this.initializeColumnStates();
        if (this.selectedProject) {
          this.organizeItemsByStatus();
        }
      },
      error: (err) => {
        this.error = 'Failed to load progress statuses';
        console.error(err);
      }
    });
  }

  initializeColumnStates(): void {
    this.progressStatuses.forEach(status => {
      if (!this.columnStates[status.progressId]) {
        this.columnStates[status.progressId] = { isMinimized: false };
      }
    });
    this.connectedDropListIds = this.progressStatuses.map(status => this.getDropListId(status.progressId));
  }

  getDropListId(statusId: number): string {
    return `status-list-${statusId}`;
  }

  getStatusIdFromDropListId(dropListId: string): number {
    const parts = dropListId?.toString().split('-');
    const id = parts?.length ? Number(parts[parts.length - 1]) : NaN;
    return Number.isNaN(id) ? 0 : id;
  }

  onProjectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedProjectId = target.value ? Number(target.value) : null;
    if (selectedProjectId !== null && !Number.isNaN(selectedProjectId)) {
      const selectedProject = this.projects.find(p => p.projectId === selectedProjectId);
      if (selectedProject) {
        this.onProjectSelected(selectedProject);
      }
    }
  }

  onProjectSelected(project: ProjectVO): void {
    this.selectedProject = project;
    this.isLoading = true;
    this.projectService.getProjectInfo(String(project.projectId)).subscribe({
      next: (data: ProjectVO) => {
        this.selectedProject = (data as any).attributes || data || project;
        this.organizeItemsByStatus();
        this.isLoading = false;
      },
      error: (err) => {
        this.selectedProject = project;
        this.organizeItemsByStatus();
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  openEpicPopup(item: any): void {
    if (!this.selectedProject || item?.type !== 'epic') {
      return;
    }

    this.dialog.open(ProjectStatusEpicDetailComponent, {
      width: '95vw',
      maxWidth: '1200px',
      maxHeight: '95vh',
      panelClass: 'epic-detail-dialog-panel',
      autoFocus: false,
      data: {
        itemType: 'epic',
        item: item.data,
        projectId: this.selectedProject.projectId
      }
    });
  }

  openItemPopup(item: any): void {
    if (!this.selectedProject || !item?.type) {
      return;
    }

    if (item.type === 'epic' || item.type === 'story' || item.type === 'task' || item.type === 'subtask') {
      this.dialog.open(ProjectStatusEpicDetailComponent, {
        width: '95vw',
        maxWidth: '1200px',
        maxHeight: '95vh',
        panelClass: 'epic-detail-dialog-panel',
        autoFocus: false,
        data: {
          itemType: item.type,
          item: item.data,
          projectId: this.selectedProject.projectId
        }
      });
      return;
    }

    this.dialog.open(ProjectStatusItemDetailComponent, {
      width: '95vw',
      maxWidth: '1200px',
      maxHeight: '95vh',
      panelClass: 'item-detail-dialog-panel',
      autoFocus: false,
      data: {
        itemType: item.type,
        item: item.data,
        projectId: this.selectedProject.projectId
      }
    });
  }

  getEpicPageUrl(epicId: number): string {
    if (!this.selectedProject) {
      return '#';
    }
    return `${window.location.origin}/project-status/epic/${epicId}?projectId=${this.selectedProject.projectId}`;
  }

  getItemId(item: any): string | number {
    if (!item || !item.type) {
      return '';
    }
    if (item.type === 'epic') {
      return item.data?.epicId ?? '';
    }
    if (item.type === 'story') {
      return item.data?.storyCode || item.data?.storyId || '';
    }
    if (item.type === 'task') {
      return item.data?.taskId ?? '';
    }
    if (item.type === 'subtask') {
      return item.data?.subTaskId ?? '';
    }
    return '';
  }

  getItemPageUrl(item: any): string {
    if (!this.selectedProject || !item || !item.type) {
      return '#';
    }

    if (item.type === 'epic') {
      return this.getEpicPageUrl(item.data?.epicId);
    }

    if (item.type === 'story') {
      const storyId = item.data?.storyId;
      if (!storyId) {
        return '#';
      }
      return `${window.location.origin}/project-status/story/${storyId}?projectId=${this.selectedProject.projectId}`;
    }

    if (item.type === 'task') {
      const taskId = item.data?.taskId;
      if (!taskId) {
        return '#';
      }
      return `${window.location.origin}/project-status/task/${taskId}?projectId=${this.selectedProject.projectId}`;
    }

    const id = item.type === 'subtask'
      ? item.data?.subTaskId
      : null;

    if (!id) {
      return '#';
    }

    return `${window.location.origin}/project-status/item/${item.type}/${id}?projectId=${this.selectedProject.projectId}`;
  }

  organizeItemsByStatus(): void {
    if (!this.selectedProject) {
      return;
    }

    this.itemsByStatus = {};
    this.progressStatuses.forEach(status => {
      this.itemsByStatus[status.progressId] = [];
    });
    // Organize Epics
    if (this.selectedProject.epics) {
      this.selectedProject.epics.forEach(epic => {
        const statusId = epic.progress?.progressId || 0;
        if (!this.itemsByStatus[statusId]) {
          this.itemsByStatus[statusId] = [];
        }
        this.itemsByStatus[statusId].push({
          type: 'epic',
          data: epic,
          expanded: false
        });

        // Organize User Stories under Epics
        if (epic.userStories) {
          epic.userStories.forEach(story => {
            const storyStatusId = story.progress?.progressId || 0;
            if (!this.itemsByStatus[storyStatusId]) {
              this.itemsByStatus[storyStatusId] = [];
            }
            this.itemsByStatus[storyStatusId].push({
              type: 'story',
              data: story,
              parentId: epic.epicId,
              expanded: false
            });

            // Organize Tasks under User Stories
            if (story.tasks) {
              story.tasks.forEach(task => {
                const taskStatusId = task.progress?.progressId || 0;
                if (!this.itemsByStatus[taskStatusId]) {
                  this.itemsByStatus[taskStatusId] = [];
                }
                this.itemsByStatus[taskStatusId].push({
                  type: 'task',
                  data: task,
                  parentId: story.storyId,
                  expanded: false
                });

                // Organize SubTasks under Tasks
                if (task.subTasks) {
                  task.subTasks.forEach(subtask => {
                    const subtaskStatusId = subtask.progress?.progressId || 0;
                    if (!this.itemsByStatus[subtaskStatusId]) {
                      this.itemsByStatus[subtaskStatusId] = [];
                    }
                    this.itemsByStatus[subtaskStatusId].push({
                      type: 'subtask',
                      data: subtask,
                      parentId: task.taskId
                    });
                  });
                }
              });
            }
          });
        }
      });
    }
  }

  getItemsForStatus(statusId: number): any[] {
    return this.itemsByStatus[statusId] || [];
  }

  getItemStatusId(item: any, fallbackStatusId: number = 0): number {
    const statusId = item?.progress?.progressId;
    if (statusId !== undefined && statusId !== null) {
      return Number(statusId);
    }
    return fallbackStatusId;
  }

  toggleColumnMinimize(statusId: number): void {
    if (this.columnStates[statusId]) {
      this.columnStates[statusId].isMinimized = !this.columnStates[statusId].isMinimized;
    }
  }

  onStatusDrop(event: CdkDragDrop<any[]>, targetStatusId: number): void {
    if (!this.selectedProject) {
      return;
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const item = event.previousContainer.data[event.previousIndex];
    const previousStatusId = this.getStatusIdFromDropListId(event.previousContainer.id) || this.getItemStatusId(item, targetStatusId);
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

    const request: ProgressStatusMoveRequest = {
      itemId: item.data?.epicId || item.data?.storyId || item.data?.taskId || item.data?.subTaskId,
      projectId: this.selectedProject.projectId,
      currentStatusId: previousStatusId,
      newStatusId: targetStatusId,
      itemType: item.type
    };

    this.projectService.moveProjectStatus(request).subscribe({
      next: () => {
        item.data.progress = this.progressStatuses.find(s => s.progressId === targetStatusId) || item.data.progress;
        this.snackBar.open('Item moved successfully.', 'Close', { duration: 2500 });
      },
      error: (err) => {
        transferArrayItem(event.container.data, event.previousContainer.data, event.currentIndex, event.previousIndex);
        this.snackBar.open('Failed to move item. Please refresh.', 'Close', { duration: 3000 });
        console.error(err);
      }
    });
  }

  openCreateStatusDialog(): void {
    const dialogRef = this.dialog.open(ProjectStatusCreateDialogComponent, {
      width: '500px',
      data: { orgId: this.orgId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createProgressStatus(result);
      }
    });
  }

  createProgressStatus(requestData: ProgressStatusRequestVO): void {
    const request: ProgressStatusRequestVO = {
      ...requestData,
      orgId: parseInt(this.orgId),
      createdBy: localStorage.getItem('userId') || 'system',
      updatedBy: localStorage.getItem('userId') || 'system'
    };

    this.projectService.createProgressStatus(request).subscribe({
      next: (newStatus) => {
        this.snackBar.open('Progress status created successfully!', 'Close', { duration: 3000 });
        this.loadProgressStatuses();
      },
      error: (err) => {
        this.snackBar.open('Failed to create progress status', 'Close', { duration: 3000 });
        console.error(err);
      }
    });
  }

  getItemTitle(item: any): string {
    const data = item.data;
    if (item.type === 'epic') {
      return data.epicName || '';
    } else if (item.type === 'story') {
      return data.title || '';
    } else if (item.type === 'task') {
      return data.title || '';
    } else if (item.type === 'subtask') {
      return data.title || '';
    }
    return '';
  }

  getItemDescription(item: any): string {
    const data = item.data;
    if (item.type === 'epic') {
      return '';
    } else if (item.type === 'story') {
      return data.description || '';
    } else if (item.type === 'task') {
      return data.description || '';
    } else if (item.type === 'subtask') {
      return data.description || '';
    }
    return '';
  }

  getItemDates(item: any): { start: string | null; end: string | null } {
    const data = item.data;
    return {
      start: data.plannedStartDate || null,
      end: data.plannedEndDate || null
    };
  }

  getStatusColor(statusId: number): string {
    const status = this.progressStatuses.find(s => s.progressId === statusId);
    return status?.colorCode || '#ffffff';
  }

  getStatusName(statusId: number): string {
    const status = this.progressStatuses.find(s => s.progressId === statusId);
    return status?.progressName || 'Unknown';
  }

  getItemPadding(itemType: string): string {
    switch (itemType) {
      case 'epic':
        return '0px';
      case 'story':
        return '10px';
      case 'task':
        return '20px';
      case 'subtask':
        return '30px';
      default:
        return '0px';
    }
  }

  getItemTypeLabel(itemType: string): string {
    return itemType.charAt(0).toUpperCase() + itemType.slice(1);
  }
}
