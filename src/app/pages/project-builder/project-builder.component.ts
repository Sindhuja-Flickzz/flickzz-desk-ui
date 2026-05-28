import { Component, HostListener, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { PageEvent } from '@angular/material/paginator';
import { CompanyMaster } from '../../models/company-master';
import { CompanyService } from '../../service/company.service';
import { ProjectService } from '../../service/project.service';
import { ProjectCreateRequest, ProjectVO } from '../../models/project-builder';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project-builder',
  templateUrl: './project-builder.component.html',
  styleUrls: ['./project-builder.component.scss']
})
export class ProjectBuilderComponent implements OnInit {
  activeTab: 'create' | 'list' = 'create';
  currentStep = 1;
  selectedEpicIndex = 0;
  selectedUserStoryIndex: number | null = null;
  selectedTaskIndex: number | null = null;
  isMobile = false;
  isSidebarOpen = true;
  builderForm: FormGroup;
  companies: CompanyMaster[] = [];
  projects: ProjectVO[] = [];
  filteredProjects: ProjectVO[] = [];
  selectedProjectForView?: ProjectVO;

  searchValue = '';
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;
  isEditMode = false;
  editingProjectId: number | null = null;
  editingProject?: ProjectVO;
  currentSortField: 'projectName' | 'company' | 'plannedStartDate' | 'plannedEndDate' | null = null;
  currentSortDirection: 'asc' | 'desc' = 'asc';

  submitError = '';
  submitSuccess = '';
  isSubmitting = false;
  loading = false;
  orgId = '';

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private projectService: ProjectService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.orgId = localStorage.getItem('userOrgId') || '';
    this.builderForm = this.fb.group({
      projectName: ['', Validators.required],
      projectDesc: [''],
      epics: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.addEpic();
    this.loadCompanies();
    this.checkScreenSize();
    // this.loadProjectList();

    this.builderForm.valueChanges.subscribe(() => {
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.isSidebarOpen = false;
    } else {
      this.isSidebarOpen = true;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  get epics(): FormArray {
    return this.builderForm.get('epics') as FormArray;
  }

  get createTabLabel(): string {
    return this.isEditMode ? 'Edit' : 'Create';
  }

  userStories(epicIndex: number): FormArray {
    return this.epics.at(epicIndex).get('userStories') as FormArray;
  }

  get selectedEpic(): FormGroup {
    return this.epics.at(this.selectedEpicIndex) as FormGroup;
  }

  get selectedUserStory(): FormGroup | null {
    if (this.selectedUserStoryIndex === null) return null;
    return this.userStories(this.selectedEpicIndex).at(this.selectedUserStoryIndex) as FormGroup;
  }

  selectEpic(index: number): void {
    this.selectedEpicIndex = index;
    this.selectedUserStoryIndex = null;
  }

  selectUserStory(epicIndex: number, userStoryIndex: number): void {
    this.selectedEpicIndex = epicIndex;
    this.selectedUserStoryIndex = userStoryIndex;

    if (this.currentStep === 3) {
      const selectedStory = this.selectedUserStory;
      selectedStory?.markAsUntouched();
    }
  }

  createTaskForm(taskId: string = ''): FormGroup {
    return this.fb.group({
      taskId: [taskId],
      taskName: ['', Validators.required],
      leadIds: [[]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      predecessorTaskName: [null],
      predecessorId: [null]
    });
  }

  createUserStoryForm(userStoryId: string = ''): FormGroup {
    return this.fb.group({
      userStoryId: [userStoryId],
      userStoryName: ['', Validators.required],
      leadIds: [[], Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      predecessorUserStoryName: [null],
      tasks: this.fb.array([this.createTaskForm(`${userStoryId}.1`)])
    });
  }

  tasks(epicIndex: number, userStoryIndex: number): FormArray {
    return this.userStories(epicIndex).at(userStoryIndex).get('tasks') as FormArray;
  }

  createEpicForm(): FormGroup {
    return this.fb.group({
      epicName: ['', Validators.required],
      epicDesc: [''],
      epicSequence: [this.epics.length + 1],
      userStories: this.fb.array([this.createUserStoryForm(`${this.epics.length + 1}.1`)])
    });
  }

  addEpic(): void {
    this.epics.push(this.createEpicForm());
    this.syncEpicSequences();
    this.selectedEpicIndex = this.epics.length - 1;
    this.selectedUserStoryIndex = null;
  }

  removeEpic(index: number): void {
    if (this.epics.length <= 1) {
      return;
    }
    this.epics.removeAt(index);
    this.syncEpicSequences();
    if (this.selectedEpicIndex >= this.epics.length) {
      this.selectedEpicIndex = this.epics.length - 1;
    }
    if (this.selectedEpicIndex < 0) {
      this.selectedEpicIndex = 0;
    }
    this.selectedUserStoryIndex = null;
  }

  addUserStory(epicIndex: number): void {
    const storyArray = this.userStories(epicIndex);
    const newIndex = storyArray.length;
    storyArray.push(this.createUserStoryForm(`${epicIndex + 1}.${newIndex + 1}`));
    this.selectedEpicIndex = epicIndex;
    this.selectedUserStoryIndex = newIndex;
    this.syncUserStoryIds();
  }

  removeUserStory(epicIndex: number, userStoryIndex: number): void {
    const userStoryArray = this.userStories(epicIndex);
    if (userStoryArray.length <= 1) {
      return;
    }
    userStoryArray.removeAt(userStoryIndex);
    this.syncUserStoryIds();
    if (this.selectedUserStoryIndex !== null) {
      if (this.selectedUserStoryIndex >= userStoryArray.length) {
        this.selectedUserStoryIndex = userStoryArray.length - 1;
      }
      if (userStoryArray.length === 0) {
        this.selectedUserStoryIndex = null;
      }
    }
  }

  // addUserStory(epicIndex: number, userStoryIndex?: number): void {
  //   let targetUserStoryIndex = userStoryIndex;
  //   const stories = this.userStories(epicIndex);

  //   if (targetUserStoryIndex === undefined) {
  //     if (stories.length === 0) {
  //       this.addUserStory(epicIndex);
  //       targetUserStoryIndex = this.userStories(epicIndex).length - 1;
  //     } else {
  //       targetUserStoryIndex = this.selectedUserStoryIndex ?? 0;
  //     }
  //   }

  //   this.userStories(epicIndex, targetUserStoryIndex).push(
  //     this.createUserStoryForm(`${epicIndex + 1}.${targetUserStoryIndex + 1}.${this.userStories(epicIndex, targetUserStoryIndex).length + 1}`)
  //   );
  //   this.syncUserStoryIds();
  // }

  dropUserStory(event: CdkDragDrop<AbstractControl[]>, epicIndex: number): void {
    const stories = this.userStories(epicIndex);
    moveItemInArray(stories.controls, event.previousIndex, event.currentIndex);
    stories.updateValueAndValidity();

    if (this.selectedEpicIndex === epicIndex && this.selectedUserStoryIndex !== null) {
      const selectedIndex = this.selectedUserStoryIndex;
      if (event.previousIndex === selectedIndex) {
        this.selectedUserStoryIndex = event.currentIndex;
      } else if (event.previousIndex < selectedIndex && event.currentIndex >= selectedIndex) {
        this.selectedUserStoryIndex = selectedIndex - 1;
      } else if (event.previousIndex > selectedIndex && event.currentIndex <= selectedIndex) {
        this.selectedUserStoryIndex = selectedIndex + 1;
      }
    }

    this.syncUserStoryIds();
  }

  addTask(epicIndex: number, userStoryIndex: number): void {
    const taskArray = this.tasks(epicIndex, userStoryIndex);
    const newIndex = taskArray.length;
    taskArray.push(this.createTaskForm(`${epicIndex + 1}.${userStoryIndex + 1}.${newIndex + 1}`));
    this.selectedEpicIndex = epicIndex;
    this.selectedUserStoryIndex = userStoryIndex;
    this.syncTaskIds();
  }

  removeTask(epicIndex: number, userStoryIndex: number, taskIndex: number): void {
    const taskArray = this.tasks(epicIndex, userStoryIndex);
    taskArray.removeAt(taskIndex);
    if (this.selectedTaskIndex !== null && this.selectedTaskIndex >= taskArray.length) {
      this.selectedTaskIndex = taskArray.length - 1;
    }
    this.syncTaskIds();
  }

  dropTask(event: CdkDragDrop<AbstractControl[]>, epicIndex: number, userStoryIndex: number): void {
    const taskArray = this.tasks(epicIndex, userStoryIndex);
    moveItemInArray(taskArray.controls, event.previousIndex, event.currentIndex);
    taskArray.updateValueAndValidity();
    this.syncTaskIds();
  }

  syncTaskIds(): void {
    this.epics.controls.forEach((epic, epicIndex) => {
      const stories = epic.get('userStories') as FormArray;
      stories.controls.forEach((story, storyIndex) => {
        const tasks = story.get('tasks') as FormArray;
        tasks.controls.forEach((task, taskIndex) => {
          task.get('taskId')?.setValue(`${epicIndex + 1}.${storyIndex + 1}.${taskIndex + 1}`, { emitEvent: false });
        });
      });
    });
  }

  ensureSelectedStory(): void {
    if (this.selectedUserStoryIndex !== null) {
      return;
    }
    if (this.epics.length === 0) {
      return;
    }
    const stories = this.userStories(this.selectedEpicIndex);
    if (stories.length > 0) {
      this.selectedUserStoryIndex = 0;
    }
  }

  addLeadToUserStory(selectedLeadId: string, epicIndex: number, userStoryIndex: number, selectEl: HTMLSelectElement): void {
    if (!selectedLeadId) {
      return;
    }

    const leadControl = this.userStories(epicIndex).at(userStoryIndex).get('leadIds');
    const selectedLeadIds: number[] = Array.isArray(leadControl?.value) ? [...(leadControl?.value as number[])] : [];
    const leadIdNumber = Number(selectedLeadId);

    if (!selectedLeadIds.includes(leadIdNumber)) {
      leadControl?.setValue([...selectedLeadIds, leadIdNumber]);
    }

    selectEl.value = '';
  }

  getAvailableCompanyLeads(userStory: AbstractControl): any[] {
    const selectedIds = userStory.get('leadIds')?.value || [];
    return this.companies.filter(company => !selectedIds.includes(company.companyId));
  }

  syncEpicSequences(): void {
    this.epics.controls.forEach((epic, index) => {
      epic.get('epicSequence')?.setValue(index + 1, { emitEvent: false });
    });
  }

  syncUserStoryIds(): void {
    this.epics.controls.forEach((epic, epicIndex) => {
      const storyArray = epic.get('userStories') as FormArray;
      storyArray.controls.forEach((userStory, userStoryIndex) => {
        userStory.get('userStoryId')?.setValue(`${epicIndex + 1}.${userStoryIndex + 1}`, { emitEvent: false });
      });
    });
    this.syncTaskIds();
  }

  findUserStoryIdByName(userStoryName: string | null | undefined): string | null {
    if (!userStoryName) {
      return null;
    }

    const parts = userStoryName.split('.');
    if (parts.length < 2 || !parts[0].startsWith('Epic')) {
      return null;
    }

    const epicNumStr = parts[0].substring(4); // remove 'Epic'
    const epicNum = parseInt(epicNumStr, 10);
    if (isNaN(epicNum)) {
      return null;
    }

    const userStoryNamePart = parts.slice(1).join('.'); // in case user story name has dots
    const epicIndex = epicNum - 1;
    if (epicIndex < 0 || epicIndex >= this.epics.length) {
      return null;
    }

    const stories = this.userStories(epicIndex);
    for (let usIndex = 0; usIndex < stories.length; usIndex++) {
      const userStory = stories.at(usIndex);
      if (userStory.get('userStoryName')?.value?.trim() === userStoryNamePart.trim()) {
        return `${epicNum}.${usIndex + 1}`;
      }
    }

    return null;
  }

  loadCompanies(): void {
    if (!this.orgId) {
      this.companies = [];
      return;
    }

    this.companyService.getServiceProviderList(Number(this.orgId)).subscribe({
      next: (result) => {
        const roles = (result as any).attributes || (Array.isArray(result) ? result : []);
        this.companies = Array.isArray(roles)
          ? roles.map((role: any) => role.mappedCompany).filter((company: CompanyMaster) => !!company)
          : [];
      },
      error: () => {
        this.companies = [];
      }
    });
  }

  loadProjectList(): void {
    if (!this.orgId) {
      this.projects = [];
      return;
    }
    this.loading = true;
    this.projectService.getProjects(this.orgId).subscribe({
      next: (result) => {
        this.projects = (result as any).attributes || [];
        this.filterProjects();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load projects', err);
        this.projects = [];
        this.filterProjects();
        this.loading = false;
        this.submitError = 'Unable to fetch project list.';
      }
    });
  }

  filterProjects(): void {
    const search = this.searchValue?.trim().toLowerCase();
    this.filteredProjects = this.projects.filter(project => {
      if (!search) {
        return true;
      }
      return [project.projectName, project.projectCode, project.company?.companyName]
        .filter(Boolean)
        .some(value => value?.toLowerCase().includes(search));
    });
    this.sortFilteredProjects();
    this.totalRecords = this.filteredProjects.length;
    this.currentPage = 0;
  }

  sortBy(field: 'projectName' | 'company' | 'plannedStartDate' | 'plannedEndDate'): void {
    if (this.currentSortField === field) {
      this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSortField = field;
      this.currentSortDirection = 'asc';
    }
    this.sortFilteredProjects();
    this.currentPage = 0;
  }

  private sortFilteredProjects(): void {
    if (!this.currentSortField) {
      return;
    }

    const dir = this.currentSortDirection === 'asc' ? 1 : -1;
    this.filteredProjects.sort((a, b) => {
      let aValue: string | number | Date | null = null;
      let bValue: string | number | Date | null = null;

      switch (this.currentSortField) {
        case 'projectName':
          aValue = a.projectName || '';
          bValue = b.projectName || '';
          break;
        case 'company':
          aValue = a.company?.companyName || '';
          bValue = b.company?.companyName || '';
          break;
        case 'plannedStartDate':
          aValue = a.plannedStartDate ? new Date(a.plannedStartDate) : null;
          bValue = b.plannedStartDate ? new Date(b.plannedStartDate) : null;
          break;
        case 'plannedEndDate':
          aValue = a.plannedEndDate ? new Date(a.plannedEndDate) : null;
          bValue = b.plannedEndDate ? new Date(b.plannedEndDate) : null;
          break;
      }

      if (aValue === null && bValue === null) {
        return 0;
      }
      if (aValue === null) {
        return 1 * dir;
      }
      if (bValue === null) {
        return -1 * dir;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return (aValue.getTime() - bValue.getTime()) * dir;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return aStr.localeCompare(bStr) * dir;
    });
  }

  getSortIndicator(field: 'projectName' | 'company' | 'plannedStartDate' | 'plannedEndDate'): string {
    if (this.currentSortField !== field) {
      return '';
    }
    return this.currentSortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
  }

  getPaginatedProjects(): ProjectVO[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredProjects.slice(start, start + this.pageSize);
  }

  selectTab(tab: 'create' | 'list'): void {
    this.submitError = '';
    this.submitSuccess = '';
    if (tab === 'list') {
      this.clearEditState();
      this.resetForm();
      this.activeTab = tab;
      this.selectedProjectForView = undefined;
      this.loadProjectList();
      return;
    }

    if (tab === 'create') {
      if (!this.isEditMode) {
        this.clearEditState();
        this.resetForm();
      }
      this.activeTab = tab;
      this.currentStep = 1;
      this.selectedProjectForView = undefined;
    }
  }

  validateCreatePage(): boolean {
    this.submitError = '';
    this.builderForm.markAllAsTouched();

    if (!this.builderForm.get('projectName')?.value?.trim()) {
      this.submitError = 'Please fill in all required fields before continuing.';
      return false;
    }

    let valid = true;
    this.epics.controls.forEach((epic, epicIndex) => {
      if (!epic.get('epicName')?.value?.trim()) {
        valid = false;
      }
      const stories = this.userStories(epicIndex);
      if (!stories || stories.length === 0) {
        valid = false;
      } else {
        stories.controls.forEach(userStory => {
          if (!userStory.get('userStoryName')?.value?.trim() || !userStory.get('leadIds')?.value?.length || !userStory.get('startDate')?.value || !userStory.get('endDate')?.value) {
            valid = false;
          }
        });
      }
    });

    if (!valid) {
      this.submitError = 'All epics and user stories must be completed before proceeding.';
      return false;
    }

    return true;
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      if (!this.validateCreatePage()) {
        return;
      }
      this.currentStep = 2;
      this.selectedEpicIndex = 0;
      this.selectedUserStoryIndex = null;
      return;
    }

    if (this.currentStep === 2) {
      this.selectedEpicIndex = 0;
      this.selectedUserStoryIndex = null;
      this.ensureSelectedStory();
      this.clearTaskErrors();
      this.currentStep = 3;
      return;
    }
  }

  private clearTaskErrors(): void {
    this.epics.controls.forEach(epic => {
      const stories = epic.get('userStories') as FormArray;
      stories.controls.forEach(userStory => {
        const taskArray = userStory.get('tasks') as FormArray;
        taskArray.controls.forEach(task => task.markAsUntouched());
      });
    });
  }

  backToEdit(): void {
    if (this.currentStep === 3) {
      this.currentStep = 2;
      return;
    }
    if (this.currentStep === 2) {
      this.currentStep = 1;
    }
  }

  validateTaskStep(): { valid: boolean; missingUserStories: boolean; missingTasks: boolean } {
    this.builderForm.markAllAsTouched();
    let valid = true;
    let missingUserStories = false;
    let missingTasks = false;

    this.epics.controls.forEach((epic, epicIndex) => {
      const stories = this.userStories(epicIndex);
      if (!stories || stories.length === 0) {
        missingUserStories = true;
      }

      // stories.controls.forEach((story: AbstractControl) => {
      //   const taskArray = (story.get('tasks') as FormArray) || this.fb.array([]);
      //   if (!taskArray || taskArray.length === 0) {
      //     missingTasks = true;
      //   }

      //   taskArray.controls.forEach(task => {
      //     if (!task.get('taskName')?.value?.trim() || !task.get('startDate')?.value || !task.get('endDate')?.value) {
      //       valid = false;
      //     }
      //   });
      // });
    });

    if (!valid) {
      this.submitError = 'Please complete all task details before submitting or saving.';
    }

    return { valid, missingUserStories, missingTasks };
  }

  getPredecessorOptions(epicIndex: number, usIndex: number): string[] {
    const stories = this.userStories(epicIndex);
    const currentUserStoryName = stories.at(usIndex)?.get('userStoryName')?.value?.trim() || null;

    const allUserStoryNames: string[] = [];
    this.epics.controls.forEach((epic, epicPosition) => {
      const stories = (epic.get('userStories') as FormArray) || this.fb.array([]);
      stories.controls.forEach((userStory: AbstractControl) => {
        const name = userStory.get('userStoryName')?.value?.trim();
        if (name && name !== currentUserStoryName) {
          // allUserStoryNames.push(`Epic${epicPosition + 1}.${name}`);
          allUserStoryNames.push(userStory.get('userStoryId')?.value);
        }
      });
    });
    return Array.from(new Set(allUserStoryNames));
  }

  getCompanyName(leadId: string | number | null | undefined): string {
    if (leadId === null || leadId === undefined || leadId === '') {
      return 'N/A';
    }
    const selectedId = Number(leadId);
    const company = this.companies.find(c => c.companyId === selectedId);
    return company?.companyName || 'N/A';
  }

  removeLead(epicIndex: number, userStoryIndex: number, leadId: number | string): void {
    const leadControl = this.userStories(epicIndex).at(userStoryIndex).get('leadIds');
    const selectedLeadIds = leadControl?.value || [];
    const updatedLeadIds = selectedLeadIds.filter((id: any) => String(id) !== String(leadId));
    leadControl?.setValue(updatedLeadIds);
  }

  addLeadToTask(selectedLeadId: string, epicIndex: number, userStoryIndex: number, taskIndex: number, selectEl: HTMLSelectElement): void {
    if (!selectedLeadId) {
      return;
    }

    const taskControl = this.tasks(epicIndex, userStoryIndex).at(taskIndex);
    const leadControl = taskControl.get('leadIds');
    const selectedLeadIds: number[] = Array.isArray(leadControl?.value) ? [...(leadControl?.value as number[])] : [];
    const leadIdNumber = Number(selectedLeadId);

    if (!selectedLeadIds.includes(leadIdNumber)) {
      leadControl?.setValue([...selectedLeadIds, leadIdNumber]);
    }

    selectEl.value = '';
  }

  removeTaskLead(epicIndex: number, userStoryIndex: number, taskIndex: number, leadId: number | string): void {
    const taskControl = this.tasks(epicIndex, userStoryIndex).at(taskIndex);
    const leadControl = taskControl.get('leadIds');
    const selectedLeadIds = leadControl?.value || [];
    const updatedLeadIds = selectedLeadIds.filter((id: any) => String(id) !== String(leadId));
    leadControl?.setValue(updatedLeadIds);
  }

  getCompanyNames(leadIds: number[] | null | undefined): string {
    if (!leadIds || !leadIds.length) {
      return 'N/A';
    }
    return leadIds
      .map(id => this.getCompanyName(id))
      .filter(name => name !== 'N/A')
      .join(', ');
  }

  buildCreatePayload(actionType: 'save' | 'submit'): ProjectCreateRequest {
    const raw = this.builderForm.getRawValue();
    const epicsPayload = raw.epics.map((epic: any, epicIndex: number) => ({
      epicName: epic.epicName,
      epicDesc: epic.epicDesc || '',
      epicSequence: epicIndex + 1,
      userStories: (epic.userStories || []).map((userStory: any, storyIndex: number) => ({
        mappingStoryId: userStory.userStoryId,
        title: userStory.userStoryName,
        leads: (userStory.leadIds || []).map((id: any) => ({ companyId: Number(id) })),
        plannedStartDate: this.normalizeDateValue(userStory.startDate),
        plannedEndDate: this.normalizeDateValue(userStory.endDate),
        mappingPredecessorId: userStory.predecessorUserStoryName || null,
        tasks: (userStory.tasks || []).map((task: any, taskIndex: number) => ({
          title: task.taskName,
          plannedStartDate: this.normalizeDateValue(task.startDate),
          plannedEndDate: this.normalizeDateValue(task.endDate),
          taskSequence: taskIndex + 1
        }))
      }))
    }));

    return {
      projectId: this.editingProjectId ?? undefined,
      projectName: raw.projectName,
      projectDesc: raw.projectDesc || '',
      orgId: Number(this.orgId),
      epics: epicsPayload,
      createdBy: localStorage.getItem('userRole') || '',
      isSave: actionType === 'save',
      isSubmit: actionType === 'submit'
    } as ProjectCreateRequest;
  }

  normalizeDateValue(value: any): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toISOString().split('T')[0];
  }

  saveProject(): void {
    this.handleProjectAction('save');
  }

  submitProject(): void {
    this.handleProjectAction('submit');
  }

  private handleProjectAction(actionType: 'save' | 'submit'): void {
    this.submitError = '';
    const validation = this.validateTaskStep();
    if (!validation.valid) {
      return;
    }

    const payload = this.buildCreatePayload(actionType);

    // if (validation.missingUserStories || validation.missingTasks) {
    //   const missingParts: string[] = [];
    //   if (validation.missingUserStories) {
    //     missingParts.push('one or more epics do not have any user stories');
    //   }
    //   if (validation.missingTasks) {
    //     missingParts.push('one or more user stories do not have any tasks');
    //   }
    //   const dialogData: ConfirmationDialogData = {
    //     title: 'Incomplete Task Structure',
    //     message: `The project is missing ${missingParts.join(' and ')}. Do you want to continue ${actionType === 'save' ? 'saving' : 'submitting'}?`,
    //     confirmText: actionType === 'save' ? 'Continue Save' : 'Continue Submit',
    //     cancelText: 'Edit',
    //     showCancel: true,
    //     type: 'info'
    //   };

    //   const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    //     width: '440px',
    //     data: dialogData
    //   });

    //   dialogRef.afterClosed().subscribe(confirmed => {
    //     if (!confirmed) {
    //       return;
    //     }
    //     this.sendProjectRequest(payload, actionType);
    //   });
    //   return;
    // }

    this.sendProjectRequest(payload, actionType);
  }

  private sendProjectRequest(payload: ProjectCreateRequest, actionType: 'save' | 'submit'): void {
    this.isSubmitting = true;

    if (this.isEditMode) {
      this.projectService.updateProject(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = actionType === 'submit' ? 'Project submitted successfully.' : 'Project saved successfully.';
          if (actionType === 'submit') {
            this.resetForm();
            this.clearEditState();
            this.selectTab('list');
          }
        },
        error: (err) => {
          console.error('Project update failed', err);  
          this.isSubmitting = false;
          this.submitError = err?.error?.message || `Failed to ${actionType} project. Please try again.`;
        }
      });
      return;
    }

    this.projectService.createProject(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = actionType === 'submit' ? 'Project submitted successfully.' : 'Project saved successfully.';
        if (actionType === 'submit' || this.isEditMode) {
          this.resetForm();
          this.clearEditState();
          this.selectTab('list');
        }
      },
      error: (err) => {
        console.error('Project request failed', err);
        this.isSubmitting = false;
        this.submitError = err?.error?.message || `Failed to ${actionType} project. Please try again.`;
      }
    });
  }

  resetForm(): void {
    this.builderForm.reset();
    while (this.epics.length > 0) {
      this.epics.removeAt(0);
    }
    this.addEpic();
    this.selectedEpicIndex = 0;
    this.selectedUserStoryIndex = null;
    this.selectedTaskIndex = null;
    this.currentStep = 1;
    this.submitError = '';
    this.submitSuccess = '';
  }

  private clearEditState(): void {
    this.isEditMode = false;
    this.editingProjectId = null;
    this.editingProject = undefined;
  }

  onEditProject(project: ProjectVO): void {
    this.projectService.getProjectInfo(String(project.projectId)).subscribe({
      next: (result) => {
        const projectDetail = (result as any).attributes || project;
        this.startEditingProject(projectDetail);
      },
      error: (err) => {
        console.error('Failed to load project details for edit', err);
        this.submitError = 'Unable to fetch project details for editing.';
      }
    });
  }

  private startEditingProject(project: ProjectVO): void {
    this.isEditMode = true;
    this.editingProjectId = project.projectId;
    this.editingProject = project;
    this.activeTab = 'create';
    this.currentStep = 1;
    this.selectedEpicIndex = 0;
    this.selectedUserStoryIndex = null;
    this.selectedTaskIndex = null;
    this.resetForm();
    this.populateProjectForm(project);
    this.setProjectFormEditability(project);
  }

  private populateProjectForm(project: ProjectVO): void {
    this.builderForm.patchValue({
      projectName: project.projectName || '',
      projectDesc: project.projectDesc || ''
    });

    const storyCodeMap = new Map<string, string>();
    (project.epics || []).forEach((epic: any) => {
      (epic.userStories || []).forEach((story: any) => {
        const storyKey = story.storyId ?? story.mappingStoryId ?? story.storyCode;
        if (storyKey != null) {
          storyCodeMap.set(String(storyKey), story.storyCode || String(story.mappingStoryId ?? story.storyId));
        }
      });
    });

    while (this.epics.length > 0) {
      this.epics.removeAt(0);
    }

    if (project.epics?.length) {
      project.epics.forEach((epic: any, epicIndex: number) => {
        const epicGroup = this.fb.group({
          epicName: [epic.epicName || '', Validators.required],
          epicDesc: [epic.epicDesc || ''],
          epicSequence: [epic.epicSequence || epicIndex + 1],
          userStories: this.fb.array([])
        });

        const storyArray = epicGroup.get('userStories') as FormArray;
        const sortedStories = [...(epic.userStories || [])].sort((a: any, b: any) => (a.storySequence ?? 0) - (b.storySequence ?? 0));
        sortedStories.forEach((story: any, storyIndex: number) => {
          console.log('Processing story:', story);
          const storyCode = story.storyCode || String(story.mappingStoryId ?? `${epicIndex + 1}.${storyIndex + 1}`);
          const predecessorKey = story.mappingPredecessorId ?? story.predecessorId;
          const predecessorValue = predecessorKey != null ? storyCodeMap.get(String(predecessorKey)) || String(predecessorKey) : null;

          const storyGroup = this.fb.group({
            userStoryId: [storyCode],
            userStoryName: [story.title || '', Validators.required],
            leadIds: [((story.leads || []) as any[]).map(lead => Number(lead.company.companyId)).filter((id: number) => !Number.isNaN(id)), Validators.required],
            startDate: [this.normalizeDateValue(story.plannedStartDate) || '', Validators.required],
            endDate: [this.normalizeDateValue(story.plannedEndDate) || '', Validators.required],
            predecessorUserStoryName: [predecessorValue],
            tasks: this.fb.array([])
          });

          const taskArray = storyGroup.get('tasks') as FormArray;
          if (story.tasks?.length) {
            story.tasks.forEach((task: any, taskIndex: number) => {
              taskArray.push(this.fb.group({
                taskId: [task.taskId || `${epicIndex + 1}.${storyIndex + 1}.${taskIndex + 1}`],
                taskName: [task.title || '', Validators.required],
                leadIds: [[]],
                startDate: [this.normalizeDateValue(task.plannedStartDate) || '', Validators.required],
                endDate: [this.normalizeDateValue(task.plannedEndDate) || '', Validators.required],
                predecessorTaskName: { value: task.predecessorId != null ? String(task.predecessorId) : null, disabled: false },
                predecessorId: { value: task.predecessorId != null ? String(task.predecessorId) : null, disabled: false }
              }));
            });
          } else {
            taskArray.push(this.createTaskForm(`${epicIndex + 1}.${storyIndex + 1}.1`));
          }

          storyArray.push(storyGroup);
        });

        this.epics.push(epicGroup);
      });
    } else {
      this.addEpic();
    }
  }

  private setProjectFormEditability(project: ProjectVO): void {
    if (project.isSaved) {
      this.builderForm.enable();
      return;
    }

    if (project.isSubmitted) {
      this.builderForm.disable();
      this.epics.controls.forEach((epic, epicIndex) => {
        const stories = this.userStories(epicIndex);
        stories.controls.forEach((story, storyIndex) => {
          story.get('predecessorUserStoryName')?.enable({ emitEvent: false });
          story.get('startDate')?.enable({ emitEvent: false });
          story.get('endDate')?.enable({ emitEvent: false });
          const tasksArray = this.tasks(epicIndex, storyIndex);
          tasksArray.controls.forEach(task => {
            task.get('startDate')?.enable({ emitEvent: false });
            task.get('endDate')?.enable({ emitEvent: false });
          });
        });
      });
    } else {
      this.builderForm.enable();
    }
  }

  onViewProject(project: ProjectVO): void {
    this.selectedProjectForView = project;
    this.activeTab = 'list';
    this.projectService.getProjectInfo(String(project.projectId)).subscribe({
      next: (result) => {
        this.selectedProjectForView = (result as any).attributes || project;
      },
      error: (err) => {
        console.error('Failed to load project details', err);
        this.selectedProjectForView = project;
        this.submitError = 'Unable to fetch complete project details.';
      }
    });
  }

  onDeleteProject(project: ProjectVO): void {

    const dialogData: ConfirmationDialogData = {
      title: 'Delete Project',
      message: `Are you sure you want to delete project "${project.projectName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      type: 'delete'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }
      this.projectService.deleteProject(project.projectId).subscribe({
        next: () => {
          this.submitSuccess = 'Project deleted successfully.';
          this.loadProjectList();
        },
        error: (err) => {
          console.error('Project delete failed', err);
          this.submitError = err?.error?.message || 'Failed to delete project. Please try again.';
        }
      });
    });
  }
}
