import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../data-access/auth.service';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  async onSignup() {
    if (!this.fullName || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.authService.signUp(this.email, this.password, this.fullName);
      
      this.successMessage = 'Account created! Please check your email for verification.';
      
      // Navigate to account page after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/account']);
      }, 2000);
      
    } catch (error: any) {
      this.loading = false;
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          this.errorMessage = 'An account with this email already exists';
          break;
        case 'auth/invalid-email':
          this.errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          this.errorMessage = 'Password is too weak. Please choose a stronger password';
          break;
        case 'auth/operation-not-allowed':
          this.errorMessage = 'Account creation is currently disabled';
          break;
        default:
          this.errorMessage = 'Account creation failed. Please try again';
          console.error('Signup error:', error);
      }
    }
  }
}
