import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthenticationService,
    private router: Router,
  ) {
    this.verifyForm = this.fb.group({
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
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

  get passwordControl() {
    return this.verifyForm.get('password');
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
      password: this.passwordControl?.value
    };

    this.authService.submitSecure(payload).subscribe({
      next: response => {
        this.loading = false;
        this.isSuccess = true;
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
