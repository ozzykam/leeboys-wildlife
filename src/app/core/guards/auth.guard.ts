import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../data-access/auth.service';
import { map, take, tap } from 'rxjs/operators';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    tap(user => {
      if (!user) {
        // User is not authenticated, redirect to login
        router.navigate(['/login'], { 
          queryParams: { returnUrl: state.url },
          replaceUrl: true // Replace current history entry to prevent back navigation issues
        });
      }
    }),
    map(user => !!user)
  );
};