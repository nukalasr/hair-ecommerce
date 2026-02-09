import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError, delay } from 'rxjs/operators';
import { User, UserCredentials } from '../models/user.model';
import { environment } from '../../environments/environment';
import { SecureStorageService } from './secure-storage.service';
import { CryptoUtil } from '../utils/crypto.util';
import { ValidationUtil } from '../utils/validation.util';

/**
 * Authentication Service with Dual Mode Support
 *
 * Modes:
 * 1. Demo Mode: Uses in-memory data for testing/demo (when backend not available)
 * 2. API Mode: Uses backend API with httpOnly cookies (production)
 *
 * Security features:
 * - PBKDF2 password hashing (demo mode)
 * - httpOnly cookies (API mode)
 * - Encrypted localStorage via SecureStorageService
 * - Input validation
 */

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Store only user info (not token in API mode - token is in httpOnly cookie)
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Demo mode users (with hashed passwords)
  private demoUsers: UserCredentials[] = [];
  private demoMode = true; // Will switch to false if backend is available
  private initPromise: Promise<void>;

  constructor(
    private http: HttpClient,
    private secureStorage: SecureStorageService
  ) {
    this.initPromise = this.initializeDemoUsers();
    this.checkAuthStatus();
  }

  /**
   * Initialize demo users with hashed passwords
   */
  private async initializeDemoUsers(): Promise<void> {
    // Create demo users with hashed passwords
    const buyerCreds = await CryptoUtil.hashPassword('DemoPassword123!');
    const sellerCreds = await CryptoUtil.hashPassword('DemoPassword123!');

    this.demoUsers = [
      {
        id: '1',
        email: 'buyer@example.com',
        passwordHash: buyerCreds.hash,
        passwordSalt: buyerCreds.salt,
        firstName: 'Demo',
        lastName: 'Buyer',
        role: 'buyer' as const,
        createdAt: new Date()
      },
      {
        id: '2',
        email: 'seller@example.com',
        passwordHash: sellerCreds.hash,
        passwordSalt: sellerCreds.salt,
        firstName: 'Demo',
        lastName: 'Seller',
        role: 'seller' as const,
        createdAt: new Date()
      }
    ];
  }

  /**
   * Check authentication status
   * First tries API mode, falls back to demo mode
   */
  private checkAuthStatus(): void {
    // Try to check with backend first
    this.http.get<any>(
      `${environment.apiUrl}/auth/me`,
      { withCredentials: true }
    ).subscribe({
      next: (response) => {
        // Backend is available - use API mode
        this.demoMode = false;
        if (response.success && response.data) {
          this.currentUserSubject.next(response.data);
          this.isAuthenticatedSubject.next(true);
        }
      },
      error: () => {
        // Backend not available - use demo mode
        this.demoMode = true;
        this.checkDemoAuthStatus();
      }
    });
  }

  /**
   * Check demo mode auth status from secure storage
   */
  private async checkDemoAuthStatus(): Promise<void> {
    const storedUser = await this.secureStorage.getItem<User>('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(storedUser);
      this.isAuthenticatedSubject.next(true);
    }
  }

  /**
   * Login user (works in both demo and API mode)
   */
  login(email: string, password: string): Observable<{ success: boolean; message: string; user?: User }> {
    // Validate inputs
    if (!email || !password) {
      return of({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!ValidationUtil.isValidEmail(email)) {
      return of({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (this.demoMode) {
      return this.loginDemo(email, password);
    } else {
      return this.loginAPI(email, password);
    }
  }

  /**
   * Demo mode login
   */
  private loginDemo(email: string, password: string): Observable<{ success: boolean; message: string; user?: User }> {
    return new Observable<{ success: boolean; message: string; user?: User }>(observer => {
      // Wait for initialization to complete
      this.initPromise.then(() => {
        // Find user
        const demoUser = this.demoUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!demoUser) {
        observer.next({
          success: false,
          message: 'Invalid email or password'
        });
        observer.complete();
        return;
      }

        // Verify password
        CryptoUtil.verifyPassword(password, demoUser.passwordHash, demoUser.passwordSalt).then((isValid: boolean) => {
          if (isValid) {
            const user: User = {
              id: demoUser.id,
              email: demoUser.email,
              firstName: demoUser.firstName,
              lastName: demoUser.lastName,
              role: demoUser.role,
              createdAt: demoUser.createdAt
            };

            // Store user (async, but we don't block on it)
            this.secureStorage.setItem('currentUser', user).catch(err =>
              console.error('Failed to store user:', err)
            );
            this.currentUserSubject.next(user);
            this.isAuthenticatedSubject.next(true);

            observer.next({
              success: true,
              message: 'Login successful',
              user
            });
          } else {
            observer.next({
              success: false,
              message: 'Invalid email or password'
            });
          }
          observer.complete();
        });
      }); // Close initPromise.then()
    }).pipe(delay(100)); // Small delay to simulate network
  }

  /**
   * API mode login
   */
  private loginAPI(email: string, password: string): Observable<{ success: boolean; message: string; user?: User }> {
    return this.http.post<any>(
      `${environment.apiUrl}/auth/login`,
      { email, password },
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError(error => {
        const message = error.error?.message || 'Login failed';
        return of({
          success: false,
          message
        });
      })
    );
  }

  /**
   * Register new user (works in both demo and API mode)
   */
  register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: 'buyer' | 'seller';
  }): Observable<any> {
    // Validate inputs
    if (!ValidationUtil.isValidEmail(userData.email)) {
      return of({
        success: false,
        message: 'Invalid email format'
      });
    }

    const passwordCheck = ValidationUtil.isStrongPassword(userData.password);
    if (!passwordCheck.valid) {
      return of({
        success: false,
        message: passwordCheck.message
      });
    }

    if (this.demoMode) {
      return this.registerDemo(userData);
    } else {
      return this.registerAPI(userData);
    }
  }

  /**
   * Demo mode registration
   */
  private registerDemo(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: 'buyer' | 'seller';
  }): Observable<any> {
    return new Observable<{ success: boolean; message: string; user?: User }>(observer => {
      // Wait for initialization to complete
      this.initPromise.then(() => {
        // Check if email already exists
        const existingUser = this.demoUsers.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
      if (existingUser) {
        observer.next({
          success: false,
          message: 'Email already exists'
        });
        observer.complete();
        return;
      }

        // Hash password and create user
        CryptoUtil.hashPassword(userData.password).then((credentials: { hash: string; salt: string }) => {
          const newDemoUser: UserCredentials = {
            id: ValidationUtil.generateSecureId('user'),
            email: userData.email,
            passwordHash: credentials.hash,
            passwordSalt: credentials.salt,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role || 'buyer',
            createdAt: new Date()
          };

          this.demoUsers.push(newDemoUser);

          const user: User = {
            id: newDemoUser.id,
            email: newDemoUser.email,
            firstName: newDemoUser.firstName,
            lastName: newDemoUser.lastName,
            role: newDemoUser.role,
            createdAt: newDemoUser.createdAt
          };

          // Auto-login after registration (async, but we don't block on it)
          this.secureStorage.setItem('currentUser', user).catch(err =>
            console.error('Failed to store user:', err)
          );
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);

          observer.next({
            success: true,
            message: 'Registration successful',
            user
          });
          observer.complete();
        });
      }); // Close initPromise.then()
    }).pipe(delay(100)); // Small delay to simulate network
  }

  /**
   * API mode registration
   */
  private registerAPI(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/auth/register`,
      userData,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError(error => {
        const message = error.error?.message || 'Registration failed';
        return of({
          success: false,
          message
        });
      })
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<any> | void {
    if (this.demoMode) {
      // Demo mode logout
      this.secureStorage.removeItem('currentUser');
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      return of({ success: true });
    } else {
      // API mode logout
      return this.http.post<any>(
        `${environment.apiUrl}/auth/logout`,
        {},
        { withCredentials: true }
      ).pipe(
        tap(() => {
          this.currentUserSubject.next(null);
          this.isAuthenticatedSubject.next(false);
        }),
        catchError(error => {
          // Even if server request fails, clear local state
          this.currentUserSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          return of({ success: true });
        })
      );
    }
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
