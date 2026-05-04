import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
  countries: CountryMaster[] = [];
  states: StateMaster[] = [];
  cities: CityMaster[] = [];
  languages: LanguageMaster[] = [];
  skills: SkillMaster[] = [];

  // Skills data for non-admin users
  skillsData: Array<{ skillName: string; experienceYears: number; experienceMonths: number }> = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private agentService: AgentService,
    private companyService: CompanyService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      firstName: [{ value: '', disabled: false }, Validators.required],
      middleName: [{ value: '', disabled: false }],
      lastName: [{ value: '', disabled: false }],
      email: [{ value: '', disabled: true }, Validators.required],
      uid: [{ value: '', disabled: true }],
      accessId: [{ value: '', disabled: true }],
      organizationName: [{ value: '', disabled: true }],
      role: [{ value: '', disabled: true }, Validators.required],
      registeredNumber: [{ value: '', disabled: true }],
      country: [{ value: '', disabled: false }],
      // Admin-specific fields
      state: [{ value: '', disabled: false }],
      city: [{ value: '', disabled: false }],
      addressLine1: [{ value: '', disabled: false }],
      addressLine2: [{ value: '', disabled: false }],
      pinCode: [{ value: '', disabled: false }],
      employeeSize: [{ value: '', disabled: false }, Validators.pattern(/^\d+$/)],
      // Non-admin specific fields
      language: [{ value: '', disabled: false }]
    });
    this.userOrgId = localStorage.getItem('userOrgId') || '';
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.loadProfileData();
  }

  loadInitialData() {
    
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
    this.userRole = userRole;
    this.isAdminRole = userRole.toLowerCase() === 'admin';
    this.isAdminAgentRole = userRole.toLowerCase() === 'adminagent' || userRole.toLowerCase() === 'admin_agent';

    // Call appropriate API based on role
    if (this.isAdminRole) {
      this.loadEnquiryInfo(userEmail);
    } else {
      this.loadUserInfo(userEmail);
    }
  }

  private loadEnquiryInfo(userEmail: string): void {
    this.authService.getEnquiryInfo(userEmail).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
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
      firstName: enquiry.firstName,
      middleName: enquiry.middleName || '',
      lastName: enquiry.lastName,
      email: enquiry.email,
      uid: company?.uid || '',
      organizationName: company?.companyName || '',
      role: enquiry.userRole,
      registeredNumber: (enquiry.phoneCode || '') + (enquiry.phoneNumber || ''),
      country: enquiry.country?.countryId || '',
      state: company?.state?.stateId || '',
      city: company?.city?.cityId || '',
      addressLine1: company?.addressLine1 || '',
      addressLine2: company?.addressLine2 || '',
      pinCode: company?.pinCode || '',
      employeeSize: company?.employeeSize || ''
    });

    // Disable admin-specific fields in view mode
    if (!this.isEditing) {
      this.disableAdminFields();
    }
  }

  private populateFormFromUser(user: UserVO): void {
    console.log('Populating form with user data:', user);
    this.profileForm.patchValue({
      firstName: user.firstName,
      middleName: user.middleName || '',
      lastName: user.lastName,
      email: user.email,
      accessId: user.registerId || '',
      organizationName: user.agent?.organization?.companyName || '', // Not available in UserVO
      uid: user.agent?.organization?.uid || '',
      role: user.role,
      registeredNumber: (user.phoneCode || '') + (user.phoneNumber || ''),
      country: user.country?.countryId || '',
      city: user.city?.cityId || '',
      language: user.language?.languageId || ''
    });

    // Extract skills data from agent
    if (user.agent?.agentSkillsMappings) {
      this.skillsData = user.agent.agentSkillsMappings.map(mapping => ({
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
    this.profileForm.get('state')?.disable();
    this.profileForm.get('city')?.disable();
    this.profileForm.get('addressLine1')?.disable();
    this.profileForm.get('addressLine2')?.disable();
    this.profileForm.get('pinCode')?.disable();
    this.profileForm.get('employeeSize')?.disable();
  }

  private disableNonAdminFields(): void {
    this.profileForm.get('language')?.disable();
  }

  startEditing(): void {
    this.isEditing = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Enable editable fields
    this.profileForm.get('firstName')?.enable();
    this.profileForm.get('middleName')?.enable();
    this.profileForm.get('lastName')?.enable();
    this.profileForm.get('country')?.enable();

    if (this.isAdminRole) {
      this.profileForm.get('state')?.enable();
      this.profileForm.get('city')?.enable();
      this.profileForm.get('addressLine1')?.enable();
      this.profileForm.get('addressLine2')?.enable();
      this.profileForm.get('pinCode')?.enable();
      this.profileForm.get('employeeSize')?.enable();
    } else {
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
      firstName: formValue.firstName,
      middleName: formValue.middleName,
      lastName: formValue.lastName,
      countryId: formValue.country
    };

    if (this.isAdminRole) {
      updatePayload = {
        ...updatePayload,
        companyId: (this.profileData as EnquiryRegistrationVO)?.company?.companyId,
        state: formValue.state,
        cityId: formValue.city,
        addressLine1: formValue.addressLine1,
        addressLine2: formValue.addressLine2,
        pinCode: formValue.pinCode,
        employeeSize: formValue.employeeSize
      };
    } else {
      updatePayload = {
        ...updatePayload,
        cityId: formValue.city,
        languageId: formValue.language
      };
    }

    this.authService.updateProfile(updatePayload).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.code === '200' || response.code === '0') {
          this.successMessage = 'Profile updated successfully.';
          this.isEditing = false;
          this.isSaving = false;
          
          // Reload profile data
          setTimeout(() => {
            this.loadProfileData();
          }, 1500);
        } else {
          this.errorMessage = response.description || 'Failed to update profile.';
          this.isSaving = false;
        }
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.errorMessage = error.error?.description || 'Error updating profile. Please try again.';
        this.isSaving = false;
      }
    });
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
      firstName: 'First Name',
      middleName: 'Middle Name',
      lastName: 'Last Name',
      email: 'Email',
      uid: 'UID',
      accessId: 'Access ID',
      organizationName: 'Organization Name',
      role: 'Role',
      registeredNumber: 'Registered Number',
      country: 'Country',
      state: 'State',
      city: 'City',
      addressLine1: 'Address Line 1',
      addressLine2: 'Address Line 2',
      pinCode: 'Pin Code',
      employeeSize: 'Employee Size',
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
      'role',
      'registeredNumber'
    ];
    return readOnlyFields.includes(fieldName);
  }

  isFieldVisible(fieldName: string): boolean {
    const adminOnlyFields = ['state', 'addressLine1', 'addressLine2', 'pinCode', 'employeeSize'];
    const nonAdminOnlyFields = ['language'];

    if (this.isAdminRole && nonAdminOnlyFields.includes(fieldName)) {
      return false;
    }

    if (!this.isAdminRole && adminOnlyFields.includes(fieldName)) {
      return false;
    }

    return true;
  }

  shouldShowUID(): boolean {
    return this.isAdminRole || this.isAdminAgentRole;
  }

  shouldShowAccessID(): boolean {
    return !this.isAdminRole;
  }
}
