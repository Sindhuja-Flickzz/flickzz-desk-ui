import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyRole } from '../../../models/company-master';
import { CompanyService } from '../../../service/company.service';

interface ConfigItem {
  key: string;
  name: string;
  businessRequirement: string;
  sla: string;
}

@Component({
  selector: 'app-manage-bp',
  templateUrl: './manage-bp.component.html',
  styleUrls: ['./manage-bp.component.scss']
})
export class ManageBpComponent implements OnInit {
  configurations: ConfigItem[] = [
    {
      key: 'priority',
      name: 'Priority',
      businessRequirement: 'Define the priority configuration used for incoming tickets.',
      sla: 'Configured per organization or selected business partner'
    },
    {
      key: 'sla-type',
      name: 'SLA Type',
      businessRequirement: 'Manage the SLA policy that applies to the selected context.',
      sla: 'Internal or BP-specific SLA handling'
    },
    {
      key: 'category',
      name: 'Category',
      businessRequirement: 'Maintain the request categories for the selected configuration scope.',
      sla: 'Grouped under the selected support context'
    },
    {
      key: 'support-group',
      name: 'Support Group',
      businessRequirement: 'Assign the support team that owns tickets for the selected scope.',
      sla: 'Shared with internal or mapped business partner units'
    },
    {
      key: 'assignment',
      name: 'Assignment',
      businessRequirement: 'Set the default assignment rules for tickets in this configuration scope.',
      sla: 'Driven by the selected organization or partner'
    }
  ];

  selectedConfig: ConfigItem | null = null;
  selectionMode: 'internal' | 'bp' = 'internal';
  orgId = Number(localStorage.getItem('userOrgId') || 0);
  bpOptions: CompanyRole[] = [];
  selectedBpId: number | null = null;
  loadingBpList = false;

  constructor(
    private router: Router,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.loadBusinessPartners();
  }

  loadBusinessPartners(): void {
    if (!this.orgId) {
      return;
    }

    this.loadingBpList = true;
    this.companyService.getServiceProviderList(this.orgId).subscribe({
      next: (response) => {
        this.bpOptions = (response as any).attributes || response || [];
        this.selectedBpId = null;
        this.selectedConfig = null;
        this.loadingBpList = false;
      },
      error: () => {
        this.bpOptions = [];
        this.loadingBpList = false;
      }
    });
  }

  selectConfig(config: ConfigItem): void {
    this.selectedConfig = config;

    if (config.key === 'priority') {
      this.navigateToPriority();
    }
  }

  onSelectionModeChange(mode: 'internal' | 'bp'): void {
    this.selectionMode = mode;
    this.selectedConfig = null;

    if (mode === 'bp') {
      this.selectedBpId = null;
      if (!this.bpOptions.length) {
        this.loadBusinessPartners();
      }
    }
  }

  onBpChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedBpId = value ? Number(value) : null;
    this.selectedConfig = null;
  }

  navigateToPriority(): void {
    const selectedOrgId = this.selectionMode === 'bp' && this.selectedBpId ? this.selectedBpId : this.orgId;
    this.router.navigate(['/priority'], {
      queryParams: {
        mode: this.selectionMode,
        orgId: selectedOrgId
      }
    });
  }

  getBpCompanyId(bp: CompanyRole): number | null {
    return bp.mappedCompany?.companyId || bp.company?.companyId || null;
  }

  getBpUid(bp: CompanyRole): string {
    return bp.mappedCompany?.uid || bp.company?.uid || 'Unknown business partner';
  }

  getScopeLabel(): string {
    if (this.selectionMode === 'bp') {
      const selected = this.bpOptions.find((bp) => this.getBpCompanyId(bp) === this.selectedBpId);
      return selected ? `Configuration for BP ${this.getBpUid(selected)}` : '';
    }

    return 'Configuration for your organization';
  }

  backToHome(): void {
    this.router.navigate(['/business-partner']);
  }
}
