import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AgentService } from '../../service/agent.service';
import { RitmService } from '../../service/ritm.service';
import { SupportGroupService } from '../../service/support-group.service';

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

  constructor(
    private ritmService: RitmService,
    private supportGroupService: SupportGroupService,
    private agentService: AgentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userId = Number(localStorage.getItem('userId') || 0);
    this.orgId = Number(localStorage.getItem('userOrgId') || 0) || null;

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

  get currentList(): any[] {
    if (this.subTab === 'incident') {
      return this.incidentList;
    }
    if (this.subTab === 'others') {
      return this.otherList;
    }
    return this.ritmList;
  }

  setPrimaryTab(tab: PrimaryTab): void {
    this.primaryTab = tab;
    this.subTab = 'ritm';
    this.loadRitmData();
  }

  setSubTab(tab: SubTab): void {
    this.subTab = tab;
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
      },
      error: () => {
        this.ritmList = [];
      }
    });
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
    return item?.status || item?.requestStatus || item?.state || 'Open';
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
}
