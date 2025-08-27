import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../data-access/admin.service';
import { UserProfile } from '../../../data-access/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  
  users: UserProfile[] = [];
  isLoading = true;
  searchTerm = '';
  roleFilter: 'all' | 'user' | 'admin' = 'all';
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

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  getUserCount(role: 'user' | 'admin'): number {
    return this.users.filter(user => user.role === role).length;
  }
}