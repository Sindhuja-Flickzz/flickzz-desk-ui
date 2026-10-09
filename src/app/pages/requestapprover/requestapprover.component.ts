import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AgentService } from '../../service/agent.service';
import { RequestApproverService } from '../../service/requestapprover.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { USER_ROLES } from 'src/app/data/app_constants';

interface AgentSuggestion {
  agentId: number;
  agentName: string;
  mailId?: string;
  accessId?: string;
}

interface RequestApproverConfiguration {
  approverConfigId?: number;
  approverCode: string;
  approvers: Array<{ agentId: number; approverSequence: number; agent?: AgentSuggestion }>;
  followSequence: boolean;
  isAnyApprovalSufficient: boolean;
  isActive?: boolean;
}

@Component({
  selector: 'app-requestapprover',
  templateUrl: './requestapprover.component.html',
  styleUrls: ['./requestapprover.component.scss']
})
export class RequestApproverComponent implements OnInit {
  requestApproverForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Request Approver Configuration';
  isEditMode = false;
  originalFormValue: any = null;

  activeAgents: AgentSuggestion[] = [];
  configurations: RequestApproverConfiguration[] = [];
  filteredConfigurations: RequestApproverConfiguration[] = [];
  agentSuggestions: { [key: number]: AgentSuggestion[] } = {};
  searchValue = '';
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;

  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  constructor(
    private fb: FormBuilder,
    private requestApproverService: RequestApproverService,
    private agentService: AgentService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.requestApproverForm = this.fb.group({
      approverConfigId: [null],
      approverCode: ['', [Validators.required, Validators.maxLength(50)]],
      approvers: this.fb.array([]),
      followSequence: [false],
      isAnyApprovalSufficient: [true]
    });
    this.addApprover();
  }

  ngOnInit(): void {
    this.loadActiveAgents();
    // this.loadConfigurationList();
  }

  get approvers(): FormArray {
    return this.requestApproverForm.get('approvers') as FormArray;
  }

  private createApproverRow(): FormGroup {
    return this.fb.group({
      agentId: [null, Validators.required],
      agentQuery: [''],
      approverSequence: ['', [Validators.required, Validators.min(1)]]
    });
  }

  addApprover(): void {
    this.approvers.push(this.createApproverRow());
    const index = this.approvers.length - 1;
    this.agentSuggestions[index] = this.getAvailableAgents(index);
  }

  setApprovalMode(mode: 'sequence' | 'any'): void {
    this.requestApproverForm.patchValue({
      followSequence: mode === 'sequence',
      isAnyApprovalSufficient: mode === 'any'
    });
  }

  removeApprover(index: number): void {
    if (this.approvers.length === 1) {
      this.formError.approvers = 'At least one approver is required';
      return;
    }
    this.approvers.removeAt(index);
    this.rebuildSuggestions();
  }

  loadActiveAgents(): void {
    const orgId = localStorage.getItem('userOrgId') || '';
    if (!orgId) {
      this.activeAgents = [];
      return;
    }

    this.agentService.getActiveAgentList(orgId).subscribe({
      next: (response) => {
        const list = (response as any)?.attributes || response;
        const items = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];
        this.activeAgents = items.map((item: any) => ({
          agentId: Number(item?.agentId ?? item?.id ?? item?.agent?.agentId),
          agentName: item?.agentName ?? item?.name ?? item?.agent?.agentName ?? '',
          mailId: item?.mailId ?? item?.email ?? item?.agent?.mailId,
          accessId: item?.accessId ?? item?.agent?.accessId
        })).filter((agent: AgentSuggestion) => agent.agentId != null && agent.agentName.trim());
        this.rebuildSuggestions();
      },
      error: (err) => {
        console.error('Failed to load active agents:', err);
        this.activeAgents = [];
      }
    });
  }

  onAgentSearch(index: number): void {
    const row = this.approvers.at(index);
    row.get('agentId')?.setValue(null, { emitEvent: false });
    const query = String(row.get('agentQuery')?.value || '').toLowerCase().trim();
    const available = this.getAvailableAgents(index);
    this.agentSuggestions[index] = !query ? [] : available.filter(agent =>
      `${agent.agentName} ${agent.mailId || ''} ${agent.accessId || ''}`.toLowerCase().includes(query)
    );
  }

  selectAgent(index: number, agent: AgentSuggestion): void {
    this.approvers.at(index).patchValue({ agentId: agent.agentId, agentQuery: agent.agentName }, { emitEvent: false });
    this.agentSuggestions[index] = [];
    this.rebuildSuggestions();
  }

  private getAvailableAgents(rowIndex: number): AgentSuggestion[] {
    const selected = new Set(this.approvers.controls
      .map((row, index) => index === rowIndex ? null : row.get('agentId')?.value)
      .filter((agentId): agentId is number => agentId != null)
      .map(agentId => Number(agentId)));
    return this.activeAgents.filter(agent => !selected.has(Number(agent.agentId)));
  }

  private rebuildSuggestions(): void {
    this.agentSuggestions = {};
  }

  onSave(): void {
    this.formError = {};
    this.submitError = '';
    this.approvers.controls.forEach((row, index) => {
      const agentQuery = String(row.get('agentQuery')?.value || '').trim().toLowerCase();
      if (!row.get('agentId')?.value && agentQuery) {
        const exactAgent = this.getAvailableAgents(index).find(agent => agent.agentName.toLowerCase() === agentQuery);
        if (exactAgent) row.patchValue({ agentId: exactAgent.agentId, agentQuery: exactAgent.agentName }, { emitEvent: false });
      }
    });
    const code = this.requestApproverForm.get('approverCode');
    if (code?.hasError('required')) this.formError.approverCode = 'Approver Code is required';
    if (code?.hasError('maxlength')) this.formError.approverCode = 'Approver Code cannot exceed 50 characters';

    const rows = this.approvers.getRawValue();
    if (rows.length === 0) this.formError.approvers = 'At least one approver is required';
    const selectedIds = rows.map((row: any) => Number(row.agentId)).filter(Boolean);
    if (new Set(selectedIds).size !== selectedIds.length) this.formError.approvers = 'An agent cannot be selected more than once';
    if (!this.formError.approvers && rows.some((row: any) => !row.agentId)) this.formError.approvers = 'Select an agent for each approver';
    if (rows.some((row: any) => !row.approverSequence || Number(row.approverSequence) < 1)) this.formError.approvers = 'Enter a valid sequence for each approver';
    const sequences = rows.map((row: any) => Number(row.approverSequence)).filter(Boolean);
    if (new Set(sequences).size !== sequences.length) this.formError.approvers = 'Sequence cannot repeat';
    if (Object.keys(this.formError).length > 0) return;

    const formValue = this.requestApproverForm.getRawValue();
    const payload = {
      approverConfigId: formValue.approverConfigId,
      approverCode: formValue.approverCode.trim(),
      approvers: rows.map((row: any) => ({ agentId: Number(row.agentId), approverSequence: Number(row.approverSequence) })),
      followSequence: !!formValue.followSequence,
      isAnyApprovalSufficient: !!formValue.isAnyApprovalSufficient,
      companyId: Number(localStorage.getItem('userOrgId') || 0),
      updatedBy: this.isEditMode ? Number(localStorage.getItem('userId') || 0) : null,
      createdBy: !this.isEditMode ? Number(localStorage.getItem('userId') || 0) : null,
      isCreatedByAdmin: !this.isEditMode ? localStorage.getItem('userRole')?.toLowerCase() === 'admin' : false,
      isUpdatedByAdmin: this.isEditMode ? localStorage.getItem('userRole')?.toLowerCase() === 'admin' : false
    };

    this.isSubmitting = true;
    const request = this.isEditMode
      ? this.requestApproverService.updateConfiguration(payload)
      : this.requestApproverService.createConfiguration(payload);
    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = `Request approver configuration ${this.isEditMode ? 'updated' : 'created'} successfully.`;
        setTimeout(() => {
          this.loadConfigurationList();
          this.resetForm();
          this.activeTab = 'list';
        }, 1200);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Request approver save error:', err);
        this.submitError = err.error?.message || err.error?.description || 'Failed to save request approver configuration.';
      }
    });
  }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Create Request Approver Configuration';
    this.requestApproverForm.reset({ approverConfigId: null, followSequence: false, isAnyApprovalSufficient: true });
    this.approvers.clear();
    this.agentSuggestions = {};
    this.addApprover();
    this.formError = {};
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
  }

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.formError = {};
    if (tab === 'create' && !this.isEditMode) this.resetForm();
    if (tab === 'list') {
      this.isEditMode = false;
      this.loadConfigurationList();
    }
  }

  loadConfigurationList(): void {
    const orgId = Number(localStorage.getItem('userOrgId') || 0);
    this.loading = true;
    this.requestApproverService.getConfigurations(orgId).subscribe({
      next: (response) => {
        const list = (response as any)?.attributes || response || [];
        this.configurations = Array.isArray(list) ? list : [];
        this.filterBySearch();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load request approver configurations:', err);
        this.configurations = [];
        this.filteredConfigurations = [];
        this.loading = false;
        this.submitError = err.error?.message || 'Failed to load request approver configurations.';
      }
    });
  }

  onViewConfiguration(configuration: RequestApproverConfiguration): void {
    this.isEditMode = true;
    this.activeTab = 'create';
    this.pageTitle = 'Edit Request Approver Configuration';
    this.formError = {};
    this.approvers.clear();
    configuration.approvers.forEach((approver, index) => {
      const agent = approver.agent || this.activeAgents.find(item => item.agentId === approver.agentId);
      const row = this.createApproverRow();
      row.patchValue({ agentId: Number(approver.agentId), agentQuery: agent?.agentName || '', approverSequence: approver.approverSequence });
      this.approvers.push(row);
    });
    this.requestApproverForm.patchValue({
      approverConfigId: configuration.approverConfigId,
      approverCode: configuration.approverCode,
      followSequence: configuration.followSequence,
      isAnyApprovalSufficient: configuration.isAnyApprovalSufficient
    });
    this.originalFormValue = this.requestApproverForm.getRawValue();
    this.rebuildSuggestions();
  }

  onDeleteConfiguration(configuration: RequestApproverConfiguration): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Request Approver Configuration',
      message: `Are you sure you want to delete configuration "${configuration.approverCode}"?`,
      confirmText: 'Delete', cancelText: 'Cancel', showCancel: true, type: 'delete'
    };
    this.dialog.open(ConfirmationDialogComponent, { width: '420px', data: dialogData }).afterClosed().subscribe(result => {
      if (!result || !configuration.approverConfigId) return;
      const deletedBy = Number(localStorage.getItem('userId') || 0);
      const isDeletedByAdmin = localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase();
      
      this.requestApproverService.deleteConfiguration(configuration.approverConfigId, deletedBy, isDeletedByAdmin).subscribe({
        next: () => { this.submitSuccess = 'Request approver configuration deleted successfully.'; this.loadConfigurationList(); },
        error: (err) => { this.submitError = err.error?.message || 'Failed to delete request approver configuration.'; }
      });
    });
  }

  filterBySearch(): void {
    const term = this.searchValue.trim().toLowerCase();
    this.filteredConfigurations = !term ? this.configurations : this.configurations.filter(item => item.approverCode.toLowerCase().includes(term));
    this.totalRecords = this.filteredConfigurations.length;
    this.currentPage = 0;
  }

  getPaginatedConfigurations(): RequestApproverConfiguration[] {
    return this.filteredConfigurations.slice(this.currentPage * this.pageSize, (this.currentPage + 1) * this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  getAgentNames(configuration: RequestApproverConfiguration): string {
    return (configuration.approvers || []).map(approver => approver.agent?.agentName || this.activeAgents.find(agent => agent.agentId === approver.agentId)?.agentName || approver.agentId).join(', ');
  }

  backToHome(): void {
    this.router.navigate(['/settings']);
  }

  cancelEdit(): void {
    this.loadConfigurationList();
    this.resetForm();
    this.activeTab = 'list';
  }
}
