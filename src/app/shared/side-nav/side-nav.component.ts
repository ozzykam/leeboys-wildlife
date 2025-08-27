import { Component, EventEmitter, Input, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../data-access/auth.service';
import { User } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-side-nav',
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() closeNav = new EventEmitter<void>();

  private authService = inject(AuthService);
  private router = inject(Router);

  isLoggedIn = false;
  currentUser: User | null = null;
  private userSubscription?: Subscription;

  // Getters for reactive data
  ngOnInit() {
    // Subscribe to auth state changes
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.currentUser = user;
    });
  }

  onNavItemClick() {
    this.closeNav.emit();
  }

  async onLogout() {
    try {
      await this.authService.signOut();
      // Navigate to home page after successful logout
      await this.router.navigate(['/']);
      this.closeNav.emit();
    } catch (error) {
      console.error('Error during logout:', error);
      this.closeNav.emit();
    }
  }

  onOverlayClick() {
    this.closeNav.emit();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
}
