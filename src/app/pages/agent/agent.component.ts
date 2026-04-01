import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin } from 'rxjs';
import { AgentService } from '../../service/agent.service';
import { AgentMaster, AgentRequest, AgentSkillsMapping } from '../../models/agent-master';
import { CalendarMasterVO } from '../../models/calendar-master';
import { CompanyMaster } from '../../models/company-master';
import { SkillMaster } from '../../models/skill-master';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-agent',
  templateUrl: './agent.component.html',
  styleUrls: ['./agent.component.scss']
})
export class AgentComponent implements OnInit {
  agentForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Agent';
  isEditMode = false;
  originalFormValue: any = null;

  companies: CompanyMaster[] = [];
  calendars: CalendarMasterVO[] = [];
  skills: SkillMaster[] = [];
  suggestedSkills: SkillMaster[] = [];
  filteredSkills: SkillMaster[] = [];
  selectedSkills: SkillMaster[] = [];

  agents: AgentMaster[] = [];
  agentSkillNames: { [key: number]: string[] } = {};

  skillSearch = '';
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
    private agentService: AgentService,
    private dialog: MatDialog
  ) {
    this.agentForm = this.fb.group({
      agentId: [null],
      agentName: ['', Validators.required],
      mailId: ['', [Validators.required, Validators.email]],
      accessId: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^\\+?[0-9]{7,15}$')]],
      orgId: [null, Validators.required],
      calendarId: [null, Validators.required],
      skillSearch: ['']
    });
  }

  ngOnInit(): void {
    this.loadAllData();

    this.agentForm.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  loadAllData(): void {
    this.loading = true;

    this.agentService.getCompanyList().subscribe({
      next: (response) => {
        this.companies = (response as any).attributes || [];
        this.setDefaultOrganizationAndCalendar();
      },
      error: () => { this.companies = []; }
    });

    this.agentService.getCalendarList().subscribe({
      next: (response) => {
        this.calendars = (response as any).attributes || [];
        this.setDefaultOrganizationAndCalendar();
      },
      error: () => { this.calendars = []; }
    });

    this.agentService.getSkillsList().subscribe({
      next: (response) => {
        this.skills = (response as any).attributes || [];
        this.suggestedSkills = this.skills;
        // this.filteredSkills = this.suggestedSkills;
      },
      error: () => {
        this.skills = [];
        this.suggestedSkills = [];
        this.filteredSkills = [];
      }
    });

    this.loadAgentList();
    this.loading = false;
  }

  loadAgentList(): void {
    this.agentService.getAgentList().subscribe({
      next: (result) => {
        this.agents = (result as any).attributes || [];
        this.totalRecords = this.agents.length;
        this.currentPage = 0;
        this.agentSkillNames = {};

        const skillObservables = this.agents.map(agent =>
          this.agentService.getAgentSkills(agent.agentId)
        );

        if (skillObservables.length > 0) {
          forkJoin(skillObservables).subscribe({
            next: (allSkills) => {
              allSkills.forEach((mappingsResp, idx) => {
                const agentId = this.agents[idx].agentId;
                const mappings = (mappingsResp as any).attributes || mappingsResp || [];
                const names = (mappings || []).map((map: any) => map.skill?.skillName).filter(Boolean);
                this.agentSkillNames[agentId] = names;
              });
            },
            error: () => {
              // ignore; fill individually in fallback
              this.agents.forEach(agent => (this.agentSkillNames[agent.agentId] = []));
            }
          });
        }
      },
      error: (err) => {
        console.error('Failed to load agents:', err);
      }
    });
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      this.pageTitle = this.isEditMode ? 'Edit Agent' : 'Create Agent';
      if (!this.isEditMode) {
        this.resetForm();
        this.setDefaultOrganizationAndCalendar();
      }
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.pageTitle = 'Create Agent';
      this.resetForm();
      this.loadAgentList();
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Create Agent';
    this.agentForm.reset();
    this.selectedSkills = [];
    this.agentForm.patchValue({ skillSearch: '' });
    // this.filteredSkills = this.skills;
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
    this.setDefaultOrganizationAndCalendar();
  }

  onSkillSearch(): void {
    const term = (this.agentForm.get('skillSearch')?.value || '').trim().toLowerCase();
    console.log('Searching for skill with term:', term);
    if (!term) {
      this.filteredSkills = []
      return;
    }
    this.filteredSkills = this.suggestedSkills.filter(s => s.skillName.toLowerCase().includes(term));
  }

  addSkillFromSuggestion(skill: SkillMaster): void {
    if (!skill) { return; }
    if (this.selectedSkills.some(s => s.skillId === skill.skillId)) {
      return;
    }
    this.selectedSkills.push(skill);
    this.agentForm.patchValue({ skillSearch: '' });
    this.filteredSkills = [];
    // this.filteredSkills = this.suggestedSkills.slice(0, 10);
    this.formError.skill = null;
  }

  removeSelectedSkill(skill: SkillMaster): void {
    this.selectedSkills = this.selectedSkills.filter(s => s.skillId !== skill.skillId);
  }

  onSave(): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    Object.keys(this.agentForm.controls).forEach(key => {
      const field = this.agentForm.get(key);
      if (field?.hasError('required')) {
        this.formError[key] = `${this.beautifyFieldName(key)} is required`;
      }
      if (key === 'mailId' && field?.hasError('email')) {
        this.formError[key] = 'Invalid email format';
      }
      if (key === 'phone' && field?.hasError('pattern')) {
        this.formError[key] = 'Phone number should contain 7-15 digits';
      }
    });

    if (this.selectedSkills.length === 0) {
      this.formError.skill = 'At least one skill must be selected';
    }

    if (Object.keys(this.formError).length > 0) {
      return;
    }

    const payload: AgentRequest = {
      agentId: this.agentForm.value.agentId,
      agentName: this.agentForm.value.agentName,
      mailId: this.agentForm.value.mailId,
      accessId: this.agentForm.value.accessId,
      phone: this.agentForm.value.phone,
      orgId: Number(this.agentForm.value.orgId),
      skills: this.selectedSkills.map(s => s.skillId),
      calendarId: Number(this.agentForm.value.calendarId),
      createdBy: localStorage.getItem('userRole') || '',
      updatedBy: localStorage.getItem('userRole') || ''
    };

    if (this.isEditMode) {
      if (!this.isFormChanged()) {
        this.submitError = 'No changes to update.';
        return;
      }

      this.agentService.updateAgent(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Agent updated successfully.';
          setTimeout(() => {
            this.agentForm.markAsPristine();
            this.originalFormValue = this.createCompareSnapshot();
            this.loadAgentList();
            this.activeTab = 'list';
            this.isEditMode = false;
          }, 1500);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update agent error', err);
          this.submitError = err.error?.message || 'Failed to update agent.';
        }
      });
    } else {
      this.agentService.createAgent(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Agent created successfully.';
          setTimeout(() => {
            this.loadAgentList();
            this.resetForm();
            this.activeTab = 'list';
          }, 1500);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Create agent error', err);
          this.submitError = err.error?.message || 'Failed to create agent.';
        }
      });
    }
  }

  isFormChanged(): boolean {
    if (!this.originalFormValue) {
      return true;
    }
    const currentValue = this.createCompareSnapshot();
    return JSON.stringify(currentValue) !== JSON.stringify(this.originalFormValue);
  }

  createCompareSnapshot(): any {
    const formValue = this.agentForm.getRawValue();
    return {
      agentName: formValue.agentName,
      mailId: formValue.mailId,
      accessId: formValue.accessId,
      phone: formValue.phone,
      orgId: formValue.orgId,
      calendarId: formValue.calendarId,
      skills: this.selectedSkills.map(s => s.skillId)
    };
  }

  onViewAgent(agent: AgentMaster): void {
    this.formError = {};
    this.activeTab = 'create';
    this.isEditMode = true;
    this.pageTitle = 'Edit Agent';

    this.agentService.getAgentSkills(agent.agentId).subscribe({
      next: (mappingsResp) => {
        const mappings = (mappingsResp as any).attributes || mappingsResp || [];
        this.selectedSkills = (mappings || []).map((m: any) => m.skill).filter(Boolean);

        this.agentForm.patchValue({
          agentId: agent.agentId,
          agentName: agent.agentName,
          mailId: agent.mailId,
          accessId: agent.accessId,
          phone: agent.phone,
          orgId: agent.organization?.companyId || null,
          calendarId: agent.calendar?.calendarId || null
        });

        this.originalFormValue = this.createCompareSnapshot();
      },
      error: () => {
        this.selectedSkills = [];
      }
    });
  }

  onDeleteAgent(agent: AgentMaster): void {
    this.submitError = '';
    this.submitSuccess = '';

    const dialogData: ConfirmationDialogData = {
      title: 'Delete Agent',
      message: `Are you sure you want to delete agent "${agent.agentName}"?`,
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
      if (!result) return;
      this.agentService.deleteAgent(agent.agentId).subscribe({
        next: () => {
          this.loadAgentList();
          this.submitSuccess = 'Agent deleted successfully.';
        },
        error: (err) => {
          console.error('Delete agent error', err);
          this.submitError = err.error?.message || 'Failed to delete agent.';
        }
      });
    });
  }

  getPaginatedAgents(): AgentMaster[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.agents.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  setDefaultOrganizationAndCalendar(): void {
    if (this.isEditMode) {
      return;
    }
    this.agentForm.patchValue({ 
    orgId: '',
    calendarId: ''
    });
  }

  beautifyFieldName(key: string): string {
    switch (key) {
      case 'orgId': return 'Organization';
      case 'calendarId': return 'Calendar';
      case 'accessId': return 'Access ID';
      default: return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
  }
}
