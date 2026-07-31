import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
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

  hoveredGroupPopover: { groupId: number | null; section: 'internal' | 'bp' | 'agent' | null } = {
    groupId: null,
    section: null
  };
  openGroupPopover: { groupId: number | null; section: 'internal' | 'bp' | 'agent' | null } = {
    groupId: null,
    section: null
  };

  managerInternalSearchValue = '';
  managerInternalSuggestions: AgentSuggestion[] = [];
  managerInternalAgents: AgentSuggestion[] = [];

  managerBpSearchValue = '';
  managerBpSuggestions: AgentSuggestion[] = [];
  managerBpAgents: AgentSuggestion[] = [];

  agentSearchValue = '';
  agentSuggestions: AgentSuggestion[] = [];
  selectedAgents: AgentSuggestion[] = [];

  managerInfoVisible: Record<'managerInternal' | 'managerBp', boolean> = {
    managerInternal: false,
    managerBp: false
  };

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
    this.managerInternalSearchValue = '';
    this.managerInternalSuggestions = [];
    this.managerInternalAgents = [];
    this.managerBpSearchValue = '';
    this.managerBpSuggestions = [];
    this.managerBpAgents = [];
    this.agentSearchValue = '';
    this.agentSuggestions = [];
    this.selectedAgents = [];
    this.managerInfoVisible = {
      managerInternal: false,
      managerBp: false
    };
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'list';
  }

  onManagerSearch(section: 'managerInternal' | 'managerBp'): void {
    const searchValue = (section === 'managerInternal' ? this.managerInternalSearchValue : this.managerBpSearchValue || '').trim();
    if (!searchValue) {
      this.setSuggestions(section, []);
      return;
    }

    const orgIds = this.getOrgIdsForSection(section);
    if (!orgIds.length) {
      this.setSuggestions(section, []);
      return;
    }

    const requests = orgIds.map((orgId: number) => this.agentService.getAgentList(String(orgId)));
    forkJoin(requests).subscribe({
      next: (responses) => {
        const normalized = responses.flatMap((response: any) => this.normalizeAgentResponse(response));
        const deduped = normalized.filter((agent, index, arr) => arr.findIndex((item) => item.agentId === agent.agentId) === index);
        const query = searchValue.toLowerCase();
        const filtered = deduped.filter((agent) => {
          const haystack = `${agent.agentName} ${agent.accessId || ''} ${agent.mailId || ''}`.toLowerCase();
          return haystack.includes(query);
        }).slice(0, 8);
        this.setSuggestions(section, filtered);
      },
      error: () => {
        this.setSuggestions(section, []);
      }
    });
  }

  onAgentSearch(): void {
    const value = (this.agentSearchValue || '').trim();
    if (!value) {
      this.agentSuggestions = [];
      return;
    }

    const orgIds = this.getOrgIdsForSection('agent');
    if (!orgIds.length) {
      this.agentSuggestions = [];
      return;
    }

    const requests = orgIds.map((orgId: number) => this.agentService.getAgentList(String(orgId)));
    forkJoin(requests).subscribe({
      next: (responses) => {
        const normalized = responses.flatMap((response: any) => this.normalizeAgentResponse(response));
        const deduped = normalized.filter((agent, index, arr) => arr.findIndex((item) => item.agentId === agent.agentId) === index);
        const excludedAgentIds = new Set<number>([
          ...this.managerInternalAgents,
          ...this.managerBpAgents,
          ...this.selectedAgents
        ].map((agent) => agent.agentId).filter((id): id is number => id != null));
        const query = value.toLowerCase();
        this.agentSuggestions = deduped.filter((agent) => {
          if (agent.agentId != null && excludedAgentIds.has(agent.agentId)) {
            return false;
          }
          const haystack = `${agent.agentName} ${agent.accessId || ''} ${agent.mailId || ''}`.toLowerCase();
          return haystack.includes(query);
        }).slice(0, 8);
      },
      error: () => {
        this.agentSuggestions = [];
      }
    });
  }

  addSelectedAgent(section: 'managerInternal' | 'managerBp' | 'agent', agent: AgentSuggestion): void {
    const target = this.getSectionAgents(section);
    const existsById = agent?.agentId != null && target.some((item) => item.agentId === agent.agentId);
    const name = (agent.agentName || '').trim().toLowerCase();
    const existsByName = name && target.some((item) => (item.agentName || '').trim().toLowerCase() === name);
    const existsInManagerSection = section === 'agent' && agent?.agentId != null && (
      this.managerInternalAgents.some((item) => item.agentId === agent.agentId) ||
      this.managerBpAgents.some((item) => item.agentId === agent.agentId)
    );
    const existsInManagerSectionByName = section === 'agent' && name && (
      this.managerInternalAgents.some((item) => (item.agentName || '').trim().toLowerCase() === name) ||
      this.managerBpAgents.some((item) => (item.agentName || '').trim().toLowerCase() === name)
    );

    if (existsById || existsByName || existsInManagerSection || existsInManagerSectionByName) {
      this.resetSectionSearch(section);
      return;
    }

    target.push(agent);
    this.resetSectionSearch(section);
  }

  removeSelectedAgent(section: 'managerInternal' | 'managerBp' | 'agent', agentId: number): void {
    const target = this.getSectionAgents(section);
    if (section === 'agent') {
      this.selectedAgents = target.filter((agent) => agent.agentId !== agentId);
    } else if (section === 'managerInternal') {
      this.managerInternalAgents = target.filter((agent) => agent.agentId !== agentId);
    } else {
      this.managerBpAgents = target.filter((agent) => agent.agentId !== agentId);
    }
  }

  dropManagerAgents(event: CdkDragDrop<AgentSuggestion[]>, section: 'managerInternal' | 'managerBp'): void {
    const target = this.getSectionAgents(section);
    moveItemInArray(target, event.previousIndex, event.currentIndex);
    if (section === 'managerInternal') {
      this.managerInternalAgents = target;
    } else {
      this.managerBpAgents = target;
    }
  }

  toggleInfo(section: 'managerInternal' | 'managerBp'): void {
    this.managerInfoVisible[section] = !this.managerInfoVisible[section];
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

    this.managerInternalAgents = this.normalizeAgents(this.extractManagerAgents(group, 'internal'));
    this.managerBpAgents = this.normalizeAgents(this.extractManagerAgents(group, 'bp'));
    this.selectedAgents = this.normalizeAgents(this.extractGroupAgents(group, ['agents', 'agentDetails', 'members', 'supportGroupMembers']));

    this.managerInternalSearchValue = '';
    this.managerInternalSuggestions = [];
    this.managerBpSearchValue = '';
    this.managerBpSuggestions = [];
    this.agentSearchValue = '';
    this.agentSuggestions = [];
  }

  fetchAgentsByIds(ids: number[]): void {
    const orgId = this.selectedContextOrgId || Number(localStorage.getItem('userOrgId') || 0);
    if (!orgId || !ids || ids.length === 0) {
      this.selectedAgents = ids.map((id) => ({ agentId: id, agentName: '' } as AgentSuggestion));
      return;
    }

    this.agentService.getAgentList(String(orgId)).subscribe({
      next: (response) => {
        const normalized = this.normalizeAgentResponse(response);
        this.selectedAgents = ids.map((id) => normalized.find((agent: AgentSuggestion) => agent.agentId === id) || ({ agentId: id, agentName: '' } as AgentSuggestion));
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

    if (!this.managerInternalAgents.length) {
      this.formError['managerInternalAgents'] = 'Please add at least one internal manager.';
    }

    if (this.selectionMode === 'bp' && !this.managerBpAgents.length) {
      this.formError['managerBpAgents'] = 'Please add at least one business partner manager.';
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
      managerInternalAgents: this.managerInternalAgents.map((agent) => agent.agentId),
      managerBpAgents: this.selectionMode === 'bp' ? this.managerBpAgents.map((agent) => agent.agentId) : [],
      agents: this.selectedAgents.map((agent) => agent.agentId),
      orgId: localStorage.getItem('userOrgId') ? Number(localStorage.getItem('userOrgId')) : null,
      businessPartnerId: this.businessPartnerId,
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
        const agentNames = this.getDisplayableAgentNames(group).toLowerCase();
        return groupName.includes(term) || agentNames.includes(term);
      });
    }
    this.totalRecords = this.filteredSupportGroups.length;
    this.currentPage = 0;
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
  }

  getPaginatedSupportGroups(): any[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredSupportGroups.slice(startIndex, endIndex);
  }

  getGroupId(group: any): number | null {
    return group?.supportGroupId ?? group?.id ?? null;
  }

  setHoveredGroupPopover(groupId: number | null, section: 'internal' | 'bp' | 'agent'): void {
    this.hoveredGroupPopover = { groupId, section };
  }

  clearHoveredGroupPopover(): void {
    this.hoveredGroupPopover = { groupId: null, section: null };
  }

  toggleGroupPopover(groupId: number | null, section: 'internal' | 'bp' | 'agent'): void {
    if (this.openGroupPopover.groupId === groupId && this.openGroupPopover.section === section) {
      this.openGroupPopover = { groupId: null, section: null };
      return;
    }
    this.openGroupPopover = { groupId, section };
  }

  isGroupPopoverVisible(groupId: number | null, section: 'internal' | 'bp' | 'agent'): boolean {
    return (
      this.hoveredGroupPopover.groupId === groupId && this.hoveredGroupPopover.section === section
    ) || (
      this.openGroupPopover.groupId === groupId && this.openGroupPopover.section === section
    );
  }

  getSupportGroupInternalManagers(group: any): string {
    const managers = this.extractGroupAgents(group, ['managers']);
    const internalManagers = Array.isArray(managers)
      ? managers.filter((manager: any) => manager?.isInternal === true)
      : [];
    return this.normalizeAgents(internalManagers).map((agent) => agent.agentName).join(', ') || '-';
  }

  getSupportGroupBpManagers(group: any): string {
    const managers = this.extractGroupAgents(group, ['managers']);
    const bpManagers = Array.isArray(managers)
      ? managers.filter((manager: any) => manager?.isBP === true)
      : [];
    return this.normalizeAgents(bpManagers).map((agent) => agent.agentName).join(', ') || '-';
  }

  getSupportGroupAgents(group: any): string {
    return this.normalizeAgents(this.extractGroupAgents(group, ['members'])).map((agent) => agent.agentName).join(', ') || '-';
  }

  getSupportGroupInternalManagerNames(group: any): string[] {
    const names = this.getSupportGroupInternalManagers(group);
    return names === '-' ? [] : names.split(', ').filter((name) => name);
  }

  getSupportGroupBpManagerNames(group: any): string[] {
    const names = this.getSupportGroupBpManagers(group);
    return names === '-' ? [] : names.split(', ').filter((name) => name);
  }

  getSupportGroupAgentNames(group: any): string[] {
    const names = this.getSupportGroupAgents(group);
    return names === '-' ? [] : names.split(', ').filter((name) => name);
  }

  getSupportGroupOrganization(group?: any): string {
    const businessPartnerName = group?.businessPartnerName || group?.companyName || this.businessPartnerName;
    if (this.selectionMode === 'bp' || businessPartnerName) {
      return businessPartnerName || localStorage.getItem('userOrgName') || '-';
    }
    return localStorage.getItem('userOrgName') || '-';
  }

  getDisplayableAgentNames(group: any): string {
    return [
      this.getSupportGroupInternalManagers(group),
      this.getSupportGroupBpManagers(group),
      this.getSupportGroupAgents(group)
    ].join(' ');
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

  private getSectionAgents(section: 'managerInternal' | 'managerBp' | 'agent'): AgentSuggestion[] {
    if (section === 'managerInternal') {
      return this.managerInternalAgents;
    }
    if (section === 'managerBp') {
      return this.managerBpAgents;
    }
    return this.selectedAgents;
  }

  private setSuggestions(section: 'managerInternal' | 'managerBp', suggestions: AgentSuggestion[]): void {
    if (section === 'managerInternal') {
      this.managerInternalSuggestions = suggestions;
      return;
    }
    this.managerBpSuggestions = suggestions;
  }

  private resetSectionSearch(section: 'managerInternal' | 'managerBp' | 'agent'): void {
    if (section === 'managerInternal') {
      this.managerInternalSearchValue = '';
      this.managerInternalSuggestions = [];
      return;
    }
    if (section === 'managerBp') {
      this.managerBpSearchValue = '';
      this.managerBpSuggestions = [];
      return;
    }
    this.agentSearchValue = '';
    this.agentSuggestions = [];
  }

  private getOrgIdsForSection(section: 'managerInternal' | 'managerBp' | 'agent'): number[] {
    const fallbackOrgId = Number(localStorage.getItem('userOrgId') || 0);
    const contextOrgId = this.selectedContextOrgId || fallbackOrgId;
    const internalOrgId = fallbackOrgId;
    const bpOrgId = contextOrgId || internalOrgId;

    if (section === 'managerBp') {
      return bpOrgId ? [bpOrgId] : [];
    }
    if (section === 'managerInternal') {
      return internalOrgId ? [internalOrgId] : [];
    }
    return [internalOrgId, bpOrgId].filter((id, index, array) => id && array.indexOf(id) === index);
  }

  private normalizeAgentResponse(response: any): AgentSuggestion[] {
    const agents = (response as any)?.attributes || response || [];
    return agents.map((agent: any) => ({
      agentId: agent.agentId ?? agent.id,
      agentName: agent.agentName || agent.name || '',
      accessId: agent.accessId || '',
      mailId: agent.mailId || agent.email || ''
    })).filter((agent: AgentSuggestion) => agent.agentId && agent.agentName);
  }

  private extractGroupAgents(group: any, keys: string[]): any[] {
    if (!group) {
      return [];
    }

    for (const key of keys) {
      const value = (group as any)?.[key];
      if (Array.isArray(value)) {
        return value;
      }
      if (value && typeof value === 'object' && Array.isArray((value as any).attributes)) {
        return (value as any).attributes;
      }
      if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
        return (value as any).data;
      }
    }

    return [];
  }

  private extractManagerAgents(group: any, type: 'internal' | 'bp'): any[] {
    const explicitKeys = type === 'internal'
      ? ['managerInternalAgents', 'managerInternal', 'managerInternalList', 'managerInternals']
      : ['managerBpAgents', 'managerBp', 'managerBP', 'managerBpList'];

    const explicitAgents = this.extractGroupAgents(group, explicitKeys);
    if (explicitAgents.length) {
      return explicitAgents;
    }

    const fallbackManagers = this.extractGroupAgents(group, ['managers']);
    if (!fallbackManagers.length) {
      return [];
    }

    return fallbackManagers.filter((manager: any) => {
      if (type === 'internal') {
        return manager?.isInternal === true || manager?.isInternal === 'true' || manager?.managerType === 'INTERNAL' || manager?.managerType === 'INTERNAL_MANAGER';
      }

      return manager?.isBP === true || manager?.isBP === 'true' || manager?.managerType === 'BP' || manager?.managerType === 'BUSINESS_PARTNER';
    });
  }

  clearSubmitMessages(): void {
    this.submitError = '';
    this.submitSuccess = '';
  }
}
