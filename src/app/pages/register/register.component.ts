import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RegisterLoginRequest } from '../../models/register-login-request';
import { FlickzzDeskResponse } from '../../models/authentication-response';
import { AuthenticationService } from '../../service/authentication.service';
import { AgentService } from '../../service/agent.service';
import { Router } from '@angular/router';
import { VerificationRequest } from '../../models/verification-request';
import { CountryMaster } from '../../models/company-master';
import { CityMaster, LanguageMaster } from '../../models/city-master';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup;
  registerRequest: RegisterLoginRequest = {
    mfaEnabled: false
  };
  commonResponse: FlickzzDeskResponse = {
    code: '',
    title: '',
    description: '',
    attributes: {
      accessToken: '',
      mfaEnabled: false,
      refreshToken: '',
      secretImageUri: '',
      userRole: ''
    }
  };

  countries: CountryMaster[] = [];
  cities: CityMaster[] = [];
  languages: LanguageMaster[] = [];

  selectedCountry: CountryMaster | null = null;
  selectedCity: CityMaster | null = null;
  selectedLanguage: LanguageMaster | null = null;

  message = '';
  otpCode = '';
  showPassword = false;
  formError: any = {};
  submitError = '';
  tfaEnabled = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private agentService: AgentService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      accessId: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9]+$/)]],
      password: ['', Validators.required],
      phone: ['', [Validators.pattern('^[0-9]+$')]],
      countryId: [''],
      cityId: [''],
      languageId: ['']
    });
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading = true;

    this.agentService.getCountryList().subscribe({
      next: (response) => {
        this.countries = (response as any).attributes || [];
        this.registerForm.patchValue({ countryId: '' });
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

    this.loading = false;
  }

  // setDefaultCountry(): void {
  //   // Default to India
  //   const defaultCountry = this.countries.find(c => c.isoCode === 'IN');
  //   if (defaultCountry) {
  //     this.selectedCountry = defaultCountry;
  //     this.registerForm.patchValue({ countryId: defaultCountry.countryId });
  //   }
  // }

  onCountryChange(): void {
    const countryId = this.registerForm.get('countryId')?.value;
    if (countryId) {
      this.selectedCountry = this.countries.find(c => c.countryId === Number(countryId)) || null;
      this.loadCitiesByCountry(countryId);
    } else {
      this.selectedCountry = null;
      this.cities = [];
      this.selectedCity = null;
      this.registerForm.patchValue({ cityId: '' });
    }
    console.log('Selected country:', this.selectedCountry);
  }

  loadCitiesByCountry(countryId: number): void {
    this.agentService.getCityList(countryId).subscribe({
      next: (response) => {
        this.cities = (response as any).attributes || [];
        this.selectedCity = null;
        this.registerForm.patchValue({ cityId: '' });
      },
      error: () => {
        this.cities = [];
        this.selectedCity = null;
        this.registerForm.patchValue({ cityId: '' });
      }
    });
  }

  onCityChange(): void {
    const cityId = this.registerForm.get('cityId')?.value;
    if (cityId) {
      this.selectedCity = this.cities.find(c => c.cityId === Number(cityId)) || null;
    } else {
      this.selectedCity = null;
    }
    console.log('Selected city:', this.selectedCity);
  }

  onLanguageChange(): void {
    const languageId = this.registerForm.get('languageId')?.value;
    if (languageId) {
      this.selectedLanguage = this.languages.find(l => l.languageId === Number(languageId)) || null;
    } else {
      this.selectedLanguage = null;
    }
    console.log('Selected language:', this.selectedLanguage);
  }

  onOtpInput($event: Event) {
    this.otpCode = (this.otpCode.replace(/[^0-9]/g, '').slice(0, 6))
  }

  registerUser() {
    this.message = '';
    this.submitError = '';
    this.formError = {};

    Object.keys(this.registerForm.controls).forEach(key => {
      const field = this.registerForm.get(key);
      if (field?.hasError('required')) {
        const label = key === 'accessId' ? 'Access ID' : key.charAt(0).toUpperCase() + key.slice(1);
        this.formError[key] = `${label} is required`;
      }
      if (key === 'email' && field?.hasError('email')) {
        this.formError[key] = 'Invalid email format';
      }
      if (key === 'accessId' && field?.hasError('pattern')) {
        this.formError[key] = 'Access ID must contain only letters and numbers';
      }
      if (key === 'phone' && field?.hasError('pattern')) {
        this.formError[key] = 'Phone number must contain only digits';
      }
    });

    if (Object.keys(this.formError).length > 0) {
      return;
    }
    this.registerRequest = {
      ...this.registerRequest,
      firstname: this.registerForm.value.firstname,
      lastname: this.registerForm.value.lastname,
      email: this.registerForm.value.email,
      registerId: this.registerForm.value.accessId,
      password: this.registerForm.value.password,
      phone: this.registerForm.value.phone,
      countryId: Number(this.selectedCountry?.countryId),
      cityId: Number(this.selectedCity?.cityId),
      languageId: Number(this.selectedLanguage?.languageId),
      mfaEnabled: this.registerRequest.mfaEnabled,
      createdBy: 'Admin'
    };

    this.authService.register(this.registerRequest)
      .subscribe({
        next: (response) => {
          this.tfaEnabled = true;
          if (response.code === 'GM-200') {
              this.commonResponse = response;
          }
        },
        error: (err) => {
          console.error('Register error', err);
          this.submitError = err.error?.description || 'Failed to register.';
        }
      });
  }

  verifyTfa() {
    this.message = '';
    this.submitError = '';

    if (this.otpCode.length < 6) {
      this.submitError = 'Validation code must be 6 digits';
      return;
    }

    const verifyRequest: VerificationRequest = {
      email: this.registerForm.value.email || this.registerRequest.email,
      code: parseInt(this.otpCode)
    };
    this.authService.verifyCode(verifyRequest)
      .subscribe({
        next: (response) => {
          this.message = 'Account created successfully\nYou will be redirected to the Login page in 3 seconds';
          setTimeout(() => {
            this.router.navigate(['login']);
          }, 3000);
        },
        error: (err) => {
          console.error('Verify TFA error', err);
          this.submitError = err.error?.description || 'Failed to verify code.';
        }
      });
  }
  
  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}

