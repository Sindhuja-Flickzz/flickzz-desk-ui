import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CompanyService } from '../../service/company.service';
import { CompanyRequest, CountryMaster, EnquiryRegistration, StateMaster } from '../../models/company-master';
import { CityMaster } from '../../models/city-master';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.scss']
})
export class CompanyComponent implements OnInit {
  companyForm: FormGroup;
  countries: CountryMaster[] = [];
  states: StateMaster[] = [];
  cities: CityMaster[] = [];
  loading = false;
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;
  originalFormValue: any = null;

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private router: Router
  ) {
    this.companyForm = this.fb.group({
      companyId: [null],
      uid: ['', Validators.required],
      companyName: ['', [Validators.required, this.alphanumericValidator.bind(this)]],
      registeredNumber: ['', Validators.required],
      countryId: [null, Validators.required],
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      state: '',
      city: '',
      pincode: ['', Validators.pattern('^[0-9]*$')],
      mail: ['', [Validators.required, Validators.email]],
      employeeSize: [null, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.companyForm.valueChanges.subscribe(() => {
      this.submitError = '';
      this.submitSuccess = '';
    });

    this.companyForm.get('countryId')?.valueChanges.subscribe(countryId => {
      this.states = [];
      this.cities = [];
      this.companyForm.patchValue({ state: '', city: '' }, { emitEvent: false });

      if (countryId) {
        this.loadStateList(Number(countryId));
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

  loadInitialData(): void {
    this.loading = true;
    const userEmail = localStorage.getItem('userId') || '';

    if (!userEmail) {
      this.submitError = 'User identity not found in localStorage.';
      this.loading = false;
      return;
    }

    this.companyService.getAllCountries().subscribe({
      next: (response) => {
        this.countries = (response as any).attributes || response || [];
      },
      error: () => {
        this.countries = [];
      }
    });

    this.companyService.getEnquiryByUserEmail(userEmail).subscribe({
      next: (response) => {
        const enquiry = (response as any).attributes || response;
        this.patchEnquiryData(enquiry);
        this.originalFormValue = this.companyForm.getRawValue();
        this.loading = false;
      },
      error: (err) => {
        this.submitError = err?.error?.message || 'Failed to load enquiry details.';
        this.loading = false;
      }
    });
  }

  patchEnquiryData(enquiry: EnquiryRegistration): void {

    if (enquiry && enquiry.company && enquiry.company.city) {
      this.loadAllCities();
    }

    this.companyForm.patchValue({
      companyId: enquiry.company?.companyId ?? null,
      uid: enquiry.company?.uid ?? '',
      companyName: enquiry.company?.companyName ?? '',
      registeredNumber: `${enquiry?.company?.phoneCode ?? ''}${enquiry?.company?.registeredNumber ?? ''}`,
      countryId: enquiry.company?.country?.countryId ?? null,
      addressLine1: enquiry.company?.addressLine1 ?? null,
      addressLine2: enquiry.company?.addressLine2 ?? null,
      state: enquiry.company?.state?.stateId ?? '',
      city: enquiry.company?.city?.cityId ?? '',
      pincode: enquiry.company?.pinCode ?? null,
      mail: enquiry.company?.mail ?? '',
      employeeSize: enquiry.company?.employeeSize ?? enquiry.employeeSize ?? null
    });
  }

  onSave(): void {
    this.isSubmitting = true;
    this.submitError = '';
    this.submitSuccess = '';

    if (this.companyForm.invalid) {
      if (this.companyForm.get('mail')?.hasError('email')) {
        this.submitError = 'Please enter a valid email address.';
      } else {
        this.submitError = 'Please complete all required fields.';
      }
      this.isSubmitting = false;
      return;
    }

    const formValue = this.companyForm.value;
    const payload: CompanyRequest = {
      companyId: formValue.companyId,
      companyName: formValue.companyName,
      registeredNumber: formValue.registeredNumber,
      uid: formValue.uid,
      countryId: Number(formValue.countryId),
      address: `${formValue.addressLine1}${formValue.addressLine2 ? ', ' + formValue.addressLine2 : ''}`,
      addressLine1: formValue.addressLine1,
      addressLine2: formValue.addressLine2,
      stateId: formValue.state,
      cityId: formValue.city,
      pinCode: formValue.pincode,
      mail: formValue.mail,
      employeeSize: Number(formValue.employeeSize),
      createdBy: localStorage.getItem('userRole') || '',
      updatedBy: localStorage.getItem('userRole') || ''
    };

    this.companyService.updateCompany(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = 'Company updated successfully.';
        this.originalFormValue = this.companyForm.getRawValue();
        this.companyForm.markAsPristine();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err?.error?.message || 'Failed to update company.';
      }
    });
  }

  resetForm(): void {
    if (this.originalFormValue) {
      this.companyForm.patchValue(this.originalFormValue);
      this.companyForm.markAsPristine();
      this.submitError = '';
      this.submitSuccess = '';
    }
  }

  loadStateList(countryId: number): void {
    this.companyService.getStateList(countryId).subscribe({
      next: (response) => {
        this.states = (response as any).attributes || response || [];
      },
      error: () => {
        this.states = [];
      }
    });
  }

  onStateSelect(stateId: number | null): void {
    this.cities = [];
    this.companyForm.patchValue({ city: '' }, { emitEvent: false });

    if (stateId != null) {
      this.loadCityList(Number(stateId));
    }
  }

  loadAllCities(): void {
    this.companyService.getAllCities().subscribe({
      next: (response) => {
        this.cities = (response as any).attributes || response || [];
      },
      error: () => {
        this.cities = [];
      }
    });
  }

  loadCityList(stateId: number): void {
    this.companyService.getCitiesByState(stateId).subscribe({
      next: (response) => {
        this.cities = (response as any).attributes || response || [];
      },
      error: () => {
        this.cities = [];
      }
    });
  }

  cancelForm(): void {
    this.router.navigate(['/settings']);
  }
}
