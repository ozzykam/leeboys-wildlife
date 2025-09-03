import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AdminService } from '../../../data-access/admin.service';
import { UserProfile } from '../../../data-access/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private router = inject(Router);
  
  users: UserProfile[] = [];
  isLoading = true;
  searchTerm = '';
  roleFilter: 'all' | 'user' | 'admin' = 'all';
  selectedUser: UserProfile | null = null;
  showUserDetail = false;
  private subscription?: Subscription;

  roleOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'user', label: 'Regular Users' },
    { value: 'admin', label: 'Administrators' }
  ];

  ngOnInit() {
    this.loadUsers();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadUsers() {
    this.isLoading = true;
    if (this.roleFilter === 'all') {
      this.subscription = this.adminService.getAllUsers().subscribe({
        next: (users) => {
          this.users = users;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.isLoading = false;
        }
      });
    } else {
      this.subscription = this.adminService.getUsersByRole(this.roleFilter).subscribe({
        next: (users) => {
          this.users = users;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.isLoading = false;
        }
      });
    }
  }

  onRoleFilterChange() {
    this.loadUsers();
  }

  get filteredUsers(): UserProfile[] {
    if (!this.searchTerm) {
      return this.users;
    }

    const searchLower = this.searchTerm.toLowerCase();
    return this.users.filter(user => 
      user.displayName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  }

  async toggleAdminRole(user: UserProfile) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const isAdmin = newRole === 'admin';

    try {
      const result = await this.adminService.setAdminClaim(user.uid, isAdmin);
      console.log(result.message);
      // The observable will automatically update the UI
    } catch (error) {
      console.error('Error updating user role:', error);
      // You might want to show a toast notification here
    }
  }

  getRoleBadgeClass(role: 'user' | 'admin'): string {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium';
    return role === 'admin' 
      ? `${baseClasses} bg-red-100 text-red-800`
      : `${baseClasses} bg-blue-100 text-blue-800`;
  }

  formatDate(date: Date | any): string {
    if (!date) return 'N/A';
    
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      return isNaN(parsedDate.getTime()) ? 'Invalid Date' : parsedDate.toLocaleDateString();
    }
    
    // Handle Date objects
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    }
    
    // Fallback
    const fallbackDate = new Date(date);
    return isNaN(fallbackDate.getTime()) ? 'Invalid Date' : fallbackDate.toLocaleDateString();
  }

  getUserCount(role: 'user' | 'admin'): number {
    return this.users.filter(user => user.role === role).length;
  }

  // User detail view methods
  viewUserDetail(user: UserProfile) {
    this.selectedUser = user;
    this.showUserDetail = true;
  }

  closeUserDetail() {
    this.selectedUser = null;
    this.showUserDetail = false;
  }

  // Billing actions
  createQuoteForUser(user: UserProfile) {
    this.router.navigate(['/admin/create-invoice'], {
      queryParams: {
        mode: 'quote',
        customerId: user.uid,
        customerName: user.displayName,
        customerEmail: user.email,
        customerPhone: user.phone || '',
        customerStreet: user.address?.street || '',
        customerCity: user.address?.city || '',
        customerState: user.address?.state || '',
        customerZipCode: user.address?.zipCode || ''
      }
    });
  }

  createInvoiceForUser(user: UserProfile) {
    this.router.navigate(['/admin/create-invoice'], {
      queryParams: {
        mode: 'invoice',
        customerId: user.uid,
        customerName: user.displayName,
        customerEmail: user.email,
        customerPhone: user.phone || '',
        customerStreet: user.address?.street || '',
        customerCity: user.address?.city || '',
        customerState: user.address?.state || '',
        customerZipCode: user.address?.zipCode || ''
      }
    });
  }

  // Helper methods for user detail
  getUserDisplayStatus(user: UserProfile): string {
    if (user.role === 'admin') return 'Administrator';
    return user.billingAccountId ? 'Active Customer' : 'Pending Activation';
  }

  getUserStatusClass(user: UserProfile): string {
    if (user.role === 'admin') return 'bg-purple-100 text-purple-800';
    return user.billingAccountId ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  }

  // Navigation method
  navigateToCreateUser() {
    this.router.navigate(['/create-user']);
  }
}