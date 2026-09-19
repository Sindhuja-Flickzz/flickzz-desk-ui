import { Component, HostListener, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AgentService } from '../../service/agent.service';
import { RitmService } from '../../service/ritm.service';
import { SupportGroupService } from '../../service/support-group.service';
import { VariantService } from '../../service/variant.service';

type PrimaryTab = 'opened-by-me' | 'assigned-to-me';
type SubTab = 'ritm' | 'incident' | 'others';

@Component({
  selector: 'app-my-tickets',
  templateUrl: './my-tickets.component.html',
  styleUrls: ['./my-tickets.component.scss']
})
export class MyTicketsComponent implements OnInit {
  primaryTab: PrimaryTab = 'opened-by-me';
  subTab: SubTab = 'ritm';
  loading = false;

  agentId: number | null = null;
  orgId: number | null = null;
  supportGroupIds: number[] = [];

  ritmList: any[] = [];
  incidentList: any[] = [];
  otherList: any[] = [];
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;
  filterOpen = false;
  filterText = '';
  filterStatus = '';
  ritmStatuses: any[] = [];
  templateFields: any[] = [];
  selectedTemplateFieldIds: string[] = [];
  columnMenuOpen = false;

  constructor(
    private ritmService: RitmService,
    private supportGroupService: SupportGroupService,
    private agentService: AgentService,
    private variantService: VariantService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userId = Number(localStorage.getItem('userId') || 0);
    this.orgId = Number(localStorage.getItem('userOrgId') || 0) || null;
    this.loadRitmStatuses();
    this.loadTemplateFields();

    if (userId) {
      this.loadAgentId(userId);
      return;
    }

    this.agentId = null;
    this.loadSupportGroups();
    this.loadRitmData();
  }

  loadAgentId(userId: number): void {
    this.agentService.getAgentIdByUserId(userId).subscribe({
      next: (agentId) => {
        this.agentId = Number(agentId) || null;
        this.loadSupportGroups();
        this.loadRitmData();
      },
      error: () => {
        this.agentId = null;
        this.loadSupportGroups();
        this.loadRitmData();
      }
    });
  }

  @HostListener('document:click', ['$event'])
  closeColumnMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (this.columnMenuOpen && !target?.closest('.column-picker')) {
      this.columnMenuOpen = false;
    }
  }

  get currentList(): any[] {
    let items: any[];
    if (this.subTab === 'incident') {
      items = this.incidentList;
    } else if (this.subTab === 'others') {
      items = this.otherList;
    } else {
      items = this.ritmList;
    }
    return this.applyFilters(items);
  }

  setPrimaryTab(tab: PrimaryTab): void {
    this.primaryTab = tab;
    this.subTab = 'ritm';
    this.resetPagination();
    this.loadRitmData();
  }

  toggleFilters(): void {
    this.filterOpen = !this.filterOpen;
  }

  clearFilters(): void {
    this.filterText = '';
    this.filterStatus = '';
    this.selectedTemplateFieldIds = [];
    this.columnMenuOpen = false;
    this.resetPagination();
  }

  toggleColumnMenu(): void {
    this.columnMenuOpen = !this.columnMenuOpen;
  }

  toggleTemplateField(fieldId: string): void {
    this.selectedTemplateFieldIds = this.selectedTemplateFieldIds.includes(fieldId)
      ? this.selectedTemplateFieldIds.filter(id => id !== fieldId)
      : [...this.selectedTemplateFieldIds, fieldId];
    this.resetPagination();
  }

  setSubTab(tab: SubTab): void {
    this.subTab = tab;
    this.resetPagination();
    if (tab !== 'ritm') {
      return;
    }

    this.loadRitmData();
  }

  loadSupportGroups(): void {
    if (!this.agentId || !this.orgId) {
      this.supportGroupIds = [];
      return;
    }

    this.supportGroupService.getSupportGroupIdsForAgent(this.agentId, this.orgId).subscribe({
      next: (ids) => {
        this.supportGroupIds = Array.isArray(ids) ? ids : [];
      },
      error: () => {
        this.supportGroupIds = [];
      }
    });
  }

  loadRitmData(): void {
    if (this.subTab !== 'ritm') {
      return;
    }

    this.loading = true;
    const request$ = this.primaryTab === 'opened-by-me'
      ? this.ritmService.getRequestedByMe(this.agentId)
      : this.ritmService.getAssignedToMe(this.agentId);

    request$.pipe(finalize(() => this.loading = false)).subscribe({
      next: (items) => {
        this.ritmList = this.normalizeList(items);
        this.totalRecords = this.ritmList.length;
        this.currentPage = 0;
      },
      error: () => {
        this.ritmList = [];
        this.totalRecords = 0;
        this.currentPage = 0;
      }
    });
  }

  resetPagination(): void {
    this.currentPage = 0;
    this.totalRecords = this.currentList.length;
  }

  private loadRitmStatuses(): void {
    this.ritmService.getRitmStatuses(String(this.orgId || 0)).subscribe({
      next: response => this.ritmStatuses = this.normalizeList(response?.attributes ?? response),
      error: () => this.ritmStatuses = []
    });
  }

  private loadTemplateFields(): void {
    this.variantService.getRitmTemplateDetails(String(this.orgId || 0)).subscribe({
      next: response => {
        const fields = this.flattenTemplateFields(response?.attributes ?? response ?? []);
        const seen = new Set<string>();
        this.templateFields = fields.filter(field => {
          const key = this.getTemplateFieldKey(field);
          if (!key || seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      },
      error: () => this.templateFields = []
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
    return nested !== undefined
      ? this.flattenTemplateFields(nested)
      : (value.fieldId != null || value.fieldName != null || value.name != null ? [value] : []);
  }

  getTemplateFieldKey(field: any): string {
    return String(field?.fieldId ?? field?.fieldName ?? field?.name ?? '').trim();
  }

  getSelectedTemplateFields(): any[] {
    return this.selectedTemplateFieldIds
      .map(fieldId => this.templateFields.find(field => this.getTemplateFieldKey(field) === fieldId))
      .filter(Boolean);
  }

  getDynamicFieldValue(item: any, fieldId: string): string {
    const selectedField = this.templateFields.find(field => this.getTemplateFieldKey(field) === fieldId);
    const fields = this.flattenTemplateFields(item?.templateDetails ?? item?.templateFields ?? []);
    const value = fields.find(field =>
      (selectedField?.fieldId != null && String(field?.fieldId) === String(selectedField.fieldId))
      || String(field?.fieldName ?? field?.name ?? '').trim().toLowerCase() === String(selectedField?.fieldName ?? selectedField?.name ?? '').trim().toLowerCase()
    );
    const fieldValue = value?.value ?? value?.fieldValue;
    return fieldValue === null || fieldValue === undefined || fieldValue === '' ? '—' : String(fieldValue);
  }

  getTicketGridTemplate(): string {
    const dynamicColumns = this.selectedTemplateFieldIds.map(() => '1.2fr').join(' ');
    return `1.05fr 1.25fr 1fr 1.65fr .95fr${dynamicColumns ? ' ' + dynamicColumns : ''}`;
  }

  getStatusCode(status: any): string {
    return String(status && typeof status === 'object'
      ? status.statusCode ?? status.statusName ?? status.name ?? status.statusId
      : status ?? '').trim();
  }

  private applyFilters(items: any[]): any[] {
    const text = this.filterText.trim().toLowerCase();
    const status = this.filterStatus.trim().toLowerCase();
    return items.filter(item => {
      const searchable = [this.getRequestNumber(item), this.getTitle(item), this.getRequestedBy(item), this.getAssignee(item), this.getPriority(item), this.getStatusCode(item?.status)]
        .filter(Boolean).join(' ').toLowerCase();
      const itemStatus = this.getStatusCode(item?.status || 'Open').toLowerCase();
      return (!text || searchable.includes(text)) && (!status || itemStatus === status);
    });
  }

  getPaginatedTickets(): any[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.currentList.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  normalizeList(items: any): any[] {
    if (Array.isArray(items)) {
      return items;
    }

    if (Array.isArray(items?.attributes)) {
      return items.attributes;
    }

    if (Array.isArray(items?.data)) {
      return items.data;
    }

    if (Array.isArray(items?.result)) {
      return items.result;
    }

    return [];
  }

  getPrimaryLabel(): string {
    return this.primaryTab === 'opened-by-me' ? 'Opened by me' : 'Assigned to me';
  }

  getRequestNumber(item: any): string {
    return item?.ritmNumber || item?.requestNumber || item?.requestId || item?.id || 'N/A';
  }

  getTitle(item: any): string {
    return item?.shortDescription || item?.description || item?.title || 'No title';
  }

  getStatus(item: any): string {
    return item?.status?.statusCode;
  }

  getPriority(item: any): string {
    return item?.priority.code;
  }

  getRequestedBy(item: any): string {
    return item?.requestedBy.agentName;
  }

  getAssignee(item: any): string {
    return item?.assignedTo?.agentName || 'Yet to be assigned';
  }

  openTicket(item: any): void {
    const ritmId = item?.ritmId || item?.id || item?.requestId || item?.ritmNumber || item?.requestNumber;
    const requestType = this.primaryTab === 'opened-by-me' ? 'requestedByMe' : 'assignedToMe';
    if (!ritmId) {
      return;
    }

    this.router.navigate(['/agent', this.agentId || 0, requestType], {
      queryParams: { ritmId: String(ritmId) }
    });
  }

  back(): void {
    this.router.navigate(['/settings']);
  }
}
