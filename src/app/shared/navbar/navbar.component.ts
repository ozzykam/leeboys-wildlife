import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '@angular/fire/auth';
import { AuthService, UserProfile } from '../../data-access/auth.service';
import { SideNavComponent } from '../side-nav/side-nav.component';
import { Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive, SideNavComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  isLoggedIn = false;
  currentUser: User | null = null;
  userProfile: UserProfile | null = null;
  isAdmin = false;
  isSideNavOpen = false;
  private userSubscription?: Subscription;
  private adminSubscription?: Subscription;
  private profileSubscription?: Subscription;

  ngOnInit() {
    // Subscribe to auth state changes
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.currentUser = user;
    });

    // Subscribe to user profile changes
    this.profileSubscription = this.authService.user$.pipe(
      switchMap(user => {
        if (user) {
          return this.authService.getUserProfile(user.uid);
        } else {
          return [];
        }
      })
    ).subscribe(profile => {
      this.userProfile = profile || null;
    });

    // Subscribe to admin status changes
    this.adminSubscription = this.authService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    this.adminSubscription?.unsubscribe();
    this.profileSubscription?.unsubscribe();
  }

  async onLogout() {
    try {
      await this.authService.signOut();
      // Redirect to home page after logout
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  toggleSideNav() {
    this.isSideNavOpen = !this.isSideNavOpen;
    // Prevent body scroll when side nav is open
    if (this.isSideNavOpen) {
      document.body.classList.add('side-nav-open');
    } else {
      document.body.classList.remove('side-nav-open');
    }
  }

  closeSideNav() {
    this.isSideNavOpen = false;
    document.body.classList.remove('side-nav-open');
  }
}
