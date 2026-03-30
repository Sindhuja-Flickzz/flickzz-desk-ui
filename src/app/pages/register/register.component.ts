import { Component } from '@angular/core';
import {RegisterLoginRequest} from "../../models/register-login-request";
import {FlickzzDeskResponse} from "../../models/authentication-response";
import {AuthenticationService} from "../../service/authentication.service";
import {Router} from "@angular/router";
import {VerificationRequest} from "../../models/verification-request";

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {

  registerRequest: RegisterLoginRequest = {
    mfaEnabled: false
  };
  commonResponse: FlickzzDeskResponse = {
    code: '',
    title: '',
    description: '',
    attributes: {
      accessToken: '',
      mfaEnabled: false,
      refreshToken: '',
      secretImageUri: '',
      userRole: ''
    }
  };
  message = '';
  otpCode = '';

  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {
  }

  registerUser() {
    this.message = '';
    this.authService.register(this.registerRequest)
      .subscribe({
        next: (response) => {
          if (response.code == 'GM-200') {    
            if(response.attributes.mfaEnabled) {        
              this.commonResponse = response;
            } else {
              // inform the user
              this.message = 'Account created successfully\nYou will be redirected to the Login page in 3 seconds';
              setTimeout(() => {
                this.router.navigate(['login']);
              }, 3000)
            }
          }
        }
      });

  }

  verifyTfa() {
    this.message = '';
    const verifyRequest: VerificationRequest = {
      email: this.registerRequest.email,
      code: parseInt(this.otpCode)
    };
    this.authService.verifyCode(verifyRequest)
      .subscribe({
        next: (response) => {
          this.message = 'Account created successfully\nYou will be redirected to the Welcome page in 3 seconds';
          setTimeout(() => {
            localStorage.setItem('token', response.attributes.accessToken as string);
            localStorage.setItem('refreshToken', response.attributes.refreshToken as string);
            this.router.navigate(['welcome']);
          }, 3000);
        }
      });
  }
}
