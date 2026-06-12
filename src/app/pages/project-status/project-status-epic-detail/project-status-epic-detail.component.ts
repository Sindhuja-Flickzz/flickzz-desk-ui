import { Component, Inject, OnInit, Optional } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProjectService } from '../../../service/project.service';
import { EpicVO, ProgressStatusVO, UserStory, Task, SubTask } from '../../../models/project-builder';
import { DetailsTemplateService } from '../../../service/details-template.service';
import { FieldTypeItem, TemplateDetail, TemplateDetailField, TemplatesDetails } from '../../../models/details-template.model';

export interface EpicDetailDialogData {
  itemType?: 'epic' | 'story' | 'task' | 'subtask';
  item?: EpicVO | UserStory | Task | SubTask;
  projectId?: number;
}

@Component({
  selector: 'app-project-status-epic-detail',
  templateUrl: './project-status-epic-detail.component.html',
  styleUrls: ['./project-status-epic-detail.component.scss']
})
export class ProjectStatusEpicDetailComponent implements OnInit {
  itemType: 'epic' | 'story' | 'task' | 'subtask' = 'epic';
  epic: EpicVO | null = null;
  story: UserStory | null = null;
  task: Task | null = null;
  subtask: SubTask | null = null;
  projectId?: number;
  isLoading = false;
  error: string | null = null;
  // UI state
  progressStatuses: ProgressStatusVO[] = [];
  templates: TemplatesDetails[] = [];
  selectedTemplate?: TemplatesDetails | null = null;
  templateFieldValues: { [key: string]: any } = {};
  fieldTypeMap: Map<number, string> = new Map();
  selectedProgress: ProgressStatusVO | null = null;
  selectedTemplateId?: number;
  acceptanceText = '';
  discussionText = '';
  attachments: { name: string; url?: string }[] = [];

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private projectService: ProjectService,
    private templateService: DetailsTemplateService,
    @Optional() public dialogRef: MatDialogRef<ProjectStatusEpicDetailComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: EpicDetailDialogData
  ) {}

  ngOnInit(): void {
    if (this.data?.item && this.data.projectId) {
      this.itemType = this.data.itemType || 'epic';
      this.projectId = this.data.projectId;
      if (this.itemType === 'story') {
        this.story = this.data.item as UserStory;
      } else if (this.itemType === 'task') {
        this.task = this.data.item as Task;
      } else if (this.itemType === 'subtask') {
        this.subtask = this.data.item as SubTask;
      } else {
        this.epic = this.data.item as EpicVO;
      }
      this.initializeItemState();
      this.discussionText = '';
      this.loadProgressStatuses();
      this.loadTemplates();
    } else if (this.checkAndLoadFromHash()) {
      return;
    } else {
      this.loadFromRoute();
    }
  }

  private checkAndLoadFromHash(): boolean {
    const hash = window.location.hash.substring(1);
    if (!hash || (!hash.startsWith('epic_') && !hash.startsWith('story_') && !hash.startsWith('task_') && !hash.startsWith('subtask_'))) {
      return false;
    }

    try {
      const payloadJson = sessionStorage.getItem(hash);
      if (!payloadJson) {
        console.warn('Token not found in sessionStorage:', hash);
        return false;
      }

      const payload = JSON.parse(payloadJson);
      const { projectId, epicId, storyId, taskId, subtaskId } = payload;
      this.projectId = projectId;

      if (subtaskId) {
        this.itemType = 'subtask';
        this.loadSubtaskById(subtaskId, projectId, () => {
          sessionStorage.removeItem(hash);
        });
        return true;
      }

      if (taskId) {
        this.itemType = 'task';
        this.loadTaskById(taskId, projectId, () => {
          sessionStorage.removeItem(hash);
        });
        return true;
      }

      if (storyId) {
        this.itemType = 'story';
        this.loadStoryById(storyId, projectId, () => {
          sessionStorage.removeItem(hash);
        });
        return true;
      }

      if (epicId) {
        this.itemType = 'epic';
        this.loadEpicById(epicId, projectId, () => {
          sessionStorage.removeItem(hash);
        });
        return true;
      }

      console.warn('Invalid payload structure:', payload);
      return false;
    } catch (e) {
      console.error('Error parsing token from hash:', e);
      return false;
    }
  }

  loadFromRoute(): void {
    const itemType = this.route.snapshot.paramMap.get('itemType') as 'epic' | 'story' | 'task' | 'subtask' | null;
    const itemId = Number(this.route.snapshot.paramMap.get('itemId'));
    const epicId = Number(this.route.snapshot.paramMap.get('epicId'));
    const storyId = Number(this.route.snapshot.paramMap.get('storyId'));
    const taskId = Number(this.route.snapshot.paramMap.get('taskId'));
    const projectId = Number(this.route.snapshot.queryParamMap.get('projectId'));
    console.log('Route params - projectId:', projectId, 'itemType:', itemType, 'itemId:', itemId, 'epicId:', epicId, 'storyId:', storyId, 'taskId:', taskId);

    if (itemType && itemId) {
      this.itemType = itemType;
      this.projectId = projectId || undefined;
      if (itemType === 'subtask') {
        this.loadSubtaskById(itemId, projectId);
        return;
      }
      if (itemType === 'task') {
        this.loadTaskById(itemId, projectId);
        return;
      }
      if (itemType === 'story') {
        this.loadStoryById(itemId, projectId);
        return;
      }
      if (itemType === 'epic') {
        this.loadEpicById(itemId, projectId);
        return;
      }
    }

    if (epicId) {
      this.itemType = 'epic';
      this.projectId = projectId || undefined;
      this.loadEpicById(epicId, projectId);
      return;
    }

    if (storyId) {
      this.itemType = 'story';
      this.projectId = projectId || undefined;
      this.loadStoryById(storyId, projectId);
      return;
    }

    if (taskId) {
      this.itemType = 'task';
      this.projectId = projectId || undefined;
      this.loadTaskById(taskId, projectId);
      return;
    }

    this.error = 'Missing item identifier.';
  }

  private loadEpicById(epicId: number, projectId?: number, onFinally?: () => void): void {
    this.isLoading = true;
    this.projectService.getEpicById(epicId).subscribe({
      next: (epic) => {
        this.isLoading = false;
        if (onFinally) {
          onFinally();
        }
        this.epic = (epic as any)?.attributes || epic;
        this.projectId = this.projectId || projectId || this.epic?.project?.projectId;
        this.initializeItemState();
        this.discussionText = '';
        this.loadProgressStatuses();
        this.loadTemplates();
      },
      error: (err) => {
        if (onFinally) {
          onFinally();
        }
        if (projectId) {
          this.loadEpicFromProject(projectId, epicId);
          return;
        }
        this.isLoading = false;
        this.error = 'Failed to load epic details.';
        console.error(err);
      }
    });
  }

  private loadEpicFromProject(projectId: number, epicId: number): void {
    this.isLoading = true;
    this.projectService.getProjectInfo(String(projectId)).subscribe({
      next: (project) => {
        this.isLoading = false;
        project = (project as any)?.attributes || project;
        this.projectId = projectId;
        this.findEpic(project.epics, epicId);
        this.initializeItemState();
        this.discussionText = '';
        this.loadProgressStatuses();
        this.loadTemplates();
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Failed to load epic details.';
        console.error(err);
      }
    });
  }

  private loadStoryById(storyId: number, projectId?: number, onFinally?: () => void): void {
    if (!projectId) {
      this.error = 'Missing project identifier for story.';
      return;
    }

    this.isLoading = true;
    this.projectService.getProjectInfo(String(projectId)).subscribe({
      next: (project) => {
        this.isLoading = false;
        if (onFinally) {
          onFinally();
        }
        project = (project as any)?.attributes || project;
        this.projectId = projectId;
        this.findStory(project.epics, storyId);
        this.initializeItemState();
        this.discussionText = '';
        this.loadProgressStatuses();
        this.loadTemplates();
      },
      error: (err) => {
        if (onFinally) {
          onFinally();
        }
        this.isLoading = false;
        this.error = 'Failed to load story details.';
        console.error(err);
      }
    });
  }

  private loadTaskById(taskId: number, projectId?: number, onFinally?: () => void): void {
    if (!projectId) {
      this.error = 'Missing project identifier for task.';
      return;
    }

    this.isLoading = true;
    this.projectService.getProjectInfo(String(projectId)).subscribe({
      next: (project) => {
        this.isLoading = false;
        if (onFinally) {
          onFinally();
        }
        project = (project as any)?.attributes || project;
        this.projectId = projectId;
        this.findTask(project.epics, taskId);
        this.initializeItemState();
        this.discussionText = '';
        this.loadProgressStatuses();
        this.loadTemplates();
      },
      error: (err) => {
        if (onFinally) {
          onFinally();
        }
        this.isLoading = false;
        this.error = 'Failed to load task details.';
        console.error(err);
      }
    });
  }

  private loadSubtaskById(subtaskId: number, projectId?: number, onFinally?: () => void): void {
    if (!projectId) {
      this.error = 'Missing project identifier for subtask.';
      return;
    }

    this.isLoading = true;
    this.projectService.getProjectInfo(String(projectId)).subscribe({
      next: (project) => {
        this.isLoading = false;
        if (onFinally) {
          onFinally();
        }
        project = (project as any)?.attributes || project;
        this.projectId = projectId;
        this.findSubtask(project.epics, subtaskId);
        this.initializeItemState();
        this.discussionText = '';
        this.loadProgressStatuses();
        this.loadTemplates();
      },
      error: (err) => {
        if (onFinally) {
          onFinally();
        }
        this.isLoading = false;
        this.error = 'Failed to load subtask details.';
        console.error(err);
      }
    });
  }

  private findEpic(epics: EpicVO[] | undefined, epicId: number): void {
    if (!epics) {
      this.error = 'Epic not found.';
      return;
    }

    const found = epics.find(e => e.epicId === epicId);
    if (!found) {
      this.error = 'Epic not found.';
      return;
    }

    this.epic = found;
  }

  private findStory(epics: EpicVO[] | undefined, storyId: number): void {
    if (!epics) {
      this.error = 'Story not found.';
      return;
    }

    for (const epic of epics) {
      if (!epic.userStories) {
        continue;
      }
      const found = epic.userStories.find(s => s.storyId === storyId);
      if (found) {
        this.story = found;
        return;
      }
    }

    this.error = 'Story not found.';
  }

  private findTask(epics: EpicVO[] | undefined, taskId: number): void {
    if (!epics) {
      this.error = 'Task not found.';
      return;
    }

    for (const epic of epics) {
      if (!epic.userStories) {
        continue;
      }
      for (const story of epic.userStories) {
        if (!story.tasks) {
          continue;
        }
        const found = story.tasks.find(t => t.taskId === taskId);
        if (found) {
          this.task = found;
          return;
        }
      }
    }

    this.error = 'Task not found.';
  }

  private findSubtask(epics: EpicVO[] | undefined, subtaskId: number): void {
    if (!epics) {
      this.error = 'Subtask not found.';
      return;
    }

    for (const epic of epics) {
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
          const found = task.subTasks.find(st => st.subTaskId === subtaskId);
          if (found) {
            this.subtask = found;
            return;
          }
        }
      }
    }

    this.error = 'Subtask not found.';
  }

  private initializeItemState(): void {
    const item = this.itemType === 'story'
      ? this.story
      : this.itemType === 'task'
        ? this.task
        : this.itemType === 'subtask'
          ? this.subtask
          : this.epic;
    if (!item) {
      return;
    }

    if (this.itemType === 'epic') {
      this.acceptanceText = (item as any)?.epicDesc || '';
    } else {
      this.acceptanceText = (item as any)?.description || '';
    }
    this.selectedProgress = (item as any)?.progress || null;
    this.selectedTemplateId = (item as any).templateId ?? '';
  }

  getItemPageUrl(): string {
    const itemId = this.itemType === 'story'
      ? this.story?.storyId
      : this.itemType === 'task'
        ? this.task?.taskId
        : this.itemType === 'subtask'
          ? this.subtask?.subTaskId
          : this.epic?.epicId;
    if (!itemId) {
      return '#';
    }

    const projectId = this.projectId || this.epic?.project?.projectId;
    let baseRoute = '/project-status/epic/' + itemId;
    if (this.itemType === 'story') {
      baseRoute = `/project-status/story/${itemId}`;
    } else if (this.itemType === 'task') {
      baseRoute = `/project-status/task/${itemId}`;
    } else if (this.itemType === 'subtask') {
      baseRoute = `/project-status/item/subtask/${itemId}`;
    }

    return projectId ? `${window.location.origin}${baseRoute}?projectId=${projectId}` : `${window.location.origin}${baseRoute}`;
  }

  openItemInNewTab(event: MouseEvent): void {
    event.preventDefault();
    const url = this.getItemPageUrl();
    if (url !== '#') {
      window.open(url, '_blank', 'noopener');
    }
  }

  loadProgressStatuses(): void {
    const orgId = localStorage.getItem('userOrgId');
    if (!orgId) {
      return;
    }
    this.projectService.getProgressStatuses(orgId).subscribe({
      next: (data: ProgressStatusVO[]) => {
        const statuses = (data as any)?.attributes || [];
        this.progressStatuses = (statuses as ProgressStatusVO[]).sort((a, b) => a.progressSequence - b.progressSequence);
        const item = this.itemType === 'story'
          ? this.story
          : this.itemType === 'task'
            ? this.task
            : this.epic;
        if (item) {
          if ((item as any).progress) {
            const matched = this.progressStatuses.find(s => s.progressId === (item as any).progress?.progressId);
            this.selectedProgress = matched || (item as any).progress || null;
          } else if (this.progressStatuses.length) {
            this.selectedProgress = this.progressStatuses[0];
            (item as any).progress = this.selectedProgress;
            const saveMethod = this.itemType === 'story'
              ? this.projectService.updateStory(item)
              : this.itemType === 'task'
                ? this.projectService.updateTask(item)
                : this.projectService.updateEpic(item);
            saveMethod.subscribe({
              next: () => {},
              error: (err: any) => console.error('Failed to set default item progress', err)
            });
          }
        }
      },
      error: (err: any) => console.error('Failed to load progress statuses', err)
    });
  }

  loadTemplates(): void {
    const orgId = localStorage.getItem('userOrgId');
    if (!orgId) {
      return;
    }

    this.templateService.getFieldTypeList(orgId).subscribe({
      next: (fieldTypeData: any) => {
        const fieldTypes = (fieldTypeData as any)?.attributes || fieldTypeData || [];
        this.fieldTypeMap.clear();
        if (Array.isArray(fieldTypes)) {
          fieldTypes.forEach((item: FieldTypeItem) => {
            if (item && item.typeId !== undefined) {
              this.fieldTypeMap.set(item.typeId, item.label);
            }
          });
        }

        this.templateService.getTemplateList(orgId).subscribe({
          next: (data: any) => {
            const templates = (data as any)?.attributes || '';
            this.templates = Array.isArray(templates)
              ? templates.map((template: TemplatesDetails) => ({
                  ...template,
                  templateDetails: Array.isArray(template.templateDetails)
                    ? template.templateDetails.map((detail: TemplateDetail) => ({
                        ...detail,
                        fieldTypeLabel: this.fieldTypeMap.get(detail.fieldTypeId) || ''
                      }))
                    : []
                }))
              : [];
            this.initializeSelectedTemplate();
          },
          error: (err) => console.error('Failed to load templates', err)
        });
      },
      error: (err) => {
        console.error('Failed to load field types for templates', err);
        this.templateService.getTemplateList(orgId).subscribe({
          next: (data: any) => {
            const templates = (data as any)?.attributes || data || [];
            this.templates = Array.isArray(templates) ? templates as TemplatesDetails[] : [];
            this.initializeSelectedTemplate();
          },
          error: (tmplErr) => console.error('Failed to load templates', tmplErr)
        });
      }
    });
  }

  updateProgress(status: ProgressStatusVO | null): void {
    const item = this.itemType === 'story'
      ? this.story
      : this.itemType === 'task'
        ? this.task
        : this.itemType === 'subtask'
          ? this.subtask
          : this.epic;
    if (!item || !status) return;
    this.selectedProgress = status;
    (item as any).progress = status;

    const save$ = this.itemType === 'story'
      ? this.projectService.updateStory(item)
      : this.itemType === 'task'
        ? this.projectService.updateTask(item)
        : this.itemType === 'subtask'
          ? this.projectService.updateTask((item as any).taskId || item)
          : this.projectService.updateEpic(item);

    save$.subscribe({
      next: () => {},
      error: (err: any) => console.error('Failed to update item progress', err)
    });
  }

  saveAcceptance(): void {
    const item = this.itemType === 'story'
      ? this.story
      : this.itemType === 'task'
        ? this.task
        : this.itemType === 'subtask'
          ? this.subtask
          : this.epic;
    if (!item) return;

    if (this.itemType === 'epic') {
      (item as any).epicDesc = this.acceptanceText;
    } else {
      (item as any).description = this.acceptanceText;
    }

    const save$ = this.itemType === 'story'
      ? this.projectService.updateStory(item)
      : this.itemType === 'task'
        ? this.projectService.updateTask(item)
        : this.itemType === 'subtask'
          ? this.projectService.updateTask((item as any).taskId || item)
          : this.projectService.updateEpic(item);

    save$.subscribe({
      next: () => {},
      error: (err: any) => console.error('Failed to save acceptance', err)
    });
  }

  saveItem(): void {
    const item = this.itemType === 'story'
      ? this.story
      : this.itemType === 'task'
        ? this.task
        : this.itemType === 'subtask'
          ? this.subtask
          : this.epic;
    if (!item) {
      return;
    }

    if (this.selectedTemplateId) {
      (item as any).templateId = this.selectedTemplateId;
    }

    if (this.selectedTemplate) {
      (item as any).templateDetails = this.selectedTemplate.templateDetails?.map((detail) => ({
        fieldName: detail.fieldName,
        fieldTypeId: detail.fieldTypeId,
        mandatory: detail.mandatory,
        options: detail.options,
        value: this.templateFieldValues[detail.fieldName]
      })) || [];
    }

    const save$ = this.itemType === 'story'
      ? this.projectService.updateStory(item)
      : this.itemType === 'task'
        ? this.projectService.updateTask(item)
        : this.itemType === 'subtask'
          ? this.projectService.updateTask((item as any).taskId || item)
          : this.projectService.updateEpic(item);

    save$.subscribe({
      next: () => {
        console.log('Item updated successfully');
      },
      error: (err: any) => console.error('Failed to save template data', err)
    });
  }

  saveDiscussion(): void {
    console.log('Saved discussion:', this.discussionText);
  }

  selectTemplate(templateId: number): void {
    const item = this.itemType === 'story'
      ? this.story
      : this.itemType === 'task'
        ? this.task
        : this.itemType === 'subtask'
          ? this.subtask
          : this.epic;
    this.selectedTemplateId = templateId;
    if (item) {
      (item as any).templateId = templateId;
    }

    this.selectedTemplate = this.templates.find((template) => template.templateId === templateId) || null;
    this.initializeTemplateFieldValues();
  }

  onTemplateChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value) {
      const templateId = Number(value);
      this.selectTemplate(templateId);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    for (let i = 0; i < input.files.length; i++) {
      const f = input.files[i];
      this.attachments.push({ name: f.name });
    }
  }

  private initializeSelectedTemplate(): void {
    if (!this.selectedTemplateId || !this.templates.length) {
      return;
    }
    this.selectedTemplate = this.templates.find((template) => template.templateId === this.selectedTemplateId) || null;
    this.initializeTemplateFieldValues();
  }

  private initializeTemplateFieldValues(): void {
    this.templateFieldValues = {};
    const item = this.itemType === 'story'
      ? this.story
      : this.itemType === 'task'
        ? this.task
        : this.epic;
    const existingDetails = Array.isArray((item as any)?.templateDetails) ? (item as any).templateDetails : [];

    this.selectedTemplate?.templateDetails?.forEach((detail) => {
      const existingDetail = existingDetails.find((item: any) => item.fieldName === detail.fieldName);
      if (existingDetail?.value !== undefined) {
        this.templateFieldValues[detail.fieldName] = existingDetail.value;
        return;
      }

      const typeLabel = detail.fieldTypeLabel?.toUpperCase() || '';
      if (detail.options && detail.options.length) {
        if (typeLabel === 'CHECKBOX' || typeLabel === 'MULTISELECT') {
          this.templateFieldValues[detail.fieldName] = detail.options
            .filter((option) => option.defaultSelected)
            .map((option) => option.value);
        } else {
          this.templateFieldValues[detail.fieldName] = detail.options.find((option) => option.defaultSelected)?.value || '';
        }
      } else {
        this.templateFieldValues[detail.fieldName] = '';
      }
    });
  }

  getTemplateFieldControlType(detail: TemplateDetailField): string {
    const typeLabel = detail.fieldTypeLabel?.toUpperCase() || '';
    console.log('Determining control type for field:', detail, 'with type label:', typeLabel);
    if (detail.options && detail.options.length) {
      if (typeLabel === 'CHECKBOX' || typeLabel === 'MULTISELECT') {
        return 'checkboxes';
      }
      if (typeLabel === 'RADIO') {
        return 'radio';
      }
      return 'select';
    }
    if (typeLabel === 'TEXTAREA') {
      return 'textarea';
    }
    if (typeLabel === 'NUMBER') {
      return 'number';
    }
    if (typeLabel.includes('DATE')) {
      return 'date';
    }
    if (typeLabel === 'EMAIL') {
      return 'email';
    }
    if (typeLabel === 'URL') {
      return 'url';
    }
    return 'text';
  }

  getTemplateFieldValue(fieldName: string): any {
    return this.templateFieldValues[fieldName] ?? '';
  }

  updateTemplateFieldValue(detail: TemplateDetailField, value: any): void {
    this.templateFieldValues[detail.fieldName] = value;
  }

  toggleTemplateFieldCheckbox(detail: TemplateDetailField, optionValue: string): void {
    const currentValue = this.templateFieldValues[detail.fieldName] || [];
    const selectedValues = Array.isArray(currentValue) ? [...currentValue] : [];
    const index = selectedValues.indexOf(optionValue);
    if (index >= 0) {
      selectedValues.splice(index, 1);
    } else {
      selectedValues.push(optionValue);
    }
    this.templateFieldValues[detail.fieldName] = selectedValues;
  }

  isCheckboxOptionSelected(detail: TemplateDetailField, optionValue: string): boolean {
    const currentValue = this.templateFieldValues[detail.fieldName];
    return Array.isArray(currentValue) && currentValue.includes(optionValue);
  }

  getItemDescription(): string {
    const item = this.itemType === 'story'
      ? this.story
      : this.itemType === 'task'
        ? this.task
        : this.epic;
    return (item as any)?.epicDesc || (item as any)?.description || 'No description available.';
  }

  getAcceptanceCriteria(): string {
    const item = this.itemType === 'story'
      ? this.story
      : this.itemType === 'task'
        ? this.task
        : this.epic;
    return (item as any)?.epicDesc || (item as any)?.description || 'No acceptance criteria documented.';
  }

  getItemTitle(): string {
    if (this.itemType === 'story') {
      return this.story?.title || '';
    }
    if (this.itemType === 'task') {
      return this.task?.title || '';
    }
    return this.epic?.epicName || '';
  }

  getItemIdLabel(): string {
    if (this.itemType === 'story') {
      return `Story ${this.story?.storyId || '---'}`;
    }
    if (this.itemType === 'task') {
      return `Task ${this.task?.taskId || '---'}`;
    }
    if (this.itemType === 'subtask') {
      return `Subtask ${this.subtask?.subTaskId || '---'}`;
    }
    return `Epic ${this.epic?.epicId || '---'}`;
  }

  getItemProjectName(): string {
    if (this.itemType === 'story') {
      return (this.story as any)?.project?.projectName || this.epic?.project?.projectName || 'N/A';
    }
    if (this.itemType === 'task') {
      return (this.task as any)?.storyId?.project?.projectName || (this.task as any)?.project?.projectName || this.epic?.project?.projectName || 'N/A';
    }
    if (this.itemType === 'subtask') {
      return (this.subtask as any)?.taskId?.storyId?.project?.projectName || (this.subtask as any)?.taskId?.project?.projectName || this.epic?.project?.projectName || 'N/A';
    }
    return this.epic?.project?.projectName || 'N/A';
  }

  getItemSequence(): string {
    if (this.itemType === 'story') {
      return (this.story as any)?.storySequence?.toString() || 'N/A';
    }
    if (this.itemType === 'task') {
      return (this.task as any)?.taskSequence?.toString() || 'N/A';
    }
    if (this.itemType === 'subtask') {
      return (this.subtask as any)?.subTaskId?.toString() || 'N/A';
    }
    return this.epic?.epicSequence?.toString() || 'N/A';
  }

  getItemStartDate(): string {
    const item = this.itemType === 'story'
      ? this.story
      : this.itemType === 'task'
        ? this.task
        : this.epic;
    const date = (item as any)?.plannedStartDate;
    return date ? new Date(date).toLocaleDateString() : 'N/A';
  }

  getItemEndDate(): string {
    const item = this.itemType === 'story'
      ? this.story
      : this.itemType === 'task'
        ? this.task
        : this.epic;
    const date = (item as any)?.plannedEndDate;
    return date ? new Date(date).toLocaleDateString() : 'N/A';
  }

  getItemStoryCount(): string {
    if (this.itemType === 'story' || this.itemType === 'subtask') {
      return '1';
    }
    if (this.itemType === 'task') {
      return (this.task?.subTasks?.length ?? 0).toString();
    }
    return this.epic?.userStories?.length?.toString() || '0';
  }

  close(): void {
    this.dialogRef?.close();
  }
}
