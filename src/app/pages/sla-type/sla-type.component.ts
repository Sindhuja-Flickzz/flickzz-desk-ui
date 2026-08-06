import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { PriorityService } from '../../service/priority.service';
import { CompanyService } from '../../service/company.service';
import { SlaService } from '../../service/sla.service';
import { PriorityMaster } from '../../models/priority-master';
import { USER_ROLES } from 'src/app/data/app_constants';

@Component({
  selector: 'app-sla-type',
  templateUrl: './sla-type.component.html',
  styleUrls: ['./sla-type.component.scss']
})
export class SlaTypeComponent implements OnInit {
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create SLA Type';
  slaForm: FormGroup;
  priorities: PriorityMaster[] = [];
  // keep raw API response
  prioritiesRaw: PriorityMaster[] = [];
  // grouped unique priority codes
  groupedPriorityCodes: string[] = [];
  // ticket type options for currently selected priority code
  ticketTypeOptions: { ticketTypeId: number | null; ticketTypeName: string; priorityId: number }[] = [];
  ticketTypeId: number | null = null;
  selectedTicketTypeName: string | null = null;
  // selected concrete priorityId (set after ticket type chosen or auto-selected)
  selectedPriorityId: number | null = null;
  selectionMode: 'internal' | 'bp' = 'internal';
  businessPartnerId: number | null = null;
  businessPartnerName: string | null = null;
  bpOptions: any[] = [];
  loading = false;
  slaList: any[] = [];
  filteredSlaList: any[] = [];
  priorityFilterOptions: string[] = [];
  ticketTypeFilterOptions: string[] = [];
  selectedStatusFilter: 'all' | 'live' | 'under-approval' | 'inactive' = 'all';
  priorityFilter: string | null = null;
  ticketTypeFilter: string | null = null;
  editingSlaId: number | null = null;
  orgId = Number(localStorage.getItem('userOrgId') || 0);
  private pendingEditTicketTypeId: number | null = null;
  formSubmitError = '';
  contextLabel = 'Using your organization configuration';

  units = [
    { value: 'hours', label: 'Hours' },
    { value: 'days', label: 'Days' }
  ];

  constructor(
    private fb: FormBuilder,
    private priorityService: PriorityService,
    private companyService: CompanyService,
    private slaService: SlaService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private location: Location
  ) {
    this.slaForm = this.fb.group({
      priority: [null, Validators.required],
      ticketType: [{ value: null, disabled: true }, Validators.required],
      firstResponseValue: [null, [Validators.required, Validators.min(0)]],
      firstResponseUnit: ['hours', Validators.required],
      resolutionValue: [null, [Validators.required, Validators.min(0)]],
      resolutionUnit: ['hours', Validators.required],
      updateFrequencyValue: [null, [Validators.required, Validators.min(0)]],
      updateFrequencyUnit: ['hours', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const mode = params.get('mode');
      const orgId = params.get('orgId');
      const bpId = params.get('businessPartnerId');
      const bpName = params.get('companyName');
      this.selectionMode = mode === 'bp' ? 'bp' : 'internal';
      this.businessPartnerId = bpId ? Number(bpId) : null;
      this.businessPartnerName = bpName || null;
      this.contextLabel = this.selectionMode === 'bp'
        ? `Using business partner configuration for ${this.businessPartnerName || this.businessPartnerId}`
        : 'Using your organization configuration';
    });

    // update selected priority id when ticket type control changes
    this.slaForm.get('ticketType')?.valueChanges.subscribe(() => this.onTicketTypeSelect());

    this.loadPriorities(this.businessPartnerId);
    if (this.selectionMode === 'bp' && !this.businessPartnerId) {
      this.loadBpOptions();
    }
    // this.loadSlaList();
  }

  backToPrevious(): void {
    this.location.back();
  }

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.slaForm.reset({
      priority: null,
      ticketType: null,
      firstResponseValue: null,
      firstResponseUnit: 'hours',
      resolutionValue: null,
      resolutionUnit: 'hours',
      updateFrequencyValue: null,
      updateFrequencyUnit: 'hours'
    });
    this.editingSlaId = null;
    this.pendingEditTicketTypeId = null;
    this.ticketTypeOptions = [];
    this.formSubmitError = '';
    this.selectedPriorityId = null;
    this.slaForm.get('ticketType')?.disable();
    if (tab === 'create') {
      this.pageTitle = 'Create SLA Type';
    } else {
      this.pageTitle = 'SLA Type List';
      this.loadSlaList();
    }
  }

  loadPriorities(businessPartnerId: number | null): void {
    this.priorityService.getAllActivePriorities(businessPartnerId).subscribe({
      next: (res) => {
        this.prioritiesRaw = (res as any).attributes || [];
        // keep original list as priorities but also create grouped unique codes
        this.priorities = this.prioritiesRaw;
        const codes = Array.from(new Set(this.prioritiesRaw.map(p => p.code || (p as any).priorityName)));
        this.groupedPriorityCodes = codes;

        if (this.editingSlaId != null && this.slaForm.get('priority')?.value) {
          this.onPriorityChange(this.pendingEditTicketTypeId ?? this.slaForm.get('ticketType')?.value ?? null);
        }
      },
      error: () => { this.prioritiesRaw = []; this.priorities = []; this.groupedPriorityCodes = []; }
    });
  }

  onPriorityChange(selectedTicketTypeId?: number | null): void {
    const code = this.slaForm.get('priority')?.value;
    const existingTicketTypeId = selectedTicketTypeId ?? this.slaForm.get('ticketType')?.value ?? null;

    if (!code) {
      this.ticketTypeOptions = [];
      this.slaForm.patchValue({ ticketType: null });
      this.slaForm.get('ticketType')?.disable();
      this.selectedPriorityId = null;
      this.ticketTypeId = null;
      this.selectedTicketTypeName = null;
      return;
    }

    const matches = this.prioritiesRaw.filter(p => (p.code || (p as any).priorityName) === code);
    if (matches.length === 0) {
      this.ticketTypeOptions = [];
      this.slaForm.patchValue({ ticketType: null });
      this.slaForm.get('ticketType')?.disable();
      this.selectedTicketTypeName = null;
      this.selectedPriorityId = null;
      this.ticketTypeId = null;
      return;
    }

    const matchingRecord = existingTicketTypeId != null
      ? matches.find(m => (m.ticketType?.ticketTypeId ?? null) === existingTicketTypeId)
      : undefined;

    if (matches.length === 1 || matchingRecord?.ticketType) {
      const rec = matches.length === 1 ? matches[0] : matchingRecord!;
      const name = rec.ticketType?.ticketTypeName ?? null;
      this.ticketTypeOptions = rec.ticketType ? [{ ticketTypeId: rec.ticketType.ticketTypeId ?? null, ticketTypeName: name || '', priorityId: rec.priorityId }] : [];
      this.ticketTypeId = rec.ticketType?.ticketTypeId ?? null;
      this.selectedTicketTypeName = name;
      this.selectedPriorityId = rec.priorityId ?? null;
      this.slaForm.patchValue({ ticketType: rec.ticketType?.ticketTypeId ?? null });
      this.slaForm.get('ticketType')?.disable();
      return;
    }

    this.ticketTypeOptions = matches.map(m => ({ ticketTypeId: m.ticketType?.ticketTypeId ?? null, ticketTypeName: m.ticketType?.ticketTypeName ?? '', priorityId: m.priorityId }));
    this.selectedTicketTypeName = null;
    this.slaForm.patchValue({ ticketType: existingTicketTypeId });
    this.slaForm.get('ticketType')?.enable();
    this.ticketTypeId = existingTicketTypeId;
    this.selectedPriorityId = null;
  }

  onTicketTypeSelect(): void {
    const selectedTicketId = Number(this.slaForm.get('ticketType')?.value);
    const code = this.slaForm.get('priority')?.value;
    if (!code || !selectedTicketId) {
      this.selectedPriorityId = null;
      this.ticketTypeId = null;
      return;
    }
    const rec = this.prioritiesRaw.find(p => (p.code || (p as any).priorityName) === code && p.ticketType?.ticketTypeId === selectedTicketId);
    this.selectedPriorityId = rec?.priorityId ?? null;
    this.ticketTypeId = selectedTicketId;
    this.selectedTicketTypeName = rec?.ticketType?.ticketTypeName ?? null;
  }

  loadBpOptions(): void {
    const org = Number(localStorage.getItem('userOrgId') || 0);
    if (!org) { this.bpOptions = []; return; }
    this.companyService.getServiceProviderList(org).subscribe({
      next: (res) => { this.bpOptions = (res as any).attributes || []; },
      error: () => { this.bpOptions = []; }
    });
  }

  selectBp(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.businessPartnerId = value ? Number(value) : null;
  }

  startEditSla(sla: any): void {
    this.editingSlaId = sla.slaId ?? null;
    this.pendingEditTicketTypeId = sla.priority?.ticketType?.ticketTypeId ?? null;
    this.activeTab = 'create';
    this.pageTitle = 'Edit SLA Type';
    const mapBackUnit = (term: string) => term === 'D' ? 'days' : 'hours';
    this.slaForm.patchValue({
      priority: sla.priority?.code || null,
      ticketType: sla.priority?.ticketType?.ticketTypeId || null,
      firstResponseValue: sla.firstResponseTime,
      firstResponseUnit: mapBackUnit(sla.firstResponseTerm),
      resolutionValue: sla.resolutionTime,
      resolutionUnit: mapBackUnit(sla.resolutionTerm),
      updateFrequencyValue: sla.updateFrequency,
      updateFrequencyUnit: mapBackUnit(sla.updateFrequencyTerm)
    });
    // populate ticket type options for the selected priority and set selected values
    this.onPriorityChange(this.pendingEditTicketTypeId);
    this.selectedPriorityId = sla.priority?.priorityId ?? null;
    this.ticketTypeId = sla.priority?.ticketType?.ticketTypeId ?? null;
    this.selectedTicketTypeName = sla.priority?.ticketType?.ticketTypeName ?? null;
    // keep ticketType readonly in edit mode
    this.slaForm.get('ticketType')?.disable();
  }

  deleteSla(sla: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete SLA Type',
        message: `Are you sure you want to delete SLA for priority "${sla.priority?.code}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        includeRemarks: true,
        remarksLabel: 'Remarks',
        remarksPlaceholder: 'Enter remarks for deletion'
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result?.confirmed || !sla.slaId) {
        return;
      }
      this.loading = true;
      this.slaService.deleteSlaType(sla.slaId, result.remarks).subscribe({
        next: () => {
          this.loading = false;
          this.loadSlaList();
        },
        error: (err) => {
          this.loading = false;
          console.error('Delete SLA error', err);
          this.formSubmitError = err.error?.message || 'Failed to delete SLA type.';
        }
      });
    });
  }

  validateUpdateFrequency(): boolean {
    const resVal = this.slaForm.value.resolutionValue;
    const resUnit = this.slaForm.value.resolutionUnit;
    const updVal = this.slaForm.value.updateFrequencyValue;
    const updUnit = this.slaForm.value.updateFrequencyUnit;
    if (resVal == null || updVal == null) return true;
    const toHours = (val: number, unit: string) => unit === 'days' ? val * 24 : val;
    return toHours(updVal, updUnit) <= toHours(resVal, resUnit);
  }

  isSlaFormValid(): boolean {
    if (this.slaForm.invalid) {
      return false;
    }
    if (!this.validateUpdateFrequency()) {
      return false;
    }
    if (this.selectedPriorityId == null || this.ticketTypeId == null) {
      return false;
    }
    if (this.selectionMode === 'bp' && !this.businessPartnerId) {
      return false;
    }
    return true;
  }

  openProceedDialog(): void {
    this.formSubmitError = '';

    if (!this.validateUpdateFrequency()) {
      this.formSubmitError = 'Update Frequency must be less than or equal to Resolution Time.';
      return;
    }

    if (this.slaForm.invalid) {
      this.slaForm.markAllAsTouched();
      this.formSubmitError = 'Please fill in all required fields.';
      return;
    }

    if (this.selectedPriorityId == null || this.ticketTypeId == null) {
      this.formSubmitError = 'Please select a valid priority and ticket type.';
      return;
    }

    if (this.selectionMode === 'bp' && !this.businessPartnerId) {
      this.formSubmitError = 'Please select a business partner.';
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      disableClose: true,
      data: {
        title: this.editingSlaId ? 'Confirm Update' : 'Confirm Save',
        message: this.editingSlaId ? 'Please review the SLA details and add remarks before updating.' : 'Please review the SLA details and add remarks before saving.',
        confirmText: this.editingSlaId ? 'Update' : 'Save',
        cancelText: 'Cancel',
        includeRemarks: true,
        remarksLabel: 'Remarks',
        remarksPlaceholder: 'Enter remarks for this action'
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result?.confirmed) {
        return;
      }
      this.onSave(result.remarks);
    });
  }

  onSave(remarks?: string): void {
    this.formSubmitError = '';

    if (!this.validateUpdateFrequency()) {
      this.formSubmitError = 'Update Frequency must be less than or equal to Resolution Time.';
      return;
    }

    if (this.slaForm.invalid) {
      this.slaForm.markAllAsTouched();
      this.formSubmitError = 'Please fill in all required fields.';
      return;
    }

    if (this.selectedPriorityId == null || this.ticketTypeId == null) {
      this.formSubmitError = 'Please select a valid priority and ticket type.';
      return;
    }

    if (this.selectionMode === 'bp' && !this.businessPartnerId) {
      this.formSubmitError = 'Please select a business partner.';
      return;
    }

    const mapTerm = (unit: string) => unit === 'days' ? 'D' : 'H';

    const payload = {
      slaId: this.editingSlaId,
      priorityId: this.selectedPriorityId,
      ticketTypeId: this.ticketTypeId,
      firstResponseTime: this.slaForm.value.firstResponseValue,
      firstResponseTerm: mapTerm(this.slaForm.value.firstResponseUnit),
      resolutionTime: this.slaForm.value.resolutionValue,
      resolutionTerm: mapTerm(this.slaForm.value.resolutionUnit),
      updateFrequency: this.slaForm.value.updateFrequencyValue,
      updateFrequencyTerm: mapTerm(this.slaForm.value.updateFrequencyUnit),
      remarks: remarks || '',
      businessPartnerId: this.businessPartnerId,
      orgId: localStorage.getItem('userOrgId') ? Number(localStorage.getItem('userOrgId')) : null,
      createdBy: Number(localStorage.getItem('userId') || 0),
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };

    const request$ = this.editingSlaId
      ? this.slaService.updateSlaType(payload)
      : this.slaService.createSlaType(payload);
    console.log('request payload', request$);
    request$.subscribe({
      next: () => { this.loadSlaList(); this.activeTab = 'list'; },
      error: (err) => {
        console.error('Create SLA error', err);
        this.formSubmitError = err.error?.description || 'Failed to save SLA type. Please try again.';
      }
    });
  }

  applySlaListFilters(): void {
    this.filteredSlaList = this.slaList.filter(sla => {
      const priorityMatch = !this.priorityFilter || sla.priority?.code === this.priorityFilter;
      const ticketTypeMatch = !this.ticketTypeFilter || sla.priority?.ticketType?.ticketTypeName === this.ticketTypeFilter;
      const statusMatch = this.matchesSlaStatusFilter(sla);
      return priorityMatch && ticketTypeMatch && statusMatch;
    });
  }

  matchesSlaStatusFilter(sla: any): boolean {
    switch (this.selectedStatusFilter) {
      case 'live':
        return sla.isActive === true;
      case 'under-approval':
        return sla.isActive === false && sla.isUnderApproval === true;
      case 'inactive':
        return sla.isActive === false && sla.isUnderApproval === false;
      default:
        return true;
    }
  }

  getSlaStatusLabel(sla: any): string {
    if (sla.isActive === true) {
      return 'Live';
    }
    if (sla.isUnderApproval === true) {
      return 'Under Approval';
    }
    return 'Inactive';
  }

  getSlaStatusClass(sla: any): string {
    if (sla.isActive === true) {
      return 'status-pill live';
    }
    if (sla.isUnderApproval === true) {
      return 'status-pill under-approval';
    }
    return 'status-pill inactive';
  }

  loadSlaList(): void {
    this.loading = true;
    if(this.businessPartnerId == null && this.orgId != null) {
        this.companyService.getServiceProviderList(this.orgId).subscribe({
        next: (response) => {
          this.bpOptions = (response as any).attributes || response || [];
          const matchingRole = this.bpOptions.find((bp) => {
            return bp.company?.companyId != null && bp.mappedCompany?.companyId != null
              && bp.company.companyId === bp.mappedCompany.companyId;
          });

          this.businessPartnerId = matchingRole?.businessPartnerId ?? null;
        },
        error: () => {
          console.error('Failed to load business partners');
        }
      });
    }
    this.slaService.getAllSlaTypes(this.businessPartnerId).subscribe({
      next: (res) => {
        this.slaList = (res as any).attributes || [];
        this.priorityFilterOptions = Array.from(new Set(this.slaList.map(sla => sla.priority?.code).filter(Boolean))) as string[];
        this.ticketTypeFilterOptions = Array.from(new Set(this.slaList.map(sla => sla.priority?.ticketType?.ticketTypeName).filter(Boolean))) as string[];
        this.selectedStatusFilter = 'all';
        this.priorityFilter = null;
        this.ticketTypeFilter = null;
        this.applySlaListFilters();
        this.loading = false;
      },
      error: () => {
        this.slaList = [];
        this.filteredSlaList = [];
        this.priorityFilterOptions = [];
        this.ticketTypeFilterOptions = [];
        this.selectedStatusFilter = 'all';
        this.priorityFilter = null;
        this.ticketTypeFilter = null;
        this.loading = false;
      }
    });
  }
}
