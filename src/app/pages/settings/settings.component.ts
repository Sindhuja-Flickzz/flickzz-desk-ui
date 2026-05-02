import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  tiles = [
    { title: 'Requestor', route: '/company/requestor' },
    { title: 'Service Provider', route: '/company/service-provider' },
    { title: 'Plant', route: '/plant' },
    { title: 'Skills', route: '/skill' },
    { title: 'Agent', route: '/agent' },
    { title: 'Support Calendar', route: '/calendar/create-calendar', queryParams: { type: 'support' } },
    { title: 'Requestor Calendar', route: '/calendar/create-calendar', queryParams: { type: 'requestor' } },
    { title: 'Calendar List', route: '/calendar/list' },
    { title: 'Priority', route: '/priority' },
    { title: 'Business Offering', route: '/business-offering' },
    { title: 'Number Range', route: '/number-range' },
    { title: 'Impact', route: '/impact' }
  ];

  constructor(private router: Router) {}

  onTileClick(tile: any) {
    if (tile.queryParams) {
      this.router.navigate([tile.route], { queryParams: tile.queryParams });
    } else {
      this.router.navigate([tile.route]);
    }
  }
}