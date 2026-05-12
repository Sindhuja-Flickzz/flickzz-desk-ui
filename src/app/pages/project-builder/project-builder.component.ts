import { Component, HostListener, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  reviewMode = false;
  selectedEpicIndex = 0;
  isMobile = false;
  isSidebarOpen = true;
  builderForm: FormGroup;
  companies: CompanyMaster[] = [];
  projects: ProjectVO[] = [];
  filteredProjects: ProjectVO[] = [];
  selectedProjectForView?: ProjectVO;
  selectedProjectForKanban?: ProjectVO;

  searchValue = '';
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

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

  tasks(epicIndex: number): FormArray {
    return this.epics.at(epicIndex).get('tasks') as FormArray;
  }

  get selectedEpic(): FormGroup {
    return this.epics.at(this.selectedEpicIndex) as FormGroup;
  }

  selectEpic(index: number): void {
    this.selectedEpicIndex = index;
  }

  createTaskForm(taskId: string = ''): FormGroup {
    return this.fb.group({
      taskId: [taskId],
      taskName: ['', Validators.required],
      leadIds: [[], Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      predecessorTaskName: [null]
    });
  }

  createEpicForm(): FormGroup {
    return this.fb.group({
      epicName: ['', Validators.required],
      epicDesc: [''],
      epicSequence: [this.epics.length + 1],
      tasks: this.fb.array([this.createTaskForm(`${this.epics.length + 1}.1`)])
    });
  }

  addEpic(): void {
    this.epics.push(this.createEpicForm());
    this.syncEpicSequences();
    this.syncTaskIds();
    this.selectedEpicIndex = this.epics.length - 1;
  }

  removeEpic(index: number): void {
    if (this.epics.length <= 1) {
      return;
    }
    this.epics.removeAt(index);
    this.syncEpicSequences();
    this.syncTaskIds();
    if (this.selectedEpicIndex >= this.epics.length) {
      this.selectedEpicIndex = this.epics.length - 1;
    }
    if (this.selectedEpicIndex < 0) {
      this.selectedEpicIndex = 0;
    }
  }

  addTask(epicIndex: number): void {
    this.tasks(epicIndex).push(this.createTaskForm(`${epicIndex + 1}.${this.tasks(epicIndex).length + 1}`));
    this.syncTaskIds();
  }

  removeTask(epicIndex: number, taskIndex: number): void {
    const taskArray = this.tasks(epicIndex);
    if (taskArray.length <= 1) {
      return;
    }
    taskArray.removeAt(taskIndex);
    this.syncTaskIds();
  }

  addLeadToTask(selectedLeadId: string, epicIndex: number, taskIndex: number, selectEl: HTMLSelectElement): void {
    if (!selectedLeadId) {
      return;
    }

    const leadControl = this.tasks(epicIndex).at(taskIndex).get('leadIds');
    const selectedLeadIds :number[] = Array.isArray(leadControl?.value) ? [...(leadControl?.value as number[])] : [];
    const leadIdNumber = Number(selectedLeadId);

    if (!selectedLeadIds.includes(leadIdNumber)) {
      leadControl?.setValue([...selectedLeadIds, leadIdNumber]);
    }

    selectEl.value = '';
  }

  getAvailableCompanyLeads(task: AbstractControl): any[] {
    const selectedIds = task.get('leadIds')?.value || [];
    return this.companies.filter(company => !selectedIds.includes(company.companyId));
  }

  syncEpicSequences(): void {
    this.epics.controls.forEach((epic, index) => {
      epic.get('epicSequence')?.setValue(index + 1, { emitEvent: false });
    });
  }

  syncTaskIds(): void {
    this.epics.controls.forEach((epic, epicIndex) => {
      const taskArray = epic.get('tasks') as FormArray;
      taskArray.controls.forEach((task, taskIndex) => {
        task.get('taskId')?.setValue(`${epicIndex + 1}.${taskIndex + 1}`, { emitEvent: false });
      });
    });
  }

  findTaskIdByName(taskName: string | null | undefined): string | null {
    if (!taskName) {
      return null;
    }

    const parts = taskName.split('.');
    if (parts.length < 2 || !parts[0].startsWith('Epic')) {
      return null;
    }

    const epicNumStr = parts[0].substring(4); // remove 'Epic'
    const epicNum = parseInt(epicNumStr, 10);
    if (isNaN(epicNum)) {
      return null;
    }

    const taskNamePart = parts.slice(1).join('.'); // in case task name has dots
    const epicIndex = epicNum - 1;
    if (epicIndex < 0 || epicIndex >= this.epics.length) {
      return null;
    }

    const taskArray = this.tasks(epicIndex);
    for (let taskIndex = 0; taskIndex < taskArray.length; taskIndex++) {
      const task = taskArray.at(taskIndex);
      if (task.get('taskName')?.value?.trim() === taskNamePart.trim()) {
        return `${epicNum}.${taskIndex + 1}`;
      }
    }

    return null;
  }

  loadCompanies(): void {
    this.companyService.getAllCompanies().subscribe({
      next: (result) => {
        this.companies = (result as any).attributes || [];
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
    this.totalRecords = this.filteredProjects.length;
    this.currentPage = 0;
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
    this.activeTab = tab;
    this.reviewMode = false;
    this.selectedProjectForView = undefined;
    if (tab === 'list') {
      this.loadProjectList();
    }
  }

  validateCreatePage(): boolean {
    this.submitError = '';
    this.builderForm.markAllAsTouched();

    if (this.builderForm.invalid) {
      this.submitError = 'Please fill in all required fields before continuing.';
      return false;
    }

    let valid = true;
    this.epics.controls.forEach((epic, epicIndex) => {
      if (!epic.get('epicName')?.value?.trim()) {
        valid = false;
      }
      this.tasks(epicIndex).controls.forEach(task => {
        if (!task.get('taskName')?.value?.trim() || !task.get('leadIds')?.value?.length || !task.get('startDate')?.value || !task.get('endDate')?.value) {
          valid = false;
        }
      });
    });

    if (!valid) {
      this.submitError = 'All epics and tasks must be completed before proceeding.';
      return false;
    }

    return true;
  }

  nextStep(): void {
    if (!this.validateCreatePage()) {
      return;
    }
    this.reviewMode = true;
    this.selectedEpicIndex = 0;
  }

  backToEdit(): void {
    this.reviewMode = false;
  }

  getPredecessorOptions(epicIndex: number, taskIndex: number): string[] {
    const currentTaskName = this.tasks(epicIndex).at(taskIndex).get('taskName')?.value?.trim();
    const allTaskNames: string[] = [];
    this.epics.controls.forEach((epic, epicPosition) => {
      this.tasks(epicPosition).controls.forEach(task => {
        const name = task.get('taskName')?.value?.trim();
        if (name && name !== currentTaskName) {
          allTaskNames.push(`Epic${epicPosition + 1}.${name}`);
        }
      });
    });
    return Array.from(new Set(allTaskNames));
  }

  getCompanyName(leadId: string | number | null | undefined): string {
    if (leadId === null || leadId === undefined || leadId === '') {
      return 'N/A';
    }
    const selectedId = Number(leadId);
    const company = this.companies.find(c => c.companyId === selectedId);
    return company?.companyName || 'N/A';
  }

  removeLead(epicIndex: number, taskIndex: number, leadId: number | string): void {
    const leadControl = this.tasks(epicIndex).at(taskIndex).get('leadIds');
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

  buildCreatePayload(): ProjectCreateRequest {
    const raw = this.builderForm.value;
    const epicsPayload = raw.epics.map((epic: any, epicIndex: number) => ({
      epicName: epic.epicName,
      epicDesc: epic.epicDesc || '',
      epicSequence: epicIndex + 1,
      userStories: epic.tasks.map((task: any) => ({
        mappingStoryId : task.taskId,
        title: task.taskName,
        leads: (task.leadIds || []).map((id: any) => ({ companyId: Number(id) })),
        plannedStartDate: this.normalizeDateValue(task.startDate),
        plannedEndDate: this.normalizeDateValue(task.endDate),
        mappingPredecessorId: task.predecessorTaskName ? this.findTaskIdByName(task.predecessorTaskName) : 0
      })),
    }));

    return {
      projectName: raw.projectName,
      orgId: Number(this.orgId),
      epics: epicsPayload,
      createdBy : localStorage.getItem('userRole') || ''
    };
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

  onCreateProject(): void {
    if (!this.reviewMode) {
      return;
    }
    const payload = this.buildCreatePayload();
    this.isSubmitting = true;
    this.projectService.createProject(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = 'Project created successfully.';
        this.reviewMode = false;
        this.resetForm();
        this.selectTab('list');
      },
      error: (err) => {
        console.error('Project create failed', err);
        this.isSubmitting = false;
        this.submitError = err?.error?.message || 'Failed to create project. Please try again.';
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
    this.reviewMode = false;
    this.submitError = '';
    this.submitSuccess = '';
  }

  onViewProject(project: ProjectVO): void {
    this.selectedProjectForView = project;
    this.activeTab = 'list';
    // this.router.navigate(['/project-builder', project.projectId]);
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

  /**
   * Load project and display in Kanban board view
   */
  onViewKanban(project: ProjectVO): void {
    this.selectedProjectForKanban = project;
    this.projectService.getProjectInfo(String(project.projectId)).subscribe({
      next: (result) => {
        this.selectedProjectForKanban = (result as any).attributes || project;  
      },
      error: (err) => {
        console.error('Failed to load project details for Kanban', err);
        this.selectedProjectForKanban = project;
        this.submitError = 'Unable to fetch project details for Kanban board.';
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
