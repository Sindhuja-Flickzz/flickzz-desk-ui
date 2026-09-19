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
import { VariantService } from '../../service/variant.service';
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
  ritmStatuses: any[] = [];
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
  templates: any[] = [];
  expandedTemplates: Record<string, boolean> = {};
  templatesLoading = false;
  private fieldTypeMap = new Map<number, string>();
  private existingTemplateDetails: any[] = [];
  private existingStatusValue: any = null;

  constructor(
    private fb: FormBuilder,
    private ritmService: RitmService,
    private companyService: CompanyService,
    private categoryService: CategoryService,
    private supportGroupService: SupportGroupService,
    private variantService: VariantService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.orgId = localStorage.getItem('userOrgId') || '';
   }

  ngOnInit(): void {
    this.initializeForms();
    this.initializePage();
    this.loadTemplateDetails();
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
      ritmNumber: [{ value: '', disabled: true }],
      openedBy: [{ value: '', disabled: true }],
      requestedFor: ['', Validators.required],
      location: [{ value: '', disabled: true }],
      availabilityTime: [{ value: '', disabled: true }],
      currentTime: [{ value: '', disabled: true }],
      category: ['', Validators.required],
      subCategory: ['', Validators.required],
      assignmentGroup: [''],
      priority: ['', Validators.required],
      status: [''],
      assignedTo: [''],
      watchList: [],
      attachments: [[]]
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
    this.loadRitmStatuses();

    const id = this.route.snapshot.queryParamMap.get('id');
    const navigationState = this.router.getCurrentNavigation()?.extras?.state as { ritmData?: any } | undefined;
    const existingRitmData = navigationState?.ritmData || history.state?.ritmData;

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
      if (existingRitmData) {
        this.populateFormFromRitm(existingRitmData);
      } else {
        this.loadRitmDetails(id);
      }
    }
  }

  private loadTemplateDetails(): void {
    this.templatesLoading = true;
    this.variantService.getFieldTypeList(this.orgId).subscribe({
      next: response => {
        const fieldTypes = this.normalizeArray<any>(response?.attributes || response);
        this.fieldTypeMap = new Map(fieldTypes.map(fieldType => [
          Number(fieldType.typeId),
          String(fieldType.code || fieldType.label || '')
        ]));
        this.fetchRitmTemplateDetails();
      },
      error: () => this.fetchRitmTemplateDetails()
    });
  }

  private fetchRitmTemplateDetails(): void {
    this.variantService.getRitmTemplateDetails(this.orgId).subscribe({
      next: response => {
        const templates = this.normalizeArray<any>(response?.attributes || response);
        this.templates = templates.map(template => ({
          ...template,
          templateDetails: this.normalizeArray<any>(template?.templateDetails || template?.details).map(field => ({
            ...field,
            value: this.getExistingTemplateValue(field),
            defaultApplied: false
          }))
        }));
        this.applyExistingTemplateValues();
        this.templatesLoading = false;
      },
      error: error => {
        this.templates = [];
        this.templatesLoading = false;
        this.submitError = 'Unable to load RITM template details.';
      }
    });
  }

  getTemplateFields(template: any): any[] {
    return Array.isArray(template?.templateDetails) ? template.templateDetails : [];
  }

  getTemplateKey(template: any, index: number): string {
    return String(template?.templateId ?? template?.templateName ?? index) + ':' + index;
  }

  isTemplateExpanded(template: any, index: number): boolean {
    return this.expandedTemplates[this.getTemplateKey(template, index)] === true;
  }

  toggleTemplate(template: any, index: number): void {
    const key = this.getTemplateKey(template, index);
    this.expandedTemplates[key] = !this.isTemplateExpanded(template, index);
  }

  getFieldType(field: any): string {
    const fieldType = field?.fieldTypeCode || field?.fieldTypeLabel || field?.fieldType
      || this.fieldTypeMap.get(Number(field?.fieldTypeId)) || field?.fieldTypeId || 'TEXTBOX';
    return String(fieldType).toUpperCase().replace(/[-\s]/g, '_');
  }

  getFieldOptions(field: any): any[] {
    return Array.isArray(field?.options) ? field.options : [];
  }

  hasDefaultValue(field: any): boolean {
    return field?.defaultValue !== null && field?.defaultValue !== undefined && String(field.defaultValue) !== '';
  }

  applyDefaultValue(field: any): void {
    if (this.hasDefaultValue(field)) {
      field.value = field.defaultValue;
      field.defaultApplied = true;
      field.userValue = '';
      field.templateError = '';
    }
  }

  isFieldLocked(field: any): boolean {
    return field?.defaultApplied === true && field?.editable === false;
  }

  private getExistingTemplateValue(field: any): any {
    const existingDetails = this.existingTemplateDetails;
    if (Array.isArray(existingDetails)) {
      const existing = existingDetails.find((item: any) => Number(item?.fieldId) === Number(field?.fieldId));
      return existing?.value ?? existing?.fieldValue ?? '';
    }
    return '';
  }

  private applyExistingTemplateValues(): void {
    this.templates.forEach(template => this.getTemplateFields(template).forEach(field => {
      const value = this.getExistingTemplateValue(field);
      if (value !== '') {
        field.value = value;
      }
    }));
  }

  private getTemplatePayload(): any[] {
    return this.templates.flatMap(template => this.getTemplateFields(template).map(field => ({
      fieldId: field.fieldId,
      value: this.getUserTemplateValue(field)
    })));
  }

  private getUserTemplateValue(field: any): any {
    return field.defaultApplied ? field.userValue : (field.userValue ?? field.value ?? '');
  }

  isMandatoryTemplateField(field: any): boolean {
    return field?.mandatory === true || field?.mandatory === 'true' || field?.isMandatory === true;
  }

  onTemplateFieldChange(field: any, value: any): void {
    field.userValue = value;
    field.templateError = '';
  }

  private validateTemplateFields(): boolean {
    let isValid = true;
    this.templates.forEach(template => this.getTemplateFields(template).forEach(field => {
      field.templateError = '';
      if (this.isMandatoryTemplateField(field)) {
        const value = this.getUserTemplateValue(field);
        const isEmpty = value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
        if (isEmpty) {
          field.templateError = `${field.fieldName || 'This field'} is required.`;
          isValid = false;
        }
      }
    }));
    return isValid;
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
        // this.loadSupportTabs();
      },
      error: (err: unknown) => {
        this.submitError = 'Unable to load user list.';
        console.error(err);
      }
    });
  }

  private loadRitmStatuses(): void {
    this.ritmService.getRitmStatuses(this.orgId).subscribe({
      next: (response: any) => {
        const statuses = response?.attributes ?? response ?? [];
        this.ritmStatuses = Array.isArray(statuses) ? statuses : [];
        this.applyExistingStatusValue();
      },
      error: () => {
        this.ritmStatuses = [];
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

          const watchedBy = typeof record['watchedBy'] === 'object' && record['watchedBy'] !== null
            ? record['watchedBy'] as Record<string, unknown>
            : null;

          const watchedAgent = typeof record['watcher'] === 'object' && record['watcher'] !== null
            ? record['watcher'] as Record<string, unknown>
            : null;

          return record['agentId']
            ?? record['id']
            ?? nestedAgent?.['agentId']
            ?? nestedAgent?.['id']
            ?? watchedBy?.['agentId']
            ?? watchedBy?.['id']
            ?? watchedAgent?.['agentId']
            ?? watchedAgent?.['id'];
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

  private populateFormFromRitm(item: any): void {
    const ritm = item?.attributes || item || {};
    this.existingTemplateDetails = ritm.templateDetails || ritm.templateFields || [];
    this.applyExistingTemplateValues();
    console.log('Populating form with RITM data:', ritm);
    this.ritmForm.patchValue({
      ritmNumber: ritm.ritmNumber || '',
      openedBy: ritm.openedBy || this.getCurrentUserDisplayName(),
      requestedFor: ritm.requestedFor.agentId,
      location: ritm.location || this.currentUser?.city?.cityName || this.currentUser?.country?.countryName || '',
      availabilityTime: this.formatAvailabilityTime(this.currentUser?.calendar?.workFrom, this.currentUser?.calendar?.workTo),
      currentTime: this.getLocalTime(this.currentUser?.city?.timezone),
      category: ritm.categoryId ?? ritm.category?.categoryId ?? (ritm.category || ''),
      subCategory: ritm.subCategoryId ?? ritm.subCategory?.subCategoryId ?? ritm.subCategory?.id ?? '',
      assignmentGroup: ritm.assignmentGroup || '',
      priority: ritm.priority.priorityId || '',
      status: '',
      assignedTo: this.getAssignedAgentId(ritm.assignedTo ?? ritm.assignedToId),
      watchList: this.normalizeWatchListIds(ritm.watchlist || []),
      shortDescription: ritm.shortDescription || '',
      description: ritm.description || '',
      stepsToReproduce: ritm.stepsToReproduce || '',
      otherNotes: ritm.otherNotes || ''
    });
    this.existingStatusValue = ritm.status ?? ritm.statusId ?? ritm.statusCode ?? '';
    this.applyExistingStatusValue();
    this.assignmentGroupId = ritm.supportGroupId
      ?? ritm.assignmentGroupId
      ?? ritm.assignmentGroup?.supportGroupId
      ?? ritm.assignmentGroup?.groupId
      ?? ritm.assignmentGroup?.id
      ?? (typeof ritm.assignmentGroup === 'number' ? ritm.assignmentGroup : null);

    if (!ritm.ritmNumber) {
      this.generateRitmNumber();
    }
    this.loading = false;
  }

  private getRitmStatusValue(status: any): string {
    if (status && typeof status === 'object') {
      return String(status.statusCode ?? status.statusName ?? status.name ?? status.statusId ?? '');
    }
    return status == null ? '' : String(status);
  }

  private applyExistingStatusValue(): void {
    if (this.existingStatusValue === null || this.existingStatusValue === undefined || this.existingStatusValue === '') {
      return;
    }

    const existingStatus = this.existingStatusValue;
    const statusId = existingStatus && typeof existingStatus === 'object'
      ? existingStatus.statusId ?? existingStatus.id
      : existingStatus;
    const statusCode = this.getRitmStatusValue(existingStatus);
    const matchingStatus = this.ritmStatuses.find(status =>
      (statusId != null && String(status.statusId ?? status.id) === String(statusId))
      || (statusCode && String(status.statusCode ?? status.statusName ?? status.name).toLowerCase() === statusCode.toLowerCase())
    );

    if (matchingStatus) {
      this.ritmForm.get('status')?.setValue(
        String(matchingStatus.statusId ?? matchingStatus.id)
      );
    }
  }

  private getAssignedAgentId(assignedTo: any): number | string {
    if (assignedTo && typeof assignedTo === 'object') {
      return assignedTo.agentId ?? assignedTo.id ?? assignedTo.userId ?? '';
    }
    return assignedTo ?? '';
  }

  private loadRitmDetails(ritmId: string): void {
    this.loading = true;
    this.ritmService.getRitmById(ritmId).subscribe({
      next: (response: any) => {
        const item = response?.attributes || response || {};
        this.populateFormFromRitm(item);
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

    if (!this.validateTemplateFields()) {
      this.submitError = 'Please provide values for all mandatory template fields.';
      return;
    }

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
      isUpdaterAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      status: this.isEditMode && rawValues.status !== '' && rawValues.status !== null
        ? Number(rawValues.status)
        : rawValues.status,
      ...(this.isEditMode ? { ritmId: Number(this.ritmId) } : {}),
      templateDetails: this.getTemplatePayload()
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

    const saveRequest$ = this.isEditMode
      ? this.ritmService.updateRitm(payload)
      : this.ritmService.createRitm(payload);

    saveRequest$.subscribe({
      next: (response: any) => {
        this.submitSuccess = this.isEditMode ? 'RITM updated successfully.' : 'RITM created successfully.';
        this.submitting = false;
        if (!this.isEditMode) {
          const createdRitm = response?.attributes || response || {};
          this.successRitmDetails = this.buildSuccessRitmDetails(createdRitm, rawValues);
          console.log('RITM created successfully:', this.successRitmDetails);
          this.showSuccessScreen = true;
          this.applyFormDefaults();
          this.ritmForm.get('category')?.reset();
          this.ritmForm.get('subCategory')?.reset();
          this.ritmForm.get('assignmentGroup')?.reset();
          this.ritmForm.get('priority')?.reset();
          this.ritmForm.get('watchList')?.reset([]);
          this.ritmForm.get('shortDescription')?.reset();
          this.ritmForm.get('description')?.reset();
          this.ritmForm.get('stepsToReProduce')?.reset();
          this.ritmForm.get('otherNotes')?.reset();
        }
      },
      error: err => {
        this.submitError = err?.error?.description || 'Failed to save RITM. Please try again.';
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

  get successLongTextBlocks(): Array<{ label: string; value: string }> {
    const data = this.successRitmDetails || {};
    const blocks = [
      { label: 'Description', value: this.normalizeSuccessValue(data.description || data.shortDescription) },
      { label: 'Steps to Reproduce', value: this.normalizeSuccessValue(data.stepsToReproduce) },
      { label: 'Other Notes', value: this.normalizeSuccessValue(data.otherNotes) }
    ];

    return blocks.filter(block => !!block.value);
  }

  get successTemplateGroups(): Array<{ templateName: string; fields: Array<{ fieldName: string; value: string }> }> {
    const details = this.successRitmDetails?.templateDetails || this.successRitmDetails?.templateFields || [];
    const flatDetails = this.normalizeTemplateDetails(details);
    const groups = new Map<string, Array<{ fieldName: string; value: string }>>();

    flatDetails.forEach((field: any) => {
      const value = this.normalizeSuccessValue(field.value ?? field.fieldValue ?? field.defaultValue);
      if (!value) {
        return;
      }

      const templateName = field.templateName || field.template?.templateName || 'Request Details';
      const fields = groups.get(templateName) || [];
      fields.push({
        fieldName: field.fieldName || field.label || `Field ${field.fieldId || ''}`,
        value
      });
      groups.set(templateName, fields);
    });

    return Array.from(groups.entries()).map(([templateName, fields]) => ({ templateName, fields }));
  }

  get successWatchlist(): string[] {
    const watchlist = this.successRitmDetails?.watchlist || this.successRitmDetails?.watchList || [];
    return this.normalizeWatchlistDisplay(watchlist);
  }

  private normalizeWatchlistDisplay(watchlist: any): string[] {
    return this.normalizeArray<any>(watchlist).map(watcher => {
      if (watcher == null) {
        return '';
      }
      watcher = watcher.watchedBy;
      if (typeof watcher !== 'object') {
        const user = this.users.find(item => Number(item.agentId) === Number(watcher));
        return user ? `${user.agentName} (${user.accessId})` : String(watcher);
      }
      return watcher.agentName
        ? `${watcher.agentName}${watcher.accessId ? ` (${watcher.accessId})` : ''}`
        : watcher.name || watcher.watcherName || watcher.accessId || watcher.agentId || '';
    }).filter(Boolean);
  }

  private normalizeTemplateDetails(details: any): any[] {
    const items = this.normalizeArray<any>(details);
    return items.flatMap(item => {
      if (Array.isArray(item?.templateDetails) || Array.isArray(item?.details)) {
        return this.normalizeArray<any>(item.templateDetails || item.details).map(field => ({
          ...field,
          templateName: field.templateName || item.templateName
        }));
      }
      return [item];
    });
  }

  get successRequestFields(): Array<{ label: string; value: string; icon: string; iconClass: string; className?: string }> {
    const data = this.successRitmDetails || {};
    const requestedFor = this.normalizeSuccessValue(data.requestedForName || data.requestedFor || this.getRequestedForDisplayName());
    const category = this.normalizeSuccessValue(data.categoryName || data.category);
    const subCategory = this.normalizeSuccessValue(data.subCategoryName || data.subCategory);
    const priority = this.normalizeSuccessValue(data.priorityName || data.priority);
    const supportGroup = this.normalizeSuccessValue(data.assignmentGroupName || data.assignmentGroup);
    const requestedBy = this.normalizeSuccessValue(data.requestedByName || data.requestedBy || this.currentUser?.agentName);
    const assignedTo = this.normalizeSuccessValue(data.assignedTo);
    // const expectedResolution = this.normalizeSuccessValue(data.expectedResolution);

    return [
      { label: 'Requested For', value: requestedFor || '—', icon: '◔', iconClass: 'primary', className: '' },
      { label: 'Status', value: this.normalizeSuccessValue(data.status?.statusCode || 'OPEN'), icon: '◉', iconClass: 'success', className: 'status-pill' },
      { label: 'Priority', value: priority || '—', icon: '◢', iconClass: 'warning', className: 'priority-pill' },
      { label: 'Created On', value: this.successCreatedOnLabel, icon: '◧', iconClass: 'primary', className: '' },
      { label: 'Requested By', value: requestedBy || '—', icon: '◐', iconClass: 'muted', className: '' },
      { label: 'Assigned To', value: assignedTo || '—', icon: '◍', iconClass: 'soft', className: '' },
      { label: 'Category', value: category || '—', icon: '▣', iconClass: 'muted', className: '' },
      { label: 'Sub Category', value: subCategory || '—', icon: '◎', iconClass: 'soft', className: '' },
      { label: 'Support Group', value: supportGroup || '—', icon: '◍', iconClass: 'soft', className: '' },
      { label: 'Requested At', value: this.formatSuccessDate(data.requestedAt || data.createdAt) || '—', icon: '◫', iconClass: 'soft', className: '' },
      // { label: 'Expected Resolution', value: expectedResolution || '—', icon: '◐', iconClass: 'muted', className: '' },
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
