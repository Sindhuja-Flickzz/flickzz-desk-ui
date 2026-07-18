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

  selectedConfig: ConfigItem | null = null;
  selectionMode: 'internal' | 'bp' = 'internal';
  orgId = Number(localStorage.getItem('userOrgId') || 0);
  bpOptions: CompanyRole[] = [];
  selectedBpId: number | null = null;
  internalBpId: number | null = null;
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
        this.internalBpId = this.getInternalBpId(this.bpOptions);
        this.selectedBpId = null;
        this.selectedConfig = null;
        this.loadingBpList = false;
      },
      error: () => {
        this.bpOptions = [];
        this.internalBpId = null;
        this.loadingBpList = false;
      }
    });
  }

  selectConfig(config: ConfigItem): void {
    this.selectedConfig = config;
  }

  onConfigCardClick(config: ConfigItem): void {
    const route = this.getConfigRoute(config.key);
    if (route) {
      const queryParams = this.getConfigRouteQueryParams(config.key);
      this.router.navigate([route], { queryParams });
      return;
    }

    this.selectedConfig = config;
  }

  getConfigRoute(key: string): string | null {
    switch (key) {
      case 'priority':
        return '/priority';
      case 'assignment':
        return '/company/bp-assignment';
      case 'sla-type':
        return '/company/sla-type';
      case 'category':
        return '/company/category';
      default:
        return null;
    }
  }

  getConfigRouteQueryParams(key: string): any {
    // if (key === 'priority') {
      const businessPartnerId = this.getSelectedBusinessPartnerId();
      return {
        mode: this.selectionMode,
        orgId: this.selectionMode === 'bp' ? this.selectedBpId : this.orgId,
        businessPartnerId: businessPartnerId ?? undefined,
        companyName: this.getSelectedBpCompanyName() ?? undefined
      };
    // }
    // return {};
  }

  onSelectionModeChange(mode: 'internal' | 'bp'): void {
    this.selectionMode = mode;
    this.selectedConfig = null;

    if (mode === 'bp' && !this.bpOptions.length) {
      this.loadBusinessPartners();
    }
  }

  onBpChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedBpId = value ? Number(value) : null;
    this.selectedConfig = null;
  }

  getSelectableBpOptions(): CompanyRole[] {
    return this.bpOptions.filter(bp => !this.isInternalBp(bp));
  }

  isInternalBp(bp: CompanyRole): boolean {
    return bp.businessPartnerId != null && this.internalBpId != null && bp.businessPartnerId === this.internalBpId;
  }

  navigateToPriority(): void {
    const selectedOrgId = this.selectionMode === 'bp' && this.selectedBpId ? this.selectedBpId : this.orgId;
    this.router.navigate(['/priority'], {
      queryParams: {
        mode: this.selectionMode,
        orgId: selectedOrgId,
        businessPartnerId: this.getSelectedBusinessPartnerId() ?? undefined,
        companyName: this.getSelectedBpCompanyName() ?? undefined
      }
    });
  }

  hasConfiguration(configKey: string): boolean {
    return this.selectionMode === 'internal' && configKey === 'priority';
  }

  createConfiguration(configKey: string): void {
    console.warn(`Create configuration action not implemented for ${configKey}`);
  }

  updateConfiguration(configKey: string): void {
    console.warn(`Update configuration action not implemented for ${configKey}`);
  }

  getInternalBpId(bpOptions: CompanyRole[]): number | null {
    const matchingRole = bpOptions.find((bp) => {
      return bp.company?.companyId != null && bp.mappedCompany?.companyId != null
        && bp.company.companyId === bp.mappedCompany.companyId;
    });

    return matchingRole?.businessPartnerId ?? null;
  }

  getSelectedBusinessPartnerId(): number | null {
    if (this.selectionMode === 'bp') {
      const selectedCompanyId = this.selectedBpId;
      if (!selectedCompanyId) {
        return null;
      }

      const matchingRole = this.bpOptions.find((bp) => this.getBpCompanyId(bp) === selectedCompanyId);
      return matchingRole?.businessPartnerId ?? null;
    }

    return this.internalBpId ?? null;
  }

  getBpCompanyId(bp: CompanyRole): number | null {
    return bp.mappedCompany?.companyId || bp.company?.companyId || null;
  }

  getBpUid(bp: CompanyRole): string {
    return bp.mappedCompany?.uid || bp.company?.uid || 'Unknown business partner';
  }

  getSelectedBpCompanyName(): string | null {
    if (!this.selectedBpId) {
      return null;
    }
    
    const selected = this.bpOptions.find((bp) => this.getBpCompanyId(bp) === this.selectedBpId);
    return selected?.company?.companyId === Number(localStorage.getItem('userOrgId')) ? selected?.mappedCompany?.companyName : selected?.company?.companyName || null;
  }

  getScopeLabel(): string {
    if (this.selectionMode === 'bp') {
      const selected = this.bpOptions.find((bp) => this.getBpCompanyId(bp) === this.selectedBpId);
      return selected ? `Configuration for BP ${this.getSelectedBpCompanyName()}` : '';
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
