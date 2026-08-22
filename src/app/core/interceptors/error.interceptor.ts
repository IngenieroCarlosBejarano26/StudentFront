import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLogin = req.url.includes('/Auth/Login');

      if (error.status === 401 && !isLogin) {
        auth.logout();
      }

      if (error.status === 403 && !isLogin) {
        void router.navigateByUrl('/forbidden');
      }

      return throwError(() => error);
    })
  );
};
