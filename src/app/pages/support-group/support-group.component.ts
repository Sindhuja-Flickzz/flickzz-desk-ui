import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { SupportGroupService } from '../../service/support-group.service';
import { AgentService } from '../../service/agent.service';
import { USER_ROLES } from '../../data/app_constants';

interface AgentSuggestion {
  agentId: number;
  agentName: string;
  accessId?: string;
  mailId?: string;
}

@Component({
  selector: 'app-support-group',
  templateUrl: './support-group.component.html',
  styleUrls: ['./support-group.component.scss']
})
export class SupportGroupComponent implements OnInit {
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Support Group';
  supportGroupForm: FormGroup;
  supportGroups: any[] = [];
  filteredSupportGroups: any[] = [];
  searchValue = '';
  loading = false;
  isSubmitting = false;
  formError: Record<string, string> = {};
  submitSuccess = '';
  submitError = '';
  isEditMode = false;
  editingSupportGroupId: number | null = null;
  selectionMode: 'internal' | 'bp' = 'internal';
  selectedContextOrgId = Number(localStorage.getItem('userOrgId') || 0);
  businessPartnerId: number | null = null;
  businessPartnerName: string | null = null;
  contextLabel = 'Using your organization configuration';
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  agentSearchValue = '';
  agentSuggestions: AgentSuggestion[] = [];
  selectedAgents: AgentSuggestion[] = [];

  constructor(
    private fb: FormBuilder,
    private supportGroupService: SupportGroupService,
    private agentService: AgentService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private location: Location
  ) {
    this.supportGroupForm = this.fb.group({
      supportGroupId: [null],
      groupName: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      const orgId = params.get('orgId');
      const bpId = params.get('businessPartnerId');
      const bpName = params.get('companyName');
      this.selectionMode = mode === 'bp' ? 'bp' : 'internal';
      this.selectedContextOrgId = orgId ? Number(orgId) : Number(localStorage.getItem('userOrgId') || 0);
      this.businessPartnerId = bpId ? Number(bpId) : null;
      this.businessPartnerName = bpName || null;
      this.contextLabel = this.selectionMode === 'bp'
        ? `Using business partner configuration for ${this.businessPartnerName || this.businessPartnerId}`
        : 'Using your organization configuration';
    });
  }

  backToPrevious(): void {
    this.location.back();
  }

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    if (tab === 'create') {
      if (!this.isEditMode) {
        this.resetForm();
      }
      this.pageTitle = this.isEditMode ? 'Edit Support Group' : 'Create Support Group';
      return;
    }

    this.isEditMode = false;
    this.editingSupportGroupId = null;
    this.pageTitle = 'Create Support Group';
    this.resetForm();
    this.loadSupportGroups();
  }

  resetForm(): void {
    this.isEditMode = false;
    this.editingSupportGroupId = null;
    this.pageTitle = 'Create Support Group';
    this.supportGroupForm.reset({
      supportGroupId: null,
      groupName: ''
    });
    this.agentSearchValue = '';
    this.agentSuggestions = [];
    this.selectedAgents = [];
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'list';
  }

  onAgentSearch(): void {
    const value = (this.agentSearchValue || '').trim();
    if (!value) {
      this.agentSuggestions = [];
      return;
    }

    const orgId = this.selectedContextOrgId || Number(localStorage.getItem('userOrgId') || 0);
    if (!orgId) {
      this.agentSuggestions = [];
      return;
    }

    this.agentService.getAgentList(String(orgId)).subscribe({
      next: (response) => {
        const agents = (response as any)?.attributes || response || [];
        const normalized = agents.map((agent: any) => ({
          agentId: agent.agentId ?? agent.id,
          agentName: agent.agentName || agent.name || '',
          accessId: agent.accessId || '',
          mailId: agent.mailId || agent.email || ''
        })).filter((agent: AgentSuggestion) => agent.agentId && agent.agentName);

        const query = value.toLowerCase();
        this.agentSuggestions = normalized.filter((agent: AgentSuggestion) => {
          const haystack = `${agent.agentName} ${agent.accessId || ''} ${agent.mailId || ''}`.toLowerCase();
          return haystack.includes(query);
        }).slice(0, 8);
      },
      error: () => {
        this.agentSuggestions = [];
      }
    });
  }

  addSelectedAgent(agent: AgentSuggestion): void {
    const existsById = agent?.agentId != null && this.selectedAgents.some((item) => item.agentId === agent.agentId);
    const name = (agent.agentName || '').trim().toLowerCase();
    const existsByName = name && this.selectedAgents.some((item) => (item.agentName || '').trim().toLowerCase() === name);

    if (existsById || existsByName) {
      this.agentSearchValue = '';
      this.agentSuggestions = [];
      return;
    }

    this.selectedAgents.push(agent);
    this.agentSearchValue = '';
    this.agentSuggestions = [];
  }

  removeSelectedAgent(agentId: number): void {
    this.selectedAgents = this.selectedAgents.filter((agent) => agent.agentId !== agentId);
  }

  startEdit(group: any): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    this.isEditMode = true;
    this.editingSupportGroupId = group.supportGroupId ?? group.id ?? null;
    this.pageTitle = 'Edit Support Group';
    this.activeTab = 'create';
    this.supportGroupForm.patchValue({
      supportGroupId: group.supportGroupId ?? group.id ?? null,
      groupName: group.groupName || group.supportGroupName || ''
    });
    const members = group.agents || group.agentDetails || group.members || [];
    if (members.length > 0 && typeof members[0] === 'number') {
      this.fetchAgentsByIds(members as number[]);
    } else {
      this.selectedAgents = this.normalizeAgents(members);
    }
  }

  fetchAgentsByIds(ids: number[]): void {
    const orgId = this.selectedContextOrgId || Number(localStorage.getItem('userOrgId') || 0);
    if (!orgId || !ids || ids.length === 0) {
      this.selectedAgents = ids.map((id) => ({ agentId: id, agentName: '' } as AgentSuggestion));
      return;
    }

    this.agentService.getAgentList(String(orgId)).subscribe({
      next: (response) => {
        const agents = (response as any)?.attributes || response || [];
        const normalized = agents.map((agent: any) => ({
          agentId: agent.agentId ?? agent.id,
          agentName: agent.agentName || agent.name || '',
          accessId: agent.accessId || '',
          mailId: agent.mailId || agent.email || ''
        })).filter((a: AgentSuggestion) => a.agentId);

        this.selectedAgents = ids.map((id) => normalized.find((a: AgentSuggestion) => a.agentId === id) || ({ agentId: id, agentName: '' } as AgentSuggestion));
      },
      error: () => {
        this.selectedAgents = ids.map((id) => ({ agentId: id, agentName: '' } as AgentSuggestion));
      }
    });
  }

  onSave(): void {
    this.isSubmitting = true;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    const groupName = (this.supportGroupForm.get('groupName')?.value || '').trim();
    if (!groupName) {
      this.formError['groupName'] = 'Group name is required.';
    }

    if (!this.selectedAgents.length) {
      this.formError['agents'] = 'Please add at least one agent.';
    }

    if (Object.keys(this.formError).length > 0) {
      this.isSubmitting = false;
      return;
    }

    const payload: any = {
      supportGroupId: this.editingSupportGroupId,
      groupName,
      agents: this.selectedAgents.map((agent) => agent.agentId),
      businessPartnerId: this.businessPartnerId ?? this.selectedContextOrgId,
      createdBy: Number(localStorage.getItem('userId') || 0),
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isActive: true,
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };

    const request$ = this.isEditMode && this.editingSupportGroupId
      ? this.supportGroupService.updateSupportGroup(payload)
      : this.supportGroupService.createSupportGroup(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = this.isEditMode ? 'Support group updated successfully.' : 'Support group created successfully.';
        setTimeout(() => {
          this.loadSupportGroups();
          this.resetForm();
          this.activeTab = 'list';
        }, 1000);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(this.isEditMode ? 'Update support group error' : 'Create support group error', err);
        this.submitError = err.error?.description || err.error?.message || (this.isEditMode ? 'Failed to update support group.' : 'Failed to create support group.');
      }
    });
  }

  loadSupportGroups(): void {
    this.loading = true;
    this.supportGroupService.getAllSupportGroups(this.businessPartnerId).subscribe({
      next: (result) => {
        this.supportGroups = this.normalizeSupportGroups(result);
        this.searchValue = '';
        this.filterBySearch();
        this.currentPage = 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load support groups:', err);
        this.supportGroups = [];
        this.filteredSupportGroups = [];
        this.loading = false;
      }
    });
  }

  normalizeSupportGroups(result: any): any[] {
    if (Array.isArray(result)) {
      return result;
    }
    if (Array.isArray((result as any)?.attributes)) {
      return (result as any).attributes;
    }
    if (Array.isArray((result as any)?.data)) {
      return (result as any).data;
    }
    if (Array.isArray((result as any)?.supportGroups)) {
      return (result as any).supportGroups;
    }
    return result ? [result] : [];
  }

  deleteSupportGroup(group: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Support Group',
        message: `Are you sure you want to delete support group "${group.groupName || group.supportGroupName}"?`
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      const groupId = group.supportGroupId ?? group.id;
      if (!groupId) {
        return;
      }

      this.loading = true;
      this.supportGroupService.deleteSupportGroup(groupId).subscribe({
        next: () => {
          this.loading = false;
          this.submitSuccess = 'Support group deleted successfully.';
          this.loadSupportGroups();
        },
        error: (err) => {
          this.loading = false;
          console.error('Delete support group error', err);
          this.submitError = err.error?.message || err.error?.description || 'Failed to delete support group.';
        }
      });
    });
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) {
      this.filteredSupportGroups = this.supportGroups;
    } else {
      this.filteredSupportGroups = this.supportGroups.filter((group) => {
        const groupName = (group.groupName || group.supportGroupName || '').toLowerCase();
        const agentNames = this.normalizeAgents(group.agents || group.agentDetails || group.members || []).map((agent) => agent.agentName).join(' ').toLowerCase();
        return groupName.includes(term) || agentNames.includes(term);
      });
    }
    this.totalRecords = this.filteredSupportGroups.length;
    this.currentPage = 0;
  }

  getPaginatedSupportGroups(): any[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredSupportGroups.slice(startIndex, endIndex);
  }

  getSupportGroupAgents(group: any): string {
    return this.normalizeAgents(group.agents || group.agentDetails || group.members || []).map((agent) => agent.agentName).join(', ') || '-';
  }

  getSupportGroupOrganization(): string {
    if (this.selectionMode === 'bp') {
      return this.businessPartnerName || localStorage.getItem('userOrgName') || '-';
    }
    return localStorage.getItem('userOrgName') || '-';
  }

  normalizeAgents(source: any[]): AgentSuggestion[] {
    if (!Array.isArray(source)) {
      return [];
    }
    return source.map((item: any) => {
      if (typeof item === 'string') {
        return { agentId: null as any, agentName: item } as AgentSuggestion;
      }
      return {
        agentId: item.agentId ?? item.id ?? item.agent?.agentId ?? null,
        agentName: item.agentName || item.name || item.agent?.agentName || '',
        accessId: item.accessId || item.agent?.accessId || '',
        mailId: item.mailId || item.agent?.mailId || item.email || ''
      };
    }).filter((agent) => (agent.agentId != null) || (agent.agentName && agent.agentName.trim().length > 0));
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}
