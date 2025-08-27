import { Injectable, inject } from '@angular/core';
import { Auth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, sendEmailVerification } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { authState } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  
  // Observable of current user
  user$: Observable<User | null> = authState(this.auth);

  // Sign up with email and password
  async signUp(email: string, password: string, displayName: string) {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Update user profile with display name
      if (credential.user) {
        await updateProfile(credential.user, { displayName });
        await sendEmailVerification(credential.user);
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
}