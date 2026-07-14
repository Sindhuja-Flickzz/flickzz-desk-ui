import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyRole } from '../../../models/company-master';
import { CompanyService } from '../../../service/company.service';

interface ConfigItem {
  key: string;
  name: string;
  businessRequirement: string;
  sla: string;
  count?: number;
  countLabel?: string;
  icon?: string;
  colorClass?: string;
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
      businessRequirement: 'Configure priority levels and response / resolution SLA for tickets.',
      sla: 'Configured per organization or selected business partner',
      count: 12,
      countLabel: 'Priorities Configured',
      icon: 'flag',
      colorClass: 'icon-purple'
    },
    {
      key: 'sla-type',
      name: 'SLA Type',
      businessRequirement: 'Create and manage SLA types and SLA policies for this partner.',
      sla: 'Internal or BP-specific SLA handling',
      count: 4,
      countLabel: 'SLA Types Configured',
      icon: 'schedule',
      colorClass: 'icon-green'
    },
    {
      key: 'category',
      name: 'Category',
      businessRequirement: 'Manage ticket categories and sub categories for this partner.',
      sla: 'Grouped under the selected support context',
      count: 25,
      countLabel: 'Categories Configured',
      icon: 'folder',
      colorClass: 'icon-yellow'
    },
    {
      key: 'support-group',
      name: 'Support Group',
      businessRequirement: 'Create and manage support groups and group members.',
      sla: 'Shared with internal or mapped business partner units',
      count: 8,
      countLabel: 'Support Groups Configured',
      icon: 'groups',
      colorClass: 'icon-purple'
    },
    {
      key: 'assignment',
      name: 'Assignment',
      businessRequirement: 'Configure assignment rules and auto assignment settings.',
      sla: 'Driven by the selected organization or partner',
      count: 5,
      countLabel: 'Assignment Rules Configured',
      icon: 'person',
      colorClass: 'icon-teal'
    }
  ];

  activeTab: 'create' | 'list' = 'create';
  selectedConfig: ConfigItem | null = null;
  selectionMode: 'internal' | 'bp' = 'internal';
  orgId = Number(localStorage.getItem('userOrgId') || 0);
  bpOptions: CompanyRole[] = [];
  selectedBpId: number | null = null;
  loadingBpList = false;
  listData: any[] = [];
  loadingList = false;

  constructor(
    private router: Router,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.loadBusinessPartners();
  }

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.selectedConfig = null;
    if (tab === 'list') {
      this.loadBpListForCurrentSelection();
    }
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

    if (mode === 'bp' && !this.bpOptions.length) {
      this.loadBusinessPartners();
    }

    if (this.activeTab === 'list') {
      this.loadBpListForCurrentSelection();
    }
  }

  onBpChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedBpId = value ? Number(value) : null;
    this.selectedConfig = null;
    if (this.activeTab === 'list') {
      this.loadBpListForCurrentSelection();
    }
  }

  loadBpListForCurrentSelection(): void {
    if (this.selectionMode === 'bp' && !this.selectedBpId) {
      this.listData = [];
      this.loadingList = false;
      return;
    }

    const selectedOrgId = this.selectionMode === 'bp' && this.selectedBpId ? this.selectedBpId : this.orgId;
    this.loadBpList(selectedOrgId);
  }

  loadBpList(orgId: number): void {
    if (!orgId) {
      this.listData = [];
      this.loadingList = false;
      return;
    }

    this.loadingList = true;
    this.listData = [];
    this.companyService.getBpList(orgId).subscribe({
      next: (response) => {
        this.listData = (response as any).attributes || response || [];
        this.loadingList = false;
      },
      error: () => {
        this.listData = [];
        this.loadingList = false;
      }
    });
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

  getOrgName(item: any): string {
    return item?.orgName || item?.organization?.companyName || item?.companyName || '-';
  }

  backToHome(): void {
    this.router.navigate(['/business-partner']);
  }
}
