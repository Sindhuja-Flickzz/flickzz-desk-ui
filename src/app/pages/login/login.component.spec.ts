import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthenticationService } from 'src/app/service/authentication.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthenticationService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthenticationService', ['login', 'verifyCode']);
    authService.login.and.returnValue(of({
      code: 'SUCCESS',
      title: 'OK',
      description: 'ok',
      attributes: {
        accessToken: 'token',
        mfaEnabled: false,
        refreshToken: 'refresh',
        secretImageUri: '',
        userOrgId: 1,
        userOrgName: 'Org',
        userRole: 'USER',
        userId: 1,
        enquiryUser: true
      }
    }));

    TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [FormsModule, ReactiveFormsModule, MatIconModule],
      providers: [
        { provide: AuthenticationService, useValue: authService },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should block duplicate login submissions while a request is in flight', () => {
    component.isSubmitting = true;
    component.login();

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('should show a verification error, clear the code, and allow retry after an invalid code', () => {
    authService.verifyCode.and.returnValue(throwError(() => ({
      error: { description: 'Invalid validation code' }
    })));
    component.otpCode = '123456';

    component.verifyCode();

    expect(component.submitError).toBe('Invalid validation code');
    expect(component.otpCode).toBe('');
    expect(component.isVerifying).toBeFalse();

    component.otpCode = '654321';
    fixture.detectChanges();
    const verifyButton = fixture.nativeElement.querySelector('button[type="button"]') as HTMLButtonElement;
    expect(verifyButton.disabled).toBeFalse();
  });
});
