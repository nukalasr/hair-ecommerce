import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  const requiredRole = route.data['role'] as 'buyer' | 'seller' | 'admin';

  if (!user) {
    router.navigate(['/auth/login']);
    return false;
  }

  // Admin has access to everything
  if (user.role === 'admin') {
    return true;
  }

  // Check specific role
  if (requiredRole === 'seller' && authService.isSeller()) {
    return true;
  }

  if (requiredRole === 'buyer' && authService.isBuyer()) {
    return true;
  }

  // Access denied - redirect to home
  router.navigate(['/']);
  return false;
};
