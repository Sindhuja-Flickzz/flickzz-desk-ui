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
    }
  ];

  constructor(private router: Router) {}

  open(tile: any) {
    // console.log('Open tile', tile.title);
    // this.router.navigateByUrl('/config-approval').catch(() => {
    //   this.router.navigate(['/home']);
    // });
    console.log('Open tile', tile.title);
  }
}
