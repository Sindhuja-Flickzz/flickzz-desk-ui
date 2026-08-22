import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  tiles = [
    { title: 'Company', route: '/company' },
    { title: 'Plant', route: '/plant' },
    { title: 'Calendar', route: '/calendar' },
    { title: 'Skills', route: '/skill' },
    { title: 'Agent', route: '/agent' },
    { title: 'Number Range', route: '/number-range' },
    { title: 'Impact', route: '/impact' },
    {title: 'RITM', route: '/ritm'}
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