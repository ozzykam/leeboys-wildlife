import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ServiceRequestsService, ServiceRequest } from '../../../data-access/service-requests.service';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-service-requests',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './service-requests.component.html',
  styleUrl: './service-requests.component.scss'
})
export class ServiceRequestsComponent implements OnInit, OnDestroy {
  private serviceRequestsService = inject(ServiceRequestsService);
  
  serviceRequests: ServiceRequest[] = [];
  filteredRequests: ServiceRequest[] = [];
  searchTerm = '';
  statusFilter: ServiceRequest['status'] | 'all' = 'all';
  isLoading = true;
  selectedRequest: ServiceRequest | null = null;
  showDetailModal = false;
  private subscription?: Subscription;
  
  statusOptions = [
    { value: 'all', label: 'All Requests' },
    { value: 'new', label: 'New' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'canceled', label: 'Canceled' }
  ];

  ngOnInit() {
    this.loadServiceRequests();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadServiceRequests() {
    this.isLoading = true;
    this.subscription = this.serviceRequestsService.getAllServiceRequests().subscribe({
      next: (requests) => {
        this.serviceRequests = requests;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading service requests:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    let filtered = this.serviceRequests;

    // Filter by status
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === this.statusFilter);
    }

    // Filter by search term
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(request => 
        request.customerName.toLowerCase().includes(searchLower) ||
        request.email.toLowerCase().includes(searchLower) ||
        request.phone.includes(searchLower) ||
        request.address.street.toLowerCase().includes(searchLower) ||
        request.description.toLowerCase().includes(searchLower)
      );
    }

    this.filteredRequests = filtered.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  onSearchChange() {
    this.applyFilters();
  }

  onStatusFilterChange() {
    this.applyFilters();
  }

  async updateStatus(requestId: string, newStatus: ServiceRequest['status']) {
    try {
      await this.serviceRequestsService.updateServiceRequestStatus(requestId, newStatus);
      // The observable will automatically update the list
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  getStatusBadgeClass(status: ServiceRequest['status']): string {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'new':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'scheduled':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'in_progress':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'canceled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  getProblemTypeDisplay(problemType: ServiceRequest['problemType']): string {
    const typeMap: Record<ServiceRequest['problemType'], string> = {
      'raccoon': 'Raccoon',
      'mice': 'Mice/Rats', 
      'bats': 'Bats',
      'squirrels': 'Squirrels',
      'insects': 'Insects',
      'dead_animal': 'Dead Animal',
      'other': 'Other'
    };
    return typeMap[problemType] || problemType;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  formatAddress(address: ServiceRequest['address']): string {
    return `${address.street}${address.city ? ', ' + address.city : ''}${address.state ? ', ' + address.state : ''}`;
  }

  getStatusCount(status: ServiceRequest['status']): number {
    return this.serviceRequests.filter(request => request.status === status).length;
  }

  viewRequestDetails(request: ServiceRequest) {
    this.selectedRequest = request;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedRequest = null;
  }
}
