import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../data-access/auth.service';
import { map, take } from 'rxjs/operators';

// Guard for pages that should only be accessible by guests (not logged in users)
// Like login/signup pages
export const GuestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    map(user => {
      if (!user) {
        // User is not authenticated, allow access to guest pages
        return true;
      } else {
        // User is already authenticated, redirect to account
        router.navigate(['/account']);
        return false;
      }
    })
  );
};