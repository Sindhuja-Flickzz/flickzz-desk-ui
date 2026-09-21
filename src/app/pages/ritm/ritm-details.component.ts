import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AgentService } from '../../service/agent.service';
import { RitmService } from '../../service/ritm.service';
import { VariantService } from '../../service/variant.service';

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
  workNotes: any[] = [];
  history: any[] = [];
  slaInfo: any = null;
  commentText = '';
  activeTab: 'details' | 'work-notes' | 'history' | 'sla' = 'details';
  loading = false;
  notesLoading = false;
  historyLoading = false;
  historySearchTerm = '';
  submittingComment = false;
  templates: any[] = [];
  templatesLoading = false;
  private fieldTypeMap: Map<number, string> = new Map();
  private ritmTemplateDetails: any[] = [];
  pageSize = 5;
  workNotesPage = 1;
  historyPage = 1;
  orgId = localStorage.getItem('userOrgId') || '';
  private agentNameMap: Map<number, string> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ritmService: RitmService,
    private agentService: AgentService,
    private variantService: VariantService
  ) {}

  ngOnInit(): void {
    this.loadAgentNameMap();
    this.route.paramMap.subscribe((params) => {
      const agentId = params.get('agentId');
      const requestType = params.get('requestType');
    this.orgId = localStorage.getItem('userOrgId') || '';
      this.agentId = agentId ? Number(agentId) : null;
      this.requestType = requestType || 'requestedByMe';
      this.loadTemplates();
      this.loadRouteState();
    });
  }

  loadRouteState(): void {
    this.route.queryParamMap.subscribe((params) => {
      const ritmId = params.get('ritmId');
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
      return;
    }

    this.loading = true;
    this.ritmService.getRitmById(String(this.ritmId)).pipe(finalize(() => this.loading = false)).subscribe({
      next: (response) => {
        const payload = response?.attributes ?? response ?? {};
        const detailPayload = Array.isArray(payload) ? payload[0] ?? {} : payload;
        this.ritm = detailPayload?.ritm ?? detailPayload;
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
      },
      error: () => {
        this.ritm = {};
        this.workNotes = [];
        this.history = [];
        this.slaInfo = null;
      }
    });
  }

  private loadTemplates(): void {
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

    this.variantService.getRitmTemplateDetails(this.orgId).pipe(finalize(() => this.templatesLoading = false)).subscribe({
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

  setActiveTab(tab: 'details' | 'work-notes' | 'history' | 'sla'): void {
    this.activeTab = tab;

    if (tab === 'work-notes' && this.ritmId) {
      this.loadWorkNotes();
    }

    if (tab === 'history' && this.ritmId) {
      this.loadHistory();
    }
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
      ritmId: Number(this.ritmId),
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
    return [
      { label: 'Requested For', value: this.getNestedValue('requestedFor.agentName', this.getFieldValue('requestedForName', this.getFieldValue('requestedFor', 'N/A'))) },
      { label: 'Status', value: this.getStatusLabel() },
      { label: 'Priority', value: this.getNestedValue('priority.code', this.getFieldValue('priorityName', this.getFieldValue('priority', 'Normal'))) },
      { label: 'Created On', value: this.getFieldValue('createdOn', this.getFieldValue('createdAt', this.getFieldValue('requestedAt', 'N/A'))) },
      { label: 'Requested By', value: this.getNestedValue('requestedBy.agentName', this.getFieldValue('requestedByName', this.getFieldValue('openedByName', this.getFieldValue('openedBy', 'N/A')))) },
      { label: 'Assigned To', value: this.getAssignedToLabel() },
      { label: 'Category', value: this.getNestedValue('category.categoryName', this.getFieldValue('categoryName', this.getFieldValue('category', 'N/A'))) },
      { label: 'Sub Category', value: this.getNestedValue('subCategory.subCategoryName', this.getFieldValue('subCategoryName', this.getFieldValue('subCategory', 'N/A'))) },
      { label: 'Support Group', value: this.getNestedValue('supportGroup.groupName', this.getFieldValue('assignmentGroupName', this.getFieldValue('assignmentGroup', this.getFieldValue('supportGroupName', 'N/A')))) },
      { label: 'Requested At', value: this.getFieldValue('requestedAt', this.getFieldValue('requestedOn', this.getFieldValue('createdAt', 'N/A'))) }
    ];
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
      this.router.navigate(['/ritm'], {
        queryParams: { id: this.ritmId },
        state: { ritmData: this.ritm }
      });
    }
  }

  back(): void {
    const returnPath = this.route.snapshot.queryParamMap.get('from') === 'group-ritm'
      ? '/group-ritm'
      : '/my-tickets';
    this.router.navigate([returnPath]);
  }
}
