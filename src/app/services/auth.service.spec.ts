import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { SecureStorageService } from './secure-storage.service';
import { User } from '../models/user.model';
import { firstValueFrom } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let secureStorageService: jasmine.SpyObj<SecureStorageService>;

  beforeEach(() => {
    // Create spy object for SecureStorageService
    const secureStorageSpy = jasmine.createSpyObj('SecureStorageService', [
      'setItem',
      'getItem',
      'removeItem'
    ]);
    secureStorageSpy.getItem.and.returnValue(null); // Default: no stored user

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: SecureStorageService, useValue: secureStorageSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    secureStorageService = TestBed.inject(SecureStorageService) as jasmine.SpyObj<SecureStorageService>;

    // Handle the initial checkAuthStatus call made in constructor
    // This will fail, putting the service in demo mode
    const req = httpMock.expectOne((request) => request.url.includes('/auth/me'));
    req.flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should have no current user initially', (done) => {
      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });

    it('should not be authenticated initially', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('Login', () => {
    it('should successfully login with correct buyer credentials', async () => {
      const result = await firstValueFrom(
        service.login('buyer@example.com', 'DemoPassword123!')
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('buyer@example.com');
      expect(result.user?.role).toBe('buyer');
    });

    it('should successfully login with correct seller credentials', async () => {
      const result = await firstValueFrom(
        service.login('seller@example.com', 'DemoPassword123!')
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('seller@example.com');
      expect(result.user?.role).toBe('seller');
    });

    it('should fail login with incorrect password', async () => {
      const result = await firstValueFrom(
        service.login('buyer@example.com', 'WrongPassword123!')
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
      expect(result.user).toBeUndefined();
    });

    it('should fail login with non-existent email', async () => {
      const result = await firstValueFrom(
        service.login('nonexistent@example.com', 'DemoPassword123!')
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should fail login with empty credentials', async () => {
      const result = await firstValueFrom(
        service.login('', '')
      );

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should update currentUser$ observable on successful login', async () => {
      await firstValueFrom(service.login('buyer@example.com', 'DemoPassword123!'));

      const currentUser = service.getCurrentUser();

      expect(currentUser).toBeDefined();
      expect(currentUser?.email).toBe('buyer@example.com');
    });

    it('should call secureStorage.setItem on successful login', async () => {
      await firstValueFrom(service.login('buyer@example.com', 'DemoPassword123!'));

      expect(secureStorageService.setItem).toHaveBeenCalledWith(
        'currentUser',
        jasmine.any(Object)
      );
    });
  });

  describe('Logout', () => {
    beforeEach(async () => {
      // Login first
      await firstValueFrom(service.login('buyer@example.com', 'DemoPassword123!'));
    });

    it('should clear current user', () => {
      service.logout();

      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should call secureStorage.removeItem', () => {
      service.logout();

      expect(secureStorageService.removeItem).toHaveBeenCalledWith('currentUser');
    });

    it('should set isAuthenticated to false', () => {
      service.logout();

      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('Registration', () => {
    it('should register a new buyer successfully', async () => {
      const newUser = {
        email: 'newbuyer@example.com',
        password: 'MySecure!Pass2024',
        firstName: 'New',
        lastName: 'Buyer',
        role: 'buyer' as const
      };

      const result = await firstValueFrom(service.register(newUser));

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe(newUser.email);
      expect(result.user?.role).toBe('buyer');
    });

    it('should register a new seller successfully', async () => {
      const newUser = {
        email: 'newseller@example.com',
        password: 'MySecure!Pass2024',
        firstName: 'New',
        lastName: 'Seller',
        role: 'seller' as const
      };

      const result = await firstValueFrom(service.register(newUser));

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('seller');
    });

    it('should fail registration with existing email', async () => {
      const existingUser = {
        email: 'buyer@example.com',
        password: 'MySecure!Pass2024',
        firstName: 'Test',
        lastName: 'User',
        role: 'buyer' as const
      };

      const result = await firstValueFrom(service.register(existingUser));

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should fail registration with weak password', async () => {
      const weakPasswordUser = {
        email: 'newuser@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
        role: 'buyer' as const
      };

      const result = await firstValueFrom(service.register(weakPasswordUser));

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should fail registration with invalid email', async () => {
      const invalidEmailUser = {
        email: 'invalid-email',
        password: 'MySecure!Pass2024',
        firstName: 'Test',
        lastName: 'User',
        role: 'buyer' as const
      };

      const result = await firstValueFrom(service.register(invalidEmailUser));

      expect(result.success).toBe(false);
      expect(result.message).toContain('email');
    });

    it('should automatically login after successful registration', async () => {
      const newUser = {
        email: 'autoLogin@example.com',
        password: 'MySecure!Pass2024',
        firstName: 'Auto',
        lastName: 'Login',
        role: 'buyer' as const
      };

      await firstValueFrom(service.register(newUser));

      const currentUser = service.getCurrentUser();

      expect(currentUser).toBeDefined();
      expect(currentUser?.email).toBe(newUser.email);
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when not logged in', () => {
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should return current user when logged in', async () => {
      await firstValueFrom(service.login('buyer@example.com', 'DemoPassword123!'));

      const currentUser = service.getCurrentUser();
      expect(currentUser).toBeDefined();
      expect(currentUser?.email).toBe('buyer@example.com');
    });
  });

  describe('Role Checking', () => {
    it('should correctly identify buyer role', async () => {
      await firstValueFrom(service.login('buyer@example.com', 'DemoPassword123!'));

      const currentUser = service.getCurrentUser();
      expect(currentUser?.role).toBe('buyer');
    });

    it('should correctly identify seller role', async () => {
      await firstValueFrom(service.login('seller@example.com', 'DemoPassword123!'));

      const currentUser = service.getCurrentUser();
      expect(currentUser?.role).toBe('seller');
    });
  });
});
