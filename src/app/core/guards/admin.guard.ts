import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../data-access/auth.service';
import { map, take, switchMap } from 'rxjs/operators';
import { from, of } from 'rxjs';

export const AdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    switchMap(user => {
      if (!user) {
        // Not authenticated at all
        router.navigate(['/login']);
        return of(false);
      }

      // Check for admin custom claim
      return from(user.getIdTokenResult()).pipe(
        map(idTokenResult => {
          const isAdmin = !!idTokenResult.claims?.['admin'];
          
          if (isAdmin) {
            return true;
          } else {
            // User is authenticated but not admin
            router.navigate(['/account']); // Redirect to account page
            return false;
          }
        })
      );
    })
  );
};