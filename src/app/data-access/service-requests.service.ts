import { Injectable, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { Observable } from 'rxjs';

export interface ServiceRequest {
  id?: string;
  customerId?: string;
  customerName: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    geo?: { lat: number; lng: number };
  };
  problemType: 'raccoon' | 'mice' | 'bats' | 'squirrels' | 'insects' | 'dead_animal' | 'other';
  description: string;
  photos?: string[]; // Storage paths
  status: 'new' | 'scheduled' | 'in_progress' | 'completed' | 'canceled';
  emergency: boolean;
  preferredTimes?: Date[];
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceRequestsService {
  private firestoreService = inject(FirestoreService);
  private collectionName = 'serviceRequests';

  // Create new service request (public - no auth required)
  async createServiceRequest(request: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
    const newRequest: Partial<ServiceRequest> = {
      ...request,
      status: 'new',
      emergency: request.emergency || false
    };
    
    return await this.firestoreService.addDocument(this.collectionName, newRequest);
  }

  // Get all service requests (admin only)
  getAllServiceRequests(): Observable<ServiceRequest[]> {
    return this.firestoreService.getCollectionObservable(this.collectionName);
  }

  // Get service requests by status
  getServiceRequestsByStatus(status: ServiceRequest['status']): Observable<ServiceRequest[]> {
    return this.firestoreService.getCollectionQuery(
      this.collectionName,
      [{ field: 'status', operator: '==', value: status }],
      'createdAt',
      'desc'
    );
  }

  // Get emergency requests
  getEmergencyRequests(): Observable<ServiceRequest[]> {
    return this.firestoreService.getCollectionQuery(
      this.collectionName,
      [
        { field: 'emergency', operator: '==', value: true },
        { field: 'status', operator: '!=', value: 'completed' }
      ],
      'createdAt',
      'desc'
    );
  }

  // Update service request status
  async updateServiceRequestStatus(requestId: string, status: ServiceRequest['status']) {
    return await this.firestoreService.updateDocument(this.collectionName, requestId, { status });
  }

  // Get service request by ID
  getServiceRequest(requestId: string): Observable<ServiceRequest> {
    return this.firestoreService.getDocumentObservable(this.collectionName, requestId);
  }

  // Update service request
  async updateServiceRequest(requestId: string, updates: Partial<ServiceRequest>) {
    return await this.firestoreService.updateDocument(this.collectionName, requestId, updates);
  }
}