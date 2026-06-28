import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CompanyService } from '../../../service/company.service';
import { CompanyBpRequest, CompanyMaster } from '../../../models/company-master';
import { USER_ROLES } from 'src/app/data/app_constants';

@Component({
  selector: 'app-bp-assignment',
  templateUrl: './bp-assignment.component.html',
  styleUrls: ['./bp-assignment.component.scss']
})
export class BpAssignmentComponent implements OnInit {
  activeTab: 'create' | 'list' = 'create';
  bpForm: FormGroup;
  loading = false;
  loadingList = false;
  formError: Record<string, string> = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;
  companyDetails: CompanyMaster | null = null;
  bpList: any[] = [];
  orgId = Number(localStorage.getItem('userOrgId') || 0);
  userId = Number(localStorage.getItem('userId') || 0);
  userRole = localStorage.getItem('userRole') || '';

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private router: Router
  ) {
    this.bpForm = this.fb.group({
      uid: ['', Validators.required],
      callHorizonPercent: [null, [Validators.required, Validators.min(1), Validators.max(100)]],
      validFrom: [null, Validators.required],
      validTo: [null, Validators.required],
      refNumber: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9]+$/)]],
      refDate: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.bpForm.valueChanges.subscribe(() => {
      this.submitError = '';
      this.submitSuccess = '';
      this.formError = {};
    });

    this.loadBpList();
  }

  onUidChange(): void {
    if (this.companyDetails) {
      this.companyDetails = null;
    }
  }

  get calculatedCallHorizonDate(): string | null {
    const validFrom = this.parseDate(this.bpForm.value.validFrom);
    const validTo = this.parseDate(this.bpForm.value.validTo);
    const percentage = Number(this.bpForm.value.callHorizonPercent);

    if (!validFrom || !validTo || !Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
      return null;
    }

    const totalDays = Math.ceil((validTo.getTime() - validFrom.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) {
      return null;
    }

    const offsetDays = Math.ceil(totalDays * (percentage / 100));
    const horizonDate = new Date(validFrom);
    horizonDate.setDate(horizonDate.getDate() + offsetDays);
    return this.toIsoDate(horizonDate);
  }

  getValidityDays(): number | null {
    const validFrom = this.parseDate(this.bpForm.value.validFrom);
    const validTo = this.parseDate(this.bpForm.value.validTo);
    if (!validFrom || !validTo) {
      return null;
    }

    const diff = Math.ceil((validTo.getTime() - validFrom.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  }

  get minValidToDate(): string | null {
    const validFrom = this.parseDate(this.bpForm.value.validFrom);
    if (!validFrom) {
      return null;
    }

    const nextDay = new Date(validFrom);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  }

  onValidFromChange(): void {
    const validFrom = this.parseDate(this.bpForm.value.validFrom);
    const validTo = this.parseDate(this.bpForm.value.validTo);
    if (validFrom && validTo && validTo <= validFrom) {
      this.bpForm.patchValue({ validTo: null }, { emitEvent: false });
    }
    this.formError['validTo'] = '';
    this.formError['callHorizonPercent'] = '';
  }

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.submitError = '';
    this.submitSuccess = '';
    this.formError = {};

    if (tab === 'list') {
      this.loadBpList();
    }
  }

  onUidBlur(): void {
    const uid = this.bpForm.value.uid?.trim();
    if (uid) {
      this.loadCompanyByUid();
    }
  }

  loadCompanyByUid(): void {
    const uid = (this.bpForm.value.uid || '').trim();
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    if (!uid) {
      this.formError['uid'] = 'UID is required';
      this.companyDetails = null;
      return;
    }

    this.loading = true;
    this.companyService.getCompanyByUid(uid).subscribe({
      next: (response) => {
        this.loading = false;
        const company = (response as any).attributes || response || null;
        this.companyDetails = company;
        if (!company) {
          this.submitError = 'No company found for the provided UID.';
          return;
        }
        this.submitSuccess = 'Company details loaded successfully.';
      },
      error: (err) => {
        this.loading = false;
        this.companyDetails = null;
        this.submitError = err?.error?.description || err?.error?.message || 'Unable to fetch company details.';
      }
    });
  }

  onSubmit(): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    if (this.bpForm.invalid) {
      this.markFormErrors();
      return;
    }

    const validFrom = this.bpForm.value.validFrom;
    const validTo = this.bpForm.value.validTo;
    const validityDays = this.getValidityDays();

    if (validFrom && validTo && new Date(validTo) <= new Date(validFrom)) {
      this.formError['validTo'] = 'Valid till must be after Valid from.';
      return;
    }

    const horizon = Number(this.bpForm.value.callHorizonPercent);
    if (!Number.isFinite(horizon) || horizon < 1 || horizon > 100) {
      this.formError['callHorizonPercent'] = 'Call Horizon must be between 1 and 100.';
      return;
    }

    if (validityDays !== null && horizon > 100) {
      this.formError['callHorizonPercent'] = 'Call Horizon cannot exceed 100%.';
      return;
    }

    if (!this.companyDetails) {
      this.submitError = 'Please load company details before creating a BP assignment.';
      return;
    }

    this.isSubmitting = true;
    const calculatedDays = this.getCalculatedCallHorizonDays();
    const payload: CompanyBpRequest = {
      companyId: this.orgId,
      bpUid: this.bpForm.value.uid.trim(),
      createdBy: this.userId,
      isCreatedByAdmin: this.userRole.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      callHorizonDays: calculatedDays ?? 0,
      validFrom: this.toIsoDate(this.bpForm.value.validFrom),
      validTo: this.toIsoDate(this.bpForm.value.validTo),
      refNumber: this.bpForm.value.refNumber.trim(),
      refDate: this.toIsoDate(this.bpForm.value.refDate)
    };

    this.companyService.assignBusinessPartner(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = 'Business partner assignment created successfully.';
        setTimeout(() => {
          this.bpForm.reset();
          this.companyDetails = null;
          this.activeTab = 'list';
        }, 3000);
        
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err?.error?.message || err?.error?.description || 'Failed to create business partner assignment.';
      }
    });
  }

  loadBpList(): void {
    this.loadingList = true;
    this.bpList = [];
    this.companyService.getServiceProviderList(this.orgId).subscribe({
      next: (response) => {
        this.loadingList = false;
        this.bpList = (response as any).attributes || response || [];
      },
      error: () => {
        this.loadingList = false;
        this.bpList = [];
      }
    });
  }

  getStatus(item: any): 'active' | 'expiring' | 'expired' | 'unknown' {
    const validTo = this.parseDate(item.validTo || item.validTill || item.validityEnd || item.validityTill);
    const callHorizon = Number(item.callHorizonDays || item.callHorizon || 0);

    if (!validTo) {
      return 'unknown';
    }

    const today = new Date();
    if (today > validTo) {
      return 'expired';
    }

    if (callHorizon > 0) {
      const horizonDate = new Date(validTo);
      horizonDate.setDate(horizonDate.getDate() - callHorizon);
      if (today >= horizonDate) {
        return 'expiring';
      }
    }

    return 'active';
  }

  getStatusLabel(item: any): string {
    const status = this.getStatus(item);
    if (status === 'expired') {
      return 'Expired';
    }
    if (status === 'expiring') {
      return 'Call horizon reached';
    }
    if (status === 'active') {
      return 'Active';
    }
    return 'Unknown';
  }

  formatDate(value: any): string {
    const date = this.parseDate(value);
    if (!date) {
      return '-';
    }
    return date.toLocaleDateString();
  }

  parseDate(value: any): Date | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  toIsoDate(value: any): string {
    const date = this.parseDate(value);
    return date ? date.toISOString().split('T')[0] : '';
  }

  getCalculatedCallHorizonDays(): number | null {
    const validFrom = this.parseDate(this.bpForm.value.validFrom);
    const validTo = this.parseDate(this.bpForm.value.validTo);
    const percentage = Number(this.bpForm.value.callHorizonPercent);

    if (!validFrom || !validTo || !Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
      return null;
    }

    const totalDays = Math.ceil((validTo.getTime() - validFrom.getTime()) / (1000 * 60 * 60 * 24));
    return totalDays > 0 ? Math.ceil(totalDays * (percentage / 100)) : null;
  }

  markFormErrors(): void {
    Object.keys(this.bpForm.controls).forEach((key) => {
      const control = this.bpForm.get(key);
      if (control && control.invalid) {
        if (control.errors?.['required']) {
          this.formError[key] = 'This field is required.';
        } else if (control.errors?.['min'] || control.errors?.['max']) {
          this.formError[key] = 'Value must be between 1 and 100.';
        } else if (control.errors?.['pattern']) {
          this.formError[key] = 'Only alphanumeric characters are allowed.';
        }
      }
    });
  }

  backToHome(): void {
    this.router.navigate(['/business-partner']);
  }
}
