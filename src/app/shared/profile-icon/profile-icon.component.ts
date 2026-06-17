import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../service/authentication.service';
import { ThemeService } from '../../service/theme.service';
import { CompanyService } from '../../service/company.service';
import { EnquiryRequest } from '../../models/enquiry-request';
import { RegisterLoginRequest } from '../../models/register-login-request';
import { Subject, takeUntil } from 'rxjs';

interface UserProfile {
  username: string;
  uid: string;
  role: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

@Component({
  selector: 'app-profile-icon',
  templateUrl: './profile-icon.component.html',
  styleUrls: ['./profile-icon.component.scss']
})
export class ProfileIconComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isDropdownOpen = false;
  isDarkMode = false;
  isEditing = false;
  notificationCount = 1; // Mock notification count

  userProfile: UserProfile = {
    username: '',
    uid: '',
    role: '',
    email: '',
    firstName: '',
    lastName: ''
  };

  editProfile: UserProfile = { ...this.userProfile };

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private themeService: ThemeService,
    private companyService: CompanyService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.themeService.isDarkMode$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserProfile(): void {
    const userEmail = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const userOrgId = localStorage.getItem('userOrgId');

    if (!userEmail || !userRole) {
      console.error('User email or role not found in localStorage');
      return;
    }

    this.userProfile.email = userEmail;
    this.userProfile.role = userRole;
    this.userProfile.username = userEmail.split('@')[0]; // Default username from email
    this.userProfile.uid = userOrgId || '';

    this.editProfile = { ...this.userProfile };

    if (userOrgId) {
      const companyId = Number(userOrgId);
      if (!isNaN(companyId) && companyId > 0) {
        this.companyService.getCompanyById(companyId).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (company) => {
            company = (company as any).attributes; // Type assertion to access uid
            if (company && company.uid) {
              this.userProfile.uid = company.uid;
              this.editProfile.uid = company.uid;
            }
          },
          error: (error) => {
            console.error('Failed to load company UID for profile dropdown:', error);
          }
        });
      }
    }
  }

  private checkDarkMode(): void {
    // Theme is now managed by ThemeService
  }

  private applyTheme(): void {
    // Theme is now managed by ThemeService
  }

  getInitials(): string {
    if (this.userProfile.firstName && this.userProfile.lastName) {
      return (this.userProfile.firstName.charAt(0) + this.userProfile.lastName.charAt(0)).toUpperCase();
    } else if (this.userProfile.username) {
      const names = this.userProfile.username.split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      }
      return this.userProfile.username.charAt(0).toUpperCase();
    }
    return 'U';
  }

  getAvatarColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const index = this.userProfile.username.length % colors.length;
    return colors[index];
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
    this.isEditing = false;
    this.editProfile = { ...this.userProfile };
  }

  toggleDarkMode(): void {
    this.themeService.toggleTheme();
  }

  startEditing(): void {
    this.isEditing = true;
    this.editProfile = { ...this.userProfile };
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.editProfile = { ...this.userProfile };
  }

  saveProfile(): void {
    // For now, just update local profile
    // In a real implementation, this would call an API to save profile changes
    this.userProfile = { ...this.editProfile };
    this.isEditing = false;

    // Update localStorage if email changed
    if (this.editProfile.email !== localStorage.getItem('userId')) {
      localStorage.setItem('userId', this.editProfile.email);
    }
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
    this.closeDropdown();
  }

  openSettings(): void {
    // Navigate to settings page or open settings modal
    this.router.navigate(['/settings']);
    this.closeDropdown();
  }

  logout(): void {
    const logoutRequest = {
      username: this.userProfile.username,
      refreshToken: localStorage.getItem('refreshToken')
    };

    this.authService.logout(logoutRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        localStorage.clear();
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Force logout on error
        localStorage.clear();
        this.router.navigate(['/login']);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeDropdown();
    }
  }
}
