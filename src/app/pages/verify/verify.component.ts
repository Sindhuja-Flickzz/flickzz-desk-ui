import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '../../service/authentication.service';
import { EnquiryRequest } from '../../models/enquiry-request';

@Component({
  selector: 'app-verify',
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.css']
})
export class VerifyComponent implements OnInit {
  verifyForm: FormGroup;
  username = '';
  token = '';
  loading = false;
  invalidLink = false;
  message = '';
  isSuccess = false;
  showForm = false;
  showPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  text = 'FlickzzDesk';
  letters = this.text.split('');
  showSuccessPage = false;
  confettiPieces: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthenticationService,
    private router: Router,
  ) {
    this.verifyForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!newPassword || !confirmPassword) {
      return null;
    }

    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  ngOnInit(): void {
    // Generate confetti pieces
    this.confettiPieces = Array.from({ length: 30 }).map(() => ({
      color: this.randomColor(),
      left: Math.random() * 100,
      delay: Math.random() * 5
    }));
        // this.showSuccessPage = true;
    this.route.queryParamMap.subscribe(params => {
      this.username = params.get('username') || '';
      this.token = params.get('token') || '';

      if (!this.token) {
        this.showInvalidLink('Invalid or expired link.');
        return;
      }

      this.validateToken(this.token);
    });
  }

  randomColor(): string {
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  get newPasswordControl() {
    return this.verifyForm.get('newPassword');
  }

  get confirmPasswordControl() {
    return this.verifyForm.get('confirmPassword');
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  validateToken(token: string): void {
    this.loading = true;
    this.invalidLink = false;
    this.message = '';

    this.authService.validateToken(token).subscribe({
      next: () => {
        this.loading = false;
        this.showForm = true;
      },
      error: (err) => {
        this.loading = false;
        this.showInvalidLink(err.error.description? err.error.description : 'Invalid or expired link.');
      }
    });
  }

  showInvalidLink(message: string): void {
    this.invalidLink = true;
    this.verifyForm.disable({ emitEvent: false });
    this.message = message ? message : 'Invalid or expired link.';
    this.isSuccess = false;
    this.showForm = false;
  }

  onSubmit(): void {
    if (this.invalidLink || this.loading) {
      return;
    }

    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.message = '';

    const payload: EnquiryRequest = {
      token: this.token,
      password: this.newPasswordControl?.value,
      // newPassword: this.newPasswordControl?.value
    };

    this.authService.submitSecure(payload).subscribe({
      next: response => {
        this.showSuccessPage = true;
        this.loading = false;
        this.isSuccess = true;
        this.showForm = false;
        this.message = 'Secure access confirmed. \n You will be redirected to the login page in 3 seconds. \n Please login to FlickzzDesk with your credentials.';
        this.verifyForm.disable({ emitEvent: false });
        setTimeout(() => {
            this.router.navigate(['/login']);
          }, 5000);
      },
      error: err => {
        this.loading = false;
        this.isSuccess = false;
        this.message = err.error?.description || 'Unable to submit secure request.';
      }
    });
  }
}
