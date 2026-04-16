import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getBearerToken();

  if (!token || !req.url.startsWith('/api/')) {
    return next(req);
  }

  return next(
      req.clone({
        setHeaders: {
          Authorization: token
        }
      })
  );
};
