import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../service/authentication.service';
import { AgentService } from '../../service/agent.service';
import { CountryMaster } from '../../models/company-master';
import { EnquiryRegisterRequest } from '../../models/enquiry-register-request';
import { FlickzzDeskResponse } from '../../models/authentication-response';

@Component({
  selector: 'app-enquiry-registration',
  templateUrl: './enquiry-registration.component.html',
  styleUrls: ['./enquiry-registration.component.css']
})
export class EnquiryRegistrationComponent implements OnInit {
  registrationForm: FormGroup;
  countries: CountryMaster[] = [];
  selectedCountry: CountryMaster | null = null;
  countryCode = '--';
  submitError = '';
  loading = false;
  registrationSuccess = false;
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private agentService: AgentService,
        private router: Router
  ) {
    this.registrationForm = this.fb.group({
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      orgName: ['', [Validators.required, this.alphanumericValidator.bind(this)]],
      countryId: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      employeeSize: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadCountries();
  }

  get firstNameControl() {
    return this.registrationForm.get('firstName');
  }

  get lastNameControl() {
    return this.registrationForm.get('lastName');
  }

  get emailControl() {
    return this.registrationForm.get('email');
  }

  get orgNameControl() {
    return this.registrationForm.get('orgName');
  }

  get countryControl() {
    return this.registrationForm.get('countryId');
  }

  get phoneNumberControl() {
    return this.registrationForm.get('phoneNumber');
  }

  get employeeSizeControl() {
    return this.registrationForm.get('employeeSize');
  }

  loadCountries(): void {
    this.agentService.getCountryList().subscribe({
      next: (response) => {
        this.countries = (response as any).attributes || [];
      },
      error: (err) => {
        console.error('Country list load error', err);
        this.countries = [];
      }
    });
  }

  // Custom Validators
  alphanumericValidator(control: any): { [key: string]: any } | null {
    if (!control.value) {
      return null;
    }
    const regex = /^[a-zA-Z0-9 ]+$/;
    return regex.test(control.value) ? null : { 'alphanumeric': { value: control.value } };
  }

  onCountryChange(): void {
    const countryId = this.registrationForm.get('countryId')?.value;
    if (!countryId) {
      this.selectedCountry = null;
      this.countryCode = '--';
      this.resetPhoneValidators();
      return;
    }

    this.selectedCountry = this.countries.find(c => c.countryId === Number(countryId)) || null;
    this.countryCode = this.selectedCountry?.phoneCode ? `${this.selectedCountry.phoneCode}` : '--';
    this.resetPhoneValidators();
  }

  resetPhoneValidators(): void {
    const phoneControl = this.phoneNumberControl;
    if (!phoneControl) {
      return;
    }

    const validators = [Validators.required, Validators.pattern('^[0-9]+$')];

    if (this.selectedCountry?.phoneCode === '91') {
      validators.push(Validators.minLength(10), Validators.maxLength(10));
    } else {
      validators.push(Validators.minLength(7), Validators.maxLength(15));
    }

    phoneControl.setValidators(validators);
    phoneControl.updateValueAndValidity();
  }

  saveEnquiry(): void {
    this.submitError = '';
    this.formErrorCheck();

    if (this.registrationForm.invalid) {
      return;
    }

    const enquiryRequest: EnquiryRegisterRequest = {
      firstName: this.registrationForm.value.firstName,
      middleName: this.registrationForm.value.middleName,
      lastName: this.registrationForm.value.lastName,
      email: this.registrationForm.value.email,
      orgName: this.registrationForm.value.orgName,
      phone: `${this.countryCode}${this.registrationForm.value.phoneNumber}`,
      countryId: Number(this.registrationForm.value.countryId),
      employeeSize: Number(this.registrationForm.value.employeeSize)
    };

    this.loading = true;
    this.authService.registerEnquiry(enquiryRequest).subscribe({
      next: (response: FlickzzDeskResponse) => {
        this.loading = false;
        this.registrationSuccess = true;
        this.successMessage = response.description || 'FlickDesk enquiry registration successful. Please verify your email within 3 hours to proceed further.';
      },
      error: (err) => {
        this.loading = false;
        console.error('Enquiry registration error', err);
        this.submitError = err.error?.description || 'Enquiry registration failed';
      }
    });
  }

  private formErrorCheck(): void {
    Object.keys(this.registrationForm.controls).forEach(key => {
      const field = this.registrationForm.get(key);
      if (field?.hasError('required')) {
        const label = this.getLabelForKey(key);
        (this.formError as any)[key] = `${label} is required`;
      }
      if (key === 'email' && field?.hasError('email')) {
        (this.formError as any)[key] = 'Invalid email format';
      }
      if (key === 'phoneNumber' && field?.hasError('pattern')) {
        (this.formError as any)[key] = 'Phone number must contain digits only';
      }
      if (key === 'phoneNumber' && (field?.hasError('minlength') || field?.hasError('maxlength'))) {
        (this.formError as any)[key] = 'Enter a valid phone number for the selected country';
      }
      if (key === 'employeeSize' && field?.hasError('min')) {
        (this.formError as any)[key] = 'Employee Size must be at least 1';
      }
    });
  }

  private getLabelForKey(key: string): string {
    switch (key) {
      case 'firstName': return 'First Name';
      case 'middleName': return 'Middle Name';
      case 'lastName': return 'Last Name';
      case 'orgName': return 'Organisation Name';
      case 'phoneNumber': return 'Phone Number';
      case 'employeeSize': return 'Employee Size';
      default: return key.charAt(0).toUpperCase() + key.slice(1);
    }
  }

  cancelRegistration(): void {
     this.router.navigate(['/login']);
  }

  formError: any = {};
}
