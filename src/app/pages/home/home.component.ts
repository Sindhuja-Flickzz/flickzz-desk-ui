import { Component } from '@angular/core';
import { Router } from '@angular/router';

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
      title: 'RITM',
      description: 'View and manage your RITM requests.',
      icon: 'assignment'
    },
    {
      title: 'My Tickets',
      description: 'Access and track your support tickets.',
      icon: 'support_agent'
    },
    {
      title: 'Group RITM',
      description: 'Manage RITM requests for your group.',
      icon: 'group'
    }
  ];

  constructor(private router: Router) {}

  open(tile: any) {
    switch (tile.title) {
      case 'Approval':
        this.router.navigate(['/approval']);
        break;
      case 'RITM':
        this.router.navigate(['/ritm']);
        break;
      case 'My Tickets':
        this.router.navigate(['/my-tickets']);
        break;
      case 'Group RITM':
        this.router.navigate(['/group-ritm']);
        break;
    }
  }
}
