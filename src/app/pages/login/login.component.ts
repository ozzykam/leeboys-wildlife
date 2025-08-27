import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../data-access/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  async onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.signIn(this.email, this.password);
      
      // Navigate to return URL or account page on successful login
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/account';
      this.router.navigate([returnUrl]);
      
    } catch (error: any) {
      this.loading = false;
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          this.errorMessage = 'No account found with this email address';
          break;
        case 'auth/wrong-password':
          this.errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          this.errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          this.errorMessage = 'Too many failed attempts. Please try again later';
          break;
        default:
          this.errorMessage = 'Login failed. Please try again';
          console.error('Login error:', error);
      }
    }
  }
}
