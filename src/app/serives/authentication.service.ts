import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {RegisterLoginRequest} from "../models/register-login-request";
import {CommonResponse} from "../models/authentication-response";
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
    return this.http.post<CommonResponse>
    (`${APP_CONSTANTS.API_BASE_URL}/register`, registerRequest);
  }

  login(
    registerLoginRequest: RegisterLoginRequest
  ) {
    return this.http.post<CommonResponse>
    (`${APP_CONSTANTS.API_BASE_URL}/login`, registerLoginRequest);
  }

  verifyCode(verificationRequest: VerificationRequest) {
    return this.http.post<CommonResponse>
    (`${APP_CONSTANTS.API_BASE_URL}/verify`, verificationRequest);
  }
  
  logout(logoutRequest: LogoutRequest): Observable<CommonResponse> {
    return this.http.post<CommonResponse>(
      `${APP_CONSTANTS.API_BASE_URL}/logout`,
      logoutRequest
    );
  }

  refreshToken(refreshToken: string): Observable<CommonResponse> {
    return this.http.post<CommonResponse>(
      `${APP_CONSTANTS.API_BASE_URL}/refresh`,
      { refreshToken }
    );
  }

}
