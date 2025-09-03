import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../data-access/auth.service';

@Component({
  selector: 'app-activate-account',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './activate-account.component.html',
  styleUrl: './activate-account.component.scss'
})
export class ActivateAccountComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Form fields
  billingAccountNumber = '';
  dateOfBirth = '';
  email = ''; // Auto-populated after verification
  password = '';
  confirmPassword = '';

  // State management
  step: 'find-account' | 'verify-dob' | 'create-password' = 'find-account';
  loading = false;
  errorMessage = '';
  successMessage = '';
  pendingAccountData: any = null;
  

  async onFindAccount() {
    if (!this.billingAccountNumber) {
      this.errorMessage = 'Please enter your billing account number';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // First, just find the account by billing number
      const accountData = await this.authService.findPendingAccount(
        this.billingAccountNumber.trim()
      );

      if (accountData) {
        this.pendingAccountData = accountData;
        this.step = 'verify-dob';
        this.successMessage = `Account found for ${accountData.firstName} ${accountData.lastName}. Please verify your date of birth.`;
      } else {
        this.errorMessage = 'Billing account number not found or account is already activated. Please check your information and try again.';
      }
    } catch (error: any) {
      this.errorMessage = 'Failed to find account. Please try again.';
      console.error('Account lookup error:', error);
    } finally {
      this.loading = false;
    }
  }

  async onVerifyDateOfBirth() {
    if (!this.dateOfBirth) {
      this.errorMessage = 'Please enter your date of birth';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      // Handle Firestore Timestamp properly
      const storedDOB = this.pendingAccountData.dateOfBirth.toDate ? 
        this.pendingAccountData.dateOfBirth.toDate() : 
        new Date(this.pendingAccountData.dateOfBirth);
      const inputDOB = new Date(this.dateOfBirth);

      // Compare dates using ISO date strings to avoid timezone issues
      const storedDateOnly = storedDOB.toISOString().split('T')[0];
      const inputDateOnly = inputDOB.toISOString().split('T')[0];
      
      if (storedDateOnly === inputDateOnly) {
        this.email = this.pendingAccountData.email;
        this.step = 'create-password';
        this.successMessage = 'Date of birth verified! Please create your password to complete activation.';
      } else {
        this.errorMessage = 'Date of birth does not match our records. Please check your information and try again.';
      }
    } catch (error: any) {
      console.error('Date verification error:', error);
      this.errorMessage = 'Failed to verify date of birth. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async onActivateAccount() {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      // Activate the account with password
      await this.authService.activatePendingAccount(
        this.billingAccountNumber.trim(),
        this.email.trim(),
        this.password,
        this.pendingAccountData
      );

      this.successMessage = 'Account activated successfully! You can now sign in.';
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/login'], {
          queryParams: { email: this.email }
        });
      }, 2000);
      
    } catch (error: any) {
      // Handle specific errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          this.errorMessage = 'An account with this email already exists';
          break;
        case 'auth/invalid-email':
          this.errorMessage = 'Please enter a valid email address';
          break;
        case 'auth/weak-password':
          this.errorMessage = 'Password is too weak. Please choose a stronger password';
          break;
        default:
          this.errorMessage = 'Account activation failed. Please try again';
          console.error('Account activation error:', error);
      }
    } finally {
      this.loading = false;
    }
  }

  goBackToFindAccount() {
    this.step = 'find-account';
    this.dateOfBirth = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.pendingAccountData = null;
  }

  goBackToVerifyDOB() {
    this.step = 'verify-dob';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  clearForm() {
    this.billingAccountNumber = '';
    this.dateOfBirth = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.step = 'find-account';
    this.pendingAccountData = null;
  }
}
