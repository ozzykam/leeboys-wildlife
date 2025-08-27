import { Injectable, inject } from '@angular/core';
import { Auth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, sendEmailVerification } from '@angular/fire/auth';
import { Observable, from } from 'rxjs';
import { authState } from '@angular/fire/auth';
import { map, switchMap } from 'rxjs/operators';
import { FirestoreService } from './firestore.service';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestoreService = inject(FirestoreService);
  
  // Observable of current user
  user$: Observable<User | null> = authState(this.auth);
  
  // Observable to check if current user is admin
  isAdmin$: Observable<boolean> = this.user$.pipe(
    switchMap(user => {
      if (!user) return from([false]);
      return from(user.getIdTokenResult()).pipe(
        map(idTokenResult => !!idTokenResult.claims?.['admin'])
      );
    })
  );

  // Sign up with email and password
  async signUp(email: string, password: string, displayName: string) {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Update user profile with display name
      if (credential.user) {
        await updateProfile(credential.user, { displayName });
        await sendEmailVerification(credential.user);
        
        // Create user profile in Firestore
        const userProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
          uid: credential.user.uid,
          email: email,
          displayName: displayName,
          role: 'user' // Default role
        };
        
        await this.firestoreService.setDocument('users', credential.user.uid, userProfile);
      }
      
      return credential;
    } catch (error) {
      throw error;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      return await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error) {
      throw error;
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOut(this.auth);
    } catch (error) {
      throw error;
    }
  }

  // Get current user
  get currentUser() {
    return this.auth.currentUser;
  }

  // Check if user is authenticated
  get isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }

  // Get user profile from Firestore
  getUserProfile(uid: string): Observable<UserProfile> {
    return this.firestoreService.getDocumentObservable('users', uid);
  }

  // Check if current user is admin (sync method)
  async isCurrentUserAdmin(): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) return false;
    
    try {
      const idTokenResult = await user.getIdTokenResult();
      return !!idTokenResult.claims?.['admin'];
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Update user role (admin only - this should be done through Cloud Functions)
  async updateUserRole(uid: string, role: 'user' | 'admin'): Promise<void> {
    // This method updates the Firestore document
    // The actual Firebase custom claim should be set via Cloud Functions
    await this.firestoreService.updateDocument('users', uid, { role });
  }
}