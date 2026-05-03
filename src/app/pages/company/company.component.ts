import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CompanyService } from '../../service/company.service';
import { CompanyRequest, CountryMaster, EnquiryRegistration } from '../../models/company-master';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.scss']
})
export class CompanyComponent implements OnInit {
  companyForm: FormGroup;
  countries: CountryMaster[] = [];
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
      address: ['', Validators.required],
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
    this.companyForm.patchValue({
      companyId: enquiry.company?.companyId ?? null,
      uid: enquiry.company?.uid ?? '',
      companyName: enquiry.company?.companyName ?? '',
      registeredNumber: enquiry?.phone ?? '',
      countryId: enquiry.country?.countryId ?? null,
      address: enquiry.company?.address ?? '',
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
      address: formValue.address,
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

  cancelForm(): void {
    this.router.navigate(['/settings']);
  }
}
