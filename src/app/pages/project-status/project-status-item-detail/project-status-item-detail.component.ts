import { Component, Inject, OnInit, Optional } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProjectService } from '../../../service/project.service';
import { ProjectVO, ProgressStatusVO, EpicVO, UserStory, Task, SubTask } from '../../../models/project-builder';

export interface ProjectStatusItemDetailDialogData {
  itemType: 'story' | 'task' | 'subtask';
  item: any;
  projectId?: number;
}

@Component({
  selector: 'app-project-status-item-detail',
  templateUrl: './project-status-item-detail.component.html',
  styleUrls: ['./project-status-item-detail.component.scss']
})
export class ProjectStatusItemDetailComponent implements OnInit {
  itemType?: 'story' | 'task' | 'subtask';
  item: any = null;
  projectId?: number;
  isLoading = false;
  error: string | null = null;
  progressStatuses: ProgressStatusVO[] = [];

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private projectService: ProjectService,
    @Optional() public dialogRef: MatDialogRef<ProjectStatusItemDetailComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: ProjectStatusItemDetailDialogData
  ) {}

  ngOnInit(): void {
    if (this.data?.item && this.data?.itemType) {
      this.itemType = this.data.itemType;
      this.item = this.data.item;
      this.projectId = this.data.projectId;
      this.loadProgressStatuses();
    } else {
      this.loadFromRoute();
    }
  }

  loadFromRoute(): void {
    const itemType = this.route.snapshot.paramMap.get('itemType') as 'story' | 'task' | 'subtask' | null;
    const itemId = Number(this.route.snapshot.paramMap.get('itemId'));
    const projectId = Number(this.route.snapshot.queryParamMap.get('projectId'));

    if (!itemType || !itemId) {
      this.error = 'Missing item type or item identifier.';
      return;
    }

    if (!projectId) {
      this.error = 'Missing project identifier in URL.';
      return;
    }

    this.itemType = itemType;
    this.projectId = projectId;
    this.isLoading = true;

    this.projectService.getProjectInfo(String(projectId)).subscribe({
      next: (project) => {
        this.isLoading = false;
        const projectData = (project as any)?.attributes || project;
        this.item = this.findItem(projectData, itemType, itemId);

        if (!this.item) {
          this.error = `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} not found.`;
        }

        this.loadProgressStatuses();
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Failed to load item details.';
        console.error(err);
      }
    });
  }

  private findItem(project: ProjectVO, itemType: string, itemId: number): any {
    if (!project || !project.epics) {
      return null;
    }

    if (itemType === 'story') {
      for (const epic of project.epics) {
        if (!epic.userStories) {
          continue;
        }
        const story = epic.userStories.find(s => s.storyId === itemId);
        if (story) {
          return story;
        }
      }
    }

    if (itemType === 'task') {
      for (const epic of project.epics) {
        if (!epic.userStories) {
          continue;
        }
        for (const story of epic.userStories) {
          if (!story.tasks) {
            continue;
          }
          const task = story.tasks.find(t => t.taskId === itemId);
          if (task) {
            return task;
          }
        }
      }
    }

    if (itemType === 'subtask') {
      for (const epic of project.epics) {
        if (!epic.userStories) {
          continue;
        }
        for (const story of epic.userStories) {
          if (!story.tasks) {
            continue;
          }
          for (const task of story.tasks) {
            if (!task.subTasks) {
              continue;
            }
            const subtask = task.subTasks.find(s => s.subTaskId === itemId);
            if (subtask) {
              return subtask;
            }
          }
        }
      }
    }

    return null;
  }

  loadProgressStatuses(): void {
    const orgId = localStorage.getItem('userOrgId');
    if (!orgId) {
      return;
    }

    this.projectService.getProgressStatuses(orgId).subscribe({
      next: (data: ProgressStatusVO[]) => {
        const statuses = (data as any)?.attributes || data || [];
        this.progressStatuses = (statuses as ProgressStatusVO[]).sort((a, b) => a.progressSequence - b.progressSequence);
      },
      error: (err) => console.error('Failed to load progress statuses', err)
    });
  }

  getItemTypeLabel(): string {
    if (!this.itemType) {
      return 'Item';
    }
    return this.itemType.charAt(0).toUpperCase() + this.itemType.slice(1);
  }

  getItemDisplayId(): string {
    if (!this.item) {
      return '---';
    }

    if (this.itemType === 'story') {
      return this.item.storyCode || `#${this.item.storyId}`;
    }
    if (this.itemType === 'task') {
      return `#${this.item.taskId}`;
    }
    if (this.itemType === 'subtask') {
      return `#${this.item.subTaskId}`;
    }

    return '---';
  }

  getItemDescription(): string {
    return this.item?.description || 'No description available.';
  }

  getItemProgress(): string {
    return this.item?.progress?.progressName || 'Not set';
  }

  getProgressEndDate(): string {
    return this.item?.plannedEndDate || this.item?.actualEndDate || 'N/A';
  }

  getItemDates(): { start: string | null; end: string | null } {
    if (!this.item) {
      return { start: null, end: null };
    }

    return {
      start: this.item.plannedStartDate || this.item.actualStartDate || null,
      end: this.item.plannedEndDate || this.item.actualEndDate || null
    };
  }

  getItemSubtitle(): string {
    if (!this.itemType) {
      return '';
    }
    if (this.itemType === 'story') {
      return this.item?.title || '';
    }
    return this.item?.title || this.item?.name || '';
  }

  getRelatedItems(): any[] {
    if (!this.itemType || !this.item) {
      return [];
    }
    if (this.itemType === 'story') {
      return Array.isArray(this.item.tasks) ? this.item.tasks : [];
    }
    if (this.itemType === 'task') {
      return Array.isArray(this.item.subTasks) ? this.item.subTasks : [];
    }
    return [];
  }

  getParentInfo(): string {
    if (!this.itemType || !this.item) {
      return '';
    }
    if (this.itemType === 'task' && this.item.storyId) {
      return `Story ${this.item.storyId?.storyCode || `#${this.item.storyId?.storyId || this.item.storyId}`}`;
    }
    if (this.itemType === 'subtask' && this.item.taskId) {
      return `Task #${this.item.taskId?.taskId || this.item.taskId}`;
    }
    return '';
  }

  getItemPageUrl(): string {
    if (!this.itemType || !this.item || !this.projectId) {
      return '#';
    }
    const id = this.itemType === 'story' ? this.item.storyId : this.itemType === 'task' ? this.item.taskId : this.itemType === 'subtask' ? this.item.subTaskId : null;
    if (!id) {
      return '#';
    }
    return `${window.location.origin}/project-status/item/${this.itemType}/${id}?projectId=${this.projectId}`;
  }

  openItemInNewTab(event: MouseEvent): void {
    event.preventDefault();
    const url = this.getItemPageUrl();
    if (url !== '#') {
      window.open(url, '_blank', 'noopener');
    }
  }

  close(): void {
    this.dialogRef?.close();
  }
}
