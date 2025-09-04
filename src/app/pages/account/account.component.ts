import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../data-access/auth.service';
import { Observable, switchMap, of } from 'rxjs';

@Component({
  selector: 'app-account',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser$ = this.authService.user$;
  userProfile$!: Observable<UserProfile | null>;
  isLoading = true;

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    this.userProfile$ = this.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          this.isLoading = false;
          return of(null);
        }
        return this.authService.getUserProfile(user.uid);
      })
    );
    
    this.userProfile$.subscribe(() => {
      this.isLoading = false;
    });
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  copyToClipboard(text: string, elementId: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Show temporary feedback
      const element = document.getElementById(elementId);
      if (element) {
        const originalText = element.textContent;
        element.textContent = 'Copied!';
        element.style.color = '#10b981';
        setTimeout(() => {
          element.textContent = originalText;
          element.style.color = '';
        }, 2000);
      }
    });
  }

  getRoleBadgeClass(role: 'user' | 'admin' | 'superAdmin'): string {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium';
    if (role === 'superAdmin') {
      return `${baseClasses} bg-purple-100 text-purple-800`;
    } else if (role === 'admin') {
      return `${baseClasses} bg-red-100 text-red-800`;
    } else {
      return `${baseClasses} bg-blue-100 text-blue-800`;
    }
  }

  getAccountStatusClass(userProfile: UserProfile): string {
    if (userProfile.role === 'superAdmin') return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-medium';
    if (userProfile.role === 'admin') return 'bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium';
    return userProfile.billingAccountId 
      ? 'bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium' 
      : 'bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium';
  }

  getAccountStatus(userProfile: UserProfile): string {
    if (userProfile.role === 'superAdmin') return 'Super Administrator';
    if (userProfile.role === 'admin') return 'Administrator';
    return userProfile.billingAccountId ? 'Active Customer' : 'Pending Activation';
  }

  editProfile() {
    this.router.navigate(['/edit-profile']);
  }
}
