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
  reviewMode = false;
  selectedEpicIndex = 0;
  selectedUserStoryIndex: number | null = null;
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
  }

  createUserStoryForm(userStoryId: string = ''): FormGroup {
    return this.fb.group({
      userStoryId: [userStoryId],
      userStoryName: ['', Validators.required],
      leadIds: [[], Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      predecessorUserStoryName: [null]
    });
  }

  // createUserStoryForm(userStoryId: string = ''): FormGroup {
  //   return this.fb.group({
  //     userStoryId: [userStoryId],
  //     userStoryName: ['', Validators.required],
  //     userStoryDesc: [''],
  //     userStories: this.fb.array([this.createUserStoryForm(`${userStoryId}.1`)])
  //   });
  // }

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
    // if (!this.validateCreatePage()) {
    //   return;
    // }
    this.reviewMode = true;
    this.selectedEpicIndex = 0;
  }

  backToEdit(): void {
    this.reviewMode = false;
  }

  
  getPredecessorOptions(epicIndex: number, usIndex: number): string[] {
    const stories = this.userStories(epicIndex);
    const currentUserStoryName = stories.at(usIndex)?.get('userStoryName')?.value?.trim() || null;

    const allUserStoryNames: string[] = [];
    this.epics.controls.forEach((epic, epicPosition) => {
      const stories = (epic.get('userStories') as FormArray) || this.fb.array([]);
      console.log('Epic', epicPosition, 'stories', stories);
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
      userStories: (epic.userStories || []).map((userStory: any) => ({
        mappingStoryId: userStory.userStoryId,
        title: userStory.userStoryName,
        leads: (userStory.leadIds || []).map((id: any) => ({ companyId: Number(id) })),
        plannedStartDate: this.normalizeDateValue(userStory.startDate),
        plannedEndDate: this.normalizeDateValue(userStory.endDate),
        // mappingPredecessorId: userStory.predecessorUserStoryName ? this.findUserStoryIdByName(userStory.predecessorUserStoryName) : 0
        mappingPredecessorId: userStory.predecessorUserStoryName || 0
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
    this.selectedUserStoryIndex = null;
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
