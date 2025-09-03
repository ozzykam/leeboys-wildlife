import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ServiceRequestsComponent } from './service-requests/service-requests.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { BillingComponent } from '../billing/billing.component';

@Component({
  selector: 'app-admin',
  imports: [
    CommonModule,
    MatIconModule,
    ServiceRequestsComponent,
    UserManagementComponent,
    BillingComponent
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  private router = inject(Router);
  
  currentTab: 'requests' | 'users' | 'invoices' = 'requests';

  setTab(tab: 'requests' | 'users' | 'invoices') {
    this.currentTab = tab;
  }

  navigateToCreateInvoice() {
    this.router.navigate(['/admin/create-invoice']);
  }
}
