import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {RegisterLoginRequest} from "../models/register-login-request";
import {FlickzzDeskResponse} from "../models/authentication-response";
import {EnquiryRequest} from "../models/enquiry-request";
import {EnquiryRegisterRequest} from '../models/enquiry-register-request';
import {VerificationRequest} from "../models/verification-request";
import { LogoutRequest } from '../models/logout-request';

import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  constructor(private http: HttpClient) { }

  register(
    registerRequest: RegisterLoginRequest
  ) {
    return this.http.post<FlickzzDeskResponse>
    (`${APP_CONSTANTS.API_BASE_URL}/register`, registerRequest);
  }

  login(
    registerLoginRequest: RegisterLoginRequest
  ) {
    return this.http.post<FlickzzDeskResponse>
    (`${APP_CONSTANTS.API_BASE_URL}/login`, registerLoginRequest);
  }

  verifyCode(verificationRequest: VerificationRequest) {
    return this.http.post<FlickzzDeskResponse>
    (`${APP_CONSTANTS.API_BASE_URL}/verify`, verificationRequest);
  }

  validateToken(token: string): Observable<FlickzzDeskResponse> {
    return this.http.get<FlickzzDeskResponse>(`${APP_CONSTANTS.API_BASE_URL}/enquiry/verify`, {
      params: { token }
    });
  }

  submitSecure(enquiryRequest: EnquiryRequest): Observable<FlickzzDeskResponse> {
    return this.http.post<FlickzzDeskResponse>(
      `${APP_CONSTANTS.API_BASE_URL}/enquiry/submit-secure`,
      enquiryRequest
    );
  }

  registerEnquiry(enquiryRegisterRequest: EnquiryRegisterRequest): Observable<FlickzzDeskResponse> {
    return this.http.post<FlickzzDeskResponse>(
      `${APP_CONSTANTS.API_BASE_URL}/enquiry/register`,
      enquiryRegisterRequest
    );
  }

  resetPassword(registerLoginRequest: RegisterLoginRequest) {
    return this.http.post<FlickzzDeskResponse>
    (`${APP_CONSTANTS.API_BASE_URL}/reset/password`, registerLoginRequest);
  }
  
  logout(logoutRequest: LogoutRequest): Observable<FlickzzDeskResponse> {
    return this.http.post<FlickzzDeskResponse>(
      `${APP_CONSTANTS.API_BASE_URL}/logout`,
      logoutRequest
    );
  }

  refreshToken(refreshToken: string): Observable<FlickzzDeskResponse> {
    return this.http.post<FlickzzDeskResponse>(
      `${APP_CONSTANTS.API_BASE_URL}/refresh`,
      { refreshToken }
    );
  }
}
