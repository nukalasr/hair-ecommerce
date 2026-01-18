import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retry, throwError, timer } from 'rxjs';

/**
 * Global HTTP Error Interceptor
 *
 * Handles all HTTP errors consistently across the application:
 * - Retry failed requests (except client errors)
 * - Redirect to login on 401 Unauthorized
 * - Log errors for debugging
 * - Provide user-friendly error messages
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    // Retry strategy with exponential backoff
    retry({
      count: 2,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Don't retry client errors (4xx) - they won't succeed on retry
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Don't retry if it's a network error with no status
        if (error.status === 0 && !navigator.onLine) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying request (attempt ${retryCount + 1}/2) in ${delayMs}ms...`);
        return timer(delayMs);
      }
    }),

    // Catch and handle errors
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        errorMessage = `Network error: ${error.error.message}`;
        console.error('Client-side error:', error.error);
      } else {
        // Backend returned an unsuccessful response code
        console.error(
          `Backend returned code ${error.status}, ` +
          `body was: ${JSON.stringify(error.error)}`
        );

        // Handle specific HTTP error codes
        switch (error.status) {
          case 0:
            // Network error - server unreachable
            if (!navigator.onLine) {
              errorMessage = 'No internet connection. Please check your network.';
            } else {
              errorMessage = 'Unable to reach the server. Please try again later.';
            }
            break;

          case 401:
            // Unauthorized - redirect to login
            errorMessage = 'Your session has expired. Please login again.';
            console.warn('401 Unauthorized - Redirecting to login');

            // Save current URL for redirect after login
            const returnUrl = router.url;
            router.navigate(['/auth/login'], {
              queryParams: { returnUrl: returnUrl }
            });
            break;

          case 403:
            // Forbidden - insufficient permissions
            errorMessage = 'You do not have permission to access this resource.';
            console.warn('403 Forbidden:', req.url);
            break;

          case 404:
            // Not Found
            errorMessage = 'The requested resource was not found.';
            break;

          case 409:
            // Conflict (e.g., duplicate email during registration)
            errorMessage = error.error?.message || 'A conflict occurred. Please check your input.';
            break;

          case 422:
            // Unprocessable Entity (validation error)
            errorMessage = error.error?.message || 'Invalid data provided.';
            break;

          case 429:
            // Too Many Requests (rate limit exceeded)
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            break;

          case 500:
          case 502:
          case 503:
          case 504:
            // Server errors
            errorMessage = 'A server error occurred. Our team has been notified.';
            break;

          default:
            // Use error message from backend if available
            errorMessage = error.error?.message || error.message || errorMessage;
        }
      }

      // Log for debugging
      console.error('HTTP Error:', {
        url: req.url,
        method: req.method,
        status: error.status,
        message: errorMessage,
        error: error
      });

      // Return error observable with formatted message
      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        originalError: error
      }));
    })
  );
};
