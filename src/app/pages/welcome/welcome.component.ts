import { Component } from '@angular/core';
import {Router} from "@angular/router";
import {LogoutRequest} from '../../models/logout-request';
import {AuthenticationService} from "../../serives/authentication.service";
import {CommonResponse} from "../../models/authentication-response";

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent {
    tiles = [
    { title: 'Raise ticket' },
    { title: 'Raise Incident'},
    { title: 'Change Request' },
    { title: 'Change Request' },
    { title: 'SLA' },
    { title: 'Logout' }
  ];
  isLoading = false;
  commonResponse: CommonResponse = {
    successCode: '',
    response: {
      code: '',
      title: '',
      description: ''
    },
    object: {
      accessToken: '',
      mfaEnabled: false,
      refreshToken: '',
      secretImageUri: ''
    }
  };

  constructor(private authService: AuthenticationService, private router: Router) {}

  logout() {
    // this.router.navigate(['login']);
    this.isLoading = true;
    const logoutRequest : LogoutRequest = {
      refreshToken: localStorage.getItem('refreshToken') ?? ''
    }
    this.authService.logout(logoutRequest)
      .subscribe({
        next: (response) => {  
          this.isLoading = false;
          console.log('Logout Successful', response)
          localStorage.clear();
          this.router.navigate(['login']);
        },
        error: err => {
          console.error('Logout failed', err);
        }
      });
  }
}
