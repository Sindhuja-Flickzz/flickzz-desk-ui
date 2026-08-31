import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RitmService } from '../../service/ritm.service';
import { CompanyService } from '../../service/company.service';
import { PriorityMaster } from '../../models/priority-master';
import { ApproverItem, CatalogTask, ChangeRequestItem, LogEntry, NoteItem, TaskSlaItem, UserProfile, WorkflowStage } from '../../models/ritm.model';
import { AgentMaster } from 'src/app/models/agent-master';
import { CompanyRole } from 'src/app/models/company-master';
import { CategoryMaster, CategorySubCategory } from '../../models/category-master';
import { CategoryService } from '../../service/category.service';
import { SupportGroupService } from '../../service/support-group.service';
import { USER_ROLES } from '../../data/app_constants';  

@Component({
  selector: 'app-ritm',
  templateUrl: './ritm.component.html',
  styleUrls: ['./ritm.component.scss']
})
export class RitmComponent implements OnInit, OnDestroy {
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
  categories: CategoryMaster[] = [];
  subCategories: CategorySubCategory[] = [];
  private currentTimeTimer: ReturnType<typeof setInterval> | null = null;
  watchListSearch = '';
  watchListOpen = false;
  formSubmitted = false;
  attachmentFiles: File[] = [];
  @ViewChild('watchListDropdown') watchListDropdown?: ElementRef<HTMLElement>;
  requestDetailsExpanded = false;
  assignmentGroupId: number | null = null;
  showSuccessScreen = false;
  successRitmDetails: any = null;

  constructor(
    private fb: FormBuilder,
    private ritmService: RitmService,
    private companyService: CompanyService,
    private categoryService: CategoryService,
    private supportGroupService: SupportGroupService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.orgId = localStorage.getItem('userOrgId') || '';
   }

  ngOnInit(): void {
    this.initializeForms();
    this.initializePage();
  }

  @HostListener('document:click', ['$event'])
  closeWatchListOnOutsideClick(event: MouseEvent): void {
    const clickedElement = event.target as Node;
    if (this.watchListOpen && !this.watchListDropdown?.nativeElement.contains(clickedElement)) {
      this.watchListOpen = false;
    }
  }

  private initializeForms(): void {
    this.ritmForm = this.fb.group({
      ritmNumber: [{ value: '', disabled: true }, Validators.required],
      openedBy: [{ value: '', disabled: true }, Validators.required],
      requestedFor: ['', Validators.required],
      location: [{ value: '', disabled: true }],
      availabilityTime: [{ value: '', disabled: true }],
      currentTime: [{ value: '', disabled: true }],
      category: ['', Validators.required],
      subCategory: ['', Validators.required],
      assignmentGroup: ['', Validators.required],
      priority: ['', Validators.required],
      watchList: [],
      attachments: [[], Validators.required],
      shortDescription: ['', Validators.required],
      description: [''],
      stepsToReproduce: [''],
      otherNotes: ['']
    });

    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      assignedTo: ['', Validators.required],
      dueDate: ['', Validators.required]
    });

    this.ritmForm.get('priority')?.valueChanges.subscribe(() => {
      this.selectedPriority = this.priorities.find(priority => priority.priorityId === this.ritmForm.get('priority')?.value);
    });

    this.ritmForm.get('requestedFor')?.valueChanges.subscribe(value => {
      this.setRequestedForLocation(value);
    });

    this.ritmForm.get('category')?.valueChanges.subscribe(categoryId => {
      this.loadSubCategories(categoryId);
    });

    this.ritmForm.get('subCategory')?.valueChanges.subscribe(subCategoryId => {
      this.loadSupportGroup(subCategoryId);
    });

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
          this.loadCategories();
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

  private loadCategories(): void {
    this.categoryService.getAllCategories(this.businessPartnerId).subscribe({
      next: response => {
        this.categories = this.normalizeArray<CategoryMaster>(response?.attributes || response);
      },
      error: () => {
        this.categories = [];
        this.submitError = 'Unable to load category list.';
      }
    });
  }

  private loadSubCategories(categoryId: number | null): void {
    this.subCategories = [];
    this.ritmForm.get('subCategory')?.reset('', { emitEvent: false });
    this.ritmForm.get('assignmentGroup')?.reset('', { emitEvent: false });
    this.assignmentGroupId = null;
    if (!categoryId) {
      return;
    }
    this.categoryService.getSubCategories(categoryId).subscribe({
      next: response => {
        this.subCategories = this.normalizeArray<CategorySubCategory>(response?.attributes || response);
      },
      error: () => {
        this.submitError = 'Unable to load sub-category list.';
      }
    });
  }

  private loadSupportGroup(subCategoryId: number | null): void {
    this.ritmForm.get('assignmentGroup')?.reset('', { emitEvent: false });
    this.assignmentGroupId = null;
    if (!subCategoryId) {
      return;
    }
    this.supportGroupService.getSupportGroupBySubCategory(subCategoryId).subscribe({
      next: response => {
        const supportGroup = response?.attributes || response;
        const group = Array.isArray(supportGroup) ? supportGroup[0] : supportGroup;
        this.assignmentGroupId = group?.supportGroupId ?? group?.groupId ?? group?.id ?? null;
        this.ritmForm.get('assignmentGroup')?.setValue(
          group?.groupName || group?.supportGroupName || group?.name || ''
        );
      },
      error: () => {
        this.submitError = 'Unable to load assignment group.';
      }
    });
  }

  private loadUsers(): void {
    const orgId = localStorage.getItem('userOrgId') || '';
    this.ritmService.getAgents(orgId).subscribe({
      next: (users: AgentMaster[] | any) => {
        this.users = (users as any).attributes || [];
        this.setCurrentUser();
        this.setRequestedForDefault();
        this.setRequestedForLocation(this.ritmForm.get('requestedFor')?.value);
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
    this.ritmService.getAllActivePriorities(this.businessPartnerId).subscribe({
      next: (priorities: PriorityMaster[] | any) => {
        this.priorities = (priorities as any).attributes || [];
        this.selectedPriority = this.priorities.find(priority => priority.priorityId === this.ritmForm.get('priority')?.value);
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
    const matchedUser = this.users.find(user => user.agentId === Number(currentUserId));
    this.currentUser = matchedUser || this.users[0];
  }

  private setRequestedForDefault(): void {
    if (!this.ritmForm.get('requestedFor')?.value && this.currentUser) {
      this.ritmForm.get('requestedFor')?.setValue(this.currentUser.agentId);
    }
  }

  public setRequestedForLocation(requestedForId: number): void {
    const normalizedRequestedForId = Number(requestedForId);
    this.removeExcludedWatchListUsers(normalizedRequestedForId);
    const user = this.users.find(item => item.agentId === normalizedRequestedForId);
    if (user) {
      this.ritmForm.patchValue({
        location: user.city?.cityName || user.country?.countryName || '',
        availabilityTime: this.formatAvailabilityTime(user.calendar?.workFrom, user.calendar?.workTo),
        currentTime: this.getLocalTime(user.city?.timezone)
      });
      this.startCurrentTimeTicker(user.city?.timezone);
    }
  }

  get watchListUsers(): AgentMaster[] {
    const requestedForId = Number(this.ritmForm.get('requestedFor')?.value);
    const openedBy = `${this.ritmForm.get('openedBy')?.value || ''}`.trim().toLowerCase();

    return this.users.filter(user => {
      if (user.agentId === requestedForId || user.agentId === this.currentUser?.agentId) {
        return false;
      }

      const identityValues = [
        `${user.agentId}`,
        user.agentName,
        user.accessId,
        `${user.agentName} (${user.accessId})`
      ].map(value => `${value || ''}`.trim().toLowerCase());

      return !openedBy || !identityValues.includes(openedBy);
    });
  }

  private removeExcludedWatchListUsers(requestedForId = Number(this.ritmForm.get('requestedFor')?.value)): void {
    const allowedIds = new Set(this.watchListUsers.map(user => user.agentId));
    const selectedIds = this.normalizeWatchListIds(this.ritmForm.get('watchList')?.value || []);
    this.ritmForm.get('watchList')?.setValue(
      selectedIds.filter((agentId: number) => allowedIds.has(agentId) && agentId !== requestedForId),
      { emitEvent: false }
    );
  }

  private normalizeWatchListIds(value: unknown): number[] {
    const items = Array.isArray(value) ? value : [];

    return [...new Set(items
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>;
          const nestedAgent = typeof record['agent'] === 'object' && record['agent'] !== null
            ? record['agent'] as Record<string, unknown>
            : null;

          return record['agentId'] ?? record['id'] ?? nestedAgent?.['agentId'];
        }
        return item;
      })
      .map(id => Number(id))
      .filter((id) => !Number.isNaN(id) && id > 0))];
  }

  ngOnDestroy(): void {
    this.stopCurrentTimeTicker();
  }

  private startCurrentTimeTicker(timezone?: string): void {
    this.stopCurrentTimeTicker();
    if (!timezone) {
      return;
    }
    this.currentTimeTimer = setInterval(() => {
      this.ritmForm.get('currentTime')?.setValue(this.getLocalTime(timezone));
    }, 1000);
  }

  private stopCurrentTimeTicker(): void {
    if (this.currentTimeTimer) {
      clearInterval(this.currentTimeTimer);
      this.currentTimeTimer = null;
    }
  }

  private formatAvailabilityTime(workFrom?: string, workTo?: string): string {
    if (!workFrom || !workTo) {
      return '';
    }
    return `${workFrom} - ${workTo}`;
  }

  private getLocalTime(timezone?: string): string {
    if (!timezone) {
      return '';
    }
    try {
      return new Date().toLocaleString('en-US', {
        timeZone: timezone,
        hour12: true,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error getting local time:', error);
      return '';
    }
  }

  public get currentUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  private applyFormDefaults(): void {
    const requestedForId = this.currentUser?.agentId || '';

    this.ritmForm.patchValue({
      openedBy: this.getCurrentUserDisplayName(),
      requestedFor: requestedForId,
      location: this.currentUser?.city?.cityName || this.currentUser?.country?.countryName || ''
    });
    this.generateRitmNumber();

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
          location: item.location || this.currentUser?.city?.cityName || this.currentUser?.country?.countryName || '',
          availabilityTime: this.formatAvailabilityTime(this.currentUser?.calendar?.workFrom, this.currentUser?.calendar?.workTo),
          currentTime: this.getLocalTime(this.currentUser?.city?.timezone),
          category: item.categoryId ?? item.category?.categoryId ?? (item.category || ''),
          subCategory: item.subCategoryId ?? item.subCategory?.subCategoryId ?? item.subCategory?.id ?? '',
          assignmentGroup: item.assignmentGroup || '',
          priority: item.priority || '',
          watchList: this.normalizeWatchListIds(item.watchList || []),
          shortDescription: item.shortDescription || '',
          description: item.description || '',
          stepsToReproduce: item.stepsToReproduce || '',
          otherNotes: item.otherNotes || ''
        });
        this.assignmentGroupId = item.supportGroupId
          ?? item.assignmentGroupId
          ?? item.assignmentGroup?.supportGroupId
          ?? item.assignmentGroup?.groupId
          ?? item.assignmentGroup?.id
          ?? (typeof item.assignmentGroup === 'number' ? item.assignmentGroup : null);
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
      return `${this.currentUser.agentName} (${this.currentUser.accessId})`.trim();
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

  get currentRoleIsAdmin(): boolean {
    return this.role?.toLowerCase() === 'admin';
  }

  get selectedWatchers(): AgentMaster[] {
    const selectedIds = new Set(this.normalizeWatchListIds(this.ritmForm.get('watchList')?.value || []));
    return this.users.filter(user => selectedIds.has(user.agentId));
  }

  get filteredWatchListUsers(): AgentMaster[] {
    const searchText = (this.watchListSearch || '').trim().toLowerCase();
    return this.watchListUsers.filter(user => {
      if (!searchText) {
        return true;
      }
      const searchValue = [user.agentName, user.accessId, user.mailId]
        .map(value => `${value || ''}`.trim().toLowerCase())
        .join(' ');
      return searchValue.includes(searchText);
    });
  }

  toggleWatchListUser(agentId: number): void {
    const selectedIds: number[] = this.normalizeWatchListIds(this.ritmForm.get('watchList')?.value || []);
    const alreadySelected = selectedIds.includes(agentId);
    const updatedIds = alreadySelected
      ? selectedIds.filter(id => id !== agentId)
      : [...selectedIds, agentId];

    this.ritmForm.get('watchList')?.setValue(updatedIds);
  }

  toggleRequestDetails(): void {
    this.requestDetailsExpanded = !this.requestDetailsExpanded;
  }

  isWatchSelected(agentId: number): boolean {
    return this.normalizeWatchListIds(this.ritmForm.get('watchList')?.value || []).includes(agentId);
  }

  showRequiredError(controlName: string): boolean {
    const control = this.ritmForm.get(controlName);
    return this.formSubmitted && control?.invalid && control?.errors?.['required'];
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.attachmentFiles = files;
    this.ritmForm.patchValue({ attachments: files.map(file => file.name) });
    this.ritmForm.get('attachments')?.markAsDirty();
  }

  onSubmit(): void {
    this.formSubmitted = true;
    this.submitError = '';
    this.submitSuccess = '';

    if (this.ritmForm.invalid) {
      this.ritmForm.markAllAsTouched();
      this.submitError = 'Please correct the highlighted fields before saving.';
      return;
    }

    this.submitting = true;
    const rawValues = this.ritmForm.getRawValue();
    const formValues = {
      ...rawValues,
      openedBy: this.currentUser?.agentId ?? Number(localStorage.getItem('userId') || 0),
      assignmentGroup: this.assignmentGroupId,
      requestType: 'RITM',
      watchList: this.normalizeWatchListIds(rawValues.watchList),
      orgId: Number(this.orgId),
      createdBy: Number(localStorage.getItem('userId') || 0),
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isCreatorAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdaterAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };
    const payload = new FormData();

    payload.append(
      'ritm',
      new Blob(
        [JSON.stringify(formValues)],
        { type: 'application/json' }
      )
    );

    this.attachmentFiles.forEach(file => {
      payload.append('files', file, file.name);
    });
    console.log('Submitting RITM with payload:', payload);
    this.ritmService.createRitm(payload).subscribe({
      next: (response: any) => {
        this.submitSuccess = this.isEditMode ? 'RITM updated successfully.' : 'RITM created successfully.';
        this.submitting = false;
        if (!this.isEditMode) {
          const createdRitm = response?.attributes || response || {};
          this.successRitmDetails = this.buildSuccessRitmDetails(createdRitm, rawValues);
          this.showSuccessScreen = true;
          this.applyFormDefaults();
          this.ritmForm.get('category')?.reset();
          this.ritmForm.get('subCategory')?.reset();
          this.ritmForm.get('assignmentGroup')?.reset();
          this.ritmForm.get('priority')?.reset();
          this.ritmForm.get('watchList')?.reset([]);
          this.ritmForm.get('shortDescription')?.reset();
          this.ritmForm.get('description')?.reset();
          this.ritmForm.get('stepsToReproduce')?.reset();
          this.ritmForm.get('otherNotes')?.reset();
        }
      },
      error: err => {
        this.submitError = err?.error?.message || 'Failed to save RITM. Please try again.';
        this.submitting = false;
        console.error(err);
      }
    });
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
    this.router.navigate(['/settings']);
  }

  private buildSuccessRitmDetails(createdRitm: any, rawValues: any): any {
    const item = createdRitm || {};
    const category = item.category || this.categories.find(category => `${category.categoryId}` === `${rawValues.category}`);
    const subCategory = item.subCategory || this.subCategories.find(subCategory => `${subCategory.subCategoryId}` === `${rawValues.subCategory}`);
    const priority = item.priority || this.priorities.find(priority => Number(priority.priorityId) === Number(rawValues.priority));
    const supportGroup = item.supportGroup || item.assignmentGroup || {};
    const requestedBy = item.requestedBy || this.currentUser || {};
    const requestedFor = item.requestedFor || this.users.find(user => user.agentId === Number(rawValues.requestedFor)) || {};
    const assignedTo = item.assignedTo || requestedFor;
    const watchlist = item.watchlist || item.watchList || [];
    const attachments = item.ritmAttachments || item.attachments || [];

    return {
      ...item,
      ritmNumber: item.ritmNumber || item.requestNumber || rawValues.ritmNumber,
      status: item.status || 'OPEN',
      createdOn: item.createdOn || item.createdAt || item.requestedAt || new Date(),
      categoryName: this.readDisplayName(category, ['categoryName', 'name']) || rawValues.category,
      subCategoryName: this.readDisplayName(subCategory, ['subCategoryName', 'name']) || rawValues.subCategory,
      requestedByName: this.readDisplayName(requestedBy, ['agentName', 'name']),
      requestedForName: this.readDisplayName(requestedFor, ['agentName', 'name']) || this.getRequestedForDisplayName(),
      assignedToName: this.readDisplayName(assignedTo, ['agentName', 'name']),
      priorityName: this.readDisplayName(priority, ['code', 'level', 'description']) || item.priorityName || rawValues.priority,
      assignmentGroupName: this.readDisplayName(supportGroup, ['groupName', 'supportGroupName', 'name']) || rawValues.assignmentGroup,
      watchlist,
      ritmAttachments: attachments,
      comments: item.comments || [],
      audits: item.audits || []
    };
  }

  private readDisplayName(source: any, keys: string[]): string {
    if (source == null || source === '') {
      return '';
    }
    if (typeof source === 'string' || typeof source === 'number' || typeof source === 'boolean') {
      return `${source}`;
    }
    if (Array.isArray(source)) {
      return source.map(item => this.readDisplayName(item, keys)).filter(Boolean).join(', ');
    }
    if (typeof source === 'object') {
      for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== '') {
          return this.readDisplayName(value, keys);
        }
      }
      for (const key of ['agentName', 'categoryName', 'subCategoryName', 'groupName', 'supportGroupName', 'name', 'code', 'description', 'level']) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== '') {
          return this.readDisplayName(value, [key]);
        }
      }
    }
    return '';
  }

  private getRequestedForDisplayName(): string {
    const requestedForId = this.ritmForm.get('requestedFor')?.value;
    const user = this.users.find(item => item.agentId === Number(requestedForId));
    return user ? `${user.agentName}`.trim() : `${requestedForId || ''}`;
  }

  get successCreatedOnLabel(): string {
    const source = this.successRitmDetails?.createdOn || this.successRitmDetails?.createdAt || this.successRitmDetails?.requestedAt;
    return this.formatSuccessDate(source) || '—';
  }

  get successRequestFields(): Array<{ label: string; value: string; icon: string; iconClass: string; className?: string }> {
    const data = this.successRitmDetails || {};
    const requestedFor = this.normalizeSuccessValue(data.requestedForName || data.requestedFor || this.getRequestedForDisplayName());
    const category = this.normalizeSuccessValue(data.categoryName || data.category);
    const subCategory = this.normalizeSuccessValue(data.subCategoryName || data.subCategory);
    const priority = this.normalizeSuccessValue(data.priorityName || data.priority);
    const supportGroup = this.normalizeSuccessValue(data.assignmentGroupName || data.assignmentGroup);
    const requestedBy = this.normalizeSuccessValue(data.requestedByName || data.requestedBy || this.currentUser?.agentName);
    const description = this.normalizeSuccessValue(data.description);
    const steps = this.normalizeSuccessValue(data.stepsToReproduce);
    const notes = this.normalizeSuccessValue(data.otherNotes);
    const shortDescription = this.normalizeSuccessValue(data.shortDescription);

    return [
      { label: 'Requested For', value: requestedFor, icon: '◔', iconClass: 'primary', className: '' },
      { label: 'Category', value: category, icon: '▣', iconClass: 'muted', className: '' },
      { label: 'Support Group', value: supportGroup, icon: '◍', iconClass: 'soft', className: '' },
      { label: 'Description', value: description || shortDescription, icon: '☰', iconClass: 'muted', className: 'multiline-value' },
      { label: 'Status', value: this.normalizeSuccessValue(data.status || 'OPEN'), icon: '◉', iconClass: 'success', className: 'status-pill success-state-pill' },
      { label: 'Priority', value: priority || '—', icon: '◢', iconClass: 'warning', className: 'priority-pill' },
      { label: 'Requested At', value: this.formatSuccessDate(data.requestedAt || data.createdAt) || '—', icon: '◫', iconClass: 'soft', className: '' },
      { label: 'Created On', value: this.successCreatedOnLabel, icon: '◧', iconClass: 'primary', className: '' },
      { label: 'Requested By', value: requestedBy || '—', icon: '◐', iconClass: 'muted', className: '' },
      { label: 'Sub category', value: subCategory || '—', icon: '◎', iconClass: 'soft', className: '' },
      { label: 'Steps to Reproduce', value: steps || '—', icon: '⇢', iconClass: 'muted', className: 'multiline-value' },
      { label: 'Other Notes', value: notes || '—', icon: '✎', iconClass: 'soft', className: 'multiline-value' }
    ];
  }

  private normalizeSuccessValue(value: unknown): string {
    if (value == null || value === '') {
      return '';
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toLocaleString();
    }

    if (typeof value === 'object') {
      if ('agentName' in value && typeof value['agentName'] === 'string') {
        return value['agentName'];
      }
      return JSON.stringify(value);
    }

    return String(value);
  }

  private formatSuccessDate(value: unknown): string {
    if (!value) {
      return '';
    }

    const dateValue = new Date(value as string | number | Date);
    if (Number.isNaN(dateValue.getTime())) {
      return this.normalizeSuccessValue(value);
    }

    return dateValue.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  get requestedForControl() {
    return this.ritmForm.get('requestedFor');
  }
}
