import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  auth.clearSession();
  return router.createUrlTree(['/login']);
};

export const authChildGuard: CanActivateChildFn = (route, state) => authGuard(route, state);

export const authMatchGuard: CanMatchFn = () => inject(AuthService).isAuthenticated();

export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return router.createUrlTree([auth.homePath()]);
};
