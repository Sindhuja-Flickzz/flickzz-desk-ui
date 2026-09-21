import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { AgentService } from '../../service/agent.service';
import { RitmService } from '../../service/ritm.service';
import { SupportGroupService } from '../../service/support-group.service';
import { VariantService } from '../../service/variant.service';
import { forkJoin } from 'rxjs';

interface GroupRitmStatusCountInfo {
  statusId: number;
  statusCode: string;
  ritmCount: number;
  statusColor?: string;
}

interface GroupRitmUser {
  userId: number | null;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  agent?: { agentId?: number; agentName?: string };
  [key: string]: any;
}

interface SupportGroupSummary {
  supportGroupId: number;
  groupName: string;
  users: GroupRitmUser[];
  unassignedRequests: any[];
  requests: any[];
  totalCountRitm: number;
  unassignedRitmCount: number;
  statusCounts: GroupRitmStatusCountInfo[];
  trendData: any[];
}

@Component({
  selector: 'app-group-ritm',
  templateUrl: './group-ritm.component.html',
  styleUrls: ['./group-ritm.component.scss']
})
export class GroupRitmComponent implements OnInit {
  agentId: number | null = null;
  orgId: number | null = null;
  supportGroupIds: number[] = [];
  users: GroupRitmUser[] = [];
  supportGroups: SupportGroupSummary[] = [];
  supportGroupSearch = '';
  selectedSupportGroupId: number | null = null;
  supportGroupRequests: any[] = [];
  agentSearch = '';
  expandedAgentId: number | 'unassigned' | 'status' | null = null;
  groupLoading = false;
  selectedAgentId: number | null = null;
  selectedAgentName = 'Unassigned';
  requests: any[] = [];
  ritmStatuses: any[] = [];
  statusDefinitions: any[] = [];
  ritmTrend: any[] = [];
  templateFields: any[] = [];
  selectedTemplateFieldIds: string[] = [];
  selectedRequest: any = null;
  selectedRequestDetails: any = null;
  drawerTab: 'details' | 'comments' | 'history' | 'watchlist' | 'attachments' = 'details';
  drawerComments: any[] = [];
  drawerHistory: any[] = [];
  drawerLoading = false;
  assigning = false;
  assignmentMessage = '';
  assignmentDropdownOpen = false;
  filterOpen = false;
  columnMenuOpen = false;
  filterText = '';
  filterStatus = '';
  private agentNameMap = new Map<number, string>();
  assignmentSuggestions: any[] = [];
  assignSearch = '';
  usersLoading = false;
  requestsLoading = false;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  agentPageSize = 8;
  agentPageIndex = 0;
  agentPageSizeOptions = [5, 8, 15, 25];
  totalRecords = 0;
  currentPage = 0;
  sidebarWidth = 230;
  private isSidebarResizing = false;
  private sidebarResizeStartX = 0;
  private sidebarResizeStartWidth = 230;
  drawerWidth = 370;
  private isDrawerResizing = false;
  private drawerResizeStartX = 0;
  private drawerResizeStartWidth = 370;

  constructor(
    private router: Router,
    private agentService: AgentService,
    private ritmService: RitmService,
    private supportGroupService: SupportGroupService,
    private variantService: VariantService
  ) {}

  ngOnInit(): void {
    this.orgId = Number(localStorage.getItem('userOrgId') || 0);
    this.loadTemplateFields();
    this.loadStatusDefinitions();
    const userId = Number(localStorage.getItem('userId') || 0);

    if (!userId) {
      this.users = [];
      this.supportGroupIds = [];
      return;
    }

    this.agentService.getAgentIdByUserId(userId).subscribe({
      next: (agentId) => {
        this.agentId = Number(agentId) || null;
        this.resetSelection();
        this.loadSupportGroupUsers();
      },
      error: () => {
        this.agentId = null;
        this.resetSelection();
        this.loadSupportGroupUsers();
      }
    });
  }

  getGroupGridTemplate(): string {
    return this.selectedRequest
      ? `${this.sidebarWidth}px minmax(480px, 1fr) ${this.drawerWidth}px`
      : `${this.sidebarWidth}px minmax(0, 1fr)`;
  }

  startSidebarResize(event: PointerEvent): void {
    event.preventDefault();
    this.isSidebarResizing = true;
    this.sidebarResizeStartX = event.clientX;
    this.sidebarResizeStartWidth = this.sidebarWidth;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  resizeSidebar(event: PointerEvent): void {
    if (this.isSidebarResizing) {
      const nextWidth = this.sidebarResizeStartWidth + event.clientX - this.sidebarResizeStartX;
      this.sidebarWidth = Math.min(420, Math.max(174, nextWidth));
    }

    if (this.isDrawerResizing) {
      const nextWidth = this.drawerResizeStartWidth + this.drawerResizeStartX - event.clientX;
      this.drawerWidth = Math.min(600, Math.max(300, nextWidth));
    }

    if (!this.isSidebarResizing && !this.isDrawerResizing) {
      return;
    }
  }

  @HostListener('document:pointerup')
  stopSidebarResize(): void {
    this.isSidebarResizing = false;
    this.isDrawerResizing = false;
  }

  resetSidebarWidth(): void {
    this.sidebarWidth = 230;
  }

  startDrawerResize(event: PointerEvent): void {
    event.preventDefault();
    this.isDrawerResizing = true;
    this.drawerResizeStartX = event.clientX;
    this.drawerResizeStartWidth = this.drawerWidth;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  resetDrawerWidth(): void {
    this.drawerWidth = 370;
  }

  resetSelection(): void {
    this.selectedSupportGroupId = null;
    this.supportGroupRequests = [];
    this.expandedAgentId = null;
    this.selectedAgentId = null;
    this.selectedAgentName = 'Unassigned';
    this.requests = [];
    this.selectedRequest = null;
    this.selectedRequestDetails = null;
    this.drawerTab = 'details';
    this.drawerComments = [];
    this.drawerHistory = [];
    this.assignmentSuggestions = [];
    this.assignSearch = '';
    this.currentPage = 0;
    this.totalRecords = 0;
  }

  getStatusCode(status: any): string {
    if (status && typeof status === 'object') {
      return String(status.statusCode ?? status.statusName ?? status.name ?? status.code ?? '').trim();
    }
    return String(status ?? '').trim();
  }

  getStatusClass(status: any): string {
    const normalizedStatus = this.getStatusCode(status).toLowerCase().replace(/\s+/g, '-');
    const statusAliases: Record<string, string> = {
      'inprogress': 'in-progress',
      'in-progress': 'in-progress',
      'work-in-progress': 'in-progress',
      resolved: 'resolved',
      closed: 'closed',
      cancelled: 'cancelled',
      canceled: 'cancelled',
      rejected: 'rejected',
      approved: 'approved',
      pending: 'pending',
      open: 'open'
    };
    return statusAliases[normalizedStatus] || 'other';
  }

  getDashboardStatuses(): any[] {
    return Array.isArray(this.ritmStatuses) ? this.ritmStatuses : [];
  }

  getStatusPercentage(status: any): string {
    const total = this.getTotalStatusCount();
    return total ? `${((this.getStatusCount(status) / total) * 100).toFixed(2)}%` : '0.00%';
  }

  getStatusColor(status: any): string {
    if (status && typeof status === 'object' && status.statusColor) {
      return String(status.statusColor).trim();
    }

    const statusCode = this.getStatusCode(status).toLowerCase();
    const statusDefinition = this.statusDefinitions.find(item =>
      this.getStatusCode(item).toLowerCase() === statusCode
    );
    const statusCount = this.getDashboardStatuses().find(item =>
      this.getStatusCode(item).toLowerCase() === statusCode
    );
    return String(statusDefinition?.statusColor || statusCount?.statusColor || '').trim();
  }

  getDonutStyle(): string {
    const total = this.getTotalStatusCount();
    if (!total) {
      return 'conic-gradient(#dfe7f2 0 100%)';
    }

    let offset = 0;
    const segments = this.getDashboardStatuses().map(status => {
      const end = offset + (this.getStatusCount(status) / total) * 100;
      const segment = `${this.getStatusColor(status)} ${offset}% ${end}%`;
      offset = end;
      return segment;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }

  getTrendLabels(): string[] {
    return this.getDashboardStatuses().slice(-7).map(status => this.getStatusCode(status));
  }

  getTrendValues(): number[] {
    return this.getDashboardStatuses().slice(-7).map(status => this.getStatusCount(status));
  }

  getTrendDate(item: any, index: number): string {
    const rawDate = item?.date ?? item?.requestedOn ?? item?.createdAt ?? item?.day;
    if (rawDate) {
      const date = new Date(rawDate);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return String(rawDate);
    }
    return `Day ${index + 1}`;
  }

  getTrendPoint(index: number): string {
    const values = this.getTrendValues();
    const max = Math.max(...values, 1);
    const x = values.length > 1 ? (index / (values.length - 1)) * 100 : 0;
    const y = 34 - (values[index] / max) * 27;
    return `${x},${y}`;
  }

  getTrendPoints(): string {
    return this.getTrendValues().map((_value, index) => this.getTrendPoint(index)).join(' ');
  }

  private normalizeStatusCounts(value: any): GroupRitmStatusCountInfo[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (!value || typeof value !== 'object') {
      return [];
    }
    return Object.entries(value).map(([statusCode, count]: [string, any], index) => ({
      statusId: Number(count?.statusId ?? index),
      statusCode: count?.statusCode ?? statusCode,
      statusColor: count?.statusColor,
      ritmCount: Number(count?.ritmCount ?? count?.count ?? count ?? 0)
    }));
  }

  private normalizeTrendData(value: any): any[] {
    if (Array.isArray(value)) {
      const trendItems = value.filter(item => item && (item.count != null || item.ritmCount != null || item.value != null));
      if (trendItems.length) {
        return trendItems;
      }

      const grouped = new Map<string, number>();
      value.forEach(item => {
        const rawDate = item?.date ?? item?.requestedOn ?? item?.createdAt ?? item?.day;
        const date = rawDate ? new Date(rawDate) : null;
        if (date && !Number.isNaN(date.getTime())) {
          const key = date.toISOString().slice(0, 10);
          grouped.set(key, (grouped.get(key) || 0) + 1);
        }
      });
      return Array.from(grouped.entries()).map(([date, count]) => ({ date, count }));
    }
    return [];
  }

  private loadTemplateFields(): void {
    this.variantService.getRitmTemplateDetails(String(this.orgId || 0)).subscribe({
      next: (response: any) => {
        const fields = this.flattenTemplateFields(response?.attributes ?? response ?? []);
        const seen = new Set<string>();
        this.templateFields = fields.filter(field => {
          const key = String(field?.fieldId ?? field?.fieldName ?? field?.name ?? '').trim();
          if (!key || seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      },
      error: () => {
        this.templateFields = [];
      }
    });
  }

  private loadStatusDefinitions(): void {
    this.ritmService.getRitmStatuses(String(this.orgId || 0)).subscribe({
      next: (response: any) => {
        this.statusDefinitions = this.normalizeList(response?.attributes ?? response ?? []);
      },
      error: () => {
        this.statusDefinitions = [];
      }
    });
  }

  private flattenTemplateFields(value: any): any[] {
    if (Array.isArray(value)) {
      return value.flatMap(item => this.flattenTemplateFields(item));
    }
    if (!value || typeof value !== 'object') {
      return [];
    }
    const nested = value.templateDetails ?? value.templateFields ?? value.details;
    if (nested !== undefined) {
      return this.flattenTemplateFields(nested);
    }
    return value.fieldId != null || value.fieldName != null || value.name != null ? [value] : [];
  }

  getTemplateFieldKey(field: any): string {
    return String(field?.fieldId ?? field?.fieldName ?? field?.name ?? '').trim();
  }

  getSelectedTemplateFields(): any[] {
    return this.selectedTemplateFieldIds
      .map(fieldId => this.templateFields.find(field => this.getTemplateFieldKey(field) === fieldId))
      .filter(Boolean);
  }

  toggleColumnMenu(): void {
    this.columnMenuOpen = !this.columnMenuOpen;
  }

  toggleTemplateField(fieldId: string): void {
    this.selectedTemplateFieldIds = this.selectedTemplateFieldIds.includes(fieldId)
      ? this.selectedTemplateFieldIds.filter(id => id !== fieldId)
      : [...this.selectedTemplateFieldIds, fieldId];
    this.currentPage = 0;
  }

  getDynamicFieldValue(request: any, fieldId: string): string {
    if (!fieldId) {
      return '';
    }
    const fields = this.flattenTemplateFields(request?.templateDetails ?? request?.templateFields ?? []);
    const selectedField = this.templateFields.find(field => this.getTemplateFieldKey(field) === fieldId);
    const selectedFieldId = selectedField?.fieldId;
    const selectedFieldName = String(selectedField?.fieldName ?? selectedField?.name ?? '').trim().toLowerCase();
    const value = fields.find(field =>
      (selectedFieldId != null && String(field?.fieldId) === String(selectedFieldId))
      || (selectedFieldName && String(field?.fieldName ?? field?.name ?? '').trim().toLowerCase() === selectedFieldName)
    );
    const fieldValue = value?.value ?? value?.fieldValue;
    return fieldValue === null || fieldValue === undefined || fieldValue === '' ? '—' : String(fieldValue);
  }

  getRequestGridTemplate(): string {
    const dynamicColumns = this.selectedTemplateFieldIds.map(() => '1.2fr').join(' ');
    return `1.05fr 1.25fr 1fr 1.65fr .95fr${dynamicColumns ? ' ' + dynamicColumns : ''}`;
  }

  selectRequest(item: any): void {
    this.selectedRequest = item;
    this.selectedRequestDetails = item;
    this.drawerTab = 'details';
    this.assignmentMessage = '';
    const assignedName = this.getAssignedAgentName(item);
    this.assignSearch = assignedName === 'Not assigned' ? '' : assignedName;
    const supportGroupId = this.getSupportGroupId(item);
    this.loadAssignmentSuggestions(supportGroupId);
    this.loadRequestDetails(item);
  }

  loadRequestDetails(item: any): void {
    const ritmId = item?.ritmId ?? item?.id ?? item?.requestId;
    if (!ritmId) {
      return;
    }

    this.drawerLoading = true;
    this.ritmService.getRitmById(String(ritmId)).subscribe({
      next: (response) => {
        const payload = response?.attributes ?? response ?? {};
        const detail = Array.isArray(payload) ? payload[0] ?? {} : payload;
        this.selectedRequestDetails = detail?.ritm ?? detail;
        this.loadDrawerComments();
        this.loadDrawerHistory();
        this.drawerLoading = false;
      },
      error: () => {
        this.drawerLoading = false;
      }
    });
  }

  loadDrawerComments(): void {
    const ritmId = this.getSelectedRitmId();
    if (!ritmId) {
      this.drawerComments = [];
      return;
    }

    this.ritmService.getRitmWorkNotes(String(ritmId)).subscribe({
      next: (response) => this.drawerComments = this.normalizeList(response?.attributes ?? response?.data ?? response ?? []),
      error: () => this.drawerComments = this.normalizeList(this.selectedRequestDetails?.comments)
    });
  }

  loadDrawerHistory(): void {
    const ritmId = this.getSelectedRitmId();
    if (!ritmId) {
      this.drawerHistory = [];
      return;
    }

    this.ritmService.getRitmHistory(String(ritmId)).subscribe({
      next: (response) => this.drawerHistory = this.normalizeList(response?.attributes ?? response?.data ?? response ?? []),
      error: () => this.drawerHistory = this.normalizeList(this.selectedRequestDetails?.audits)
    });
  }

  getSelectedRitmId(): number | null {
    const value = this.selectedRequestDetails?.ritmId ?? this.selectedRequestDetails?.id ?? this.selectedRequest?.ritmId ?? this.selectedRequest?.id ?? this.selectedRequest?.requestId;
    return value == null ? null : Number(value);
  }

  openRitmDetails(): void {
    const ritmId = this.getSelectedRitmId();
    if (!ritmId) {
      return;
    }

    this.router.navigate(['/agent', this.agentId || 0, 'groupRitm'], {
      queryParams: { ritmId: String(ritmId), from: 'group-ritm' }
    });
  }

  getSupportGroupId(item: any): number | null {
    const value = item?.supportGroupId ?? item?.supportGroup?.supportGroupId ?? item?.supportGroup?.id ?? item?.supportGroup?.supportGroupId ?? null;
    return value != null ? Number(value) : null;
  }

  loadAssignmentSuggestions(supportGroupId: number | null): void {
    const group = this.supportGroups.find(item => item.supportGroupId === supportGroupId);
    if (!group) {
      this.assignmentSuggestions = [];
      return;
    }

    this.assignmentSuggestions = this.normalizeAssignmentSuggestions(group.users);
  }

  normalizeAssignmentSuggestions(users: any[]): any[] {
    if (!Array.isArray(users)) {
      return [];
    }

    return users
      .filter((user) => user && (user.agentId != null || user.userId != null || user.agent?.agentId != null))
      .map((user) => ({
        agentId: user.agentId ?? user.userId ?? user.agent?.agentId ?? null,
        agentName: user.agentName || user.userName || user.agent?.agentName || user.firstName || user.lastName || 'Agent',
        name: user.agentName || user.userName || user.agent?.agentName || user.firstName || user.lastName || 'Agent',
        email: user.email || user.mailId || user.agent?.email || user.agent?.mailId || '',
        accessId: user.accessId || user.agent?.accessId || ''
      }));
  }

  filteredAssignmentSuggestions(): any[] {
    const term = (this.assignSearch || '').trim().toLowerCase();
    if (!term) {
      return this.assignmentSuggestions;
    }

    return this.assignmentSuggestions.filter((agent) => {
      const label = [agent.agentName, agent.name, agent.email, agent.accessId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return label.includes(term);
    });
  }

  openAssignmentDropdown(): void {
    this.assignmentDropdownOpen = true;
  }

  closeAssignmentDropdown(): void {
    setTimeout(() => this.assignmentDropdownOpen = false, 150);
  }

  selectAssignmentSuggestion(agent: any): void {
    const name = agent?.agentName || agent?.name || 'Agent';
    this.assignSearch = name;
    this.assignmentDropdownOpen = false;
    if (this.selectedRequest) {
      this.selectedRequest.assignedTo = {
        agentName: name,
        agentId: agent?.agentId ?? null,
        email: agent?.email || '',
        accessId: agent?.accessId || ''
      };
      this.assignSelectedRequest();
    }
  }

  @HostListener('document:click', ['$event'])
  closeDrawerOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (this.columnMenuOpen && !target?.closest('.column-picker')) {
      this.columnMenuOpen = false;
    }

    if (!this.selectedRequest) {
      return;
    }

    if (target?.closest('.details-drawer') || target?.closest('.request-row')) {
      return;
    }

    this.selectedRequest = null;
    this.selectedRequestDetails = null;
  }

  assignSelectedRequest(): void {
    const ritmId = Number(this.selectedRequest?.ritmId ?? this.selectedRequest?.id ?? this.selectedRequest?.requestId ?? 0);
    const assignedTo = Number(this.selectedRequest?.assignedTo?.agentId ?? this.selectedRequest?.assignedToId ?? 0);
    const assignedBy = Number(localStorage.getItem('userId') || this.agentId || 0);
    if (!ritmId || !assignedTo || this.assigning) {
      this.assignmentMessage = 'Select an agent before assigning.';
      return;
    }

    this.assigning = true;
    this.assignmentMessage = '';
    this.ritmService.assignRitm({ ritmId, assignedTo, assignedBy }).subscribe({
      next: () => {
        this.assigning = false;
        this.assignmentMessage = 'Assigned successfully.';
        this.selectedRequest = null;
        this.selectedRequestDetails = null;
        this.assignmentDropdownOpen = false;
        if (this.selectedAgentId === null) {
          this.refreshSupportGroup();
        } else {
          this.refreshSelectedAgentRequests();
        }
      },
      error: () => {
        this.assigning = false;
        this.assignmentMessage = 'Unable to assign this RITM.';
      }
    });
  }

  normalizeList(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (Array.isArray(value?.attributes)) {
      return value.attributes;
    }
    if (Array.isArray(value?.data)) {
      return value.data;
    }
    return value ? [value] : [];
  }

  getDrawerValue(path: string, fallback = 'N/A'): string {
    const value = path.split('.').reduce((current: any, key: string) => current?.[key], this.selectedRequestDetails);
    return value === null || value === undefined || value === '' ? fallback : String(value);
  }

  getDrawerFieldValue(...paths: string[]): string {
    for (const path of paths) {
      const value = this.getDrawerValue(path, '');
      if (value) {
        return value;
      }
    }
    return 'N/A';
  }

  getDrawerStatusCode(): string {
    const status = this.selectedRequestDetails?.status ?? this.selectedRequest?.status;
    return this.getStatusCode(
      status?.statusCode
        ?? status?.statusName
        ?? status?.name
        ?? status?.code
        ?? this.selectedRequestDetails?.statusCode
        ?? this.selectedRequestDetails?.statusName
        ?? status
    ) || 'N/A';
  }

  toggleFilters(): void {
    this.filterOpen = !this.filterOpen;
  }

  clearFilters(): void {
    this.filterText = '';
    this.filterStatus = '';
    this.selectedTemplateFieldIds = [];
    this.columnMenuOpen = false;
    this.currentPage = 0;
  }

  get filteredRequests(): any[] {
    const search = this.filterText.trim().toLowerCase();
    const status = this.filterStatus.trim().toLowerCase();
    return this.requests.filter((item: any) => {
      const searchable = [
        item?.ritmNumber,
        item?.requestNumber,
        item?.requestedBy?.agentName,
        item?.requestedByName,
        item?.shortDescription,
        item?.description,
        item?.priority?.code,
        item?.priorityName,
          this.getStatusCode(item?.status)
      ].filter(Boolean).join(' ').toLowerCase();
        const itemStatus = this.getStatusCode(item?.status || 'Open').toLowerCase();
      return (!search || searchable.includes(search)) && (!status || itemStatus === status);
    });
  }

  getAvailableDrawerDetails(): Array<{ label: string; value: string }> {
    const fields = [
      ['Requested For', 'requestedFor.agentName', 'requestedForName', 'requestedFor'],
      ['Requested By', 'requestedBy.agentName', 'requestedByName', 'openedByName', 'openedBy'],
      ['Assigned To', 'assignedTo.agentName', 'assignedToName', 'assignedTo'],
      ['Priority', 'priority.code', 'priorityName', 'priority'],
      ['Category', 'category.categoryName', 'categoryName', 'category'],
      ['Sub Category', 'subCategory.subCategoryName', 'subCategoryName', 'subCategory'],
      ['Support Group', 'supportGroup.groupName', 'assignmentGroupName', 'assignmentGroup'],
      ['Requested On', 'requestedOn', 'requestedAt', 'createdAt'],
      ['Updated On', 'updatedAt', 'modifiedOn']
    ];
    return fields.map(([label, ...paths]) => ({ label, value: this.getDrawerFieldValue(...paths) }))
      .filter((field) => field.value !== 'N/A');
  }

  getDrawerTemplateFields(): any[] {
    const details = this.selectedRequestDetails?.templateDetails ?? this.selectedRequestDetails?.templateFields ?? [];
    return this.normalizeList(details)
      .flatMap((item: any) => this.normalizeList(item?.templateDetails ?? item?.details ?? item))
      .filter((field: any) => field?.value !== null && field?.value !== undefined && field?.value !== '' || field?.fieldValue !== null && field?.fieldValue !== undefined && field?.fieldValue !== '');
  }

  getDrawerWatchlist(): any[] {
    return this.normalizeList(this.selectedRequestDetails?.watchlist ?? this.selectedRequestDetails?.watchList ?? this.selectedRequestDetails?.watchers);
  }

  getDrawerWatcherLabel(item: any): string {
    const watcher = item?.watchedBy ?? item?.watcher ?? item;
    return typeof watcher === 'object'
      ? watcher?.agentName || watcher?.name || watcher?.userName || watcher?.accessId || 'User'
      : String(watcher || 'User');
  }

  getDrawerAttachments(): any[] {
    return this.normalizeList(this.selectedRequestDetails?.ritmAttachments ?? this.selectedRequestDetails?.attachments ?? this.selectedRequestDetails?.files);
  }

  getDrawerAttachmentName(item: any): string {
    return item?.originalFileName || item?.fileName || item?.name || 'Attachment';
  }

  getDrawerAttachmentType(item: any): string {
    return String(item?.mimeType || item?.contentType || item?.type || 'FILE').toUpperCase();
  }

  getDrawerCommentAuthor(item: any): string {
    const author = item?.createdBy;
    const explicitName = item?.createdByName || item?.userName || item?.authorName;
    return this.resolveAgentName(author, explicitName);
  }

  getDrawerDate(value: any): string {
    if (!value) {
      return 'Recent';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  getHistoryDetails(entry: any): any[] {
    const details = entry?.auditDetails ?? entry?.details ?? entry?.changes ?? [];
    return Array.isArray(details) ? details : details ? [details] : [];
  }

  getHistoryTitle(entry: any): string {
    const description = String(entry?.description || '').trim();
    if (description) {
      return description.replace(/RITM\s+/gi, '').replace(/successfully/gi, '').trim();
    }

    const action = String(entry?.actionType || entry?.type || '').toUpperCase();
    const labels: Record<string, string> = {
      CREATE: 'RITM created',
      UPDATE: 'RITM updated',
      COMMENT_CREATE: 'Comment added',
      COMMENT_UPDATE: 'Comment updated',
      STATUS_CHANGE: 'Status changed',
      PRIORITY_CHANGE: 'Priority changed',
      GROUP_CHANGE: 'Assignment group changed',
      DELETE: 'RITM deleted'
    };
    return labels[action] || 'System update';
  }

  getHistoryActor(entry: any): string {
    const actor = entry?.changedBy ?? entry?.updatedBy ?? entry?.createdBy;
    const explicitName = entry?.changedByName || entry?.updatedByName || entry?.createdByName;
    return this.resolveAgentName(actor, explicitName, 'System');
  }

  private resolveAgentName(value: any, explicitName = '', fallback = 'User'): string {
    if (value && typeof value === 'object') {
      const agentId = Number(value.agentId ?? value.id ?? value.userId ?? 0);
      return (agentId > 0 ? this.agentNameMap.get(agentId) : '')
        || value.agentName
        || value.name
        || value.userName
        || value.fullName
        || explicitName
        || fallback;
    }

    const numericId = Number(value);
    if (Number.isFinite(numericId) && numericId > 0) {
      return this.agentNameMap.get(numericId) || `Agent ${numericId}`;
    }

    return String(explicitName || value || fallback);
  }

  getHistoryDetailValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (typeof value === 'object') {
      return value.agentName || value.name || value.label || value.value || JSON.stringify(value);
    }
    return String(value);
  }

  getHistoryDate(entry: any): string {
    const value = entry?.changedAt || entry?.updatedAt || entry?.createdAt;
    if (!value) {
      return 'Recent';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getHistoryTime(entry: any): string {
    const value = entry?.changedAt || entry?.updatedAt || entry?.createdAt;
    if (!value) {
      return 'Now';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase();
  }

  getHistoryIconClass(entry: any): string {
    const action = String(entry?.actionType || entry?.type || '').toUpperCase();
    if (action.includes('COMMENT')) { return 'icon-blue'; }
    if (action.includes('STATUS') || action.includes('CREATE')) { return 'icon-green'; }
    if (action.includes('PRIORITY') || action.includes('UPDATE')) { return 'icon-orange'; }
    if (action.includes('GROUP')) { return 'icon-purple'; }
    return 'icon-gray';
  }

  getHistoryIcon(entry: any): string {
    const action = String(entry?.actionType || entry?.type || '').toUpperCase();
    if (action.includes('COMMENT')) { return 'chat'; }
    if (action.includes('STATUS')) { return 'timeline'; }
    if (action.includes('PRIORITY')) { return 'priority_high'; }
    if (action.includes('GROUP')) { return 'groups'; }
    if (action.includes('CREATE')) { return 'add'; }
    return 'edit';
  }

  getAssignedAgentName(item: any): string {
    if (!item) {
      return '';
    }

    return item?.assignedTo?.agentName || item?.assignedToName || item?.assignedAgent?.agentName || 'Not assigned';
  }

  loadSupportGroupUsers(): void {
    if (!this.agentId || !this.orgId) {
      this.users = [];
      this.supportGroupIds = [];
      this.supportGroups = [];
      return;
    }

    this.usersLoading = true;
    this.supportGroupService.getSupportGroupIdsForAgent(this.agentId, this.orgId).subscribe({
      next: (groupIds) => {
        this.supportGroupIds = Array.isArray(groupIds) ? groupIds : [];

        if (!this.supportGroupIds.length) {
          this.users = [];
          this.supportGroups = [];
          this.usersLoading = false;
          return;
        }
        this.loadSupportGroupSummaries();
        this.usersLoading = false;
      },
      error: () => {
        this.users = [];
        this.supportGroupIds = [];
        this.usersLoading = false;
      }
    });
  }

  private loadSupportGroupSummaries(): void {
    this.groupLoading = true;
    forkJoin(this.supportGroupIds.map(supportGroupId => this.supportGroupService.getSupportGroupInfo(supportGroupId))).subscribe({
      next: (responses) => {
        this.supportGroups = this.supportGroupIds.map((supportGroupId, index) => {
          const payload = responses[index]?.attributes ?? responses[index] ?? {};
          const group = Array.isArray(payload) ? payload[0] : payload;
          return {
            supportGroupId,
            groupName: group?.supportGroupName || group?.groupName || `Support group ${supportGroupId}`,
            users: this.normalizeUsers(group?.agents || []),
            unassignedRequests: [],
            requests: [],
            totalCountRitm: Number(group?.totalCountRitm || 0),
            unassignedRitmCount: Number(group?.unassignedRitmCount || 0),
            statusCounts: this.normalizeStatusCounts(group?.statusCounts),
            trendData: this.normalizeTrendData(group?.ritmTrend ?? group?.trendData ?? group?.trend ?? group?.requests)
          };
        });
        this.loadFirstSupportGroup();
      },
      error: () => {
        this.supportGroups = this.supportGroupIds.map(supportGroupId => ({ supportGroupId, groupName: `Support group ${supportGroupId}`, users: [], unassignedRequests: [], requests: [], totalCountRitm: 0, unassignedRitmCount: 0, statusCounts: [], trendData: [] }));
        this.loadFirstSupportGroup();
      }
    });
  }

  private loadFirstSupportGroup(): void {
    this.groupLoading = false;
    const firstGroup = this.supportGroups[0];
    if (firstGroup) {
      this.selectSupportGroup(firstGroup);
    }
  }

  selectSupportGroup(group: SupportGroupSummary): void {
    this.selectedSupportGroupId = group.supportGroupId;
    this.ritmStatuses = group.statusCounts || [];
    this.ritmTrend = group.trendData || [];
    this.selectedAgentId = null;
    this.selectedAgentName = 'All agents';
    this.expandedAgentId = null;
    this.agentSearch = '';
    this.agentPageIndex = 0;
    this.selectedRequest = null;
    this.users = group.users;
    this.supportGroupRequests = [];
    this.requests = [];
    this.totalRecords = 0;
    this.currentPage = 0;
  }

  refreshSupportGroup(): void {
    if (this.selectedSupportGroupId) {
      this.loadSupportGroupSummaries();
    }
  }

  getSelectedSupportGroup(): SupportGroupSummary | null {
    return this.supportGroups.find(group => group.supportGroupId === this.selectedSupportGroupId) || null;
  }

  getFilteredSupportGroups(): SupportGroupSummary[] {
    const query = this.supportGroupSearch.trim().toLowerCase();
    if (!query) {
      return this.supportGroups;
    }
    return this.supportGroups.filter(group => group.groupName.toLowerCase().includes(query));
  }

  getFilteredUsers(): GroupRitmUser[] {
    const query = this.agentSearch.trim().toLowerCase();
    if (!query) {
      return this.users;
    }
    return this.users.filter(user => this.displayAgentName(user).toLowerCase().includes(query)
      || String(user.email || '').toLowerCase().includes(query));
  }

  getPaginatedUsers(): GroupRitmUser[] {
    const startIndex = this.agentPageIndex * this.agentPageSize;
    return this.getFilteredUsers().slice(startIndex, startIndex + this.agentPageSize);
  }

  onAgentPageChange(event: PageEvent): void {
    this.agentPageIndex = event.pageIndex;
    this.agentPageSize = event.pageSize;
  }

  toggleAgent(agent: GroupRitmUser): void {
    const agentId = Number(agent?.agent?.agentId ?? agent?.userId ?? 0);
    this.expandedAgentId = this.expandedAgentId === agentId ? null : agentId;
    if (this.expandedAgentId) {
      this.selectAgent(agent);
    } else {
      this.requests = this.supportGroupRequests;
      this.selectedAgentId = null;
      this.selectedAgentName = 'All agents';
    }
  }

  expandUnassigned(): void {
    const group = this.getSelectedSupportGroup();
    if (!group) {
      return;
    }
    this.expandedAgentId = 'unassigned';
    this.selectedAgentId = null;
    this.selectedAgentName = 'Not assigned';
    this.selectedRequest = null;
    this.requestsLoading = true;
    this.requests = [];
    this.totalRecords = 0;
    this.currentPage = 0;

    this.supportGroupService.getUnassignedRequestsForSupportGroup(group.supportGroupId).subscribe({
      next: (items) => {
        this.requests = items || [];
        this.totalRecords = this.requests.length;
        this.currentPage = 0;
        this.requestsLoading = false;
      },
      error: () => {
        this.requests = [];
        this.totalRecords = 0;
        this.currentPage = 0;
        this.requestsLoading = false;
      }
    });
  }

  collapseExpandedAgent(): void {
    this.expandedAgentId = null;
    this.selectedAgentId = null;
    this.selectedAgentName = 'All agents';
    this.requests = this.supportGroupRequests;
    this.totalRecords = this.requests.length;
    this.currentPage = 0;
  }

  returnToAgentList(): void {
    this.collapseExpandedAgent();
    this.refreshSupportGroup();
  }

  getUnassignedRequestCount(): number {
    return this.getSelectedSupportGroup()?.unassignedRitmCount || 0;
  }

  getStatusCount(status: any): number {
    return Number(status?.ritmCount || 0);
  }

  selectStatus(status: GroupRitmStatusCountInfo): void {
    const group = this.getSelectedSupportGroup();
    if (!group) {
      return;
    }

    this.expandedAgentId = 'status';
    this.selectedAgentId = null;
    this.selectedAgentName = status.statusCode;
    this.selectedRequest = null;
    this.filterText = '';
    this.filterStatus = '';
    this.currentPage = 0;
    this.requests = [];
    this.totalRecords = 0;
    this.requestsLoading = true;

    this.supportGroupService.getRequestsByStatus(status.statusId, group.supportGroupId).subscribe({
      next: (items) => {
        this.requests = items || [];
        this.totalRecords = this.requests.length;
        this.requestsLoading = false;
      },
      error: () => {
        this.requests = [];
        this.totalRecords = 0;
        this.requestsLoading = false;
      }
    });
  }

  getTotalStatusCount(): number {
    return this.getSelectedSupportGroup()?.totalCountRitm || 0;
  }

  getAgentRequestCount(agent: GroupRitmUser): number {
    return Number((agent as any)?.ritmCount || 0);
  }

  refreshSelectedAgentRequests(): void {
    if (!this.selectedAgentId) {
      return;
    }

    this.requestsLoading = true;
    this.supportGroupService.getAssignedRequestsForAgent(this.selectedAgentId).subscribe({
      next: (items) => {
        this.requests = items || [];
        this.totalRecords = this.requests.length;
        this.currentPage = 0;
        this.requestsLoading = false;
      },
      error: () => {
        this.requests = [];
        this.totalRecords = 0;
        this.currentPage = 0;
        this.requestsLoading = false;
      }
    });
  }

  selectAgent(agent: GroupRitmUser): void {
    const agentId = agent?.agent?.agentId ?? agent?.userId ?? null;
    const agentName = this.displayAgentName(agent);

    this.selectedAgentId = agentId;
    this.selectedAgentName = agentName;
    this.selectedRequest = null;
    this.assignmentSuggestions = [];
    this.assignSearch = '';
    this.requestsLoading = true;

    if (!agentId) {
      this.requests = [];
      this.requestsLoading = false;
      return;
    }

    this.supportGroupService.getAssignedRequestsForAgent(agentId).subscribe({
      next: (items) => { 
        this.requests = items || [];
        this.totalRecords = this.requests.length;
        this.currentPage = 0;
        this.requestsLoading = false;
      },
      error: () => {
        this.requests = [];
        this.totalRecords = 0;
        this.currentPage = 0;
        this.requestsLoading = false;
      }
    });
  }

  normalizeUsers(agents: any[]): GroupRitmUser[] {
    if (!Array.isArray(agents)) {
      return [];
    }

    return agents
      .filter((agent) => agent && (agent.agentId))
      .map((agent) => ({
        ...agent,
        userId: agent.agentId ?? agent.agentId ?? null,
        agent: agent.agent ?? {
          agentId: agent.agentId,
          agentName: agent.agentName || 'Agent'
        }
      }));
  }

  displayAgentName(user: GroupRitmUser): string {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return user?.agent?.agentName || fullName || user?.userName || 'Unknown Agent';
  }

  getPaginatedRequests(): any[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.filteredRequests.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  back(): void {
    this.router.navigate(['/settings']);
  }
}
