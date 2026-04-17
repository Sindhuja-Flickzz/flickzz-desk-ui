import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RegisterLoginRequest } from '../../models/register-login-request';
import { FlickzzDeskResponse } from '../../models/authentication-response';
import { AuthenticationService } from '../../service/authentication.service';
import { Router } from '@angular/router';
import { VerificationRequest } from '../../models/verification-request';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {

  registerForm: FormGroup;
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
  showPassword = false;
  formError: any = {};
  submitError = '';
  tfaEnabled = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      accessId: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9]+$/)]],
      password: ['', Validators.required]
    });
  }

  onOtpInput($event: Event) {
    this.otpCode = (this.otpCode.replace(/[^0-9]/g, '').slice(0, 6))
  }

  registerUser() {
    this.message = '';
    this.submitError = '';
    this.formError = {};

    Object.keys(this.registerForm.controls).forEach(key => {
      const field = this.registerForm.get(key);
      if (field?.hasError('required')) {
        const label = key === 'accessId' ? 'Access ID' : key;
        this.formError[key] = `${label} is required`;
      }
      if (key === 'email' && field?.hasError('email')) {
        this.formError[key] = 'Invalid email format';
      }
      if (key === 'accessId' && field?.hasError('pattern')) {
        this.formError[key] = 'Access ID must contain only letters and numbers';
      }
    });

    if (Object.keys(this.formError).length > 0) {
      return;
    }

    this.registerRequest = {
      ...this.registerRequest,
      firstname: this.registerForm.value.firstname,
      lastname: this.registerForm.value.lastname,
      email: this.registerForm.value.email,
      registerId: this.registerForm.value.accessId,
      password: this.registerForm.value.password,
      mfaEnabled: this.registerRequest.mfaEnabled,
      createdBy: 'Admin'
    };

    this.authService.register(this.registerRequest)
      .subscribe({
        next: (response) => {
          this.tfaEnabled = true;
          if (response.code === 'GM-200') {
              this.commonResponse = response;
          }
        },
        error: (err) => {
          console.error('Register error', err);
          this.submitError = err.error?.description || 'Failed to register.';
        }
      });
  }

  verifyTfa() {
    this.message = '';
    this.submitError = '';

    if (this.otpCode.length < 6) {
      this.submitError = 'Validation code must be 6 digits';
      return;
    }

    const verifyRequest: VerificationRequest = {
      email: this.registerForm.value.email || this.registerRequest.email,
      code: parseInt(this.otpCode)
    };
    this.authService.verifyCode(verifyRequest)
      .subscribe({
        next: (response) => {
          this.message = 'Account created successfully\nYou will be redirected to the Login page in 3 seconds';
          setTimeout(() => {
            this.router.navigate(['login']);
          }, 3000);
        },
        error: (err) => {
          console.error('Verify TFA error', err);
          this.submitError = err.error?.description || 'Failed to verify code.';
        }
      });
  }
  
  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
