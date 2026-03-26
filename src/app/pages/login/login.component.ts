import { Component } from '@angular/core';
import {CommonResponse} from "../../models/authentication-response";
import {AuthenticationService} from "../../service/authentication.service";
import {Router} from "@angular/router";
import {VerificationRequest} from "../../models/verification-request";
import { RegisterLoginRequest } from 'src/app/models/register-login-request';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  registerLoginRequest: RegisterLoginRequest = {
    email: '',
    password: ''
  };
  otpCode = '';
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

  showPassword = false;

  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {
  }

  login() {
    this.authService.login(this.registerLoginRequest)
      .subscribe({
        next: (response) => {
          this.commonResponse = response;
          if (!this.commonResponse.object.mfaEnabled) {
            localStorage.setItem('token', response.object.accessToken as string);
            localStorage.setItem('refreshToken', response.object.refreshToken as string);
            localStorage.setItem('userId', this.registerLoginRequest.email as string);
            this.router.navigate(['welcome']);
          }
        }
      });
  }

  verifyCode() {
    const verifyRequest: VerificationRequest = {
      email: this.registerLoginRequest.email,
      code: parseInt(this.otpCode)
    };
    this.authService.verifyCode(verifyRequest)
      .subscribe({
        next: (response) => {
          localStorage.setItem('token', response.object.accessToken as string);
          localStorage.setItem('refreshToken', response.object.refreshToken as string);
          localStorage.setItem('userId', this.registerLoginRequest.email as string);
          this.router.navigate(['welcome']);
        }
      });
  }
  
  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
