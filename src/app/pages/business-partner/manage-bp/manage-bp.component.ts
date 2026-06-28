import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface ConfigItem {
  name: string;
  businessRequirement: string;
  sla: string;
}

@Component({
  selector: 'app-manage-bp',
  templateUrl: './manage-bp.component.html',
  styleUrls: ['./manage-bp.component.scss']
})
export class ManageBpComponent {
  configurations: ConfigItem[] = [
    {
      name: 'Configuration 1',
      businessRequirement: 'Support business partner onboarding and SLA-based handoff for incoming requests.',
      sla: '2 hours response time'
    },
    {
      name: 'Configuration 2',
      businessRequirement: 'Auto-route critical incidents to the mapped service provider for faster resolution.',
      sla: '30 minutes response time'
    }
  ];

  selectedConfig: ConfigItem | null = null;

  constructor(private router: Router) {}

  selectConfig(config: ConfigItem): void {
    this.selectedConfig = config;
  }

  backToHome(): void {
    this.router.navigate(['/business-partner']);
  }
}
