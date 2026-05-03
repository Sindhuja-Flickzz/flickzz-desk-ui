import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin } from 'rxjs';
import { AgentService } from '../../service/agent.service';
import { AgentMaster, AgentRequest, AgentSkillsMapping } from '../../models/agent-master';
import { CalendarMasterVO } from '../../models/calendar-master';
import { CompanyMaster, CountryMaster } from '../../models/company-master';
import { SkillMaster } from '../../models/skill-master';
import { CityMaster, LanguageMaster } from '../../models/city-master';
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
  countries: CountryMaster[] = [];
  cities: CityMaster[] = [];
  languages: LanguageMaster[] = [];
  suggestedSkills: SkillMaster[] = [];
  filteredSkills: SkillMaster[] = [];
  selectedSkill: SkillMaster | null = null;
  selectedCountry: CountryMaster | null = null;
  selectedCity: CityMaster | null = null;
  selectedTimezone: string | null = null;
  timezoneTimer: any = null;
  localTime: string = '';
  skillsList: { name: string, years: number, months: number }[] = [];

  agents: AgentMaster[] = [];
  filteredAgents: AgentMaster[] = [];
  agentSkillNames: { [key: number]: string[] } = {};
  searchValue = '';
  userOrgId: string = '';

  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;

  alphanumericPattern = '^[a-zA-Z0-9 ]+$';
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
      agentName: ['', [Validators.required, Validators.pattern(this.alphanumericPattern)]],
      mailId: ['', [Validators.required, Validators.email]],
      accessId: ['', Validators.required],
      countryCode: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      orgId: [null, Validators.required],
      calendarId: [null, Validators.required],
      countryId: [null, Validators.required],
      cityId: [null, Validators.required],
      languageId: [null, Validators.required],
      skillName: ['', Validators.pattern('^[a-zA-Z0-9 ]+$')],
      experienceYears: [0, [Validators.min(0)]],
      experienceMonths: [0, [Validators.min(0), Validators.max(11)]]
    });
    this.userOrgId = localStorage.getItem('userOrgId') || '';
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

    // Handle country selection changes
    this.agentForm.get('countryCode')?.valueChanges.subscribe(countryCode => {
      if (countryCode) {
        const country = this.getCountryByCode(countryCode);
        if (country) {
          this.onCountrySelect(country);
        }
      }
    });

    // Handle country selection for location
    this.agentForm.get('countryId')?.valueChanges.subscribe(countryId => {
      if (countryId) {
        this.onLocationCountrySelect(countryId);
      } else {
        this.cities = [];
        this.selectedCity = null;
        this.localTime = '';
        this.agentForm.patchValue({ cityId: null });
      }
    });

    // Handle city selection
    this.agentForm.get('cityId')?.valueChanges.subscribe(cityId => {
      if (cityId) {
        this.onCitySelect(cityId);
      } else {
        this.clearLocalTimeInterval();
        this.localTime = '';
      }
    });
  }

  ngOnDestroy(): void {
    this.clearLocalTimeInterval();
  }

  loadAllData(): void {
    this.loading = true;

    this.agentService.getCalendarList(this.userOrgId).subscribe({
      next: (response) => {
        this.calendars = (response as any).attributes || [];
        this.setDefaultOrganizationAndCalendar();
      },
      error: () => { this.calendars = []; }
    });

    this.agentService.getSkillsList(this.userOrgId).subscribe({
      next: (response) => {
        this.skills = (response as any).attributes || [];
        this.suggestedSkills = this.skills;
      },
      error: () => {
        this.skills = [];
        this.suggestedSkills = [];
      }
    });

    this.agentService.getCountryList().subscribe({
      next: (response) => {
        this.countries = (response as any).attributes || [];
        this.setDefaultCountry();
      },
      error: () => {
        this.countries = [];
      }
    });

    this.agentService.getLanguageList().subscribe({
      next: (response) => {
        this.languages = (response as any).attributes || [];
      },
      error: () => {
        this.languages = [];
      }
    });

    this.loadAgentList();
    this.loading = false;
  }

  checkAgentName() {
    this.formError['agentName'] = null;
    this.agentService.getAgentInfoByName(this.agentForm.get('agentName')?.value).subscribe({
      next: () => {      },
      error: () => {
         this.agentForm.patchValue({ agentName: '' });
        this.formError['agentName'] = 'Agent Name already exists';
      } 
    });
  }

  loadAgentList(): void {
    this.agentService.getAgentList(this.userOrgId).subscribe({
      next: (result) => {
        this.agents = (result as any).attributes || [];
        // Calculate local time for each agent
        this.agents.forEach(agent => {
          if (agent.city?.timezone) {
            agent.localTime = this.getLocalTime(agent.city.timezone);
          } else {
            agent.localTime = '';
          }
        });
        this.searchValue = '';
        this.filterBySearch();
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
                const formatted = (mappings || []).map((map: any) => {
                  const skillName = map.skill?.skillName || '';
                  const years = map.experienceYears ?? map.skill?.experienceYears ?? 0;
                  const months = map.experienceMonths ?? map.skill?.experienceMonths ?? 0;
                  return skillName ? `${skillName} (${years}y ${months}m)` : null;
                }).filter(Boolean) as string[];
                this.agentSkillNames[agentId] = formatted;
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
    this.skillsList = [];
    this.filteredSkills = [];
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
    this.selectedSkill = null;
    this.cities = [];
    this.selectedCity = null;
    this.localTime = '';
    this.setDefaultOrganizationAndCalendar();
    this.setDefaultCountry();
  }

  addSkill(): void {
    this.formError = { ...this.formError };
    delete this.formError.skillName;
    delete this.formError.skill;
    delete this.formError.experienceYears;
    delete this.formError.experienceMonths;

    const years = this.agentForm.get('experienceYears')?.value || 0;
    const months = this.agentForm.get('experienceMonths')?.value || 0;

    let hasError = false;

    if (!this.selectedSkill) {
      this.formError.skillName = 'Select a skill from suggestions';
      hasError = true;
    }

    if (years < 0) {
      this.formError.experienceYears = 'Years cannot be negative';
      hasError = true;
    }

    if (months < 0 || months > 11) {
      this.formError.experienceMonths = 'Months must be between 0 and 11';
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const skillName = this.selectedSkill!.skillName;
    const existingIndex = this.skillsList.findIndex(skill => skill.name.toLowerCase() === skillName.toLowerCase());

    if (existingIndex >= 0) {
      this.skillsList[existingIndex] = { name: skillName, years, months };
      this.agentForm.patchValue({ skillName: '', experienceYears: 0, experienceMonths: 0 });
      this.selectedSkill = null;
      this.filteredSkills = [];
      return;
    }

    this.skillsList.push({ name: skillName, years, months });
    this.agentForm.patchValue({ skillName: '', experienceYears: 0, experienceMonths: 0 });
    this.selectedSkill = null;
    this.filteredSkills = [];
  }

  onSkillSearch(): void {
    const term = (this.agentForm.get('skillName')?.value || '').trim().toLowerCase();
    if (!term) {
      this.filteredSkills = [];
      this.selectedSkill = null;
      return;
    }

    const currentValue = this.agentForm.get('skillName')?.value || '';
    if (!this.selectedSkill || this.selectedSkill.skillName.toLowerCase() !== currentValue.toLowerCase()) {
      this.selectedSkill = null;
    }

    this.filteredSkills = this.suggestedSkills.filter(s => s.skillName.toLowerCase().includes(term));
  }

  addSkillFromSuggestion(skill: SkillMaster): void {
    if (!skill) { return; }
    this.selectedSkill = skill;
    this.agentForm.patchValue({ skillName: skill.skillName });
    this.filteredSkills = [];
    this.formError.skillName = null;
  }

  editSkill(index: number): void {
    const skill = this.skillsList[index];
    const matchedSkill = this.suggestedSkills.find(s => s.skillName.toLowerCase() === skill.name.toLowerCase());
    
    if (matchedSkill) {
      this.selectedSkill = matchedSkill;
      this.agentForm.patchValue({
        skillName: skill.name,
        experienceYears: skill.years,
        experienceMonths: skill.months
      });
    }
  }

  removeSkill(index: number): void {
    this.skillsList.splice(index, 1);
  }

  onSave(): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    Object.keys(this.agentForm.controls).forEach(key => {
      const field = this.agentForm.get(key);
      if (field?.hasError('required')) {
        this.formError[key] = `${(key)} is required`;
      }
      if (key === 'mailId' && field?.hasError('email')) {
        this.formError[key] = 'Invalid email format';
      }
      if (key === 'phone' && field?.hasError('pattern')) {
        this.formError[key] = 'Phone number should contain 7-15 digits';
      }
      if (key === 'phoneNumber' && field?.hasError('pattern')) {
        this.formError[key] = 'Phone number should contain only digits';
      }
      if (key === 'phoneNumber' && field?.hasError('minlength')) {
        this.formError[key] = `Phone number should be at least ${field.errors?.['minlength']?.requiredLength} digits`;
      }
      if (key === 'phoneNumber' && field?.hasError('maxlength')) {
        this.formError[key] = `Phone number should not exceed ${field.errors?.['maxlength']?.requiredLength} digits`;
      }
      if (key === 'agentName' && field?.hasError('pattern')) {
        this.formError[key] = 'Agent Name can contain only letters and numbers';
      }
      if (key === 'skillName' && field?.hasError('pattern')) {
        this.formError[key] = 'Skill name can contain only letters and numbers';
      }
      if (key === 'experienceYears' && field?.hasError('min')) {
        this.formError[key] = 'Years cannot be negative';
      }
      if (key === 'experienceMonths' && (field?.hasError('min') || field?.hasError('max'))) {
        this.formError[key] = 'Months must be between 0 and 11';
      }
    });

    if (this.skillsList.length === 0) {
      this.formError.skill = 'At least one skill must be selected';
    }
    
    if (Object.keys(this.formError).length > 0) {
      return;
    }

    const currentUser = localStorage.getItem('userRole') || '';
    const skills: SkillMaster[] = this.skillsList.map(item => {
      const matchedSkill = this.skills.find(skill => skill.skillName.toLowerCase() === item.name.toLowerCase());
      return {
        skillId: matchedSkill?.skillId || 0,
        skillName: item.name,
        experienceYears: item.years,
        experienceMonths: item.months,
        createdBy: currentUser,
        updatedBy: currentUser
      };
    });

    const payload: AgentRequest = {
      agentId: this.agentForm.value.agentId,
      agentName: this.agentForm.value.agentName,
      mailId: this.agentForm.value.mailId,
      accessId: this.agentForm.value.accessId,
      phone: this.selectedCountry ? `${this.selectedCountry.phoneCode}${this.agentForm.value.phoneNumber}` : this.agentForm.value.phoneNumber,
      orgId: Number(this.agentForm.value.orgId),
      skills,
      calendarId: Number(this.agentForm.value.calendarId),
      countryId: Number(this.agentForm.value.countryId),
      cityId: Number(this.agentForm.value.cityId),
      languageId: Number(this.agentForm.value.languageId),
      createdBy: currentUser,
      updatedBy: currentUser
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
          this.submitError = err.error?.description || 'Failed to update agent.';
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
          this.submitError = err.error?.description || 'Failed to create agent.';
        }
      });
    }
  }

  isFormChanged(): boolean {
    if (!this.originalFormValue) {
      return true;
    }
    const currentValue = this.createCompareSnapshot();
    
    // Compare agent fields
    if (currentValue.agentName !== this.originalFormValue.agentName ||
        currentValue.mailId !== this.originalFormValue.mailId ||
        currentValue.accessId !== this.originalFormValue.accessId ||
        currentValue.countryCode !== this.originalFormValue.countryCode ||
        currentValue.phoneNumber !== this.originalFormValue.phoneNumber ||
        currentValue.orgId !== this.originalFormValue.orgId ||
        currentValue.calendarId !== this.originalFormValue.calendarId ||
        currentValue.countryId !== this.originalFormValue.countryId ||
        currentValue.cityId !== this.originalFormValue.cityId ||
        currentValue.languageId !== this.originalFormValue.languageId) {
      return true;
    }
    
    // Compare skills with experience details
    if (currentValue.skills.length !== this.originalFormValue.skills.length) {
      return true;
    }
    
    return currentValue.skills.some((skill: any, idx: number) => {
      const original = this.originalFormValue.skills[idx];
      return skill.name !== original.name || 
             skill.years !== original.years || 
             skill.months !== original.months;
    });
  }

  createCompareSnapshot(): any {
    const formValue = this.agentForm.getRawValue();
    return {
      agentName: formValue.agentName,
      mailId: formValue.mailId,
      accessId: formValue.accessId,
      countryCode: formValue.countryCode,
      phoneNumber: formValue.phoneNumber,
      orgId: formValue.orgId,
      calendarId: formValue.calendarId,
      countryId: formValue.countryId,
      cityId: formValue.cityId,
      languageId: formValue.languageId,
      skills: JSON.parse(JSON.stringify(this.skillsList))
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
        this.skillsList = (mappings || []).map((m: any) => ({
          name: m.skill?.skillName || '',
          years: m.experienceYears ?? m.skill?.experienceYears ?? 0,
          months: m.experienceMonths ?? m.skill?.experienceMonths ?? 0
        })).filter((s: any) => s.name);

        this.agentForm.patchValue({
          agentId: agent.agentId,
          agentName: agent.agentName,
          mailId: agent.mailId,
          accessId: agent.accessId,
          phone: agent.phone,
          orgId: agent.organization?.companyId || null,
          calendarId: agent.calendar?.calendarId || null,
          countryId: agent.country?.countryId || null,
          cityId: agent.city?.cityId || null,
          languageId: agent.language?.languageId || null
        });

        // Load cities if country is selected, then restore city/time
        if (agent.country?.countryId) {
          this.onLocationCountrySelect(agent.country.countryId, agent.city.cityId);
        }

        // Parse phone number for editing
        this.parsePhoneForEdit(agent.phone);

        this.originalFormValue = this.createCompareSnapshot();
      },
      error: () => {
        this.skillsList = [];
      }
    });
  }
  
  cancelEdit() {    
    this.loadAgentList();
    this.resetForm();
    this.activeTab = 'list';
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
          setTimeout(() => {  
            this.submitSuccess = '';
          }, 1500);
        },
        error: (err) => {
          console.error('Delete agent error', err);
          this.submitError = err.error?.description || 'Failed to delete agent.';
        }
      });
    });
  }

  getPaginatedAgents(): AgentMaster[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredAgents.slice(startIndex, endIndex);
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) {
      this.filteredAgents = this.agents;
    } else {
      this.filteredAgents = this.agents.filter(agent =>
        agent.agentName.toLowerCase().includes(term) ||
        (agent.mailId && agent.mailId.toLowerCase().includes(term)) ||
        (agent.phone && agent.phone.toLowerCase().includes(term)) ||
        (agent.country?.countryName && agent.country.countryName.toLowerCase().includes(term)) ||
        (agent.city?.cityName && agent.city.cityName.toLowerCase().includes(term)) ||
        (agent.language?.languageName && agent.language.languageName.toLowerCase().includes(term))
      );
    }
    this.totalRecords = this.filteredAgents.length;
    this.currentPage = 0;
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

  setDefaultCountry(): void {
    if (this.isEditMode) {
      return;
    }
    // Default to India
    const defaultCountry = this.countries.find(c => c.isoCode === 'IN');
    if (defaultCountry) {
      this.selectedCountry = defaultCountry;
      this.agentForm.patchValue({ countryCode: defaultCountry.isoCode });
      this.updatePhoneValidators();
    }
    this.agentForm.patchValue({ countryId: '' , cityId: '', languageId: ''});
  }

  onCountrySelect(country: CountryMaster | undefined): void {
    if (!country) return;
    this.selectedCountry = country;
    this.agentForm.patchValue({ countryCode: country.isoCode });
    this.updatePhoneValidators();
    this.formError.countryCode = null;
    this.formError.phoneNumber = null;
  }

  updatePhoneValidators(): void {
    const phoneControl = this.agentForm.get('phoneNumber');
    if (!phoneControl || !this.selectedCountry) return;

    // Remove existing validators
    phoneControl.clearValidators();
    phoneControl.setValidators([Validators.required, Validators.pattern('^[0-9]+$')]);

    // Add length validators based on country (default 10 digits if not specified)
    const minLength = 10; // Default
    const maxLength = 15; // Default

    phoneControl.setValidators([
      Validators.required,
      Validators.pattern('^[0-9]+$'),
      Validators.minLength(minLength),
      Validators.maxLength(maxLength)
    ]);

    phoneControl.updateValueAndValidity();
  }

  parsePhoneForEdit(fullPhone: string): void {
    if (!fullPhone) return;

    // Try to match phone code and extract number
    for (const country of this.countries) {
      if (fullPhone.startsWith(country.phoneCode)) {
        this.selectedCountry = country;
        const phoneNumber = fullPhone.substring(country.phoneCode.length);
        this.agentForm.patchValue({
          countryCode: country.isoCode,
          phoneNumber: phoneNumber
        });
        this.updatePhoneValidators();
        return;
      }
    }

    // If no match found, default to India and use full phone as number
    const defaultCountry = this.countries.find(c => c.isoCode === 'IN');
    if (defaultCountry) {
      this.selectedCountry = defaultCountry;
      this.agentForm.patchValue({
        countryCode: defaultCountry.isoCode,
        phoneNumber: fullPhone.replace(/^\+/, '') // Remove leading + if present
      });
      this.updatePhoneValidators();
    }
  }

  getCountryFlagUrl(countryCode?: string): string {
    if (!countryCode) {
      return '';
    }
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  }

  getCountryByCode(code?: string): CountryMaster | undefined {
    return this.countries.find(c => c.isoCode === code);
  }

  onLocationCountrySelect(countryId: number, selectedCityId?: number): void {
    this.clearLocalTimeInterval();
    this.selectedTimezone = null;
    this.agentService.getCityList(countryId).subscribe({
      next: (response) => {
        this.cities = (response as any).attributes || [];
        this.selectedCity = null;
        this.localTime = '';
        this.agentForm.patchValue({ cityId: '' }, { emitEvent: false });

        if (selectedCityId != null) {
          const cityExists = this.cities.some(city => {
            return city.cityId === selectedCityId;
          });
          if (cityExists) {
            this.agentForm.patchValue({ cityId: selectedCityId }, { emitEvent: false });
            this.onCitySelect(selectedCityId);
          }
        }
      },
      error: () => {
        this.cities = [];
        this.selectedCity = null;
        this.localTime = '';
        this.agentForm.patchValue({ cityId: '' }, { emitEvent: false });
      }
    });
  }

  onCitySelect(cityId: number): void {
    cityId = Number(cityId);
    this.selectedCity = this.cities.find(c => c.cityId === cityId) || null;
    if (this.selectedCity && this.selectedCity.country.timezone) {
      this.selectedTimezone = this.selectedCity.country.timezone;
      this.updateLocalTime();
      this.startLocalTimeTicker();
    } else {
      this.selectedTimezone = null;
      this.clearLocalTimeInterval();
      this.localTime = '';
    }
  }

  updateLocalTime(): void {
    if (!this.selectedTimezone) {
      this.localTime = '';
      return;
    }

    try {
      const now = new Date();
      this.localTime = now.toLocaleString('en-US', {
        timeZone: this.selectedTimezone,
        hour12: true,
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      console.log('Updated local time:', this.localTime);
    } catch (error) {
      console.error('Error getting local time:', error);
      this.localTime = '';
    }
  }

  startLocalTimeTicker(): void {
    this.clearLocalTimeInterval();
    this.timezoneTimer = setInterval(() => this.updateLocalTime(), 1000);
  }

  clearLocalTimeInterval(): void {
    if (this.timezoneTimer) {
      clearInterval(this.timezoneTimer);
      this.timezoneTimer = null;
    }
  }

  getLocalTime(timezone: string): string {
    try {
      const now = new Date();
      const timeString = now.toLocaleString('en-US', {
        timeZone: timezone,
        hour12: true,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      });
      return timeString;
    } catch (error) {
      console.error('Error getting local time:', error);
      return '';
    }
  }
}