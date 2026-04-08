import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {FlickzzDeskResponse} from "../../models/authentication-response";
import {AuthenticationService} from "../../service/authentication.service";
import {Router} from "@angular/router";
import {VerificationRequest} from "../../models/verification-request";
import { RegisterLoginRequest } from 'src/app/models/register-login-request';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit{

  loginform: FormGroup;
  formError: any = {};
  submitError = '';

  registerLoginRequest: RegisterLoginRequest = {
    email: '',
    password: ''
  };
  otpCode = '';
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

  showPassword = false;
  isVerifying = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private router: Router
  ) {
    this.loginform = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {

    this.loginform.valueChanges.subscribe(() => {
      
    });
  }

  ngOnDestroy(): void {
    this.submitError = '';
    this.loginform.reset();
  }

  login() {
    
    this.formError = {};
    this.submitError = '';

    Object.keys(this.loginform.controls).forEach(key => {
      const field = this.loginform.get(key);
      if (field?.hasError('required')) {
        this.formError[key] = `${key} is required`;
      }
      if (key === 'mailId' && field?.hasError('email')) {
        this.formError[key] = 'Invalid email format';
      }
      if (key === 'phone' && field?.hasError('pattern')) {
        this.formError[key] = 'Phone number should contain 7-15 digits';
      }
    });

    if (Object.keys(this.formError).length > 0) {
      return;
    }

    this.authService.login(this.registerLoginRequest)
      .subscribe({
        next: (response) => {
          this.commonResponse = response;
          if (!this.commonResponse.attributes.mfaEnabled) {
            localStorage.setItem('token', response.attributes.accessToken as string);
            localStorage.setItem('refreshToken', response.attributes.refreshToken as string);
            localStorage.setItem('userId', this.registerLoginRequest.email as string);
            localStorage.setItem('userRole', response.attributes.userRole as string);
            this.router.navigate(['welcome']);
          }
        },
        error: (err) => {
          console.error('Login error', err);
          this.submitError = err.error?.description || 'Failed to Login.';
        }
      });
  }

  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Allow only numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    this.otpCode = numericValue.slice(0, 6);
    input.value = this.otpCode;
    
    // Auto-verify when 6 digits are entered
    if (this.otpCode.length === 6) {
      setTimeout(() => this.verifyCode(), 300);
    }
  }

  verifyCode() {
    if (this.isVerifying) return;
    this.isVerifying = true;
    this.submitError = '';
    const verifyRequest: VerificationRequest = {
      email: this.registerLoginRequest.email,
      code: parseInt(this.otpCode)
    };
    this.authService.verifyCode(verifyRequest)
      .subscribe({
        next: (response) => {
          this.isVerifying = false;
          localStorage.setItem('token', response.attributes.accessToken as string);
          localStorage.setItem('refreshToken', response.attributes.refreshToken as string);
          localStorage.setItem('userId', this.registerLoginRequest.email as string);
          localStorage.setItem('userRole', response.attributes.userRole as string);
          this.router.navigate(['welcome']);
        },
        error: (err) => {
          this.isVerifying = false;
          console.error('Code verification error', err);
          this.submitError = err.error?.description || 'Failed to verify code.';
        }
      });
  }
  
  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
