import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../../data-access/auth.service';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-edit-profile',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.scss'
})
export class EditProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  profileForm: FormGroup;
  passwordForm: FormGroup;
  userProfile: UserProfile | null = null;
  
  loading = false;
  profileLoading = false;
  passwordLoading = false;
  
  profileMessage = '';
  passwordMessage = '';
  profileError = '';
  passwordError = '';

  constructor() {
    this.profileForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/)]],
      street: [''],
      city: [''],
      state: [''],
      zipCode: ['', [Validators.pattern(/^\d{5}(-\d{4})?$/)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  private async loadUserProfile() {
    this.loading = true;
    
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      this.authService.getUserProfile(currentUser.uid).pipe(take(1)).subscribe({
        next: (profile) => {
          this.userProfile = profile;
          this.populateForm(profile);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          this.profileError = 'Failed to load profile';
          this.loading = false;
        }
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      this.profileError = 'Failed to load profile';
      this.loading = false;
    }
  }

  private populateForm(profile: UserProfile) {
    this.profileForm.patchValue({
      displayName: profile.displayName || '',
      email: profile.email || '',
      phone: profile.phone || '',
      street: profile.address?.street || '',
      city: profile.address?.city || '',
      state: profile.address?.state || '',
      zipCode: profile.address?.zipCode || ''
    });
  }

  private passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword');
    const confirmPassword = group.get('confirmPassword');
    
    if (newPassword?.value !== confirmPassword?.value) {
      confirmPassword?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    if (confirmPassword?.errors?.['passwordMismatch']) {
      delete confirmPassword.errors['passwordMismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  async updateProfile() {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.profileLoading = true;
    this.profileMessage = '';
    this.profileError = '';

    const currentUser = this.authService.currentUser;
    if (!currentUser) return;

    try {
      const formValue = this.profileForm.value;

      // Update display name in Firebase Auth if changed
      if (formValue.displayName !== currentUser.displayName) {
        await this.authService.updateUserProfile({
          displayName: formValue.displayName
        });
      }

      // Update billing info (phone and address)
      await this.authService.updateUserBillingInfo(
        currentUser.uid,
        formValue.phone,
        {
          street: formValue.street,
          city: formValue.city,
          state: formValue.state,
          zipCode: formValue.zipCode
        }
      );

      this.profileMessage = 'Profile updated successfully!';
      this.loadUserProfile(); // Refresh the profile data
      
      setTimeout(() => {
        this.profileMessage = '';
      }, 3000);

    } catch (error: any) {
      console.error('Error updating profile:', error);
      this.profileError = error.message || 'Failed to update profile';
    } finally {
      this.profileLoading = false;
    }
  }

  async changePassword() {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }

    this.passwordLoading = true;
    this.passwordMessage = '';
    this.passwordError = '';

    const currentUser = this.authService.currentUser;
    if (!currentUser) return;

    try {
      const { currentPassword, newPassword } = this.passwordForm.value;
      
      await this.authService.changePassword(currentPassword, newPassword);
      
      this.passwordMessage = 'Password changed successfully!';
      this.passwordForm.reset();
      
      setTimeout(() => {
        this.passwordMessage = '';
      }, 3000);

    } catch (error: any) {
      console.error('Error changing password:', error);
      
      if (error.code === 'auth/wrong-password') {
        this.passwordError = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        this.passwordError = 'New password is too weak';
      } else if (error.code === 'auth/requires-recent-login') {
        this.passwordError = 'Please log out and log back in, then try changing your password';
      } else {
        this.passwordError = error.message || 'Failed to change password';
      }
    } finally {
      this.passwordLoading = false;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  goBack() {
    this.router.navigate(['/account']);
  }

  // Helper methods for template
  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['pattern']) {
        if (fieldName === 'phone') return 'Please enter a valid phone number';
        if (fieldName === 'zipCode') return 'Please enter a valid ZIP code';
      }
      if (field.errors['passwordMismatch']) return 'Passwords do not match';
    }
    return '';
  }

  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field?.errors && field.touched);
  }
}
