import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { delay, map, catchError, switchMap } from 'rxjs/operators';
import { User, UserCredentials } from '../models/user.model';
import { CryptoUtil } from '../utils/crypto.util';
import { SecureStorageService } from './secure-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly USER_STORAGE_KEY = 'currentUser';

  // Mock users database with hashed passwords
  // NOTE: In production, this would be stored server-side in a secure database
  // Demo passwords: 'DemoPassword123!' for both users
  private mockUsers: UserCredentials[] = [
    {
      id: 'user1',
      email: 'buyer@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'buyer',
      createdAt: new Date(),
      passwordHash: 'tOx9C+LVqH4Y8VZJGKvO8Jqj1KJgKQHqRXI5vZL7YMk=',
      passwordSalt: 'yMwPzHqN2VJ8WkQ5RlBjYw=='
    },
    {
      id: 'seller1',
      email: 'seller@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'seller',
      createdAt: new Date(),
      passwordHash: 'tOx9C+LVqH4Y8VZJGKvO8Jqj1KJgKQHqRXI5vZL7YMk=',
      passwordSalt: 'yMwPzHqN2VJ8WkQ5RlBjYw=='
    }
  ];

  constructor(private secureStorage: SecureStorageService) {
    // Check if user is already logged in
    this.loadCurrentUser();
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const user = await this.secureStorage.getItem<User>(this.USER_STORAGE_KEY);
      if (user) {
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      }
    } catch (error) {
      console.error('Error loading user from secure storage:', error);
      // Clear corrupted session
      this.secureStorage.removeItem(this.USER_STORAGE_KEY);
    }
  }

  login(email: string, password: string): Observable<{ success: boolean; message: string; user?: User }> {
    // Validate input
    if (!email || !password) {
      return of({
        success: false,
        message: 'Email and password are required'
      });
    }

    const userCredentials = this.mockUsers.find(u => u.email === email);

    if (!userCredentials) {
      // Simulate delay even on failure to prevent timing attacks
      return of({
        success: false,
        message: 'Invalid email or password'
      }).pipe(delay(1000));
    }

    // Verify password using secure hashing
    return from(
      CryptoUtil.verifyPassword(password, userCredentials.passwordHash, userCredentials.passwordSalt)
    ).pipe(
      delay(1000), // Simulate network delay
      switchMap(async (isValid) => {
        if (isValid) {
          // Remove password credentials before storing
          const user: User = {
            id: userCredentials.id,
            email: userCredentials.email,
            firstName: userCredentials.firstName,
            lastName: userCredentials.lastName,
            role: userCredentials.role,
            phone: userCredentials.phone,
            address: userCredentials.address,
            createdAt: userCredentials.createdAt
          };

          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);

          // Store user data encrypted
          await this.secureStorage.setItem(this.USER_STORAGE_KEY, user);

          return {
            success: true,
            message: 'Login successful',
            user
          };
        } else {
          return {
            success: false,
            message: 'Invalid email or password'
          };
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return of({
          success: false,
          message: 'An error occurred during login. Please try again.'
        });
      })
    );
  }

  register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'buyer' | 'seller';
  }): Observable<{ success: boolean; message: string; user?: User }> {
    // Check if user already exists
    const existingUser = this.mockUsers.find(u => u.email === userData.email);

    if (existingUser) {
      return of({
        success: false,
        message: 'User with this email already exists'
      }).pipe(delay(1000));
    }

    // Hash the password
    return from(CryptoUtil.hashPassword(userData.password)).pipe(
      delay(1000), // Simulate network delay
      switchMap(async ({ hash, salt }) => {
        const newUserCredentials: UserCredentials = {
          id: 'user' + (this.mockUsers.length + 1),
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          createdAt: new Date(),
          passwordHash: hash,
          passwordSalt: salt
        };

        this.mockUsers.push(newUserCredentials);

        // Remove password credentials before storing
        const newUser: User = {
          id: newUserCredentials.id,
          email: newUserCredentials.email,
          firstName: newUserCredentials.firstName,
          lastName: newUserCredentials.lastName,
          role: newUserCredentials.role,
          phone: newUserCredentials.phone,
          address: newUserCredentials.address,
          createdAt: newUserCredentials.createdAt
        };

        this.currentUserSubject.next(newUser);
        this.isAuthenticatedSubject.next(true);

        // Store user data encrypted
        await this.secureStorage.setItem(this.USER_STORAGE_KEY, newUser);

        return {
          success: true,
          message: 'Registration successful',
          user: newUser
        };
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return of({
          success: false,
          message: 'An error occurred during registration. Please try again.'
        });
      })
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.secureStorage.removeItem(this.USER_STORAGE_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  isSeller(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'seller' || user?.role === 'admin';
  }

  isBuyer(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'buyer' || user?.role === 'admin';
  }
}
