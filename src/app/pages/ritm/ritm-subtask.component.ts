import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AgentMaster } from '../../models/agent-master';
import { ApprovalWorkflow } from '../../models/approval-workflow.model';
import { CategoryMaster, CategorySubCategory } from '../../models/category-master';
import { PriorityMaster } from '../../models/priority-master';
import { RequestType } from '../../models/request-type.model';
import { WorkItem } from '../../models/variant.model';
import { ApprovalWorkflowService } from '../../service/approval-workflow.service';
import { AgentService } from '../../service/agent.service';
import { CategoryService } from '../../service/category.service';
import { CompanyService } from '../../service/company.service';
import { RequestTypeService } from '../../service/request-type.service';
import { RitmService } from '../../service/ritm.service';
import { SupportGroupService } from '../../service/support-group.service';
import { VariantService } from '../../service/variant.service';
import { USER_ROLES } from '../../data/app_constants';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

interface SubtaskStatus {
  statusId: number;
  statusCode: string;
  statusColor?: string;
}

@Component({
  selector: 'app-ritm-subtask',
  templateUrl: './ritm-subtask.component.html',
  styleUrls: ['./ritm.component.scss', './ritm-subtask.component.scss']
})
export class RitmSubtaskComponent implements OnInit, OnDestroy {
  subtaskForm!: FormGroup;
  users: AgentMaster[] = [];
  ritmStatuses: SubtaskStatus[] = [];
  priorities: PriorityMaster[] = [];
  categories: CategoryMaster[] = [];
  requestTypes: RequestType[] = [];
  subCategories: CategorySubCategory[] = [];
  templates: any[] = [];
  expandedTemplates: Record<string, boolean> = {};
  attachmentFiles: File[] = [];
  loading = true;
  submitting = false;
  formSubmitted = false;
  templatesLoading = false;
  submitError = '';
  submitSuccess = '';
  statusError = '';
  statusLoading = false;
  workflowLoading = false;
  statusUpdating = false;
  statusSetupFailed = false;
  assignmentGroupId: number | null = null;
  parentRitmId = '';
  subtaskId = '';
  isEditMode = false;
  private existingSubtask: any = null;
  parentRitm: any = null;
  orgId = localStorage.getItem('userOrgId') || '';
  private currentTimeTimer: ReturnType<typeof setInterval> | null = null;
  private fieldTypeMap = new Map<number, string>();
  private businessPartnerId: number | null = null;
  private supportGroupRequestId = 0;
  private approvalWorkflow: ApprovalWorkflow | null = null;
  private persistedStatusId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private snackBar: MatSnackBar,
    private ritmService: RitmService,
    private agentService: AgentService,
    private companyService: CompanyService,
    private categoryService: CategoryService,
    private requestTypeService: RequestTypeService,
    private supportGroupService: SupportGroupService,
    private variantService: VariantService,
    private workflowService: ApprovalWorkflowService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.subtaskForm = this.fb.group({
      ritmSubtaskNumber: [{ value: '', disabled: true }],
      assignedTo: [''],
      location: [{ value: '', disabled: true }],
      availabilityTime: [{ value: '', disabled: true }],
      currentTime: [{ value: '', disabled: true }],
      requestTypeId: ['', Validators.required],
      category: ['', Validators.required],
      subCategory: ['', Validators.required],
      assignmentGroup: [{ value: '', disabled: true }],
      priority: ['', Validators.required],
      customerResolution: [{ value: '', disabled: true }],
      status: ['']
    });

    this.parentRitmId = this.route.snapshot.queryParamMap.get('ritmId') || '';
    this.subtaskId = this.route.snapshot.queryParamMap.get('subtaskId') || '';
    this.isEditMode = !!this.subtaskId;
    if (this.isEditMode) {
      this.loadSubtaskStatuses();
      this.loadSubtaskApprovalWorkflow();
    }
    const navigationState = this.router.getCurrentNavigation()?.extras?.state as {
      ritmData?: any;
      parentRitmData?: any;
    } | undefined;
    this.existingSubtask = this.isEditMode
      ? navigationState?.ritmData || history.state?.ritmData || null
      : null;
    this.parentRitm = this.isEditMode
      ? navigationState?.parentRitmData || history.state?.parentRitmData || null
      : navigationState?.ritmData || history.state?.ritmData || null;
    this.parentRitmId = this.route.snapshot.queryParamMap.get('parentRitmId')
      || this.parentRitmId
      || String(this.existingSubtask?.parentRitmId
        ?? this.existingSubtask?.parentRitm?.ritmId
        ?? this.existingSubtask?.parentRitm?.ticketId
        ?? '');

    this.subtaskForm.get('assignedTo')?.valueChanges.subscribe(value => this.setAssignedToDetails(value));
    this.subtaskForm.get('category')?.valueChanges.subscribe(value => this.loadSubCategories(value));
    this.subtaskForm.get('subCategory')?.valueChanges.subscribe(value => this.loadSupportGroup(value));

    this.loadRequestTypes();
    this.loadAgents();
    this.loadPrioritiesAndCategories();
    this.loadTemplates();
    if (this.isEditMode) {
      if (this.existingSubtask) {
        this.populateFormFromSubtask(this.existingSubtask);
        this.loadParentRitm();
      } else {
        this.loadSubtask();
      }
    } else {
      this.loadParentRitm();
      this.generateSubtaskNumber();
    }
  }

  ngOnDestroy(): void {
    this.stopCurrentTimeTicker();
  }

  private loadParentRitm(): void {
    if (!this.parentRitmId) {
      if (!this.isEditMode) {
        this.submitError = 'Unable to identify the parent RITM for this subtask.';
      }
      this.loading = false;
      return;
    }
    if (this.parentRitm) {
      if (!this.isEditMode) {
        this.setParentResolutionTime();
      }
      return;
    }
    this.ritmService.getRitmById(this.parentRitmId).subscribe({
      next: response => {
        const payload = response?.attributes ?? response ?? {};
        const item = Array.isArray(payload) ? payload[0] ?? {} : payload;
        this.parentRitm = item?.ritm ?? item;
        if (!this.isEditMode) {
          this.setParentResolutionTime();
        }
      },
      error: error => {
        this.submitError = 'Unable to load the parent RITM details.';
        console.error(error);
      }
    });
  }

  private loadSubtask(): void {
    this.ritmService.getRitmById(this.subtaskId).subscribe({
      next: response => {
        const payload = response?.attributes ?? response ?? {};
        const record = Array.isArray(payload) ? payload[0] ?? {} : payload;
        this.existingSubtask = record?.ritm ?? record;
        this.populateFormFromSubtask(this.existingSubtask);
        this.parentRitmId = String(this.existingSubtask?.parentRitmId
          ?? this.existingSubtask?.parentRitm?.ritmId
          ?? this.existingSubtask?.parentRitm?.ticketId
          ?? this.parentRitmId);
        this.loadParentRitm();
      },
      error: error => {
        this.submitError = 'Unable to load RITM subtask details.';
        this.loading = false;
        console.error(error);
      }
    });
  }

  private populateFormFromSubtask(subtask: any): void {
    const categoryId = subtask?.categoryId ?? subtask?.category?.categoryId ?? subtask?.category?.id
      ?? (typeof subtask?.category === 'number' || typeof subtask?.category === 'string' ? subtask.category : '');
    const subCategoryId = subtask?.subCategoryId ?? subtask?.subCategory?.subCategoryId ?? subtask?.subCategory?.id
      ?? (typeof subtask?.subCategory === 'number' || typeof subtask?.subCategory === 'string' ? subtask.subCategory : '');
    const assignmentGroup = subtask?.assignmentGroup ?? subtask?.supportGroup
      ?? subtask?.assignmentGroupId ?? subtask?.supportGroupId;

    this.subtaskForm.patchValue({
      ritmSubtaskNumber: subtask?.ritmSubtaskNumber || subtask?.ticketNumber || subtask?.ritmNumber || '',
      assignedTo: this.getAssignedAgentId(subtask?.assignedTo ?? subtask?.assignedToId),
      requestTypeId: subtask?.requestTypeId ?? subtask?.requestType?.requestTypeId ?? '',
      category: categoryId,
      subCategory: subCategoryId,
      assignmentGroup: this.getDisplayName(assignmentGroup, ['groupName', 'supportGroupName', 'name']),
      priority: this.getPriorityId(subtask?.priority ?? subtask?.priorityId),
      customerResolution: this.toDateTimeLocalValue(subtask?.customerResolution ?? subtask?.customerResolutionDate ?? ''),
      status: this.getSubtaskStatusId(subtask) ?? ''
    }, { emitEvent: false });

    this.persistedStatusId = this.getSubtaskStatusId(subtask);
    if (this.persistedStatusId !== null && !this.ritmStatuses.some(status => status.statusId === this.persistedStatusId)) {
      const currentStatus = subtask?.status && typeof subtask.status === 'object' ? subtask.status : {};
      this.ritmStatuses = [{
        statusId: this.persistedStatusId,
        statusCode: String(currentStatus.statusCode ?? currentStatus.statusName ?? currentStatus.name ?? this.persistedStatusId),
        statusColor: currentStatus.statusColor
      }, ...this.ritmStatuses];
    }
    this.assignmentGroupId = this.getAssignmentGroupId(assignmentGroup);
    if (categoryId) {
      this.loadSubCategories(categoryId, subCategoryId, assignmentGroup);
    }
    this.applyExistingTemplateValues(subtask?.templateDetails ?? subtask?.templateFields ?? []);
    this.setAssignedToDetails(this.subtaskForm.get('assignedTo')?.value);
  }

  private getAssignedAgentId(assignedTo: any): number | string {
    return assignedTo && typeof assignedTo === 'object'
      ? assignedTo.agentId ?? assignedTo.id ?? ''
      : assignedTo ?? '';
  }

  private getPriorityId(priority: any): number | string {
    return priority && typeof priority === 'object'
      ? priority.priorityId ?? priority.id ?? ''
      : priority ?? '';
  }

  private getAssignmentGroupId(group: any): number | null {
    const id = group && typeof group === 'object'
      ? group.supportGroupId ?? group.groupId ?? group.id
      : group;
    return id == null || id === '' ? null : Number(id);
  }

  private getDisplayName(value: any, keys: string[]): string {
    if (!value || typeof value !== 'object') {
      return '';
    }
    const displayValue = keys.map(key => value[key]).find(item => item != null && item !== '');
    return displayValue == null ? '' : String(displayValue);
  }

  private applyExistingTemplateValues(details: any): void {
    const existingDetails = this.normalizeArray<any>(details);
    this.templates.forEach(template => this.getTemplateFields(template).forEach(field => {
      const existing = existingDetails.find(item =>
        field?.fieldId != null && item?.fieldId != null && Number(item.fieldId) === Number(field.fieldId)
      ) || existingDetails.find(item =>
        field?.fieldName && item?.fieldName
        && String(item.fieldName).trim().toLowerCase() === String(field.fieldName).trim().toLowerCase()
      );
      if (existing) {
        const value = existing.value ?? existing.fieldValue ?? existing.field_value ?? existing.userValue ?? '';
        field.value = value;
        field.userValue = value;
      }
    }));
  }

  private setParentResolutionTime(): void {
    const resolutionTime = this.parentRitm?.customerResolution
      ?? this.parentRitm?.customerResolutionDate
      ?? this.parentRitm?.resolutionDate
      ?? '';
    this.subtaskForm.get('customerResolution')?.setValue(this.toDateTimeLocalValue(resolutionTime));
  }

  private loadRequestTypes(): void {
    this.requestTypeService.getRequestTypes(Number(this.orgId)).subscribe({
      next: response => this.requestTypes = this.normalizeArray(response?.attributes ?? response),
      error: error => {
        this.submitError = 'Unable to load request types.';
        console.error(error);
      }
    });
  }

  private loadSubtaskStatuses(): void {
    if (!this.orgId) {
      this.statusSetupFailed = true;
      this.statusError = 'Organization information is unavailable; subtask status cannot be changed.';
      return;
    }

    this.statusLoading = true;
    this.ritmService.getActiveStatuses(this.orgId, 'RITM_SUBTASK').subscribe({
      next: response => {
        this.ritmStatuses = this.normalizeArray<any>(response?.attributes ?? response)
          .map(status => ({
            ...status,
            statusId: Number(status.statusId ?? status.id),
            statusCode: String(status.statusCode ?? '')
          }))
          .filter(status => Number.isInteger(status.statusId) && status.statusId > 0);
        this.statusLoading = false;
      },
      error: error => {
        this.statusLoading = false;
        this.statusSetupFailed = true;
        this.statusError = 'Unable to load available subtask statuses.';
        console.error('Subtask status load error:', error);
      }
    });
  }

  private loadSubtaskApprovalWorkflow(): void {
    if (!this.orgId) {
      this.statusSetupFailed = true;
      this.statusError = 'Organization information is unavailable; subtask approval settings cannot be loaded.';
      return;
    }

    this.workflowLoading = true;
    this.variantService.getWorkItemList(this.orgId).subscribe({
      next: response => {
        const workItems = this.normalizeArray<WorkItem>(response?.attributes ?? response);
        const workItem = workItems.find(item => item.code === 'RITM_SUBTASK');
        if (!workItem) {
          this.workflowLoading = false;
          this.statusSetupFailed = true;
          this.statusError = 'The RITM subtask work item is unavailable; status changes are disabled.';
          return;
        }

        this.workflowService.getWorkflowsForWorkItem(workItem.itemId, this.orgId).subscribe({
          next: workflowResponse => {
            const result = (workflowResponse as any)?.attributes ?? workflowResponse;
            const workflows = Array.isArray(result) ? result : result ? [result] : [];
            this.approvalWorkflow = workflows.find(
              (workflow: ApprovalWorkflow) => Number(workflow.workItemId) === Number(workItem.itemId)
            ) ?? workflows[0] ?? null;
            this.workflowLoading = false;
          },
          error: error => {
            this.workflowLoading = false;
            this.statusSetupFailed = true;
            this.statusError = 'Unable to load subtask approval settings; status changes are disabled.';
            console.error('Subtask approval workflow load error:', error);
          }
        });
      },
      error: error => {
        this.workflowLoading = false;
        this.statusSetupFailed = true;
        this.statusError = 'Unable to load the RITM subtask work item; status changes are disabled.';
        console.error('Subtask work-item load error:', error);
      }
    });
  }

  onStatusChange(event: Event): void {
    const selectedStatusId = (event.target as HTMLSelectElement).value;
    const statusId = Number(selectedStatusId);
    if (!Number.isInteger(statusId) || statusId <= 0 || statusId === this.persistedStatusId) {
      return;
    }

    const pendingStatusId = this.approvalWorkflow?.isApprovalRequired
      ? Number(this.approvalWorkflow.approvalPendingStatusId)
      : null;
    if (pendingStatusId === statusId) {
      this.requestRemarkAndUpdateStatus(statusId);
      return;
    }

    this.updateSubtaskStatus(statusId, '');
  }

  private requestRemarkAndUpdateStatus(statusId: number): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Approval required',
      message: 'Add a remark before moving this subtask to the approval-pending status.',
      confirmText: 'Continue',
      cancelText: 'Cancel',
      showCancel: true,
      includeRemarks: true,
      remarksLabel: 'Remark',
      remarksPlaceholder: 'Enter a remark'
    };

    this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      data: dialogData
    }).afterClosed().subscribe(result => {
      const remarks = typeof result?.remarks === 'string' ? result.remarks.trim() : '';
      if (!result?.confirmed) {
        this.restorePersistedStatus();
        return;
      }
      if (!remarks) {
        this.restorePersistedStatus();
        this.statusError = 'A remark is required to move the subtask to approval pending.';
        return;
      }
      this.updateSubtaskStatus(statusId, remarks);
    });
  }

  private updateSubtaskStatus(statusId: number, remarks: string): void {
    if (!this.subtaskId) {
      this.restorePersistedStatus();
      this.statusError = 'Unable to identify the subtask for this status change.';
      return;
    }

    this.statusUpdating = true;
    this.statusError = '';
    this.ritmService.updateSubtaskStatus({
      ticketId: Number(this.subtaskId),
      statusId,
      remarks,
      workItemId: this.approvalWorkflow?.workItemId ?? 0,
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isUpdaterAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      orgId: Number(this.orgId)
    }).subscribe({
      next: () => {
        this.persistedStatusId = statusId;
        this.subtaskForm.get('status')?.setValue(String(statusId), { emitEvent: false });
        this.statusUpdating = false;
        this.submitSuccess = 'RITM subtask status updated successfully.';
      },
      error: error => {
        this.restorePersistedStatus();
        this.statusUpdating = false;
        this.statusError = error?.error?.message || error?.error?.description || 'Failed to update RITM subtask status.';
        console.error('Subtask status update error:', error);
      }
    });
  }

  private restorePersistedStatus(): void {
    this.subtaskForm.get('status')?.setValue(
      this.persistedStatusId === null ? '' : String(this.persistedStatusId),
      { emitEvent: false }
    );
  }

  private getSubtaskStatusId(subtask: any): number | null {
    const status = subtask?.status;
    const id = subtask?.statusId ?? (status && typeof status === 'object' ? status.statusId ?? status.id : status);
    const statusId = Number(id);
    return Number.isInteger(statusId) && statusId > 0 ? statusId : null;
  }

  private loadAgents(): void {
    this.agentService.getActiveAgentList(this.orgId).subscribe({
      next: response => {
        const agents = this.normalizeArray(response?.attributes ?? response?.data ?? response)
          .map((item: any) => item?.agent ?? item)
          .filter((agent: any) => Number(agent?.agentId ?? agent?.id) > 0);
        this.users = agents;
        if (this.isEditMode) {
          this.setAssignedToDetails(this.subtaskForm.get('assignedTo')?.value);
        }
      },
      error: error => {
        this.submitError = 'Unable to load active agents.';
        console.error(error);
      }
    });
  }

  private loadPrioritiesAndCategories(): void {
    this.companyService.getServiceProviderList(Number(this.orgId)).subscribe({
      next: response => {
        const partners = this.normalizeArray<any>((response as any).attributes);
        const matchingRole = partners.find((bp: any) =>
          bp.company?.companyId != null
          && bp.mappedCompany?.companyId != null
          && bp.company.companyId === bp.mappedCompany.companyId
        );
        this.businessPartnerId = matchingRole?.businessPartnerId ?? null;
        this.categoryService.getAllCategories(this.businessPartnerId).subscribe({
          next: categoryResponse => this.categories = this.normalizeArray(categoryResponse?.attributes ?? categoryResponse),
          error: error => {
            this.submitError = 'Unable to load category list.';
            console.error(error);
          }
        });
        this.ritmService.getAllActivePriorities(this.businessPartnerId).subscribe({
          next: priorityResponse => this.priorities = this.normalizeArray<PriorityMaster>(( priorityResponse as any)?.attributes),
          error: error => {
            this.loading = false;
            this.submitError = 'Unable to load priority list.';
            console.error(error);
          },
          complete: () => this.loading = false
        });
      },
      error: error => {
        this.loading = false;
        this.submitError = 'Unable to load business partner configuration.';
        console.error(error);
      }
    });
  }

  private loadTemplates(): void {
    this.templatesLoading = true;
    this.variantService.getFieldTypeList(this.orgId).subscribe({
      next: response => {
        const fieldTypes = this.normalizeArray<any>(response?.attributes ?? response);
        this.fieldTypeMap = new Map(fieldTypes.map(fieldType => [
          Number(fieldType.typeId),
          String(fieldType.code || fieldType.label || '')
        ]));
        this.fetchTemplates();
      },
      error: () => this.fetchTemplates()
    });
  }

  private fetchTemplates(): void {
    this.variantService.getRitmTemplateDetails(this.orgId, 'RITM_SUBTASK').subscribe({
      next: response => {
        this.templates = this.normalizeArray<any>(response?.attributes ?? response).map(template => ({
          ...template,
          templateDetails: this.normalizeArray<any>(template?.templateDetails ?? template?.details).map(field => ({
            ...field,
            value: '',
            defaultApplied: false
          }))
        }));
        this.applyExistingTemplateValues(this.existingSubtask?.templateDetails ?? this.existingSubtask?.templateFields ?? []);
        this.templatesLoading = false;
      },
      error: error => {
        this.templates = [];
        this.templatesLoading = false;
        this.submitError = 'Unable to load RITM template details.';
        console.error(error);
      }
    });
  }

  private generateSubtaskNumber(): void {
    this.ritmService.getRequestNumber('RITM_SUBTASK').subscribe({
      next: response => this.subtaskForm.get('ritmSubtaskNumber')?.setValue(response?.attributes ?? response),
      error: error => {
        this.submitError = 'Unable to generate RITM subtask number.';
        console.error(error);
      }
    });
  }

  private loadSubCategories(
    categoryId: number | string,
    selectedSubCategory?: number | string,
    existingAssignmentGroup?: any
  ): void {
    this.supportGroupRequestId++;
    this.subCategories = [];
    this.subtaskForm.get('subCategory')?.reset('', { emitEvent: false });
    this.subtaskForm.get('assignmentGroup')?.reset('', { emitEvent: false });
    this.assignmentGroupId = null;
    if (!categoryId) {
      return;
    }
    this.categoryService.getSubCategories(Number(categoryId)).subscribe({
      next: response => {
        this.subCategories = this.normalizeArray(response?.attributes ?? response);
        if (selectedSubCategory) {
          this.subtaskForm.get('subCategory')?.setValue(selectedSubCategory, { emitEvent: false });
          this.loadSupportGroup(selectedSubCategory, existingAssignmentGroup);
        }
      },
      error: error => {
        this.submitError = 'Unable to load sub-category list.';
        console.error(error);
      }
    });
  }

  private loadSupportGroup(subCategoryId: number | string, existingAssignmentGroup?: any): void {
    const requestId = ++this.supportGroupRequestId;
    this.subtaskForm.get('assignmentGroup')?.reset('', { emitEvent: false });
    this.assignmentGroupId = null;
    if (!subCategoryId) {
      return;
    }
    this.supportGroupService.getSupportGroupBySubCategory(Number(subCategoryId)).subscribe({
      next: response => {
        if (requestId !== this.supportGroupRequestId) {
          return;
        }
        const groups = this.normalizeSupportGroups(response)
          .map(group => group?.supportGroup ?? group?.assignmentGroup ?? group?.group ?? group);
        const existingGroupId = this.getAssignmentGroupId(existingAssignmentGroup);
        const selectedGroup = groups.find(group => this.getAssignmentGroupId(group) === existingGroupId)
          ?? groups[0];
        this.assignmentGroupId = this.getAssignmentGroupId(selectedGroup) ?? existingGroupId;
        this.subtaskForm.get('assignmentGroup')?.setValue(
          this.getDisplayName(selectedGroup ?? existingAssignmentGroup, ['groupName', 'supportGroupName', 'name'])
        );
      },
      error: error => {
        if (requestId !== this.supportGroupRequestId) {
          return;
        }
        this.submitError = 'Unable to load assignment group.';
        console.error(error);
      }
    });
  }

  private normalizeSupportGroups(response: any): any[] {
    const unwrap = (value: any): any[] => {
      if (Array.isArray(value)) {
        return value.flatMap(unwrap);
      }
      if (!value || typeof value !== 'object') {
        return [];
      }

      const groupKeys = ['supportGroupId', 'groupId', 'id', 'groupName', 'supportGroupName', 'name'];
      if (groupKeys.some(key => value[key] != null)) {
        return [value];
      }

      for (const key of [
        'attributes', 'data', 'items', 'result', 'supportGroups', 'supportGroup',
        'assignmentGroups', 'assignmentGroup', 'groups', 'group'
      ]) {
        if (value[key] != null) {
          return unwrap(value[key]);
        }
      }

      return Object.values(value).flatMap(unwrap);
    };

    return unwrap(response);
  }

  setAssignedToDetails(agentId: number | string): void {
    const agent = this.users.find(user => Number(user.agentId) === Number(agentId));
    if (!agent) {
      this.stopCurrentTimeTicker();
      this.subtaskForm.patchValue({ location: '', availabilityTime: '', currentTime: '' });
      return;
    }
    this.subtaskForm.patchValue({
      location: agent.city?.cityName || agent.country?.countryName || '',
      availabilityTime: this.formatAvailabilityTime(agent.calendar?.workFrom, agent.calendar?.workTo),
      currentTime: this.getLocalTime(agent.city?.timezone)
    });
    this.startCurrentTimeTicker(agent.city?.timezone);
  }

  private startCurrentTimeTicker(timezone?: string): void {
    this.stopCurrentTimeTicker();
    if (!timezone) {
      return;
    }
    this.currentTimeTimer = setInterval(() => {
      this.subtaskForm.get('currentTime')?.setValue(this.getLocalTime(timezone));
    }, 1000);
  }

  private stopCurrentTimeTicker(): void {
    if (this.currentTimeTimer) {
      clearInterval(this.currentTimeTimer);
      this.currentTimeTimer = null;
    }
  }

  private formatAvailabilityTime(workFrom?: string, workTo?: string): string {
    return workFrom && workTo ? `${workFrom} - ${workTo}` : '';
  }

  private getLocalTime(timezone?: string): string {
    if (!timezone) {
      return '';
    }
    try {
      return new Date().toLocaleString('en-US', {
        timeZone: timezone,
        hour12: true,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error getting local time:', error);
      return '';
    }
  }

  private toDateTimeLocalValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const normalizedValue = String(value).trim().replace(' ', 'T');
    const match = normalizedValue.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
    return match ? `${match[1]}T${match[2] || '00:00'}` : '';
  }

  getTemplateFields(template: any): any[] {
    return Array.isArray(template?.templateDetails) ? template.templateDetails : [];
  }

  get hasAvailableTemplate(): boolean {
    return this.templates.some(template =>
      (template?.templateId != null && String(template.templateId).trim() !== '')
      || (typeof template?.templateName === 'string' && template.templateName.trim() !== '')
      || this.getTemplateFields(template).length > 0
    );
  }

  getTemplateKey(template: any, index: number): string {
    return `${template?.templateId ?? template?.templateName ?? index}:${index}`;
  }

  isTemplateExpanded(template: any, index: number): boolean {
    return this.expandedTemplates[this.getTemplateKey(template, index)] === true;
  }

  toggleTemplate(template: any, index: number): void {
    const key = this.getTemplateKey(template, index);
    this.expandedTemplates[key] = !this.isTemplateExpanded(template, index);
  }

  getFieldType(field: any): string {
    const fieldType = field?.fieldTypeCode || field?.fieldTypeLabel || field?.fieldType
      || this.fieldTypeMap.get(Number(field?.fieldTypeId)) || field?.fieldTypeId || 'TEXTBOX';
    return String(fieldType).toUpperCase().replace(/[-\s]/g, '_');
  }

  getFieldOptions(field: any): any[] {
    return Array.isArray(field?.options) ? field.options : [];
  }

  hasDefaultValue(field: any): boolean {
    return field?.defaultValue !== null && field?.defaultValue !== undefined && String(field.defaultValue) !== '';
  }

  applyDefaultValue(field: any): void {
    if (this.hasDefaultValue(field)) {
      field.value = field.defaultValue;
      field.defaultApplied = true;
      field.userValue = '';
      field.templateError = '';
    }
  }

  isFieldLocked(field: any): boolean {
    return field?.defaultApplied === true && field?.editable === false;
  }

  onTemplateFieldChange(field: any, value: any): void {
    field.userValue = value;
    field.templateError = '';
  }

  private getUserTemplateValue(field: any): any {
    return field.defaultApplied ? field.userValue : (field.userValue ?? field.value ?? '');
  }

  isMandatoryTemplateField(field: any): boolean {
    return field?.mandatory === true || field?.mandatory === 'true' || field?.isMandatory === true;
  }

  private validateTemplateFields(): boolean {
    let valid = true;
    this.templates.forEach(template => this.getTemplateFields(template).forEach(field => {
      field.templateError = '';
      const value = this.getUserTemplateValue(field);
      if (this.isMandatoryTemplateField(field)
        && (value === null || value === undefined || (typeof value === 'string' && value.trim() === ''))) {
        field.templateError = `${field.fieldName || 'This field'} is required.`;
        valid = false;
      }
    }));
    return valid;
  }

  private getTemplatePayload(): any[] {
    return this.templates.flatMap(template => this.getTemplateFields(template).map(field => ({
      fieldId: field.fieldId,
      value: this.getUserTemplateValue(field)
    })));
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.attachmentFiles = Array.from(input.files || []);
  }

  showRequiredError(controlName: string): boolean {
    const control = this.subtaskForm.get(controlName);
    return this.formSubmitted && !!control?.invalid && !!control.errors?.['required'];
  }

  onSubmit(): void {
    this.formSubmitted = true;
    this.submitError = '';
    this.submitSuccess = '';
    if (!this.isEditMode && (this.templatesLoading || !this.hasAvailableTemplate)) {
      this.submitError = 'No RITM template available.';
      return;
    }
    if (!this.validateTemplateFields() || this.subtaskForm.invalid) {
      this.subtaskForm.markAllAsTouched();
      this.submitError = `Please correct the highlighted fields before ${this.isEditMode ? 'updating' : 'creating'} the subtask.`;
      return;
    }
    if (!this.subtaskForm.get('ritmSubtaskNumber')?.value || (!this.isEditMode && !this.parentRitmId)) {
      this.submitError = 'The subtask number or parent RITM is unavailable. Please try again.';
      return;
    }

    this.submitting = true;
    const values = this.subtaskForm.getRawValue();
    const currentUserId = Number(localStorage.getItem('userId') || 0);
    const subtask = {
      ...values,
      ticketNumber: values.ritmSubtaskNumber,
      ritmSubtaskNumber: values.ritmSubtaskNumber,
      parentRitmId: Number(this.parentRitmId),
      ritmId: Number(this.parentRitmId),
      requestType: 'RITM_SUBTASK',
      requestTypeId: Number(values.requestTypeId),
      categoryId: Number(values.category),
      subCategoryId: Number(values.subCategory),
      assignmentGroup: this.assignmentGroupId,
      assignedTo: values.assignedTo ? Number(values.assignedTo) : null,
      priority: Number(values.priority),
      customerResolution: values.customerResolution,
      openedBy: currentUserId,
      orgId: Number(this.orgId),
      createdBy: currentUserId,
      updatedBy: currentUserId,
      isCreatorAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdaterAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      ...(this.isEditMode ? { ritmId: Number(this.subtaskId) } : {}),
      templateDetails: this.getTemplatePayload()
    };
    const payload = new FormData();
    payload.append('ritm', new Blob([JSON.stringify(subtask)], { type: 'application/json' }));
    this.attachmentFiles.forEach(file => payload.append('files', file, file.name));

    const saveRequest$ = this.isEditMode
      ? this.ritmService.updateRitm(payload)
      : this.ritmService.createRitmSubtask(payload);
    saveRequest$.subscribe({
      next: () => {
        this.submitting = false;
        if (this.isEditMode) {
          this.submitSuccess = 'RITM subtask updated successfully.';
          this.snackBar.open(this.submitSuccess, 'Close', { duration: 3000 });
          this.location.back();
          return;
        }
        this.submitSuccess = 'RITM subtask created successfully.';
      },
      error: error => {
        this.submitError = error?.error?.description
          || `Failed to ${this.isEditMode ? 'update' : 'create'} RITM subtask. Please try again.`;
        this.submitting = false;
        console.error(error);
      }
    });
  }

  onCancel(): void {
    const agentId = this.route.snapshot.queryParamMap.get('agentId') || '0';
    const requestType = this.route.snapshot.queryParamMap.get('requestType') || 'ritm';
    const from = this.route.snapshot.queryParamMap.get('from') || '';
    this.router.navigate(['/agent', agentId, requestType], {
      queryParams: {
        ritmId: this.isEditMode ? this.subtaskId : this.parentRitmId,
        ...(from ? { from } : {})
      }
    });
  }

  private normalizeArray<T>(value: any): T[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (Array.isArray(value?.data)) {
      return value.data;
    }
    if (Array.isArray(value?.items)) {
      return value.items;
    }
    return value && typeof value === 'object' ? Object.values(value) as T[] : [];
  }
}
