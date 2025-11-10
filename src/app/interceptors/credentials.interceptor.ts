import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * HTTP Interceptor for httpOnly Cookie Authentication
 *
 * This interceptor automatically adds `withCredentials: true` to all API requests,
 * ensuring that httpOnly cookies are sent with every request to the backend.
 *
 * Security benefits:
 * - JWT tokens stored in httpOnly cookies (not accessible to JavaScript)
 * - Automatic cookie transmission (no manual header management)
 * - XSS-proof authentication
 *
 * Usage:
 * Add to app.config.ts:
 *   provideHttpClient(withInterceptors([credentialsInterceptor]))
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  // Only add credentials for API requests to our backend
  if (req.url.startsWith(environment.apiUrl) || req.url.includes('/api/')) {
    // Clone request and add withCredentials
    const clonedRequest = req.clone({
      withCredentials: true  // Send httpOnly cookies with request
    });

    return next(clonedRequest);
  }

  // For non-API requests (external URLs), don't send credentials
  return next(req);
};
