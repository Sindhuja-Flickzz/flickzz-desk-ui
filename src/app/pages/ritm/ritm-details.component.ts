import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { AgentService } from '../../service/agent.service';
import { RitmService } from '../../service/ritm.service';
import { RequestApproverService } from '../../service/requestapprover.service';
import { VariantService } from '../../service/variant.service';
import { EffortTypeService } from '../../service/effort-type.service';
import { EffortType } from '../../models/effort-type.model';
import { EffortSummary, EffortSummaryResponse } from '../../models/effort-summary.model';
import { USER_ROLES } from '../../data/app_constants';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

type EffortSummarySegment = {
  key: 'plannedEffort' | 'ticketLoggedEffort' | 'subtasksLoggedEffort';
  label: string;
  minutes: number;
  formatted: string;
  width: number;
};

@Component({
  selector: 'app-ritm-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './ritm-details.component.html',
  styleUrls: ['./ritm-details.component.scss']
})
export class RitmDetailsComponent implements OnInit {
  agentId: number | null = null;
  requestType: string = 'requestedByMe';
  ritmId: string | null = null;
  ritm: any = null;
  workItemCode: string | null = null;
  workNotes: any[] = [];
  history: any[] = [];
  slaInfo: any = null;
  commentText = '';
  activeTab: 'details' | 'work-notes' | 'history' | 'effort' | 'sla' = 'details';
  activeAdditionalTab: 'approvers' | 'catalog-task' | 'effort' = 'approvers';
  loading = false;
  notesLoading = false;
  historyLoading = false;
  historySearchTerm = '';
  submittingComment = false;
  templates: any[] = [];
  templatesLoading = false;
  private fieldTypeMap: Map<number, string> = new Map();
  private ritmTemplateDetails: any[] = [];
  approverConfigurations: any[] = [];
  assignedApprovers: any[] = [];
  activeAgents: any[] = [];
  approverMode: 'group' | 'individual' = 'group';
  approverCodeQuery = '';
  approverSuggestions: any[] = [];
  selectedApproverConfig: any = null;
  agentQuery = '';
  agentSuggestions: any[] = [];
  selectedAgent: any = null;
  selectedAgents: any[] = [];
  showAgentList = false;
  approverDataLoading = false;
  assigningApprover = false;
  editingApprover = false;
  approverMessage = '';
  approverError = '';
  private approverDataLoaded = false;
  pageSize = 5;
  workNotesPage = 1;
  historyPage = 1;
  referencedTickets: any[] = [];
  referencedTicketsLoading = false;
  referencedTicketsError = '';
  orgId = localStorage.getItem('userOrgId') || '';
  private agentNameMap: Map<number, string> = new Map();
  effortTypes: EffortType[] = [];
  effortEntries: any[] = [];
  effortSummary: EffortSummary | null = null;
  effortSummaryLoading = false;
  effortSummaryError = '';
  effortCalculationLoading = false;
  plannedHoursLoading = false;
  effortTypesLoading = false;
  effortError = '';
  effortSuccess = '';
  plannedHoursInput: number | null = null;
  plannedMinutesInput: number | null = 0;
  totalHoursPlanned: number | null = null;
  usedHours: number | null = null;
  isEditingPlannedHours = false;
  isSavingPlannedHours = false;
  showEffortForm = false;
  effortDraft: { date: string; effortHours: number | null; effortMinutes: number | null; effortTypeId: number | null; remark: string } = this.createEffortDraft();
  editingEffortId: number | null = null;
  isSavingEffort = false;
  deletingEffortId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ritmService: RitmService,
    private agentService: AgentService,
    private requestApproverService: RequestApproverService,
    private variantService: VariantService,
    private effortTypeService: EffortTypeService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAgentNameMap();
    this.route.paramMap.subscribe((params) => {
      const agentId = params.get('agentId');
      const requestType = params.get('requestType');
    this.orgId = localStorage.getItem('userOrgId') || '';
      this.agentId = agentId ? Number(agentId) : null;
      this.requestType = requestType || 'requestedByMe';
      this.loadRouteState();
    });
  }

  loadRouteState(): void {
    this.route.queryParamMap.subscribe((params) => {
      const ritmId = params.get('ritmId');
      if (this.ritmId !== ritmId) {
        this.approverDataLoaded = false;
        this.assignedApprovers = [];
        this.editingApprover = false;
        this.effortEntries = [];
        this.totalHoursPlanned = null;
        this.plannedHoursInput = null;
        this.plannedMinutesInput = 0;
        this.isEditingPlannedHours = false;
        this.plannedHoursLoading = false;
        this.usedHours = null;
        this.showEffortForm = false;
        this.effortError = '';
        this.effortSuccess = '';
      }
      this.ritmId = ritmId || null;
      this.loadRitm();
    });
  }

  private loadRitm(): void {
    if (!this.ritmId) {
      this.ritm = null;
      this.workNotes = [];
      this.history = [];
      this.slaInfo = null;
      this.templates = [];
      this.templatesLoading = false;
      this.workItemCode = null;
      return;
    }

    this.workItemCode = null;
    this.loading = true;
    this.ritmService.getRitmById(String(this.ritmId)).pipe(finalize(() => this.loading = false)).subscribe({
      next: (response) => {
        const payload = response?.attributes ?? response ?? {};
        const detailPayload = Array.isArray(payload) ? payload[0] ?? {} : payload;
        this.ritm = detailPayload?.ritm ?? detailPayload;
        this.loadEffortSummary(
          this.ritm?.ticketId
            ?? this.ritm?.id
            ?? detailPayload?.ticketId
            ?? detailPayload?.id
            ?? this.ritmId
        );
        this.workItemCode = response?.workItem?.code
          ?? detailPayload?.workItem?.code
          ?? this.ritm?.workItem?.code
          ?? this.ritm?.workItemCode
          ?? this.ritm?.requestType?.code
          ?? (typeof this.ritm?.workItem === 'string' ? this.ritm.workItem : null)
          ?? null;
        this.ritmTemplateDetails = this.normalizeTemplateDetails(
          this.ritm?.templateDetails
            ?? this.ritm?.templateFields
            ?? detailPayload?.templateDetails
            ?? detailPayload?.templateFields
            ?? []
        );
        this.loadTemplates(this.workItemCode);
        this.applyExistingTemplateValues();

        this.slaInfo =
          this.ritm?.slaInfo ??
          this.ritm?.sla ??
          this.ritm?.serviceLevelAgreement ??
          detailPayload?.slaInfo ??
          detailPayload?.sla ??
          detailPayload?.serviceLevelAgreement ??
          null;
        this.loadApproverData();
      },
      error: () => {
        this.ritm = {};
        this.workNotes = [];
        this.history = [];
        this.slaInfo = null;
        this.effortSummary = null;
        this.effortSummaryLoading = false;
        this.effortSummaryError = '';
        this.templates = [];
        this.templatesLoading = false;
        this.workItemCode = null;
      }
    });
  }

  private loadEffortSummary(ticketId: string | number | null | undefined): void {
    this.effortSummary = null;
    this.effortSummaryError = '';

    if (ticketId === null || ticketId === undefined || ticketId === '' || !this.orgId) {
      this.effortSummaryLoading = false;
      return;
    }

    this.effortSummaryLoading = true;
    this.ritmService.getEffortSummary(ticketId, this.orgId)
      .pipe(finalize(() => this.effortSummaryLoading = false))
      .subscribe({
        next: (response: EffortSummaryResponse) => {
          this.effortSummary = response?.attributes ?? null;
          if (!this.effortSummary) {
            this.effortSummaryError = 'Effort summary data is unavailable.';
          }
        },
        error: () => {
          this.effortSummaryError = 'Unable to load the effort summary.';
        }
      });
  }

  getEffortSummarySegments(): EffortSummarySegment[] {
    if (!this.effortSummary) {
      return [];
    }

    const entries = [
      { key: 'ticketLoggedEffort' as const, label: 'Ticket logged effort', effort: this.effortSummary.ticketLoggedEffort },
      { key: 'subtasksLoggedEffort' as const, label: 'Subtasks logged effort', effort: this.effortSummary.subtasksLoggedEffort },
      { key: 'plannedEffort' as const, label: 'Planned effort', effort: this.effortSummary.plannedEffort }
    ];
    const minutesTotal = entries.reduce((total, entry) => total + this.getEffortMinutes(entry.effort), 0);

    return entries.map((entry) => {
      const minutes = this.getEffortMinutes(entry.effort);
      return {
        key: entry.key,
        label: entry.label,
        minutes,
        formatted: this.getFormattedEffort(entry.effort),
        width: minutesTotal > 0 ? (minutes / minutesTotal) * 100 : 100 / entries.length
      };
    });
  }

  getEffortSummaryTooltip(segment: EffortSummarySegment): string {
    if (!this.effortSummary) {
      return `${segment.label}: ${segment.formatted}`;
    }

    if (segment.key === 'ticketLoggedEffort') {
      const agents = this.effortSummary.agents ?? [];
      return [
        `${segment.label}: ${segment.formatted}`,
        ...(agents.length
          ? agents.map((agent) => `${agent.agentName}: ${this.getFormattedEffort(agent.effort)}`)
          : ['No agent effort recorded'])
      ].join('\n');
    }

    if (segment.key === 'subtasksLoggedEffort') {
      const subtasks = this.effortSummary.subtasks ?? [];
      return [
        `${segment.label}: ${segment.formatted}`,
        ...(subtasks.length
          ? subtasks.flatMap((subtask) => [
            `${subtask.subtaskNumber} (${this.getFormattedEffort(subtask.totalLoggedEffort)})`,
            ...(subtask.agents?.length
              ? subtask.agents.map((agent) => `  ${agent.agentName}: ${this.getFormattedEffort(agent.effort)}`)
              : ['  No agent effort recorded'])
          ])
          : ['No subtask effort recorded'])
      ].join('\n');
    }

    return `${segment.label}: ${segment.formatted}`;
  }

  private getEffortMinutes(effort: { hours?: number; minutes?: number } | null | undefined): number {
    return (Number(effort?.hours) || 0) * 60 + (Number(effort?.minutes) || 0);
  }

  private getFormattedEffort(effort: { hours?: number; minutes?: number; formatted?: string } | null | undefined): string {
    if (effort?.formatted) {
      return effort.formatted;
    }

    const hours = Number(effort?.hours) || 0;
    const minutes = Number(effort?.minutes) || 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private loadTemplates(requestType: string | null | undefined): void {
    if (!requestType) {
      this.templates = [];
      this.templatesLoading = false;
      return;
    }

    this.templatesLoading = true;
    const orgId = localStorage.getItem('userOrgId');
    if (orgId) {
      this.variantService.getFieldTypeList(orgId).subscribe({
        next: (response) => {
          const fieldTypes = this.normalizeList(response?.attributes ?? response ?? []);
          this.fieldTypeMap = new Map(fieldTypes.map((item: any) => [Number(item.typeId), String(item.code || item.label || '')]));
        },
        error: () => this.fieldTypeMap.clear()
      });
    }

    this.variantService.getRitmTemplateDetails(this.orgId, requestType).pipe(finalize(() => this.templatesLoading = false)).subscribe({
      next: (response) => {
        const templates = this.normalizeTemplateCollection(response);
        this.templates = templates.map((template: any) => ({
          ...template,
          templateDetails: this.normalizeTemplateDetails(template?.templateDetails ?? template?.templateFields ?? template?.details ?? []).map((field: any) => ({
            ...field,
            templateId: field?.templateId ?? template?.templateId,
            value: this.getExistingTemplateValue(field),
            defaultApplied: false
          }))
        }));
        this.applyExistingTemplateValues();
      },
      error: () => {
        this.templates = [];
      }
    });
  }

  getTemplateFields(template: any): any[] {
    const fields = this.getRawTemplateFields(template);
    return fields.filter((field: any) => this.hasTemplateValue(field?.value));
  }

  private normalizeTemplateCollection(response: any): any[] {
    const collection = response?.attributes ?? response?.data ?? response?.items ?? response?.templates ?? response;
    if (Array.isArray(collection)) {
      return collection;
    }
    if (!collection || typeof collection !== 'object') {
      return [];
    }
    if (Array.isArray(collection.templates)) {
      return collection.templates;
    }
    if (Array.isArray(collection.items)) {
      return collection.items;
    }
    if (collection.templateDetails || collection.details) {
      return [collection];
    }
    return Object.values(collection).flatMap((item: any) =>
      Array.isArray(item) ? item : item && typeof item === 'object' ? [item] : []
    );
  }

  private getRawTemplateFields(template: any): any[] {
    return Array.isArray(template?.templateDetails) ? template.templateDetails : [];
  }

  private normalizeTemplateDetails(details: any): any[] {
    if (Array.isArray(details)) {
      return details.flatMap((item: any) => this.normalizeTemplateDetails(item));
    }

    if (!details || typeof details !== 'object') {
      return [];
    }

    const nestedDetails = details.templateDetails ?? details.templateFields ?? details.details;
    if (nestedDetails !== undefined) {
      return this.normalizeTemplateDetails(nestedDetails).map((field: any) => ({
        ...field,
        templateId: field?.templateId ?? details?.templateId,
        templateName: field?.templateName || details?.templateName
      }));
    }

    return details.fieldId != null
      || details.templateDetailId != null
      || details.templateFieldId != null
      || details.fieldName != null
      || details.value != null
      || details.fieldValue != null
      || details.field_value != null
      || details.userValue != null
      || details.answer != null
      ? [details]
      : [];
  }

  getAvailableTemplates(): any[] {
    return this.templates.filter((template: any) => this.getTemplateFields(template).length > 0);
  }

  private hasTemplateValue(value: any): boolean {
    return value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '');
  }

  getFieldType(field: any): string {
    const fieldType = field?.fieldTypeCode || field?.fieldType || field?.fieldTypeLabel || field?.type || this.fieldTypeMap.get(Number(field?.fieldTypeId)) || field?.fieldTypeId || 'TEXTBOX';
    return String(fieldType).toUpperCase().replace(/[-\s]/g, '_');
  }

  getFieldOptions(field: any): any[] {
    return Array.isArray(field?.options) ? field.options : [];
  }

  hasDefaultValue(field: any): boolean {
    return field?.defaultValue !== null && field?.defaultValue !== undefined && String(field.defaultValue) !== '';
  }

  applyDefaultValue(field: any): void {
    if (!this.hasDefaultValue(field)) {
      return;
    }

    field.value = field.defaultValue;
    field.defaultApplied = true;
  }

  isFieldLocked(field: any): boolean {
    return field?.defaultApplied === true && field?.isEditable === false;
  }

  private getExistingTemplateValue(field: any): any {
    const details = this.ritmTemplateDetails;
    if (Array.isArray(details)) {
      const fieldId = this.getTemplateFieldId(field);
      const templateId = field?.templateId == null ? null : Number(field.templateId);
      const fieldName = this.normalizeFieldName(field?.fieldName);

      const existing = details.find((item: any) =>
        fieldId !== null
        && this.getTemplateFieldId(item) === fieldId
      ) || details.find((item: any) =>
        templateId !== null
        && item?.templateId != null
        && Number(item.templateId) === templateId
        && fieldName !== ''
        && this.normalizeFieldName(item?.fieldName) === fieldName
      ) || details.find((item: any) =>
        fieldName !== ''
        && this.normalizeFieldName(item?.fieldName) === fieldName
        && (templateId === null || item?.templateId == null || Number(item.templateId) === templateId)
      );

      if (existing) {
        return this.normalizeTemplateValue(
          existing?.value
          ?? existing?.fieldValue
          ?? existing?.field_value
          ?? existing?.userValue
          ?? existing?.answer,
          field
        );
      }
    }

    return this.normalizeTemplateValue(
      field?.value ?? field?.fieldValue ?? field?.field_value ?? field?.userValue ?? field?.answer ?? '',
      field
    );
  }

  private getTemplateFieldId(field: any): number | null {
    const fieldId = field?.fieldId ?? field?.templateDetailId ?? field?.templateFieldId ?? field?.field_id;
    if (fieldId === null || fieldId === undefined || fieldId === '') {
      return null;
    }
    const parsedFieldId = Number(fieldId);
    return Number.isFinite(parsedFieldId) ? parsedFieldId : null;
  }

  private normalizeFieldName(value: any): string {
    return value == null ? '' : String(value).trim().toLowerCase();
  }

  private normalizeTemplateValue(value: any, field?: any): any {
    if (value === null || value === undefined) {
      return '';
    }
    const normalizedValue = typeof value === 'object'
      ? value.value
        ?? value.optionValue
        ?? value.selectedValue
        ?? value.id
        ?? value.code
        ?? value.label
        ?? ''
      : value;

    if (this.getFieldType(field) !== 'DROPDOWN') {
      return normalizedValue;
    }

    const option = this.getFieldOptions(field).find((item: any) =>
      String(item?.value) === String(normalizedValue)
      || String(item?.label).trim().toLowerCase() === String(normalizedValue).trim().toLowerCase()
    );
    return option?.value ?? normalizedValue;
  }

  private applyExistingTemplateValues(): void {
    this.templates.forEach((template: any) => {
      this.getRawTemplateFields(template).forEach((field: any) => {
        const value = this.getExistingTemplateValue(field);
        if (this.hasTemplateValue(value)) {
          field.value = value;
        }
      });
    });
  }

  get isRitmSubtask(): boolean {
    return this.workItemCode === 'RITM_SUBTASK';
  }

  setActiveTab(tab: 'details' | 'work-notes' | 'history' | 'effort' | 'sla'): void {
    this.activeTab = tab;

    if (tab === 'work-notes' && this.ritmId) {
      this.loadWorkNotes();
    }

    if (tab === 'history' && this.ritmId) {
      this.loadHistory();
    }
    if (tab === 'effort') {
      this.loadEffortCalculation();
    }
  }

  setActiveAdditionalTab(tab: 'approvers' | 'catalog-task' | 'effort'): void {
    this.activeAdditionalTab = tab;
    if (tab === 'approvers' && this.ritmId && !this.loading) this.loadApproverData();
    if (tab === 'catalog-task' && this.ritmId) this.loadReferencedTickets();
    if (tab === 'effort') this.loadEffortCalculation();
  }

  private loadApproverData(): void {
    if (this.approverDataLoaded) {
      return;
    }

    this.approverDataLoaded = true;
    this.approverDataLoading = true;
    let pendingRequests = 3;
    const finishRequest = (): void => {
      pendingRequests -= 1;
      this.approverDataLoading = pendingRequests > 0;
    };
    const companyId = Number(this.ritm?.companyId ?? this.ritm?.company?.companyId ?? this.orgId);

    this.requestApproverService.getApproverConfigurations(companyId).subscribe({
      next: response => {
        this.approverConfigurations = this.normalizeList(response?.attributes ?? response?.data ?? response);
        finishRequest();
      },
      error: () => {
        this.approverConfigurations = [];
        this.approverError = 'Unable to load approver groups.';
        finishRequest();
      }
    });

    this.agentService.getActiveAgentList(this.orgId).subscribe({
      next: response => {
        this.activeAgents = this.normalizeList(response?.attributes ?? response?.data ?? response)
          .map((item: any) => item?.agent ?? item)
          .filter((agent: any) => Number(agent?.agentId ?? agent?.id) > 0);
        finishRequest();
      },
      error: () => {
        this.activeAgents = [];
        this.approverError = 'Unable to load active agents.';
        finishRequest();
      }
    });

    this.loadAssignedApprovers(finishRequest);
  }

  private loadAssignedApprovers(onComplete?: () => void): void {
    if (!this.ritmId) {
      this.assignedApprovers = [];
      onComplete?.();
      return;
    }

    const companyId = Number(this.ritm?.companyId ?? this.ritm?.company?.companyId ?? this.orgId);
    this.ritmService.getRitmApprovers(this.ritmId, companyId).pipe(finalize(() => onComplete?.())).subscribe({
      next: response => {
        this.assignedApprovers = this.normalizeList(response?.attributes ?? response?.data ?? response);
      },
      error: () => {
        this.assignedApprovers = [];
        this.approverError = 'Unable to load assigned approvers.';
      }
    });
  }

  editApprovers(): void {
    const currentAssignment = this.assignedApprovers[0] || {};
    const configurationId = Number(currentAssignment?.approverConfig?.approverConfigId ?? currentAssignment?.approverConfigId ?? currentAssignment?.configId ?? 0);
    const isGroup = Boolean(currentAssignment?.isGroupApprover ?? currentAssignment?.groupApprover ?? configurationId);

    this.approverMode = isGroup ? 'group' : 'individual';
    this.selectedApproverConfig = isGroup
      ? this.approverConfigurations.find(configuration => Number(configuration?.approverConfigId ?? configuration?.configId) === configurationId) || null
      : null;
    this.approverCodeQuery = this.selectedApproverConfig?.approverCode || '';
    this.selectedAgents = isGroup ? [] : this.getAssignedAgentItems();
    this.selectedAgent = null;
    this.agentQuery = '';
    this.approverSuggestions = [];
    this.agentSuggestions = [];
    this.editingApprover = true;
    this.approverMessage = '';
    this.approverError = '';
  }

  cancelApproverEdit(): void {
    this.editingApprover = false;
    this.onApproverModeChange();
  }

  getAssignedAgentItems(): any[] {
    const items = this.assignedApprovers.flatMap((assignment: any) => {
      if (assignment?.approverAgent) {
        return [assignment.approverAgent];
      }
      const nestedAgents = this.normalizeList(assignment?.approverIds ?? assignment?.approvers ?? assignment?.agents);
      return nestedAgents.length ? nestedAgents : [assignment];
    });
    return items.map((item: any) => {
      const agent = item?.agent ?? item;
      const agentId = Number(typeof item === 'object' ? agent?.agentId ?? agent?.id ?? item?.approverId : item);
      return this.activeAgents.find(candidate => Number(candidate?.agentId ?? candidate?.id) === agentId) || agent;
    }).filter((agent: any) => Number(agent?.agentId ?? agent?.id) > 0);
  }

  getGroupedApproverAssignments(): Array<{ code: string; approvers: any[]; followSequence?: boolean; isAnyApprovalSufficient?: boolean; remark?: string }> {
    const groups = new Map<string, { code: string; approvers: any[]; followSequence?: boolean; isAnyApprovalSufficient?: boolean; remark?: string }>();
    this.assignedApprovers
      .filter((assignment: any) => assignment?.isGroupApprover === true)
      .forEach((assignment: any) => {
        const assignedConfig = assignment?.approverConfig || {};
        const remarks = Array.isArray(assignment?.remark)
          ? assignment.remark
              .map((item: any) => item)
              .map((value: any) => String(value.remarkType + ' Remark: ' + value.remark).trim())
              .join('\n')
          : assignment?.remark?.remark ?? assignment?.remark?.comments ?? assignment?.remark?.comment ?? assignment?.remark;
        const configurationId = Number(assignedConfig?.approverConfigId ?? assignment?.approverConfigId ?? assignment?.configId ?? 0);
        const configuration = this.approverConfigurations.find(item =>
          Number(item?.approverConfigId ?? item?.configId) === configurationId
        ) || {};
        const code = String(assignedConfig?.approverCode || configuration?.approverCode || 'Approver Group');
        const key = String(configurationId || code);
        if (!groups.has(key)) {
          groups.set(key, {
            code,
            approvers: [],
            followSequence: assignedConfig?.followSequence ?? assignment?.followSequence ?? configuration?.followSequence,
            isAnyApprovalSufficient: assignedConfig?.isAnyApprovalSufficient ?? assignment?.isAnyApprovalSufficient ?? configuration?.isAnyApprovalSufficient,
            remark: remarks ? String(remarks) : undefined
          });
        }
        groups.get(key)!.approvers.push(assignment);
      });
    return Array.from(groups.values());
  }

  getIndividualApproverAssignments(): any[] {
    return this.assignedApprovers.filter((assignment: any) => assignment?.isGroupApprover === false);
  }

  getApproverRemark(approver: any): string {
    const remarks = Array.isArray(approver?.remark)
          ? approver.remark
              .map((item: any) => item)
              .map((value: any) => String(value.remarkType + ' Remark: ' + value.remark).trim())
              .join('\n')
          : approver?.remark?.remark;
    // if (remark && typeof remark === 'object') {
    //   return String(remark.remark ?? remark.comments ?? remark.comment ?? '—');
    // }
    return remarks == null || remarks === '' ? '—' : String(remarks);
  }

  getApproverName(approver: any): string {
    return String(approver?.approverAgent?.agentName ?? approver?.agent?.agentName ?? approver?.agentName ?? approver?.approverName ?? approver?.name ?? approver?.agent?.name ?? approver?.approverCode ?? 'Approver');
  }

  deleteApprovers(): void {
    if (!this.ritmId) {
      return;
    }

    this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: {
        title: 'Delete Approvers',
        message: 'Delete the approver assignment for this RITM?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        showCancel: true,
        type: 'delete'
      }
    }).afterClosed().subscribe(result => {
      if (!result) {
        return;
      }

      this.assigningApprover = true;
      const companyId = Number(this.ritm?.companyId ?? this.ritm?.company?.companyId ?? this.orgId);
      const deletedBy = Number(localStorage.getItem('userId') || 0);
      const isDeletedByAdmin = localStorage.getItem('isAdmin') === 'true';
      this.ritmService.deleteRitmApprovers(this.ritmId!, companyId, deletedBy, isDeletedByAdmin)
        .pipe(finalize(() => this.assigningApprover = false)).subscribe({
        next: response => {
          this.assignedApprovers = [];
          this.editingApprover = false;
          this.approverMessage = response?.title || 'Approver assignment deleted.';
          this.approverError = '';
        setTimeout(() => {
          this.approverMessage = '';
        }, 3000);
        },
        error: error => {
          this.approverError = error?.error?.message || error?.error?.description || 'Unable to delete approvers.';
        setTimeout(() => {
          this.approverError = '';
        }, 3000);
        }
      });
    });
  }

  onApproverModeChange(): void {
    this.approverError = '';
    this.approverMessage = '';
    this.approverCodeQuery = '';
    this.approverSuggestions = [];
    this.selectedApproverConfig = null;
    this.agentQuery = '';
    this.agentSuggestions = [];
    this.selectedAgent = null;
    this.selectedAgents = [];
    this.showAgentList = false;
  }

  onApproverCodeInput(): void {
    this.selectedApproverConfig = null;
    const query = this.approverCodeQuery.trim().toLowerCase();
    this.approverSuggestions = query
      ? this.approverConfigurations.filter(configuration => String(configuration?.approverCode || '').toLowerCase().includes(query))
      : [];
  }

  selectApproverConfiguration(configuration: any): void {
    this.selectedApproverConfig = configuration;
    this.approverCodeQuery = String(configuration?.approverCode || '');
    this.approverSuggestions = [];
  }

  onAgentInput(): void {
    this.selectedAgent = null;
    this.showAgentList = true;
    const query = this.agentQuery.trim().toLowerCase();
    this.agentSuggestions = this.activeAgents.filter(agent =>
      !query || `${agent?.agentName || agent?.name || ''} ${agent?.mailId || agent?.email || ''} ${agent?.accessId || ''}`.toLowerCase().includes(query)
    );
  }

  selectSuggestedAgent(agent: any): void {
    this.selectedAgent = agent;
    this.agentQuery = this.getAgentLabel(agent);
    this.agentSuggestions = [];
    this.showAgentList = false;
  }

  addSelectedAgent(): void {
    if (!this.selectedAgent) {
      this.approverError = 'Select an agent before adding.';
      return;
    }

    const agentId = Number(this.selectedAgent.agentId ?? this.selectedAgent.id);
    if (!this.selectedAgents.some(agent => Number(agent.agentId ?? agent.id) === agentId)) {
      this.selectedAgents = [...this.selectedAgents, this.selectedAgent];
    }
    this.selectedAgent = null;
    this.agentQuery = '';
    this.agentSuggestions = [];
    this.approverError = '';
  }

  removeSelectedAgent(agent: any): void {
    const agentId = Number(agent.agentId ?? agent.id);
    this.selectedAgents = this.selectedAgents.filter(item => Number(item.agentId ?? item.id) !== agentId);
  }

  getAgentLabel(agent: any): string {
    const name = agent?.agentName || agent?.name || 'Agent';
    const accessId = agent?.accessId;
    const email = agent?.mailId || agent?.email;
    return [name, accessId, email].filter(Boolean).join(' | ');
  }

  getConfigurationAgents(): any[] {
    return this.normalizeList(this.selectedApproverConfig?.approvers || [])
      .map((item: any) => ({
        ...(item?.agent ?? item),
        approverSequence: item?.approverSequence ?? item?.agent?.approverSequence
      }))
      .filter((agent: any) => agent && (agent.agentName || agent.name || agent.agentId));
  }

  getCatalogTasks(): any[] {
    return this.normalizeList(this.ritm?.catalogTasks ?? this.ritm?.catalogTask ?? this.ritm?.tasks ?? []);
  }

  private loadReferencedTickets(): void {
    if (!this.ritmId) {
      return;
    }

    this.referencedTicketsLoading = true;
    this.referencedTicketsError = '';
    this.ritmService.getTicketsByReference(this.ritmId).subscribe({
      next: (response) => {
        this.referencedTickets = this.normalizeList(
          response?.attributes ?? response?.data ?? response?.result ?? response
        );
        this.referencedTicketsLoading = false;
      },
      error: (error) => {
        this.referencedTicketsLoading = false;
        this.referencedTicketsError = 'Unable to load referenced tickets.';
        console.error('Failed to load tickets by reference', error);
      }
    });
  }

  getCatalogTaskTicketId(ticket: any): string | null {
    const ticketId = ticket?.ticketId ?? ticket?.ritmId ?? ticket?.requestId ?? ticket?.id ?? ticket?.ticketNumber;
    return ticketId == null ? null : String(ticketId);
  }

  getCatalogTaskTicketNumber(ticket: any): string {
    return String(ticket?.ticketNumber ?? ticket?.ritmNumber ?? ticket?.requestNumber ?? 'Ticket');
  }

  getCurrentFrom(): string {
    return this.route.snapshot.queryParamMap.get('from') || '';
  }

  getEffortEntries(): Array<{ label: string; value: string }> {
    const effort = this.ritm?.effortCalculation ?? this.ritm?.effortCalculations ?? this.ritm?.effortDetails ?? this.ritm?.effort;
    if (!effort || typeof effort !== 'object') {
      return [];
    }

    const entries = Array.isArray(effort)
      ? effort.map((item: any, index: number) => [item?.name || item?.fieldName || `Effort ${index + 1}`, item?.value ?? item?.effort ?? item?.hours ?? item])
      : Object.entries(effort);
    return entries.map(([label, value]) => ({ label: String(label), value: value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value) }));
  }

  private createEffortDraft(): { date: string; effortHours: number | null; effortMinutes: number | null; effortTypeId: number | null; remark: string } {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return { date, effortHours: null, effortMinutes: 0, effortTypeId: null, remark: '' };
  }

  private loadEffortCalculation(): void {
    if (!this.ritmId) {
      return;
    }

    this.effortError = '';
    this.effortCalculationLoading = true;
    this.plannedHoursLoading = true;
    this.effortTypesLoading = true;
    this.ritmService.getPlannedHours(this.orgId).pipe(finalize(() => this.plannedHoursLoading = false)).subscribe({
      next: response => {
        const plannedHoursList = this.normalizeList(response?.attributes ?? response?.data ?? response);
        const ticketId = Number(this.ritmId);
        const plannedHoursEntry = plannedHoursList.find(entry =>
          Number(entry?.ticketId ?? entry?.ritmId ?? entry?.requestId ?? entry?.ticket?.ticketId ?? entry?.ticket?.id) === ticketId
        );
        const plannedHours = plannedHoursEntry?.hoursPlanned;
        const plannedMinutes = plannedHoursEntry?.minutesPlanned;
        const hasSeparateDuration = plannedHours != null || plannedMinutes != null;
        const planned = plannedHoursEntry?.totalHoursPlanned
          ?? plannedHoursEntry?.plannedHours
          ?? plannedHoursEntry?.totalPlannedHours
          ?? plannedHours;
        this.totalHoursPlanned = planned == null || planned === ''
          ? hasSeparateDuration && plannedMinutes != null
            ? Number(plannedMinutes) / 60
            : null
          : hasSeparateDuration
            ? Number(plannedHours ?? 0) + Number(plannedMinutes ?? 0) / 60
            : Number(planned);
        const plannedTotalMinutes = this.totalHoursPlanned == null
          ? 0
          : Math.round(this.totalHoursPlanned * 60);
        this.plannedHoursInput = this.totalHoursPlanned == null ? null : Math.floor(plannedTotalMinutes / 60);
        this.plannedMinutesInput = plannedTotalMinutes % 60;
      },
      error: error => {
        this.totalHoursPlanned = null;
        this.plannedHoursInput = null;
        this.plannedMinutesInput = 0;
        this.effortError = error?.error?.description || error?.error?.message || 'Unable to load planned hours.';
      }
    });

    this.effortTypeService.getActiveEffortTypes(Number(this.orgId)).subscribe({
      next: response => {
        this.effortTypes = this.normalizeList(response?.attributes ?? response?.data ?? response);
        this.effortTypesLoading = false;
      },
      error: error => {
        this.effortTypes = [];
        this.effortTypesLoading = false;
        this.effortError = error?.error?.description || error?.error?.message || 'Unable to load effort types.';
      }
    });

    this.ritmService.getAgentTicketEffort(this.agentId ?? 0, this.ritmId, this.orgId).pipe(finalize(() => this.effortCalculationLoading = false)).subscribe({
      next: response => {
        const responseData = response?.attributes ?? response?.data ?? response;
        const details = Array.isArray(responseData) ? responseData[0] ?? {} : responseData ?? {};
        const effortList = Array.isArray(responseData)
          ? responseData
          : details.efforts ?? details.effortList ?? details.effortDetails ?? details.entries ?? [];
        this.effortEntries = this.normalizeList(effortList);     
        this.usedHours = this.effortEntries.reduce((total, entry) => total + this.getEffortHours(entry), 0).toFixed(2);
      },
      error: error => {
        this.effortEntries = [];
        this.effortCalculationLoading = false;
        this.effortError = error?.error?.description || error?.error?.message || 'Unable to load effort details.';
      }
    });
  }

  savePlannedHours(): void {
    this.effortError = '';
    this.effortSuccess = '';
    const hours = Number(this.plannedHoursInput);
    const minutes = Number(this.plannedMinutesInput);
    const ticketId = Number(this.ritmId);
    const orgId = Number(this.orgId);
    if (this.plannedHoursInput == null || !Number.isInteger(hours) || hours < 0
      || this.plannedMinutesInput == null || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
      this.effortError = 'Enter valid planned hours and minutes (minutes must be between 0 and 59).';
      return;
    }
    if (hours === 0 && minutes === 0) {
      this.effortError = 'Planned hours and minutes must be greater than zero.';
      return;
    }
    if (!Number.isFinite(ticketId) || !Number.isFinite(orgId)) {
      this.effortError = 'Unable to save planned hours: ticket or organization ID is unavailable.';
      return;
    }

    this.isSavingPlannedHours = true;
    const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
    this.ritmService.updatePlannedHours({
      ticketId,
      orgId,
      hoursPlanned: hours,
      minutesPlanned: minutes,
      updatedBy: this.getCurrentUserId(),
      isUpdatedByAdmin: isAdmin
    }).pipe(finalize(() => this.isSavingPlannedHours = false)).subscribe({
      next: () => {
        this.totalHoursPlanned = hours + minutes / 60;
        this.isEditingPlannedHours = false;
        this.effortSuccess = 'Planned hours saved successfully.';
        this.loadEffortSummary(ticketId);
      },
      error: error => {
        console.error('Save planned hours error', error);
        this.effortError = error?.error?.description || error?.error?.message || 'Unable to save estimated effort.';
      }
    });
  }

  editPlannedHours(): void {
    const totalMinutes = Math.round((this.totalHoursPlanned ?? 0) * 60);
    this.plannedHoursInput = Math.floor(totalMinutes / 60);
    this.plannedMinutesInput = totalMinutes % 60;
    this.isEditingPlannedHours = true;
  }

  cancelPlannedHoursEdit(): void {
    this.editPlannedHoursValuesFromTotal();
    this.isEditingPlannedHours = false;
  }

  private editPlannedHoursValuesFromTotal(): void {
    const totalMinutes = Math.round((this.totalHoursPlanned ?? 0) * 60);
    this.plannedHoursInput = this.totalHoursPlanned == null ? null : Math.floor(totalMinutes / 60);
    this.plannedMinutesInput = totalMinutes % 60;
  }

  getPlannedDurationLabel(): string {
    const totalMinutes = Math.round((this.totalHoursPlanned ?? 0) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  getEffortDurationLabel(value: unknown, minutesValue?: unknown): string {
    const effortHours = Number(value);
    if (!Number.isFinite(effortHours)) {
      return '—';
    }
    const minutes = Number(minutesValue ?? 0);
    const totalMinutes = Math.round(effortHours * 60) + (Number.isFinite(minutes) ? minutes : 0);
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  private getEffortHours(entry: any): number {
    const hours = Number(entry.effortHours ?? entry.hours ?? entry.effort ?? 0);
    const minutes = Number(entry.effortMinutes ?? entry.minutes ?? 0);
    return (Number.isFinite(hours) ? hours : 0) + ((Number.isFinite(minutes) ? (minutes > 60 ? minutes / 60 : Number((minutes / 100).toFixed(2))) : 0));
  }

  getEffortUsagePercent(): number {
    if (this.totalHoursPlanned == null || this.totalHoursPlanned <= 0) {
      return 0;
    }
    return Math.min(100, Math.round(((this.usedHours ?? 0) / this.totalHoursPlanned) * 100));
  }

  addEffort(): void {
    this.editingEffortId = null;
    this.effortDraft = this.createEffortDraft();
    this.showEffortForm = true;
    this.effortError = '';
  }

  editEffort(entry: any): void {
    this.editingEffortId = Number(entry.effortId ?? entry.id);
    const effortHours = Number(entry.effortHours ?? entry.hours ?? entry.effort ?? 0);
    const effortMinutes = Number(entry.effortMinutes ?? entry.minutes);
    const effortTotalMinutes = Number.isFinite(effortHours)
      ? Math.round(effortHours * 60) + (Number.isFinite(effortMinutes) ? effortMinutes : 0)
      : 0;
    this.effortDraft = {
      date: String(entry.date ?? entry.effortDate ?? '').slice(0, 10),
      effortHours: Math.floor(effortTotalMinutes / 60),
      effortMinutes: effortTotalMinutes % 60,
      effortTypeId: Number(entry.effortTypeId ?? entry.effortType?.effortTypeId ?? entry.effortType?.id ?? 0) || null,
      remark: String(entry.remark ?? entry.remarks ?? '')
    };
    this.showEffortForm = true;
    this.effortError = '';
  }

  cancelEffortEdit(): void {
    this.showEffortForm = false;
    this.editingEffortId = null;
    this.effortDraft = this.createEffortDraft();
    this.effortError = '';
  }

  saveEffort(): void {
    this.effortError = '';
    this.effortSuccess = '';
    const ticketId = Number(this.ritmId);
    const orgId = Number(this.orgId);
    const hours = Number(this.effortDraft.effortHours ?? 0);
    const minutes = Number(this.effortDraft.effortMinutes ?? 0);
    if (!this.effortDraft.date || !Number.isInteger(hours) || hours < 0 ||
        !Number.isInteger(minutes) || minutes < 0 || minutes > 59 ||
        (hours === 0 && minutes === 0) ||
        this.effortDraft.effortTypeId == null) {
      this.effortError = 'Enter a date, at least one non-zero effort value (hours or minutes), whole-number hours, minutes between 0 and 59, and an effort type.';
      return;
    }
    if (!Number.isFinite(ticketId) || !Number.isFinite(orgId)) {
      this.effortError = 'Unable to save effort: ticket or organization ID is unavailable.';
      return;
    }

    const currentUser = this.getCurrentUserId();
    const isAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
    const payload: {
      effortId?: number;
      ticketId: number;
      orgId: number;
      date: string;
      effortHours: number;
      effortMinutes: number;
      effortTypeId: number;
      remark: string;
      userWorked: number;
      createdBy: number;
      updatedBy: number;
      isCreatedByAdmin: boolean;
      isUpdatedByAdmin: boolean;
    } = {
      ticketId,
      orgId,
      date: this.effortDraft.date,
      effortHours: hours,
      effortMinutes: minutes,
      effortTypeId: this.effortDraft.effortTypeId,
      remark: this.effortDraft.remark.trim(),
      userWorked: currentUser,
      createdBy: currentUser,
      updatedBy: currentUser,
      isCreatedByAdmin: isAdmin,
      isUpdatedByAdmin: isAdmin
    };
    if (this.editingEffortId != null) {
      payload.effortId = this.editingEffortId;
    }

    this.isSavingEffort = true;
    this.ritmService.updateTicketEffort(payload).pipe(finalize(() => this.isSavingEffort = false)).subscribe({
      next: () => {
        this.showEffortForm = false;
        this.editingEffortId = null;
        this.effortSuccess = 'Effort saved successfully.';
        this.loadEffortCalculation();
        this.loadEffortSummary(ticketId);
      },
      error: error => {
        console.error('Save effort error', error);
        this.effortError = error?.error?.description || error?.error?.message || 'Unable to save effort.';
      }
    });
  }

  deleteEffort(entry: any): void {
    const effortId = Number(entry.effortId ?? entry.id);
    const ticketId = Number(this.ritmId);
    const orgId = Number(this.orgId);
    if (!Number.isFinite(effortId) || !Number.isFinite(ticketId) || !Number.isFinite(orgId)) {
      this.effortError = 'Unable to delete effort: an identifier is unavailable.';
      return;
    }

    this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: {
        title: 'Delete Effort',
        message: 'Are you sure you want to delete this effort entry?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        showCancel: true,
        type: 'delete'
      }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.deletingEffortId = effortId;
      this.ritmService.deleteTicketEffort(effortId, ticketId, orgId)
        .pipe(finalize(() => this.deletingEffortId = null)).subscribe({
          next: () => {
            this.effortSuccess = 'Effort deleted successfully.';
            this.loadEffortCalculation();
          },
          error: error => {
            console.error('Delete effort error', error);
            this.effortError = error?.error?.description || error?.error?.message || 'Unable to delete effort.';
          }
        });
    });
  }

  getEffortTypeName(entry: any): string {
    return String(entry.effortTypeName ?? '—');
  }

  getEffortUserWorked(entry: any): string {
    const user = entry.userWorked ?? entry.user ?? entry.agent ?? entry.workedBy;
    if (user && typeof user === 'object') {
      return String(user.agentName ?? user.userName ?? user.name ?? user.fullName ?? '—');
    }
    const userId = Number(user ?? entry.userWorkedId ?? entry.workedById ?? 0);
    return this.agentNameMap.get(userId) || (userId ? String(userId) : '—');
  }

  assignApprover(): void {
    this.approverMessage = '';
    this.approverError = '';
    const approverIds = this.approverMode === 'group'
      ? this.normalizeList(this.selectedApproverConfig?.approvers || []).map((item: any) => Number(item?.agentId ?? item?.agent?.agentId)).filter(Boolean)
      : this.selectedAgents.map(agent => Number(agent.agentId ?? agent.id)).filter(Boolean);

    if (this.approverMode === 'group' && !this.selectedApproverConfig) {
      this.approverError = 'Select an approver group.';
      return;
    }
    if (this.approverMode === 'group' && approverIds.length === 0) {
      this.approverError = 'The selected approver group has no agents.';
      return;
    }
    if (this.approverMode === 'individual' && approverIds.length === 0) {
      this.approverError = 'Add at least one individual approver.';
      return;
    }

    const target = this.approverMode === 'group'
      ? String(this.selectedApproverConfig?.approverCode || 'approver group')
      : this.selectedAgents.map(agent => agent.agentName || agent.name).join(', ');
    this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      disableClose: true,
      data: {
        title: 'Confirm Approver Assignment',
        message: `Assign ${target} to ${this.getNestedValue('ticketNumber', 'this RITM')}? Add a reason to continue.`,
        confirmText: 'Assign',
        cancelText: 'Cancel',
        includeRemarks: true,
        remarksLabel: 'Reason',
        remarksPlaceholder: 'Enter the reason for this assignment'
      }
    }).afterClosed().subscribe((result: any) => {
      if (!result?.confirmed) {
        return;
      }

      const reason = String(result.remarks || '').trim();
      if (!reason) {
        this.approverError = 'A reason is required to assign approvers.';
        return;
      }

      const companyId = Number(this.ritm?.companyId ?? this.ritm?.company?.companyId ?? this.orgId);
      const payload = {
        // ...this.ritm,
        ritmId: Number(this.ritm?.ritmId ?? this.ritmId),
        companyId,
        reason,
        assignedBy: Number(localStorage.getItem('userId') || 0),
        isGroupApprover: this.approverMode === 'group' ? true : false,
        approverConfigId: this.approverMode === 'group'
          ? Number(this.selectedApproverConfig?.approverConfigId ?? this.selectedApproverConfig?.configId ?? 0)
          : null,
        approverIds :  this.approverMode === 'group' ? null : approverIds,
        isCreatorAdmin: Boolean(localStorage.getItem('isAdmin') === 'true')
      };

      this.assigningApprover = true;
      const saveRequest = this.editingApprover
        ? this.ritmService.updateApprover(payload)
        : this.ritmService.assignApprover(payload);
      saveRequest.pipe(finalize(() => this.assigningApprover = false)).subscribe({
        next: response => {
          this.approverMessage = response?.message || response?.description || (this.editingApprover ? 'Approver assignment updated successfully.' : 'Approver assignment submitted successfully.');
          this.editingApprover = false;
          this.loadAssignedApprovers();
          setTimeout(() => {
            this.approverMessage = '';
          }, 3000);
        },
        error: error => {
          this.approverError = error?.error?.message || error?.error?.description || 'Unable to assign approver.';
          setTimeout(() => {
            this.approverError = '';
          }, 3000);
        }
      });
    });
  }

  private loadWorkNotes(): void {
    if (!this.ritmId) {
      this.workNotes = [];
      this.workNotesPage = 1;
      return;
    }

    this.notesLoading = true;
    this.ritmService.getRitmWorkNotes(String(this.ritmId)).pipe(finalize(() => this.notesLoading = false)).subscribe({
      next: (response) => {
        this.workNotes = this.normalizeList(response?.attributes ?? response?.data ?? response ?? []);
        this.workNotesPage = 1;
      },
      error: () => {
        this.workNotes = this.normalizeList(this.ritm?.comments || []);
        this.workNotesPage = 1;
      }
    });
  }

  private loadHistory(): void {
    if (!this.ritmId) {
      this.history = [];
      this.historyPage = 1;
      return;
    }

    this.historyLoading = true;
    this.ritmService.getRitmHistory(String(this.ritmId)).pipe(finalize(() => this.historyLoading = false)).subscribe({
      next: (response) => {
        this.history = this.normalizeList(response?.attributes ?? response ?? []);
        this.historyPage = 1;
      },
      error: () => {
        this.history = this.normalizeList(this.ritm?.audits || []);
        this.historyPage = 1;
      }
    });
  }

  normalizeList(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.attributes)) {
      return response.attributes;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    return response ? [response] : [];
  }

  private loadAgentNameMap(): void {
    const orgId = localStorage.getItem('userOrgId');
    if (!orgId) {
      return;
    }

    this.agentService.getActiveAgentList(orgId).subscribe({
      next: (agents: any[]) => {
        agents = (agents as any).attributes ?? [];
        const entries: Array<[number, string]> = (agents || [])
          .map((agent: any) => {
            const agentId = Number(agent?.agentId ?? agent?.id ?? agent?.userId ?? 0);
            const agentName = String(agent?.agentName || agent?.name || 'User');
            return [agentId, agentName] as [number, string];
          })
          .filter(([agentId]) => Number.isFinite(agentId) && agentId > 0);

        this.agentNameMap = new Map<number, string>(entries);
      },
      error: () => {
        this.agentNameMap.clear();
      }
    });
  }

  getCommentAuthor(note: any): string {
    const createdBy = note?.createdBy;
    if (typeof createdBy === 'number' && createdBy > 0) {
      return this.agentNameMap.get(createdBy) || `Agent ${createdBy}`;
    }

    if (typeof createdBy === 'string' && createdBy.trim()) {
      const numericId = Number(createdBy);
      if (!Number.isNaN(numericId) && numericId > 0) {
        return this.agentNameMap.get(numericId) || `Agent ${numericId}`;
      }
      return createdBy;
    }

    if (createdBy && typeof createdBy === 'object') {
      const agentId = Number(createdBy.agentId ?? createdBy.id ?? createdBy.userId ?? 0);
      if (agentId > 0) {
        return this.agentNameMap.get(agentId) || createdBy.agentName || createdBy.name || createdBy.userName || 'User';
      }
      return createdBy.agentName || createdBy.name || createdBy.userName || createdBy.fullName || 'User';
    }

    return note?.createdByName || note?.userName || note?.authorName || 'User';
  }

  getFormattedCommentDate(value: any): string {
    const rawValue = value ?? null;
    if (!rawValue) {
      return 'Recent';
    }

    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) {
      return String(rawValue);
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date).replace(' at ', ' • ');
  }

  getAuditDetails(entry: any): any[] {
    const details = entry?.auditDetails ?? entry?.details ?? [];
    return Array.isArray(details) ? details : details ? [details] : [];
  }

  getAuditFieldName(entry: any): string {
    const detail = this.getAuditDetails(entry).find((item) => item?.fieldName);
    return entry?.fieldName || detail?.fieldName || 'Field changes';
  }

  getAuditTitle(entry: any): string {
    const actionType = (entry?.actionType || entry?.type || '').toString();
    const description = (entry?.description || '').toString().trim();

    if (description) {
      return description
        .replace(/RITM\s+/gi, '')
        .replace(/successfully/gi, '')
        .trim();
    }

    const labelMap: Record<string, string> = {
      CREATE: 'RITM created',
      UPDATE: 'RITM updated',
      COMMENT_CREATE: 'Comment added',
      COMMENT_UPDATE: 'Comment updated',
      STATUS_CHANGE: 'Status changed',
      PRIORITY_CHANGE: 'Priority changed',
      GROUP_CHANGE: 'Assignment group changed',
      DELETE: 'RITM deleted'
    };

    return labelMap[actionType] || 'System update';
  }

  getAuditByLabel(entry: any): string {
    const changedBy = entry?.changedBy;
    if (typeof changedBy === 'number' && changedBy > 0) {
      return this.agentNameMap.get(changedBy) || `Agent ${changedBy}`;
    }
    if (typeof changedBy === 'string' && changedBy.trim()) {
      return changedBy;
    }
    return 'System';
  }

  getAuditTimestamp(entry: any): string {
    const value = entry?.changedAt || entry?.updatedAt || entry?.createdAt || null;
    if (!value) {
      return 'Recent';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  getAuditTime(entry: any): string {
    const value = entry?.changedAt || entry?.updatedAt || entry?.createdAt || null;
    if (!value) {
      return 'Now';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date).toUpperCase();
  }

  getHistoryIconClass(entry: any): string {
    const action = (entry?.actionType || '').toString().toUpperCase();
    if (action.includes('COMMENT')) {
      return 'icon-blue';
    }
    if (action.includes('STATUS') || action.includes('CREATE')) {
      return 'icon-green';
    }
    if (action.includes('PRIORITY') || action.includes('UPDATE')) {
      return 'icon-orange';
    }
    if (action.includes('GROUP')) {
      return 'icon-purple';
    }
    return 'icon-gray';
  }

  getHistoryIcon(entry: any): string {
    const action = (entry?.actionType || '').toString().toUpperCase();
    if (action.includes('COMMENT')) {
      return 'chat';
    }
    if (action.includes('STATUS')) {
      return 'timeline';
    }
    if (action.includes('PRIORITY')) {
      return 'priority_high';
    }
    if (action.includes('GROUP')) {
      return 'groups';
    }
    if (action.includes('CREATE')) {
      return 'add';
    }
    return 'edit';
  }

  formatAuditValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (typeof value === 'object') {
      return value.name || value.label || value.fieldName || JSON.stringify(value);
    }
    return String(value);
  }

  get filteredHistory(): any[] {
    const search = this.historySearchTerm.trim().toLowerCase();
    if (!search) {
      return this.history;
    }

    return this.history.filter((entry) => {
      const keywords = [
        entry?.description,
        entry?.actionType,
        entry?.changedBy,
        entry?.changedAt,
        this.getAuditTitle(entry),
        this.getAuditFieldName(entry),
        this.getAuditByLabel(entry)
      ].filter((value) => value !== null && value !== undefined && value !== '').map((value) => String(value).toLowerCase());

      return keywords.some((keyword) => keyword.includes(search));
    });
  }

  get paginatedWorkNotes(): any[] {
    const start = (this.workNotesPage - 1) * this.pageSize;
    return this.workNotes.slice(start, start + this.pageSize);
  }

  get workNotesPageCount(): number {
    return Math.max(1, Math.ceil(this.workNotes.length / this.pageSize));
  }

  get paginatedHistory(): any[] {
    const start = (this.historyPage - 1) * this.pageSize;
    return this.filteredHistory.slice(start, start + this.pageSize);
  }

  get historyPageCount(): number {
    return Math.max(1, Math.ceil(this.filteredHistory.length / this.pageSize));
  }

  totalForDisplay(items: any[]): number {
    return items.length;
  }

  getWorkNotesRangeLabel(): string {
    const start = (this.workNotesPage - 1) * this.pageSize + 1;
    const end = Math.min(this.workNotesPage * this.pageSize, this.workNotes.length);
    return `Showing ${start} to ${end} of ${this.workNotes.length} records`;
  }

  getHistoryRangeLabel(): string {
    const start = (this.historyPage - 1) * this.pageSize + 1;
    const end = Math.min(this.historyPage * this.pageSize, this.filteredHistory.length);
    return `Showing ${start} to ${end} of ${this.filteredHistory.length} records`;
  }

  setWorkNotesPage(page: number): void {
    const totalPages = this.workNotesPageCount;
    this.workNotesPage = Math.min(Math.max(page, 1), totalPages);
  }

  setHistoryPage(page: number): void {
    const totalPages = this.historyPageCount;
    this.historyPage = Math.min(Math.max(page, 1), totalPages);
  }

  getCurrentUserId(): number {
    return Number(localStorage.getItem('userId') || 0);
  }

  canEdit(): boolean {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId || !this.ritm) {
      return false;
    }

    const requestedBy = Number(this.ritm?.requestedBy || this.ritm?.openedBy || this.ritm?.requestedFor || 0);
    const requestedFor = Number(this.ritm?.requestedFor || this.ritm?.requestedBy || 0);
    const agent = Number(this.agentId || 0);

    return currentUserId === requestedBy || currentUserId === requestedFor || currentUserId === agent;
  }

  addComment(): void {
    if (!this.commentText.trim() || !this.ritmId) {
      return;
    }

    this.submittingComment = true;
    const payload = {
      ticketId: Number(this.ritmId),
      agentId: this.getCurrentUserId(),
      commentText: this.commentText.trim(),
      createdBy: this.getCurrentUserId()
    };

    this.ritmService.addRitmComment(payload).pipe(finalize(() => this.submittingComment = false)).subscribe({
      next: () => {
        this.commentText = '';
        this.loadWorkNotes();
      },
      error: () => {
        this.workNotes = [...this.workNotes, {
          comment: this.commentText.trim(),
          createdByName: 'You',
          createdAt: new Date().toISOString()
        }];
        this.commentText = '';
      }
    });
  }

  escalate(): void {
    if (!this.ritmId) {
      return;
    }

    this.ritmService.escalateRitm(String(this.ritmId), 'Escalated from My Tickets').subscribe({
      next: () => {
        this.loadRitm();
      },
      error: () => {
        this.slaInfo = this.slaInfo || {};
        this.slaInfo.escalationStatus = 'Escalation requested';
      }
    });
  }

  getDisplayStatus(status: string): string {
    const normalized = (status || 'Open').toString().trim();
    return normalized.toLowerCase().replace(/\s+/g, '-');
  }

  getFieldValue(field: string, fallback = '—'): string {
    const value = this.ritm?.[field];
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return String(value);
  }

  getNestedValue(path: string, fallback = '—'): string {
    const segments = path.split('.');
    let value: any = this.ritm;

    for (const segment of segments) {
      if (value === null || value === undefined) {
        return fallback;
      }
      value = value[segment];
    }

    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    return String(value);
  }

  getStatusLabel(): string {
    const status = this.ritm?.status;
    if (status && typeof status === 'object') {
      return String(status.statusCode || status.statusName || status.name || 'Open');
    }
    return this.getFieldValue('status', 'Open');
  }

  getStatusColor(): string {
    const status = this.ritm?.status;
    return String(
      (status && typeof status === 'object' ? status.statusColor : '')
      || this.ritm?.statusColor
      || ''
    ).trim();
  }

  getAssignedToLabel(): string {
    const assignedTo = this.ritm?.assignedTo;
    if (assignedTo && typeof assignedTo === 'object') {
      return String(assignedTo.agentName || assignedTo.name || assignedTo.userName || assignedTo.fullName || assignedTo.accessId || 'N/A');
    }
    return this.getFieldValue('assignedToName', assignedTo || 'N/A');
  }

  getDetailRows(): Array<{label: string, value: string}> {
    const createdOn = this.ritm?.createdOn ?? this.ritm?.createdAt ?? this.ritm?.requestedAt;
    const customerResolution = this.ritm?.customerResolution;
    return [
      { label: 'Requested For', value: this.getNestedValue('requestedFor.agentName', this.getFieldValue('requestedForName', this.getFieldValue('requestedFor', 'N/A'))) },
      { label: 'Requested By', value: this.getNestedValue('requestedBy.agentName', this.getFieldValue('requestedByName', this.getFieldValue('openedByName', this.getFieldValue('openedBy', 'N/A')))) },
      { label: 'Created On', value: this.formatDetailDateTime(createdOn) },
      { label: 'Status', value: this.getStatusLabel() },
      { label: 'Priority', value: this.getNestedValue('priority.code', this.getFieldValue('priorityName', this.getFieldValue('priority', 'Normal'))) },
      { label: 'Category', value: this.getNestedValue('category.categoryName', this.getFieldValue('categoryName', this.getFieldValue('category', 'N/A'))) },
      { label: 'Sub Category', value: this.getNestedValue('subCategory.subCategoryName', this.getFieldValue('subCategoryName', this.getFieldValue('subCategory', 'N/A'))) },
      { label: 'Support Group', value: this.getNestedValue('supportGroup.groupName', this.getFieldValue('assignmentGroupName', this.getFieldValue('assignmentGroup', this.getFieldValue('supportGroupName', 'N/A')))) },
      { label: 'Request Type', value: this.getNestedValue('requestType.requestTypeName', this.getFieldValue('requestTypeName', this.getFieldValue('requestType', 'N/A'))) },
      { label: 'Customer Resolution', value: this.formatDetailDateTime(customerResolution) },
      { label: 'Assigned To', value: this.getAssignedToLabel() }
    ];
  }

  private formatDetailDateTime(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    const date = new Date(value as string | number | Date);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date).replace(' at ', ' • ');
  }

  getWatchlistItems(): any[] {
    return this.normalizeList(this.ritm?.watchlist ?? this.ritm?.watchList ?? this.ritm?.watchers ?? []);
  }

  getWatchlistLabel(item: any): string {
    const watcher = item?.watchedBy ?? item?.watcher ?? item;
    if (watcher === null || watcher === undefined) {
      return 'User';
    }
    if (typeof watcher !== 'object') {
      return String(watcher);
    }
    return watcher.agentName || watcher.name || watcher.userName || watcher.fullName || watcher.accessId || watcher.agentId || 'User';
  }

  getAttachmentItems(): any[] {
    return this.normalizeList(this.ritm?.ritmAttachments ?? this.ritm?.attachments ?? this.ritm?.files ?? []);
  }

  getAttachmentName(attachment: any): string {
    return attachment?.originalFileName || attachment?.fileName || attachment?.name || 'Attachment';
  }

  getAttachmentType(attachment: any): string {
    return String(attachment?.mimeType || attachment?.contentType || attachment?.type || 'FILE').toUpperCase();
  }

  getAttachmentSize(attachment: any): string {
    const size = attachment?.fileSize ?? attachment?.size;
    return size ? `${Math.round(Number(size) / 1024)} KB` : '—';
  }

  editRitm(): void {
    if (this.ritmId) {
      if (this.isRitmSubtask) {
        const parentRitmId = this.ritm?.parentRitmId
          ?? this.ritm?.parentRitm?.ritmId
          ?? this.ritm?.parentRitm?.ticketId
          ?? '';
        this.router.navigate(['/ritm-subtask'], {
          queryParams: {
            subtaskId: this.ritmId,
            parentRitmId,
            agentId: this.agentId,
            requestType: this.requestType,
            from: this.route.snapshot.queryParamMap.get('from') || ''
          },
          state: { ritmData: this.ritm, parentRitmData: this.ritm?.parentRitm }
        });
        return;
      }

      this.router.navigate(['/ritm'], {
        queryParams: { id: this.ritmId },
        state: { ritmData: this.ritm }
      });
    }
  }

  createRitmSubtask(): void {
    if (!this.ritmId) {
      return;
    }
    this.router.navigate(['/ritm-subtask'], {
      queryParams: {
        ritmId: this.ritmId,
        agentId: this.agentId,
        requestType: this.requestType,
        from: this.route.snapshot.queryParamMap.get('from') || ''
      },
      state: { ritmData: this.ritm }
    });
  }

  back(): void {
    const returnRitmId = this.route.snapshot.queryParamMap.get('returnRitmId');
    if (returnRitmId) {
      this.router.navigate(['/agent', this.agentId || 0, this.requestType], {
        queryParams: {
          ritmId: returnRitmId,
          from: this.getCurrentFrom()
        }
      });
      return;
    }

    const fromPath = this.route.snapshot.queryParamMap.get('from');
    const returnPath = fromPath === 'group-ritm'
      ? '/group-ritm' : fromPath === 'my-tickets'
      ? '/my-tickets' : '/approval';
    this.router.navigate([returnPath]);
  }
}
