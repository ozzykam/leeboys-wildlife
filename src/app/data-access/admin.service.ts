import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { FirestoreService } from './firestore.service';
import { UserProfile } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private functions = inject(Functions);
  private firestoreService = inject(FirestoreService);

  // Get all users (admin only)
  getAllUsers(): Observable<UserProfile[]> {
    return this.firestoreService.getCollectionObservable('users');
  }

  // Set admin claim via Cloud Function
  async setAdminClaim(uid: string, isAdmin: boolean): Promise<any> {
    const setAdminClaimFunction = httpsCallable(this.functions, 'setAdminClaim');
    try {
      const result = await setAdminClaimFunction({ uid, isAdmin });
      return result.data;
    } catch (error) {
      console.error('Error setting admin claim:', error);
      throw error;
    }
  }

  // Initialize first admin (one-time use)
  async initializeFirstAdmin(email: string): Promise<any> {
    const initializeFirstAdminFunction = httpsCallable(this.functions, 'initializeFirstAdmin');
    try {
      const result = await initializeFirstAdminFunction({ email });
      return result.data;
    } catch (error) {
      console.error('Error initializing first admin:', error);
      throw error;
    }
  }

  // Get users by role
  getUsersByRole(role: 'user' | 'admin'): Observable<UserProfile[]> {
    return this.firestoreService.getCollectionQuery(
      'users',
      [{ field: 'role', operator: '==', value: role }],
      'createdAt',
      'desc'
    );
  }
}