import { Component, Inject, OnInit, Optional } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProjectService } from '../../../service/project.service';
import { EpicVO, ProgressStatusVO } from '../../../models/project-builder';
import { DetailsTemplateService } from '../../../service/details-template.service';
import { FieldTypeItem, TemplateDetail, TemplateDetailField, TemplatesDetails } from '../../../models/details-template.model';

export interface EpicDetailDialogData {
  epic?: EpicVO;
  projectId?: number;
}

@Component({
  selector: 'app-project-status-epic-detail',
  templateUrl: './project-status-epic-detail.component.html',
  styleUrls: ['./project-status-epic-detail.component.scss']
})
export class ProjectStatusEpicDetailComponent implements OnInit {
  epic: EpicVO | null = null;
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
    if (this.data?.epic && this.data.projectId) {
      this.epic = this.data.epic;
      this.projectId = this.data.projectId;
      this.initializeEpicState();
      this.discussionText = '';
      this.loadProgressStatuses();
      this.loadTemplates();
    } else if (this.checkAndLoadFromHash()) {
      // Token found and loaded from sessionStorage
      return;
    } else {
      this.loadFromRoute();
    }
  }

  private checkAndLoadFromHash(): boolean {
    // Get hash from window location (hash includes '#' so we need to remove it)
    const hash = window.location.hash.substring(1);
    if (!hash || !hash.startsWith('epic_')) {
      return false;
    }

    try {
      const payloadJson = sessionStorage.getItem(hash);
      if (!payloadJson) {
        console.warn('Token not found in sessionStorage:', hash);
        return false;
      }

      const payload = JSON.parse(payloadJson);
      const { projectId, epicId } = payload;

      if (!epicId) {
        console.warn('Invalid payload structure:', payload);
        return false;
      }

      this.projectId = projectId;
      this.loadEpicById(epicId, projectId, () => {
        sessionStorage.removeItem(hash);
      });
      return true;
    } catch (e) {
      console.error('Error parsing token from hash:', e);
      return false;
    }
  }

  loadFromRoute(): void {
    const epicId = Number(this.route.snapshot.paramMap.get('epicId'));
    const projectId = Number(this.route.snapshot.queryParamMap.get('projectId'));
    console.log('Route params - projectId:', projectId, 'epicId:', epicId);
    if (!epicId) {
      this.error = 'Missing epic identifier.';
      return;
    }

    this.projectId = projectId || undefined;
    this.loadEpicById(epicId, projectId);
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
        this.initializeEpicState();
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
        this.initializeEpicState();
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

  private initializeEpicState(): void {
    if (!this.epic) {
      return;
    }

    this.acceptanceText = (this.epic as any)?.epicDesc || '';
    this.selectedProgress = this.epic.progress || null;
    this.selectedTemplateId = (this.epic as any).templateId ?? '';
  }

  getEpicPageUrl(): string {
    if (!this.epic) {
      return '#';
    }

    const projectId = this.projectId || this.epic.project?.projectId;
    const baseRoute = `/project-status/epic/${this.epic.epicId}`;
    return projectId ? `${window.location.origin}${baseRoute}?projectId=${projectId}` : `${window.location.origin}${baseRoute}`;
  }

  openEpicInNewTab(event: MouseEvent): void {
    event.preventDefault();
    if (!this.epic) {
      return;
    }

    const url = `/project-status/epic/${this.epic.epicId}`;
    window.open(url, '_blank', 'noopener');
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
        // Ensure the epic has a selectedProgress when opened. If none, pick the epic's current progress or default to first status and persist.
        if (this.epic) {
          // Try to match epic progress to one of the loaded statuses
          if (this.epic.progress) {
            const matched = this.progressStatuses.find(s => s.progressId === this.epic!.progress!.progressId);
            this.selectedProgress = matched || this.epic.progress;
          } else if (this.progressStatuses.length) {
            // No progress set on epic — default to first status and update backend
            this.selectedProgress = this.progressStatuses[0];
            this.epic.progress = this.selectedProgress;
            this.projectService.updateEpic(this.epic).subscribe({
              next: () => {},
              error: (err: any) => console.error('Failed to set default epic progress', err)
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
    if (!this.epic || !status) return;
    this.selectedProgress = status;
    this.epic.progress = status;
    this.projectService.updateEpic(this.epic).subscribe({
      next: () => {},
      error: (err: any) => console.error('Failed to update epic progress', err)
    });
  }

  saveAcceptance(): void {
    if (!this.epic) return;
    (this.epic as any).epicDesc = this.acceptanceText;
    this.projectService.updateEpic(this.epic).subscribe({
      next: () => {},
      error: (err: any) => console.error('Failed to save acceptance', err)
    });
  }

  saveEpic(): void {
    if (!this.epic) {
      return;
    }

    if (this.selectedTemplateId) {
      (this.epic as any).templateId = this.selectedTemplateId;
    }

    if (this.selectedTemplate) {
      (this.epic as any).templateDetails = this.selectedTemplate.templateDetails?.map((detail) => ({
        fieldName: detail.fieldName,
        fieldTypeId: detail.fieldTypeId,
        mandatory: detail.mandatory,
        options: detail.options,
        value: this.templateFieldValues[detail.fieldName]
      })) || [];
    }

    this.projectService.updateEpic(this.epic).subscribe({
      next: () => {
        console.log('Epic updated successfully');
      },
      error: (err: any) => console.error('Failed to save epic template data', err)
    });
  }

  saveDiscussion(): void {
    // Discussion is UI-only for now; implement backend when available
    console.log('Saved discussion:', this.discussionText);
  }

  selectTemplate(templateId: number): void {
    this.selectedTemplateId = templateId;
    if (this.epic) {
      (this.epic as any).templateId = templateId;
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
    const existingDetails = Array.isArray((this.epic as any)?.templateDetails) ? (this.epic as any).templateDetails : [];

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

  getEpicDescription(): string {
    return (this.epic as any)?.epicDesc || (this.epic as any)?.description || this.epic?.project?.projectDesc || 'No description available.';
  }

  getAcceptanceCriteria(): string {
    return (this.epic as any)?.epicDesc || (this.epic as any)?.description || 'No acceptance criteria documented.';
  }

  close(): void {
    this.dialogRef?.close();
  }
}
