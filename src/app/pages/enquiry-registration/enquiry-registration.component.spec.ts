import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { CountryMaster } from '../../models/company-master';
import { AgentService } from '../../service/agent.service';
import { AuthenticationService } from '../../service/authentication.service';
import { EnquiryRegistrationComponent } from './enquiry-registration.component';

describe('EnquiryRegistrationComponent', () => {
  let component: EnquiryRegistrationComponent;
  let authService: jasmine.SpyObj<AuthenticationService>;

  const india: CountryMaster = {
    countryId: 1,
    countryName: 'India',
    isoCode: 'IN',
    phoneCode: '91',
    currencyCode: 'INR',
    currencyName: 'Indian Rupee',
    timezone: 'Asia/Kolkata'
  };

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', ['registerEnquiry']);
    authService.registerEnquiry.and.returnValue(of({
      code: 'SUCCESS',
      title: 'OK',
      description: 'Registered',
      attributes: {
        accessToken: '',
        mfaEnabled: false,
        userOrgId: 1,
        userOrgName: '',
        refreshToken: '',
        secretImageUri: '',
        userRole: '',
        userId: 1
      }
    }));
    const agentService = jasmine.createSpyObj<AgentService>('AgentService', ['getCountryList']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    component = new EnquiryRegistrationComponent(
      new FormBuilder(),
      authService,
      agentService,
      router
    );
    component.countries = [india];
    component.registrationForm.patchValue({ countryId: india.countryId });
    component.onCountryChange();
  });

  it('accepts a national number with the selected country length', () => {
    component.phoneNumberControl?.setValue('9876543210');

    expect(component.phoneNumberControl?.valid).toBeTrue();
  });

  it('accepts an E.164 number only when it matches the selected country', () => {
    component.phoneNumberControl?.setValue('+919876543210');
    expect(component.phoneNumberControl?.valid).toBeTrue();

    component.phoneNumberControl?.setValue('+14155552671');
    expect(component.phoneNumberControl?.hasError('phoneNumberFormat')).toBeTrue();
  });

  it('rejects invalid national lengths and non-numeric input', () => {
    component.phoneNumberControl?.setValue('98765');
    expect(component.phoneNumberControl?.hasError('phoneNumberFormat')).toBeTrue();

    component.phoneNumberControl?.setValue('98765abc10');
    expect(component.phoneNumberControl?.hasError('phoneNumberFormat')).toBeTrue();

    component.phoneNumberControl?.setValue('   ');
    expect(component.phoneNumberControl?.hasError('phoneNumberFormat')).toBeTrue();
  });

  it('submits international input as a national number with a separate country code', () => {
    component.registrationForm.patchValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      orgName: 'Analytical Engine',
      phoneNumber: '+919876543210',
      employeeSize: 10
    });

    component.saveEnquiry();

    expect(authService.registerEnquiry).toHaveBeenCalledWith(jasmine.objectContaining({
      phoneCode: '91',
      phoneNumber: '9876543210'
    }));
  });
});
