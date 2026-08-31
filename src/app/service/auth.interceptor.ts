import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, EMPTY } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthenticationService } from './authentication.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../shared/confirmation-dialog/confirmation-dialog.component';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private authService: AuthenticationService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId') ?? '';
    const userEmail = localStorage.getItem('userEmail') ?? '';

    if (token) {
      request = this.addAuthHeaders(request, token, userEmail, userId);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', error);

        if (error.status === 403 && !request.url.includes('/login') && !request.url.includes('/refresh')) {
          this.handleForbiddenError(error);
          return EMPTY;
        }

        if (error.status === 401 && !request.url.includes('/login') && !request.url.includes('/refresh')) {
          return this.handle401Error(request, next);
        }

        return throwError(() => error);
      })
    );
  }

  private addAuthHeaders(request: HttpRequest<any>, token: string, userEmail?: string, userId?: string): HttpRequest<any> {
    const headers: any = {
      Authorization: `Bearer ${token}`
    };

    if (userEmail) {
      headers['X-User-Email'] = userEmail;
    }

    if (userId) {
      headers['X-User-Id'] = userId;
    }

    return request.clone({
      setHeaders: headers
    });
  }

  private handleForbiddenError(error: HttpErrorResponse): void {
    const message = error.error?.message || error.error?.description || 'Your session has expired or you are not authorized to access this page.';

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Unauthorized',
        message,
        confirmText: 'OK',
        showCancel: false,
        type: 'error'
      } as ConfirmationDialogData
    });

    dialogRef.afterClosed().subscribe(() => {
      this.logout();
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
            const newToken = response.attributes?.accessToken;
            const newRefreshToken = response.attributes?.refreshToken;

            if (newToken) {
              localStorage.setItem('token', newToken);
              if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken);
              }
              this.refreshTokenSubject.next(newToken);

              const userEmail = localStorage.getItem('userEmail') ?? '';
              const userId = localStorage.getItem('userId') ?? '';
              return next.handle(this.addAuthHeaders(request, newToken, userEmail, userId));
            } else {
              this.logout();
              return throwError(() => new Error('Token refresh failed'));
            }
          }),
          catchError((error) => {
            this.isRefreshing = false;
            this.refreshTokenSubject.next(null);
            return throwError(() => error);
          })
        );
      } else {
        return throwError(() => new Error('No refresh token available'));
      }
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => {
          const userEmail = localStorage.getItem('userEmail') ?? '';
          const userId = localStorage.getItem('userId') ?? '';
          return next.handle(this.addAuthHeaders(request, token, userEmail, userId));
        })
      );
    }
  }

  private logout(): void {
    localStorage.clear();
    this.router.navigateByUrl('/login');
  }
}