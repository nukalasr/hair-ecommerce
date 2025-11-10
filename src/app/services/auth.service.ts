import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

/**
 * SECURE Authentication Service using httpOnly cookies
 *
 * Security improvements:
 * 1. NO localStorage usage - uses httpOnly cookies only
 * 2. withCredentials: true on all requests
 * 3. Token never exposed to JavaScript
 * 4. XSS-proof authentication
 */

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Store only user info (not token) - token is in httpOnly cookie
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if user is authenticated on app load
    this.checkAuthStatus();
  }

  /**
   * Check authentication status by calling /me endpoint
   * This relies on httpOnly cookie being sent automatically
   */
  private checkAuthStatus(): void {
    this.http.get<any>(
      `${environment.apiUrl}/auth/me`,
      { withCredentials: true }  // Send httpOnly cookie
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentUserSubject.next(response.data);
          this.isAuthenticatedSubject.next(true);
        }
      },
      error: () => {
        // Not authenticated or session expired
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
      }
    });
  }

  /**
   * Login user
   * Receives httpOnly cookie in response (automatic)
   */
  login(email: string, password: string): Observable<{ success: boolean; message: string; user?: User }> {
    return this.http.post<any>(
      `${environment.apiUrl}/auth/login`,
      { email, password },
      { withCredentials: true }  // Receive and send httpOnly cookies
    ).pipe(
      tap(response => {
        if (response.success && response.user) {
          // Store only user info (NOT token - it's in httpOnly cookie)
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError(error => {
        const message = error.error?.message || 'Login failed';
        return throwError(() => ({
          success: false,
          message
        }));
      })
    );
  }

  /**
   * Register new user
   * Receives httpOnly cookie in response (automatic)
   */
  register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/auth/register`,
      userData,
      { withCredentials: true }  // Receive and send httpOnly cookies
    ).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError(error => {
        const message = error.error?.message || 'Registration failed';
        return throwError(() => ({
          success: false,
          message
        }));
      })
    );
  }

  /**
   * Logout user
   * Clears httpOnly cookie on server
   */
  logout(): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/auth/logout`,
      {},
      { withCredentials: true }  // Send httpOnly cookie to clear it
    ).pipe(
      tap(() => {
        // Clear user state
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
      }),
      catchError(error => {
        // Even if server request fails, clear local state
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update user details
   */
  updateDetails(details: Partial<User>): Observable<any> {
    return this.http.put<any>(
      `${environment.apiUrl}/auth/updatedetails`,
      details,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.currentUserSubject.next(response.data);
        }
      })
    );
  }

  /**
   * Update password
   */
  updatePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put<any>(
      `${environment.apiUrl}/auth/updatepassword`,
      { currentPassword, newPassword },
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current user role
   */
  getUserRole(): 'buyer' | 'seller' | 'admin' | null {
    return this.currentUserSubject.value?.role || null;
  }

  /**
   * Check if current user is a seller
   */
  isSeller(): boolean {
    return this.currentUserSubject.value?.role === 'seller';
  }

  /**
   * Check if current user is a buyer
   */
  isBuyer(): boolean {
    return this.currentUserSubject.value?.role === 'buyer';
  }

  /**
   * Check if current user is an admin
   */
  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }
}
