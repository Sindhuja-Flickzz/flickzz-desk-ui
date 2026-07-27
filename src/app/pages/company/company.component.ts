import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CompanyService } from '../../service/company.service';
import { AgentService } from '../../service/agent.service';
import { CompanyRequest, CountryMaster, EnquiryRegistration, StateMaster } from '../../models/company-master';
import { CityMaster } from '../../models/city-master';
import { USER_ROLES } from 'src/app/data/app_constants';

interface AgentSuggestion {
  agentId: number;
  agentName: string;
  accessId?: string;
  mailId?: string;
}

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
  canUpdateCompany = false;
  approverSearchValue = '';
  allApproverAgents: AgentSuggestion[] = [];
  approverSuggestions: AgentSuggestion[] = [];
  approverAgents: AgentSuggestion[] = [];
  approverInfoVisible = false;

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private agentService: AgentService,
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
    const userEmail = localStorage.getItem('userEmail') || '';
    const orgId = Number(localStorage.getItem('userOrgId') || 0);

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

    this.loadAgentList(orgId);

    this.companyService.getCompanyInfoByUserEmail(userEmail).subscribe({
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

    // Populate approvers from response
    this.populateApproversFromResponse(enquiry);
  }

  private populateApproversFromResponse(enquiry: EnquiryRegistration): void {
    const approvers = (enquiry?.company as any)?.approvers || [];
    
    if (Array.isArray(approvers) && approvers.length > 0) {
      // Sort by level to maintain hierarchy order
      const sortedApprovers = approvers
        .filter((app: any) => app?.agent?.agentId != null)
        .sort((a: any, b: any) => (a?.level ?? 0) - (b?.level ?? 0))
        .map((app: any) => ({
          agentId: app.agent.agentId,
          agentName: app.agent.agentName ?? '',
          accessId: app.agent.accessId ?? '',
          mailId: app.agent.mailId ?? ''
        }));
      
      this.approverAgents = sortedApprovers;
      this.approverSuggestions = this.getAvailableApprovers();
    }
  }

  loadAgentList(orgId: number): void {
    if (!orgId) {
      this.canUpdateCompany = false;
      this.allApproverAgents = [];
      this.approverSuggestions = [];
      this.submitError = 'Organization information is missing, so the company update is unavailable.';
      return;
    }

    this.agentService.getAgentList(String(orgId)).subscribe({
      next: (response) => {
        const normalized = this.normalizeAgentResponse(response);
        this.allApproverAgents = normalized;
        this.approverSuggestions = this.getAvailableApprovers();
        this.canUpdateCompany = normalized.length > 0;
        if (!this.canUpdateCompany) {
          this.submitError = 'At least one agent must be available for this organization before the company can be updated.';
        }
      },
      error: () => {
        this.canUpdateCompany = false;
        this.allApproverAgents = [];
        this.approverSuggestions = [];
        this.submitError = 'Unable to load organization agents. Company update is currently unavailable.';
      }
    });
  }

  onApproverSearch(): void {
    const value = (this.approverSearchValue || '').trim().toLowerCase();
    
    if (!value) {
      this.approverSuggestions = this.getAvailableApprovers();
      return;
    }

    const available = this.getAvailableApprovers();
    this.approverSuggestions = available.filter((agent) => {
      const haystack = `${agent.agentName} ${agent.accessId || ''} ${agent.mailId || ''}`.toLowerCase();
      return haystack.includes(value);
    });
  }

  addApprover(agent: AgentSuggestion): void {
    const alreadySelected = this.approverAgents.some((item) => item.agentId === agent.agentId);
    if (alreadySelected) {
      this.approverSearchValue = '';
      this.approverSuggestions = this.getAvailableApprovers();
      return;
    }

    this.approverAgents = [...this.approverAgents, agent];
    this.approverSearchValue = '';
    this.approverSuggestions = this.getAvailableApprovers();
  }

  removeApprover(agentId: number): void {
    this.approverAgents = this.approverAgents.filter((agent) => agent.agentId !== agentId);
    this.approverSuggestions = this.getAvailableApprovers();
  }

  dropApprover(event: CdkDragDrop<AgentSuggestion[]>): void {
    moveItemInArray(this.approverAgents, event.previousIndex, event.currentIndex);
  }

  toggleApproverInfo(): void {
    this.approverInfoVisible = !this.approverInfoVisible;
  }

  private getAvailableApprovers(): AgentSuggestion[] {
    const selectedIds = new Set(this.approverAgents.map((agent) => agent.agentId));
    return this.allApproverAgents.filter((agent) => !selectedIds.has(agent.agentId));
  }

  private normalizeAgentResponse(response: any): AgentSuggestion[] {
    const list = (response as any)?.attributes || response;
    const items = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];

    return items.map((item: any) => ({
      agentId: item?.agentId ?? item?.id ?? item?.agent?.agentId ?? null,
      agentName: item?.agentName ?? item?.name ?? item?.agent?.agentName ?? item?.userName ?? '',
      accessId: item?.accessId ?? item?.access_id ?? item?.agent?.accessId ?? '',
      mailId: item?.mailId ?? item?.mail ?? item?.agent?.mailId ?? item?.email ?? ''
    })).filter((item: AgentSuggestion) => item.agentId != null);
  }

  onSave(): void {
    this.isSubmitting = true;
    this.submitError = '';
    this.submitSuccess = '';

    if (!this.canUpdateCompany) {
      this.submitError = 'At least one agent must be available for this organization before the company can be updated.';
      this.isSubmitting = false;
      return;
    }

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
      createdBy: Number(localStorage.getItem('userId')),
      updatedBy: Number(localStorage.getItem('userId')),
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      approverIds: this.approverAgents.map((agent) => agent.agentId)
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
