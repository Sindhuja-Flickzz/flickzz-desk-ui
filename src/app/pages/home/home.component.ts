import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  tiles = [
    {
      title: 'Approval',
      description: 'Review pending approvals and take action.',
      icon: 'fact_check'
    },
    {
      title: 'Configuration Approval',
      description: 'Manage configuration approval requests.',
      icon: 'settings_applications'
    }
  ];
}
