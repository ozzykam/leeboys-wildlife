import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ServiceRequestsComponent } from './service-requests/service-requests.component';
import { UserManagementComponent } from './user-management/user-management.component';

@Component({
  selector: 'app-admin',
  imports: [
    CommonModule,
    MatIconModule,
    ServiceRequestsComponent,
    UserManagementComponent
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  currentTab: 'requests' | 'users' = 'requests';

  setTab(tab: 'requests' | 'users') {
    this.currentTab = tab;
  }
}
