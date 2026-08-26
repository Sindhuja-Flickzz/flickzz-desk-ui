import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RitmService } from '../../service/ritm.service';
import { CompanyService } from '../../service/company.service';
import { PriorityMaster } from '../../models/priority-master';
import { ApproverItem, CatalogTask, ChangeRequestItem, LogEntry, NoteItem, TaskSlaItem, UserProfile, WorkflowStage } from '../../models/ritm.model';
import { AgentMaster } from 'src/app/models/agent-master';
import { CompanyRole } from 'src/app/models/company-master';

@Component({
  selector: 'app-ritm',
  templateUrl: './ritm.component.html',
  styleUrls: ['./ritm.component.scss']
})
export class RitmComponent implements OnInit {
  ritmForm!: FormGroup;
  taskForm!: FormGroup;
  users: AgentMaster[] = [];
  priorities: PriorityMaster[] = [];
  notes: NoteItem[] = [];
  logs: LogEntry[] = [];
  workflowStages: WorkflowStage[] = [];
  approvers: ApproverItem[] = [];
  taskSlas: TaskSlaItem[] = [];
  changeRequests: ChangeRequestItem[] = [];
  catalogTasks: CatalogTask[] = [];
  submitting = false;
  loading = false;
  submitError = '';
  submitSuccess = '';
  currentUser?: AgentMaster;
  selectedPriority?: PriorityMaster;
  isEditMode = false;
  ritmId = '';
  businessPartnerId: number | null = null;
  role = localStorage.getItem('userRole') || '';
  orgId = localStorage.getItem('userOrgId') || '';
  bpOptions: CompanyRole[] = [];

  constructor(
    private fb: FormBuilder,
    private ritmService: RitmService,
    private companyService: CompanyService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.orgId = localStorage.getItem('userOrgId') || '';
   }

  ngOnInit(): void {
    this.initializeForms();
    this.initializePage();
  }

  private initializeForms(): void {
    this.ritmForm = this.fb.group({
      ritmNumber: [{ value: '', disabled: true }, Validators.required],
      openedBy: [{ value: '', disabled: true }, Validators.required],
      requestedFor: ['', Validators.required],
      location: [{ value: '', disabled: true }],
      configurationItem: ['', Validators.required],
      category: ['', Validators.required],
      openedDate: [{ value: '', disabled: true }, Validators.required],
      state: ['', Validators.required],
      assignmentGroup: ['', Validators.required],
      priority: [null, Validators.required],
      workStart: [null, Validators.required],
      workEnd: [null, Validators.required],
      customerResolution: [{ value: '', disabled: true }],
      workDuration: [{ value: '', disabled: true }]
    });

    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      assignedTo: ['', Validators.required],
      dueDate: ['', Validators.required]
    });

    this.ritmForm.get('priority')?.valueChanges.subscribe(() => {
      this.selectedPriority = this.priorities.find(priority => priority.priorityId === this.ritmForm.get('priority')?.value);
      this.updateCustomerResolution();
    });

    this.ritmForm.get('requestedFor')?.valueChanges.subscribe(value => {
      this.setRequestedForLocation(value);
    });

    this.ritmForm.get('workStart')?.valueChanges.subscribe(() => this.updateWorkDuration());
    this.ritmForm.get('workEnd')?.valueChanges.subscribe(() => this.updateWorkDuration());
  }

  private initializePage(): void {
    this.loading = true;
    this.loadUsers();

    const id = this.route.snapshot.queryParamMap.get('id');
    this.companyService.getServiceProviderList(Number(this.orgId)).subscribe({
        next: (response) => {
          this.bpOptions = (response as any).attributes || response || [];
          const matchingRole = this.bpOptions.find((bp) => {
            return bp.company?.companyId != null && bp.mappedCompany?.companyId != null
              && bp.company.companyId === bp.mappedCompany.companyId;
          });
          this.businessPartnerId = matchingRole?.businessPartnerId ?? null;
          this.loadPriorities();
          
        },
        error: () => {
          console.error('Failed to load business partners');
        }
      });
    if (id) {
      this.isEditMode = true;
      this.ritmId = id;
      this.loadRitmDetails(id);
    }
  }

  private loadUsers(): void {
    const orgId = localStorage.getItem('userOrgId') || '';
    this.ritmService.getAgents(orgId).subscribe({
      next: (users: AgentMaster[] | any) => {
        this.users = (users as any).attributes || [];
        this.setCurrentUser();
        this.setRequestedForDefault();
        if (!this.isEditMode) {
          this.applyFormDefaults();
        }
        this.loadSupportTabs();
      },
      error: (err: unknown) => {
        this.submitError = 'Unable to load user list.';
        console.error(err);
      }
    });
  }

  private loadPriorities(): void {
    this.ritmService.getPriorities(this.businessPartnerId).subscribe({
      next: (priorities: PriorityMaster[] | any) => {
        this.priorities = (priorities as any).attributes || [];
        this.selectedPriority = this.priorities.find(priority => priority.priorityId === this.ritmForm.get('priority')?.value);
        this.updateCustomerResolution();
      },
      error: (err: unknown) => {
        this.submitError = 'Unable to load priority list.';
        console.error(err);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private setCurrentUser(): void {
    const currentUserId = localStorage.getItem('userId') || '';
    const matchedUser = this.users.find(user =>{user.agentId === Number(currentUserId)});
    this.currentUser = matchedUser || this.users[0];
  }

  private setRequestedForDefault(): void {
    if (!this.ritmForm.get('requestedFor')?.value && this.currentUser) {
      this.ritmForm.get('requestedFor')?.setValue(this.currentUser.agentId);
    }
  }

  public setRequestedForLocation(requestedForId: number): void {
    const user = this.users.find(item => item.agentId === requestedForId);
    if (user) {
      // this.ritmForm.get('location')?.setValue(user.us.location || '');
    }
  }

  public get currentUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  private applyFormDefaults(): void {
    const now = new Date();
    const formattedNow = this.formatAsDatetimeLocal(now);
    const requestedForId = this.currentUser?.agentId || '';

    this.ritmForm.patchValue({
      openedBy: this.getCurrentUserDisplayName(),
      requestedFor: requestedForId,
      // location: this.currentUser?.location || '',
      openedDate: formattedNow,
      workStart: now,
      workEnd: null,
      customerResolution: '',
      workDuration: ''
    });
    this.generateRitmNumber();
    this.updateCustomerResolution();

    if (!this.ritmForm.get('requestedFor')?.value) {
      this.ritmForm.get('requestedFor')?.setValue(requestedForId);
    }
  }

  private loadRitmDetails(ritmId: string): void {
    this.loading = true;
    this.ritmService.getRitmById(ritmId).subscribe({
      next: (response: any) => {
        const item = response?.attributes || response || {};
        this.ritmForm.patchValue({
          ritmNumber: item.ritmNumber || '',
          openedBy: item.openedBy || this.getCurrentUserDisplayName(),
          requestedFor: item.requestedFor || this.currentUser?.agentId,
          // location: item.location || this.currentUser?.location || '',
          configurationItem: item.configurationItem || '',
          category: item.category || '',
          openedDate: item.openedDate ? this.formatAsDatetimeLocal(new Date(item.openedDate)) : this.formatAsDatetimeLocal(new Date()),
          state: item.state || '',
          assignmentGroup: item.assignmentGroup || '',
          priority: item.priority || null,
          workStart: item.workStart ? new Date(item.workStart) : null,
          workEnd: item.workEnd ? new Date(item.workEnd) : null,
          customerResolution: item.customerResolution ? this.formatAsDatetimeLocal(new Date(item.customerResolution)) : '',
          workDuration: item.workDuration || ''
        });
        if (!item.ritmNumber) {
          this.generateRitmNumber();
        }
        this.loadSupportTabs();
      },
      error: (err: unknown) => {
        this.submitError = 'Unable to load RITM details for editing.';
        console.error(err);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private loadSupportTabs(): void {
    const userId = localStorage.getItem('userId') || '';
    // this.ritmService.getNotes(userId).subscribe({ next: (notes: NoteItem[] | any) => this.notes = this.normalizeArray(notes) });
    if (this.ritmId) {
      this.ritmService.getLogs(this.ritmId).subscribe({ next: (logs: LogEntry[] | any) => this.logs = this.normalizeArray(logs) });
      this.ritmService.getWorkflow(this.ritmId).subscribe({ next: (workflow: WorkflowStage[] | any) => this.workflowStages = this.normalizeArray(workflow) });
      this.ritmService.getTaskSlas(this.ritmId).subscribe({ next: (slas: TaskSlaItem[] | any) => this.taskSlas = this.normalizeArray(slas) });
      this.ritmService.getChangeRequests(this.ritmId).subscribe({ next: (changes: ChangeRequestItem[] | any) => this.changeRequests = this.normalizeArray(changes) });
    }
    // this.ritmService.getApprovers().subscribe({ next: (approvers: ApproverItem[] | any) => this.approvers = this.normalizeArray(approvers) });
  }

  private updateCustomerResolution(): void {
    const slaHours = 0;
    const openedDateValue = this.ritmForm.get('openedDate')?.value || this.formatAsDatetimeLocal(new Date());
    if (slaHours !== undefined && slaHours !== null && !isNaN(slaHours as number)) {
      const baseDate = new Date(openedDateValue);
      baseDate.setHours(baseDate.getHours() + Number(slaHours));
      this.ritmForm.get('customerResolution')?.setValue(this.formatAsDatetimeLocal(baseDate));
    } else {
      this.ritmForm.get('customerResolution')?.setValue('');
    }
  }

  private updateWorkDuration(): void {
    const start = this.ritmForm.get('workStart')?.value;
    const end = this.ritmForm.get('workEnd')?.value;
    if (start && end) {
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);
      const diff = endDate.getTime() - startDate.getTime();
      if (diff >= 0) {
        const hours = Math.floor(diff / 1000 / 60 / 60);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        this.ritmForm.get('workDuration')?.setValue(`${hours}h ${minutes}m`);
        return;
      }
    }
    this.ritmForm.get('workDuration')?.setValue('');
  }

  private generateRitmNumber(): void {
    this.ritmService.getRequestNumber('RITM').subscribe({
      next: response => this.ritmForm.get('ritmNumber')?.setValue(response.attributes),
      error: (err: unknown) => {
        this.submitError = 'Unable to generate RITM number.';
        console.error(err);
      }
    });
  }

  private getCurrentUserDisplayName(): string {
    if (this.currentUser) {
      return `${this.currentUser.agentName || ''}`.trim() || String(this.currentUser.agentId);
    }
    return localStorage.getItem('userId') || 'Unknown User';
  }

  private normalizeArray<T>(value: T[] | any): T[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && Array.isArray(value.data)) {
      return value.data;
    }
    if (value && Array.isArray(value.items)) {
      return value.items;
    }
    if (value && typeof value === 'object') {
      return Object.values(value) as T[];
    }
    return [];
  }

  private formatAsDatetimeLocal(date: Date): string {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - tzOffset);
    return localDate.toISOString().slice(0, 16);
  }

  get currentRoleIsAdmin(): boolean {
    return this.role?.toLowerCase() === 'admin';
  }

  isFieldDisabled(fieldName: string): boolean {
    const restricted = ['state', 'assignmentGroup'];
    return !this.currentRoleIsAdmin && restricted.includes(fieldName);
  }

  onSubmit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.ritmForm.invalid) {
      this.ritmForm.markAllAsTouched();
      this.submitError = 'Please correct the highlighted fields before saving.';
      return;
    }

    this.submitting = true;
    const rawValues = this.ritmForm.getRawValue();
    const payload = {
      ...rawValues,
      workStart: rawValues.workStart ? this.formatAsDatetimeLocal(new Date(rawValues.workStart)) : null,
      workEnd: rawValues.workEnd ? this.formatAsDatetimeLocal(new Date(rawValues.workEnd)) : null,
      requestedForName: this.getRequestedForDisplayName(),
      priorityName: this.selectedPriority?.code || ''
    };

    this.ritmService.createRitm(payload).subscribe({
      next: () => {
        this.submitSuccess = this.isEditMode ? 'RITM updated successfully.' : 'RITM created successfully.';
        this.submitting = false;
        if (!this.isEditMode) {
          this.applyFormDefaults();
          this.ritmForm.get('configurationItem')?.reset();
          this.ritmForm.get('category')?.reset();
          this.ritmForm.get('state')?.reset();
          this.ritmForm.get('assignmentGroup')?.reset();
          this.ritmForm.get('priority')?.reset();
          this.ritmForm.get('workStart')?.reset();
          this.ritmForm.get('workEnd')?.reset();
          this.ritmForm.get('customerResolution')?.reset();
          this.ritmForm.get('workDuration')?.reset();
        }
      },
      error: err => {
        this.submitError = err?.error?.message || 'Failed to save RITM. Please try again.';
        this.submitting = false;
        console.error(err);
      }
    });
  }

  private getRequestedForDisplayName(): string {
    const requestedForId = this.ritmForm.get('requestedFor')?.value;
    const user = this.users.find(item => item.agentId === requestedForId);
    return user ? `${user.agentName}`.trim() : requestedForId;
  }

  addCatalogTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const task: CatalogTask = {
      id: Date.now(),
      title: this.taskForm.get('title')?.value,
      assignedTo: this.taskForm.get('assignedTo')?.value,
      dueDate: this.taskForm.get('dueDate')?.value,
      status: 'Pending'
    };

    this.catalogTasks.push(task);
    this.ritmService.createCatalogTask(task).subscribe({
      next: () => {
        this.taskForm.reset();
      },
      error: err => {
        console.error('Failed to create catalog task', err);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/home']);
  }

  get requestedForControl() {
    return this.ritmForm.get('requestedFor');
  }
}
