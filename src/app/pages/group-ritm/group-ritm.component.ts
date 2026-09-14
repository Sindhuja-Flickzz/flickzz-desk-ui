import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AgentService } from '../../service/agent.service';
import { SupportGroupService } from '../../service/support-group.service';

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
  selectedAgentId: number | null = null;
  selectedAgentName = 'Unassigned';
  requests: any[] = [];
  selectedRequest: any = null;
  assignmentSuggestions: any[] = [];
  assignSearch = '';
  usersLoading = false;
  requestsLoading = false;

  constructor(
    private router: Router,
    private agentService: AgentService,
    private supportGroupService: SupportGroupService
  ) {}

  ngOnInit(): void {
    this.orgId = Number(localStorage.getItem('userOrgId') || 0);
    const userId = Number(localStorage.getItem('userId') || 0);

    if (!userId) {
      this.users = [];
      this.supportGroupIds = [];
      this.loadNotAssignedRequests();
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

  resetSelection(): void {
    this.selectedAgentId = null;
    this.selectedAgentName = 'Unassigned';
    this.requests = [];
    this.selectedRequest = null;
    this.assignmentSuggestions = [];
    this.assignSearch = '';
  }

  selectRequest(item: any): void {
    this.selectedRequest = item;
    this.assignSearch = this.getAssignedAgentName(item);
    const supportGroupId = this.getSupportGroupId(item);
    this.loadAssignmentSuggestions(supportGroupId);
  }

  getSupportGroupId(item: any): number | null {
    const value = item?.supportGroupId ?? item?.supportGroup?.supportGroupId ?? item?.supportGroup?.id ?? item?.supportGroup?.supportGroupId ?? null;
    return value != null ? Number(value) : null;
  }

  loadAssignmentSuggestions(supportGroupId: number | null): void {
    if (!supportGroupId) {
      this.assignmentSuggestions = [];
      return;
    }

    this.supportGroupService.getSupportGroupUsers([supportGroupId]).subscribe({
      next: (users) => {
        this.assignmentSuggestions = this.normalizeAssignmentSuggestions(users);
      },
      error: () => {
        this.assignmentSuggestions = [];
      }
    });
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
        name: user.agentName || user.userName || user.agent?.agentName || user.firstName || user.lastName || 'Agent'
      }));
  }

  filteredAssignmentSuggestions(): any[] {
    const term = (this.assignSearch || '').trim().toLowerCase();
    if (!term) {
      return this.assignmentSuggestions;
    }

    return this.assignmentSuggestions.filter((agent) => {
      const label = `${agent.agentName || agent.name || ''}`.toLowerCase();
      return label.includes(term);
    });
  }

  selectAssignmentSuggestion(agent: any): void {
    const name = agent?.agentName || agent?.name || 'Agent';
    this.assignSearch = name;
    if (this.selectedRequest) {
      this.selectedRequest.assignedTo = { agentName: name, agentId: agent?.agentId ?? null };
    }
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
      this.loadNotAssignedRequests();
      return;
    }

    this.usersLoading = true;
    this.supportGroupService.getSupportGroupIdsForAgent(this.agentId, this.orgId).subscribe({
      next: (groupIds) => {
        this.supportGroupIds = Array.isArray(groupIds) ? groupIds : [];

        if (!this.supportGroupIds.length) {
          this.users = [];
          this.usersLoading = false;
          this.loadNotAssignedRequests();
          return;
        }

        this.supportGroupService.getSupportGroupUsers(this.supportGroupIds).subscribe({
          next: (agents) => {
            this.users = this.normalizeUsers(agents);
            this.usersLoading = false;
            this.loadNotAssignedRequests();
          },
          error: () => {
            this.users = [];
            this.usersLoading = false;
            this.loadNotAssignedRequests();
          }
        });
      },
      error: () => {
        this.users = [];
        this.supportGroupIds = [];
        this.usersLoading = false;
        this.loadNotAssignedRequests();
      }
    });
  }

  loadNotAssignedRequests(): void {
    this.requestsLoading = true;

    if (!this.supportGroupIds.length) {
      this.requests = [];
      this.requestsLoading = false;
      return;
    }

    this.supportGroupService.getUnassignedRequestsForSupportGroups(this.supportGroupIds).subscribe({
      next: (items) => { 
        this.requests = items || [];
        this.requestsLoading = false;
      },
      error: () => {
        this.requests = [];
        this.requestsLoading = false;
      }
    });
  }

  selectUnassigned(): void {
    this.selectedAgentId = null;
    this.selectedAgentName = 'Unassigned';
    this.selectedRequest = null;
    this.assignmentSuggestions = [];
    this.assignSearch = '';
    this.requestsLoading = true;

    if (!this.supportGroupIds.length) {
      this.requests = [];
      this.requestsLoading = false;
      return;
    }

    this.supportGroupService.getUnassignedRequestsForSupportGroups(this.supportGroupIds).subscribe({
      next: (items) => {
        this.requests = items || [];
        this.requestsLoading = false;
      },
      error: () => {
        this.requests = [];
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
        this.requestsLoading = false;
      },
      error: () => {
        this.requests = [];
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

  back(): void {
    this.router.navigate(['/home']);
  }
}
