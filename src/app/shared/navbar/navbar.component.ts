import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '@angular/fire/auth';
import { AuthService } from '../../data-access/auth.service';
import { SideNavComponent } from '../side-nav/side-nav.component';
import { Subscription } from 'rxjs';

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
  isSideNavOpen = false;
  private userSubscription?: Subscription;

  ngOnInit() {
    // Subscribe to auth state changes
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.currentUser = user;
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
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
