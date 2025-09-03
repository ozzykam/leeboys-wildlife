import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../data-access/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  // User information fields (no password - admin creates account)
  firstName = '';
  lastName = '';
  email = '';
  dateOfBirth = '';
  phoneNumber = '';
  streetAddress = '';
  city = '';
  zipCode = '';
  
  // Admin verification
  isAdmin$ = this.authService.isAdmin$;
  
  loading = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit() {
    // Redirect non-admin users
    this.isAdmin$.subscribe(isAdmin => {
      if (isAdmin === false) {
        this.router.navigate(['/']);
      }
    });
  }

  async onCreateUserAccount() {
    if (!this.firstName || !this.lastName || !this.email || !this.dateOfBirth || 
        !this.phoneNumber || !this.streetAddress || !this.city || !this.zipCode) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    // Validate date of birth (must be at least 18 years ago)
    const dobDate = new Date(this.dateOfBirth);
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    
    if (dobDate > eighteenYearsAgo) {
      this.errorMessage = 'Customer must be at least 18 years old';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Create user account without password (pending activation)
      const billingAccountNumber = await this.authService.createPendingUserAccount({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        dateOfBirth: dobDate,
        phoneNumber: this.phoneNumber,
        address: {
          street: this.streetAddress,
          city: this.city,
          zipCode: this.zipCode
        }
      });
      
      this.successMessage = `User account created! Billing Account #: ${billingAccountNumber}. Activation email sent to customer.`;
      
      // Clear form
      this.clearForm();
      
    } catch (error: any) {
      this.loading = false;
      
      // Handle specific errors
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'An account with this email already exists';
      } else {
        this.errorMessage = 'Failed to create user account. Please try again';
        console.error('User creation error:', error);
      }
    } finally {
      this.loading = false;
    }
  }

  clearForm() {
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.dateOfBirth = '';
    this.phoneNumber = '';
    this.streetAddress = '';
    this.city = '';
    this.zipCode = '';
  }
}
