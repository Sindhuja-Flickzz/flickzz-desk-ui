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
export class LoginComponent implements OnInit, OnDestroy {

  loginform: FormGroup;
  resetPasswordForm: FormGroup;
  formError: any = {};
  submitError = '';

  registerLoginRequest: RegisterLoginRequest = {
    email: '',
    password: '',
    mfaEnabled: false
  };
  resetPasswordRequest = {
    username: '',
    newPassword: ''
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
  showNewPassword = false;
  showConfirmPassword = false;
  isVerifying = false;
  isLoginMode = true;
  isResetPasswordMode = false;
  isMfaSetupMode = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private router: Router
  ) {
    this.loginform = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required]]
    });

    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loginform.valueChanges.subscribe(() => {
      
    });
  }

  ngOnDestroy(): void {
    this.submitError = '';
    this.loginform.reset();
    this.resetPasswordForm.reset();
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
          if (response.attributes.mfaEnabled) {
            this.isLoginMode = false;
            this.isMfaSetupMode = true;
          } else {
            this.resetPasswordRequest.username = this.registerLoginRequest.email as string;
            this.isLoginMode = false;
            this.isResetPasswordMode = true;
          }
        },
        error: (err) => {
          console.error('Login error', err);
          this.submitError = err.error?.description || 'Failed to Login.';
        }
      });
  }

  resetPassword() {
    this.formError = {};
    this.submitError = '';

    Object.keys(this.resetPasswordForm.controls).forEach(key => {
      const field = this.resetPasswordForm.get(key);
      if (field?.hasError('required')) {
        this.formError[key] = `${key} is required`;
      }
      if (key === 'newPassword' && field?.hasError('minlength')) {
        this.formError[key] = 'Password must be at least 8 characters long';
      }
    });

    if (this.resetPasswordForm.hasError('passwordsMismatch')) {
      this.formError.confirmNewPassword = 'Passwords do not match';
    }

    if (this.registerLoginRequest.password === this.resetPasswordRequest.newPassword) {
      this.formError.newPassword = 'New password must be different from current password';
    }

    if (Object.keys(this.formError).length > 0) {
      return;
    }

    // const payload = {
    //   username: this.resetPasswordRequest.username,
    //   oldPassword: this.registerLoginRequest.password,
    //   newPassword: this.resetPasswordRequest.newPassword
    // };

    this.registerLoginRequest = {
      ...this.registerLoginRequest,
      email: this.resetPasswordRequest.username,
      password: this.resetPasswordRequest.newPassword,
      oldPassword: this.registerLoginRequest.password
    };

    this.authService.resetPassword(this.registerLoginRequest)
      .subscribe({
        next: (response) => {
          this.commonResponse = {
            ...this.commonResponse,
            ...response,
            attributes: {
              ...this.commonResponse.attributes,
              ...response.attributes
            }
          };
          this.isResetPasswordMode = false;
          this.isMfaSetupMode = true;
          this.submitError = '';
        },
        error: (err) => {
          console.error('Reset password error', err);
          this.submitError = err.error?.description || 'Failed to reset password.';
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

    if (this.otpCode.length < 6) {
      this.submitError = 'Validation code must be 6 digits';
      return;
    }

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

  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmNewPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private passwordMatchValidator(formGroup: FormGroup) {
    const newPassword = formGroup.get('newPassword')?.value;
    const confirmNewPassword = formGroup.get('confirmNewPassword')?.value;
    return newPassword && confirmNewPassword && newPassword !== confirmNewPassword
      ? { passwordsMismatch: true }
      : null;
  }
}
