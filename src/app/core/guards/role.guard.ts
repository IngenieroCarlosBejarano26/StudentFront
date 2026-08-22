import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Route, Router, UrlSegment } from '@angular/router';
import { AuthService } from '../services/auth.service';

function readRoles(data: Record<string, unknown> | undefined): string[] {
  const roles = data?.['roles'];
  return Array.isArray(roles) ? roles : [];
}

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = readRoles(route.data);

  if (!auth.isAuthenticated()) {
    auth.clearSession();
    return router.createUrlTree(['/login']);
  }

  if (roles.length === 0 || auth.hasAnyRole(roles)) {
    return true;
  }

  return router.createUrlTree(['/forbidden']);
};

export const roleMatchGuard: CanMatchFn = (route: Route, _segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const roles = readRoles(route.data);
  return auth.isAuthenticated() && (roles.length === 0 || auth.hasAnyRole(roles));
};
