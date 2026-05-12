import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../service/authentication.service';
import { UserVO } from '../../models/user-vo';
import { EnquiryRegistrationVO } from '../../models/enquiry-registration-vo';
import { Subject, takeUntil } from 'rxjs';
import { CountryMaster, StateMaster } from 'src/app/models/company-master';
import { CityMaster, LanguageMaster } from 'src/app/models/city-master';
import { AgentService } from 'src/app/service/agent.service';
import { SkillMaster } from 'src/app/models/skill-master';
import { CompanyService } from 'src/app/service/company.service';
import { CalendarMasterVO } from 'src/app/models/calendar-master';

type ProfileData = UserVO | EnquiryRegistrationVO;

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  profileForm: FormGroup;
  isEditing = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  userRole: string = '';
  userEmail: string = '';
  userOrgId: string = '';
  profileData: ProfileData | null = null;
  isAdminRole: boolean = false;
  isAdminAgentRole: boolean = false;
  isAgentRole: boolean = false;
  countries: CountryMaster[] = [];
  states: StateMaster[] = [];
  cities: CityMaster[] = [];
  languages: LanguageMaster[] = [];
  skills: SkillMaster[] = [];
  calendars: CalendarMasterVO[] = [];

  // Skills data for non-admin users
  skillsData: Array<{ skillId?: number; skillName: string; experienceYears: number; experienceMonths: number }> = [];
  selectedSkill: SkillMaster | null = null;
  skillNameInput = '';
  experienceYearsInput = 0;
  experienceMonthsInput = 0;
  skillSearchResults: SkillMaster[] = [];
  skillFormError: { skillName?: string; experienceYears?: string; experienceMonths?: string; general?: string } = {};
  editingSkillIndex: number | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private agentService: AgentService,
    private companyService: CompanyService,
    private router: Router
  ) {
    
    this.userOrgId = localStorage.getItem('userOrgId') || '';
    const userRole = localStorage.getItem('userRole');
    this.isAdminRole = userRole?.toLowerCase() === 'admin';
    this.isAdminAgentRole = userRole?.toLowerCase() === 'adminagent';
    this.isAgentRole = userRole?.toLowerCase() === 'agent';

    this.profileForm = this.fb.group({
      agentId: [{ value: '', disabled: true }],
      enquiryId: [{ value: '', disabled: true }],
      agentName: [{ value: '', disabled: false }, !this.isAdminRole ? Validators.required : null],
      firstName: [{ value: '', disabled: false }, this.isAdminRole ? Validators.required : null],
      middleName: [{ value: '', disabled: false }],
      lastName: [{ value: '', disabled: false }],
      email: [{ value: '', disabled: true }, Validators.required],
      uid: [{ value: '', disabled: true }],
      accessId: [{ value: '', disabled: true }],
      organizationName: [{ value: '', disabled: true }],
      role: [{ value: '', disabled: true }, Validators.required],
      registeredNumber: [{ value: '', disabled: false }, Validators.required],
      country: [{ value: '', disabled: false }],
      // Admin-specific fields
      state: [{ value: '', disabled: false }],
      city: [{ value: '', disabled: false }],
      calendar: [{ value: '', disabled: false }],
      language: [{ value: '', disabled: false }],
      skillName: [{ value: '', disabled: false }],
      experienceYears: [{ value: 0, disabled: false }],
      experienceMonths: [{ value: 0, disabled: false }]
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.loadProfileData();
  }

  loadInitialData() {    
    this.agentService.getCalendarList(this.userOrgId).subscribe({
      next: (response) => {
        this.calendars = (response as any).attributes || [];
      },
      error: () => { this.calendars = []; }
    });

    this.agentService.getSkillsList(this.userOrgId).subscribe({
      next: (response) => {
        this.skills = (response as any).attributes || [];
      },
      error: () => {
        this.skills = [];
      }
    });

    this.agentService.getCountryList().subscribe({
      next: (response) => {
        this.countries = (response as any).attributes || [];
      },
      error: () => {
        this.countries = [];
      }
    });

    this.companyService.getAllStates().subscribe({
      next: (response) => {
        this.states = (response as any).attributes || response || [];
      },
      error: () => {
        this.states = [];
      }
    });

    this.companyService.getAllCities().subscribe({
      next: (response) => {
        this.cities = (response as any).attributes || response || [];
      },
      error: () => {
        this.cities = [];
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProfileData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const userEmail = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userEmail || !userRole) {
      this.errorMessage = 'User email or role not found in session.';
      this.isLoading = false;
      return;
    }

    this.userEmail = userEmail;

    // Call appropriate API based on role
    if (this.isAdminRole) {
      this.loadEnquiryInfo(userEmail);
    } else {
      this.loadUserInfo(userEmail);
    }
  }

  onCountryChange(countryId: string | number): void {
    const id = Number(countryId);
    this.profileForm.patchValue({ state: '', city: '' });
    this.states = [];
    this.cities = [];

    if (!id) {
      return;
    }

    if (this.isAdminRole) {3
      this.loadStatesForCountry(id);
      return;
    }

    this.loadCitiesByCountry(id);
  }

  onStateChange(stateId: string | number): void {
    const id = Number(stateId);
    this.profileForm.patchValue({ city: '' });
    this.cities = [];

    if (!id) {
      return;
    }

    this.loadCitiesForState(id);
  }

  private loadStatesForCountry(countryId: number, selectedStateId?: number): void {
    this.companyService.getStateList(countryId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.states = (response as any).attributes || [];
        if (selectedStateId) {
          this.profileForm.patchValue({ state: selectedStateId });
          this.loadCitiesForState(selectedStateId);
        }
      },
      error: (error) => {
        console.error('Error loading states:', error);
        this.states = [];
        this.errorMessage = 'Unable to load states for the selected country.';
      }
    });
  }

  private loadCitiesForState(stateId: number, selectedCityId?: number): void {
    this.companyService.getCitiesByState(stateId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.cities = (response as any).attributes || [];
        if (selectedCityId) {
          this.profileForm.patchValue({ city: selectedCityId });
        }
      },
      error: (error) => {
        console.error('Error loading cities for state:', error);
        this.cities = [];
        this.errorMessage = 'Unable to load cities for the selected state.';
      }
    });
  }

  private loadCitiesByCountry(countryId: number, selectedCityId?: number): void {
    this.agentService.getCityListByCountry(countryId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.cities = (response as any).attributes || response || [];
        if (selectedCityId) {
          this.profileForm.patchValue({ city: selectedCityId });
        }
      },
      error: (error) => {
        console.error('Error loading cities for country:', error);
        this.cities = [];
        this.errorMessage = 'Unable to load cities for the selected country.';
      }
    });
  }

  private loadEnquiryInfo(userEmail: string): void {
    this.authService.getEnquiryInfo(userEmail).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        console.log('Enquiry info loaded:', response);
          const enquiry = (response as any).attributes as EnquiryRegistrationVO;
          this.profileData = enquiry;
          this.populateFormFromEnquiry(enquiry);
          this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading enquiry info:', error);
        this.errorMessage = error.error?.description || 'Error loading profile information.';
        this.isLoading = false;
      }
    });
  }

  private loadUserInfo(userEmail: string): void {
    this.authService.getUserInfo(userEmail).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        const user = (response as any).attributes as UserVO;
        this.profileData = user;
        if (user.agent?.agentId) {
          this.agentService.getAgentSkills(user.agent.agentId).subscribe({
            next: (skillsResponse) => {
              const skillsData = (skillsResponse as any).attributes || [];
              this.skillsData = skillsData.map((mapping: any) => ({
                skillId: mapping.skill?.skillId,
                skillName: mapping.skill?.skillName || '',
                experienceYears: mapping.experienceYears || 0,
                experienceMonths: mapping.experienceMonths || 0
              }));
            },
            error: (err) => {
              console.error('Error loading agent skills:', err);
              this.skillsData = [];
            }
          });
        }
        this.populateFormFromUser(user);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user info:', error);
        this.errorMessage = error.error?.description || 'Error loading profile information.';
        this.isLoading = false;
      }
    });
  }

  private populateFormFromEnquiry(enquiry: EnquiryRegistrationVO): void {
    console.log('Populating form with enquiry data:', enquiry);
    const company = enquiry.company;

    this.profileForm.patchValue({
      enquiryId: enquiry.enquiryId,
      firstName: enquiry.firstName,
      middleName: enquiry.middleName || '',
      lastName: enquiry.lastName,
      email: enquiry.email,
      uid: company?.uid || '',
      organizationName: company?.companyName || '',
      role: enquiry.userRole,
      registeredNumber: (enquiry.phoneCode || '') + '-' + (enquiry.phoneNumber || ''),
      country: enquiry.country?.countryId || '',
      state: enquiry?.state?.stateId || '',
      city: enquiry?.city?.cityId || '',
    });

    if (!this.isEditing) {
      this.disableAdminFields();
    }
  }

  private populateFormFromUser(user: UserVO): void {
    console.log('Populating form with user data:', user);
    this.profileForm.patchValue({
      agentId: user.agent?.agentId || '',
      agentName: user.agent?.agentName,
      email: user.email,
      accessId: user.registerId || '',
      organizationName: user.agent?.organization?.companyName || '', // Not available in UserVO
      calendar: user.agent?.calendar.calendarId || '',
      role: user.role,
      registeredNumber: (user.agent?.phoneCode || '') + '-' + (user.agent?.phoneNumber || ''),
      country: user.country?.countryId || '',
      city: user.city?.cityId || '',
      language: user.language?.languageId || ''
    });

    // Extract skills data from agent
    if (user.agent?.agentSkillsMappings) {
      this.skillsData = user.agent.agentSkillsMappings.map(mapping => ({
        skillId: mapping.skill?.skillId,
        skillName: mapping.skill?.skillName || '',
        experienceYears: mapping.skill?.experienceYears || 0,
        experienceMonths: mapping.skill?.experienceMonths || 0
      }));
    }

    // Disable non-admin specific fields in view mode
    if (!this.isEditing) {
      this.disableNonAdminFields();
    }
  }

  private disableAdminFields(): void {
    this.profileForm.get('country')?.disable();
    this.profileForm.get('state')?.disable();
    this.profileForm.get('city')?.disable();
  }

  private disableNonAdminFields(): void {
    this.profileForm.get('language')?.disable();
  }

  onSkillSearch(): void {
    const searchTerm = this.profileForm.get('skillName')?.value.trim().toLowerCase() || '';
    this.skillSearchResults = [];
    this.selectedSkill = null;
    this.skillFormError.skillName = undefined;

    if (!searchTerm) {
      return;
    }

    this.skillSearchResults = this.skills.filter(skill =>
      skill.skillName.toLowerCase().includes(searchTerm)
    );
  }

  selectSkill(skill: SkillMaster): void {
    this.selectedSkill = skill;
    this.skillNameInput = skill.skillName;
    this.skillSearchResults = [];
    this.skillFormError.skillName = undefined;
  }

  addOrUpdateSkill(): void {
    this.skillFormError = {};
    const trimmedSkillName = this.skillNameInput.trim();

    if (!trimmedSkillName) {
      this.skillFormError.skillName = 'Please select a skill from suggestions.';
    }

    if (this.experienceYearsInput < 0) {
      this.skillFormError.experienceYears = 'Years cannot be negative.';
    }

    if (this.experienceMonthsInput < 0 || this.experienceMonthsInput > 11) {
      this.skillFormError.experienceMonths = 'Months must be between 0 and 11.';
    }

    if (Object.keys(this.skillFormError).length > 0) {
      return;
    }

    const existingSkill = this.skills.find(skill => skill.skillName.toLowerCase() === trimmedSkillName.toLowerCase());
    const skillEntry = {
      skillId: existingSkill?.skillId,
      skillName: trimmedSkillName,
      experienceYears: this.experienceYearsInput,
      experienceMonths: this.experienceMonthsInput
    };

    if (this.editingSkillIndex !== null && this.editingSkillIndex >= 0) {
      this.skillsData[this.editingSkillIndex] = skillEntry;
      this.editingSkillIndex = null;
    } else {
      const duplicateIndex = this.skillsData.findIndex(entry =>
        entry.skillName.toLowerCase() === trimmedSkillName.toLowerCase()
      );

      if (duplicateIndex >= 0) {
        this.skillsData[duplicateIndex] = skillEntry;
      } else {
        this.skillsData.push(skillEntry);
      }
    }

    this.resetSkillEntry();
  }

  editSkill(index: number): void {
    const skill = this.skillsData[index];
    this.editingSkillIndex = index;
    this.skillNameInput = skill.skillName;
    this.experienceYearsInput = skill.experienceYears;
    this.experienceMonthsInput = skill.experienceMonths;
    this.selectedSkill = this.skills.find(s => s.skillName.toLowerCase() === skill.skillName.toLowerCase()) || null;
    this.skillSearchResults = [];
    this.skillFormError = {};
  }

  removeSkill(index: number): void {
    this.skillsData.splice(index, 1);
    if (this.editingSkillIndex === index) {
      this.resetSkillEntry();
    }
  }

  resetSkillEntry(): void {
    this.skillNameInput = '';
    this.selectedSkill = null;
    this.experienceYearsInput = 0;
    this.experienceMonthsInput = 0;
    this.skillSearchResults = [];
    this.editingSkillIndex = null;
    this.skillFormError = {};
  }

  startEditing(): void {
    this.isEditing = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Enable editable fields
    this.profileForm.get('country')?.enable();

    if (this.isAdminRole) {
      this.profileForm.get('firstName')?.enable();
      this.profileForm.get('middleName')?.enable();
      this.profileForm.get('lastName')?.enable();
      this.profileForm.get('state')?.enable();
      this.profileForm.get('city')?.enable();
    } else {
      this.profileForm.get('agentName')?.enable();
      this.profileForm.get('registeredNumber')?.enable();
      this.profileForm.get('calendar')?.enable();
      this.profileForm.get('city')?.enable();
      this.profileForm.get('language')?.enable();
    }
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.errorMessage = '';
    this.successMessage = '';

    // Reload form data and disable fields
    if (this.profileData) {
      if (this.isAdminRole) {
        this.populateFormFromEnquiry(this.profileData as EnquiryRegistrationVO);
      } else {
        this.populateFormFromUser(this.profileData as UserVO);
      }
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.profileForm.getRawValue();

    // Build the update payload based on role
    let updatePayload: any = {
      countryId: formValue.country
    };

    if (this.isAdminRole) {
      updatePayload = {
        ...updatePayload,
        enquiryId: formValue.enquiryId,
        firstName: formValue.firstName,
        middleName: formValue.middleName,
        lastName: formValue.lastName,
        companyId: (this.profileData as EnquiryRegistrationVO)?.company?.companyId,
        stateId: formValue.state,
        cityId: formValue.city,
        phoneCode: this.extractPhoneCode(formValue.registeredNumber),
        phoneNumber: this.extractPhoneNumber(formValue.registeredNumber),
      };
    } else {
      updatePayload = {
        ...updatePayload,
        agentId: formValue.agentId,
        agentName: formValue.agentName,
        orgId: localStorage.getItem('userOrgId'),
        phoneCode: this.extractPhoneCode(formValue.registeredNumber),
        phoneNumber: this.extractPhoneNumber(formValue.registeredNumber),
        cityId: formValue.city,
        languageId: formValue.language,
        calendarId: Number(formValue.calendar),
        udaptedBy: formValue.agentName || ''
      };
    }

    if (this.skillsData && this.skillsData.length > 0) {
      updatePayload = {
        ...updatePayload,
        skills: this.skillsData.map(skill => ({
          skillId: skill.skillId,
          skillName: skill.skillName,
          experienceYears: skill.experienceYears,
          experienceMonths: skill.experienceMonths
        }))
      };
    }

    if (this.isAdminRole) {
      this.authService.updateEnquiry(updatePayload).subscribe({
        next: () => {         
          this.successMessage = 'Profile updated successfully.';
          this.isEditing = false;
          this.isSaving = false;
          
          // Reload profile data
          setTimeout(() => {
            this.loadProfileData();
          }, 1500);
        },
        error: (err) => {          
          console.error('Error updating profile:', err);
          this.errorMessage = err.error?.description || 'Error updating profile. Please try again.';
          this.isSaving = false;
        }
      });
    } else {
      this.agentService.updateAgent(updatePayload).subscribe({
        next: () => {         
          this.successMessage = 'Profile updated successfully.';
          this.isEditing = false;
          this.isSaving = false;
          
          // Reload profile data
          setTimeout(() => {
            this.loadProfileData();
          }, 1500);
        },
        error: (err) => {          
          console.error('Error updating profile:', err);
          this.errorMessage = err.error?.description || 'Error updating profile. Please try again.';
          this.isSaving = false;
        }
      });
    }
  }

  private extractPhoneCode(registeredNumber: string): string {
    if (!registeredNumber) return '';
    const parts = registeredNumber.split('-');
    return parts.length > 1 ? parts[0] : '';
  }

  private extractPhoneNumber(registeredNumber: string): string {
    if (!registeredNumber) return '';
    const parts = registeredNumber.split('-');
    return parts.length > 1 ? parts[1] : registeredNumber;
  }

  goBack(): void {
    this.router.navigate(['/welcome']);
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      agentName: 'Agent Name',
      firstName: 'First Name',
      middleName: 'Middle Name',
      lastName: 'Last Name',
      calendar: 'Calendar',
      email: 'Email',
      uid: 'UID',
      accessId: 'Access ID',
      organizationName: 'Organization Name',
      role: 'Role',
      registeredNumber: 'Registered Number',
      country: 'Country',
      state: 'State',
      city: 'City',
      language: 'Language'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldReadOnly(fieldName: string): boolean {
    const readOnlyFields = [
      'email',
      'uid',
      'accessId',
      'organizationName',
      'role'
    ];
    return readOnlyFields.includes(fieldName);
  }
}
