import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthenticationService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add auth headers to request
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId') ?? '';

    if (token) {
      request = this.addAuthHeaders(request, token, userId);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', error);
        if (error.status === 401 && !request.url.includes('/login') && !request.url.includes('/register') && !request.url.includes('/refresh')) {
          return this.handle401Error(request, next);
        }
        return throwError(error);
      })
    );
  }

  private addAuthHeaders(request: HttpRequest<any>, token: string, userId?: string): HttpRequest<any> {
    const headers: any = {
      Authorization: `Bearer ${token}`
    };

    if (userId) {
      headers['X-User-ID'] = userId;
    }

    return request.clone({
      setHeaders: headers
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        return this.authService.refreshToken(refreshToken).pipe(
          switchMap((response: any) => {
            this.isRefreshing = false;
            const newToken = response.object?.accessToken;
            const newRefreshToken = response.object?.refreshToken;

            if (newToken) {
              localStorage.setItem('token', newToken);
              if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken);
              }
              this.refreshTokenSubject.next(newToken);

              // Retry the original request with new token
              const userId = localStorage.getItem('userId') ?? '';
              return next.handle(this.addAuthHeaders(request, newToken, userId));
            } else {
              // Refresh failed, logout
              this.logout();
              return throwError('Token refresh failed');
            }
          }),
          catchError((error) => {
            this.isRefreshing = false;
            this.refreshTokenSubject.next(null);
            this.logout();
            return throwError(error);
          })
        );
      } else {
        this.logout();
        return throwError('No refresh token available');
      }
    } else {
      // If refreshing, wait for new token
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => {
          const userId = localStorage.getItem('userId') ?? '';
          return next.handle(this.addAuthHeaders(request, token, userId));
        })
      );
    }
  }

  private logout(): void {
    localStorage.clear();
    // You might want to navigate to login, but since this is an interceptor, better to handle in a service or component
  }
}