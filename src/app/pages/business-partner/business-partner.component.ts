import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-business-partner',
  templateUrl: './business-partner.component.html',
  styleUrls: ['./business-partner.component.scss']
})
export class BusinessPartnerComponent {
  tiles = [
    { title: 'Assign BP', route: '/company/bp-assignment' },
    { title: 'Manage BP', route: '/company/manage-bp' }
  ];

  constructor(private router: Router) {}

  navigate(tile: { title: string; route: string }) {
    this.router.navigate([tile.route]);
  }
}
