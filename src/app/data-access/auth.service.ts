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
  billingAccountId?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingUserAccount {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date;
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    zipCode: string;
  };
}

export interface PendingAccountData extends PendingUserAccount {
  billingAccountNumber: string;
  status: 'pending' | 'activated';
  createdAt: Date;
  createdBy: string; // Admin uid who created the account
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

  // Generate billing account ID
  private generateBillingAccountId(displayName: string, phone: string, createdAt: Date): string {
    // Get last name (up to 4 characters)
    const nameParts = displayName.trim().split(' ');
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
    const lastNamePrefix = lastName.substring(0, 4).toUpperCase();
    
    // Get last 4 digits of phone number
    const phoneDigits = phone.replace(/\D/g, ''); // Remove non-digits
    const phoneSuffix = phoneDigits.slice(-4);
    
    // Format creation date/time as YYYYMMDD-HHMM
    const dateFormatted = createdAt.toISOString().replace(/[-:.]/g, '').substring(0, 8);
    const timeFormatted = createdAt.toISOString().substring(11, 16).replace(':', '');
    
    return `${lastNamePrefix}-${phoneSuffix}-${dateFormatted}-${timeFormatted}`;
  }

  // Update user profile with billing info
  async updateUserBillingInfo(uid: string, phone: string, address: UserProfile['address']): Promise<void> {
    const userDoc = await this.firestoreService.getDocument('users', uid);
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      
      // Generate billing account ID if it doesn't exist
      let billingAccountId = userData.billingAccountId;
      if (!billingAccountId && phone) {
        billingAccountId = this.generateBillingAccountId(userData.displayName, phone, userData.createdAt);
      }
      
      await this.firestoreService.updateDocument('users', uid, {
        phone,
        address,
        billingAccountId,
        updatedAt: new Date()
      });
    }
  }

  // Get all users for admin dropdown
  getAllUsers(): Observable<UserProfile[]> {
    return this.firestoreService.getCollectionObservable('users');
  }

  // Create a pending user account (admin-only, no password)
  async createPendingUserAccount(userData: PendingUserAccount): Promise<string> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    // Check if admin
    const idTokenResult = await currentUser.getIdTokenResult();
    if (!idTokenResult.claims?.['admin']) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Generate billing account number
    const billingAccountNumber = this.generateBillingAccountNumber(
      userData.firstName, 
      userData.lastName, 
      userData.phoneNumber
    );

    // Create pending account document
    const pendingAccountData: PendingAccountData = {
      ...userData,
      billingAccountNumber,
      status: 'pending',
      createdAt: new Date(),
      createdBy: currentUser.uid
    };

    await this.firestoreService.setDocument('pendingAccounts', billingAccountNumber, pendingAccountData);

    // TODO: Send activation email to customer
    console.log(`Account created with billing number: ${billingAccountNumber}`);
    console.log('Activation email would be sent to:', userData.email);

    return billingAccountNumber;
  }

  // Find pending account by billing number only
  async findPendingAccount(billingAccountNumber: string): Promise<PendingAccountData | null> {
    try {
      const pendingDoc = await this.firestoreService.getDocument('pendingAccounts', billingAccountNumber);
      
      if (!pendingDoc.exists()) {
        return null;
      }

      const pendingData = pendingDoc.data() as PendingAccountData;
      
      // Only return if status is pending (not already activated)
      if (pendingData.status === 'pending') {
        return pendingData;
      }

      return null;
    } catch (error) {
      console.error('Error finding pending account:', error);
      return null;
    }
  }

  // Verify pending account with billing number and DOB (keeping for backward compatibility)
  async verifyPendingAccount(billingAccountNumber: string, dateOfBirth: Date): Promise<PendingAccountData | null> {
    try {
      const pendingDoc = await this.firestoreService.getDocument('pendingAccounts', billingAccountNumber);
      
      if (!pendingDoc.exists()) {
        return null;
      }

      const pendingData = pendingDoc.data() as PendingAccountData;
      
      // Convert stored date for comparison
      const storedDOB = new Date(pendingData.dateOfBirth);
      const inputDOB = new Date(dateOfBirth);
      
      // Compare dates (ignoring time)
      if (storedDOB.toDateString() === inputDOB.toDateString() && pendingData.status === 'pending') {
        return pendingData;
      }

      return null;
    } catch (error) {
      console.error('Error verifying pending account:', error);
      return null;
    }
  }

  // Activate pending account with password
  async activatePendingAccount(billingAccountNumber: string, email: string, password: string, pendingData: PendingAccountData): Promise<void> {
    try {
      // Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Update user profile with display name
      await updateProfile(credential.user, {
        displayName: `${pendingData.firstName} ${pendingData.lastName}`
      });

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: credential.user.uid,
        email: email,
        displayName: `${pendingData.firstName} ${pendingData.lastName}`,
        role: 'user',
        billingAccountId: billingAccountNumber,
        phone: pendingData.phoneNumber,
        address: {
          street: pendingData.address.street,
          city: pendingData.address.city,
          state: '', // Will be updated in profile
          zipCode: pendingData.address.zipCode
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.firestoreService.setDocument('users', credential.user.uid, userProfile);

      // Mark pending account as activated
      await this.firestoreService.updateDocument('pendingAccounts', billingAccountNumber, {
        status: 'activated',
        activatedAt: new Date(),
        activatedUid: credential.user.uid
      });

      console.log('Account activated successfully for:', email);
    } catch (error) {
      console.error('Error activating account:', error);
      throw error;
    }
  }

  // Generate billing account number for pending accounts
  private generateBillingAccountNumber(firstName: string, lastName: string, phoneNumber: string): string {
    // Format: LASTNAME-FIRSTINITIAL-PHONE4-TIMESTAMP4
    const lastNamePrefix = lastName.substring(0, 4).toUpperCase().padEnd(4, 'X');
    const firstInitial = firstName.substring(0, 1).toUpperCase();
    
    // Get last 4 digits of phone number
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    const phoneSuffix = phoneDigits.slice(-4).padStart(4, '0');
    
    // Get timestamp suffix (last 4 digits of current timestamp)
    const timestamp = Date.now().toString();
    const timestampSuffix = timestamp.slice(-4);
    
    return `${lastNamePrefix}-${firstInitial}${phoneSuffix}-${timestampSuffix}`;
  }
}