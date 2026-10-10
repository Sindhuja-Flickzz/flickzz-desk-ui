import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { AgentService } from '../../service/agent.service';
import { RitmService } from '../../service/ritm.service';
import { RequestApproverService } from '../../service/requestapprover.service';
import { VariantService } from '../../service/variant.service';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-ritm-details',
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ritmService: RitmService,
    private agentService: AgentService,
    private requestApproverService: RequestApproverService,
    private variantService: VariantService,
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
        this.workItemCode = response?.workItem?.code ?? detailPayload?.workItem?.code ?? this.ritm?.workItem?.code ?? null;
        this.loadTemplates(this.workItemCode);
        this.ritmTemplateDetails = this.normalizeTemplateDetails(
          this.ritm?.templateDetails
            ?? this.ritm?.templateFields
            ?? detailPayload?.templateDetails
            ?? detailPayload?.templateFields
            ?? []
        );
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
        this.templates = [];
        this.templatesLoading = false;
        this.workItemCode = null;
      }
    });
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
        const templates = this.normalizeList(response?.attributes ?? response ?? {});
        this.templates = templates.map((template: any) => ({
          ...template,
          templateDetails: this.normalizeList(template?.templateDetails ?? template?.details ?? []).map((field: any) => ({
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

    return details.fieldId != null || details.fieldName != null || details.value != null || details.fieldValue != null
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
      const fieldId = field?.fieldId == null ? null : Number(field.fieldId);
      const templateId = field?.templateId == null ? null : Number(field.templateId);
      const fieldName = this.normalizeFieldName(field?.fieldName);

      const existing = details.find((item: any) =>
        fieldId !== null && item?.fieldId != null && Number(item.fieldId) === fieldId
      ) || details.find((item: any) =>
        templateId !== null
        && item?.templateId != null
        && Number(item.templateId) === templateId
        && fieldName !== ''
        && this.normalizeFieldName(item?.fieldName) === fieldName
      ) || details.find((item: any) =>
        fieldId === null
        && templateId === null
        && fieldName !== ''
        && this.normalizeFieldName(item?.fieldName) === fieldName
      );

      if (existing) {
        return this.normalizeTemplateValue(
          existing?.value
          ?? existing?.fieldValue
          ?? existing?.field_value
          ?? existing?.userValue
          ?? existing?.answer
        , field);
      }
    }

    return this.normalizeTemplateValue(field?.value ?? field?.fieldValue ?? '', field);
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

  }

  setActiveAdditionalTab(tab: 'approvers' | 'catalog-task' | 'effort'): void {
    this.activeAdditionalTab = tab;
    if (tab === 'approvers' && this.ritmId && !this.loading) this.loadApproverData();
    if (tab === 'catalog-task' && this.ritmId) this.loadReferencedTickets();
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
        this.getAuditByLabel(entry),
        ...this.getAuditDetails(entry).flatMap((detail) => [
          detail?.fieldName,
          detail?.oldValue,
          detail?.newValue
        ])
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
      { label: 'Assigned To', value: this.getAssignedToLabel() },
      { label: 'Request Type', value: this.getNestedValue('requestType.requestTypeName', this.getFieldValue('requestTypeName', this.getFieldValue('requestType', 'N/A'))) },
      { label: 'Customer Resolution', value: this.formatDetailDateTime(customerResolution) },
      {label: 'Assigned To', value: this.getNestedValue('assignedTo.agentName', this.getFieldValue('assignedToName', this.getFieldValue('assignedTo', 'N/A')))}
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
