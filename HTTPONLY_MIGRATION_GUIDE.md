# HttpOnly Cookie Migration Guide

**Purpose:** Migrate from localStorage JWT storage to httpOnly cookies for improved security

**Security Benefit:** Protects against XSS attacks by making tokens inaccessible to JavaScript

**Time Required:** ~30 minutes

---

## 🎯 What This Migration Achieves

### Before (Current - INSECURE)
```
User Login
    ↓
JWT stored in localStorage (encrypted)
    ↓
❌ Vulnerable to XSS attacks
❌ JavaScript can access token
❌ Malicious scripts can steal token
```

### After (Secure)
```
User Login
    ↓
JWT stored in httpOnly cookie
    ↓
✅ Protected from XSS attacks
✅ JavaScript CANNOT access token
✅ Automatically sent with requests
✅ Browser manages cookie lifecycle
```

---

## 📋 Migration Steps

### Step 1: Update Backend (5 minutes)

#### 1.1 Replace Auth Controller

**File:** `backend/controllers/authController.js`

**Replace with:** `backend/controllers/authController.SECURE.js`

```bash
cd backend/controllers
mv authController.js authController.OLD.js
mv authController.SECURE.js authController.js
```

**Key Changes:**
- ✅ Removed `token` from response body (line 219)
- ✅ Added `sameSite` attribute for CSRF protection
- ✅ Improved logout to properly clear cookies
- ✅ Explicit `path: '/'` attribute

**Verify Changes:**
```bash
# Check that sendTokenResponse doesn't include token in JSON
grep -A 10 "sendTokenResponse" backend/controllers/authController.js | grep -v "token:"
```

#### 1.2 Restart Backend

```bash
cd backend
npm run dev
```

---

### Step 2: Update Frontend (15 minutes)

#### 2.1 Add HTTP Interceptor

**File:** `src/app/app.config.ts`

**Add interceptor import:**
```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';
```

**Update providers:**
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([credentialsInterceptor])  // ✅ Add this
    )
  ]
};
```

#### 2.2 Replace Auth Service

**File:** `src/app/services/auth.service.ts`

**Replace with:** `src/app/services/auth.service.SECURE.ts`

```bash
cd src/app/services
mv auth.service.ts auth.service.OLD.ts
mv auth.service.SECURE.ts auth.service.ts
```

**Key Changes:**
- ✅ Removed all localStorage usage
- ✅ Added `withCredentials: true` to all HTTP calls
- ✅ Token never stored or accessed by JavaScript
- ✅ User info stored in memory only

#### 2.3 Update Environment Configuration

**File:** `src/environments/environment.ts`

**Ensure API URL is set:**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',  // Must match backend
  stripePublishableKey: 'pk_test_...',
  taxRate: 0.08,
  shippingCost: 10.00,
  freeShippingThreshold: 100.00
};
```

#### 2.4 Clear Existing localStorage (Important!)

Add this to your app initialization to clear old tokens:

**File:** `src/app/app.component.ts`

```typescript
export class AppComponent implements OnInit {
  ngOnInit(): void {
    // Clear old localStorage tokens on app start (one-time migration)
    if (localStorage.getItem('currentUser') || localStorage.getItem('token')) {
      console.warn('Migrating to httpOnly cookies - clearing old tokens');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      localStorage.removeItem('__device_key');
    }
  }
}
```

---

### Step 3: Update Other Services (10 minutes)

Any service making HTTP requests to the backend should work automatically with the interceptor, but verify:

#### 3.1 Product Service

**File:** `src/app/services/product.service.ts`

If making HTTP calls, ensure no manual token handling:

```typescript
// ❌ Remove if exists
headers: { 'Authorization': `Bearer ${token}` }

// ✅ No authorization header needed - cookie sent automatically
```

#### 3.2 Cart Service

If using HTTP:

```typescript
// ✅ Just make the HTTP call - credentials interceptor handles cookies
this.http.post(`${environment.apiUrl}/cart`, cartData)
  .subscribe(/* ... */);
```

#### 3.3 Order Service

Same pattern - remove manual auth headers if present.

---

### Step 4: Update Route Guards (5 minutes)

**File:** `src/app/guards/auth.guard.ts`

**Update to check authentication via service:**

```typescript
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if authenticated (relies on httpOnly cookie)
  if (authService.isAuthenticated()) {
    return true;
  }

  // Not authenticated - redirect to login
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
```

---

### Step 5: Test the Migration (10 minutes)

#### 5.1 Backend Test

```bash
# Start backend
cd backend
npm run dev
```

**Verify backend is running:**
```bash
curl http://localhost:3000/health
```

#### 5.2 Test Login

```bash
# Test login - should set httpOnly cookie
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@example.com","password":"DemoPassword123!"}' \
  -c cookies.txt \
  -v
```

**Look for in response headers:**
```
Set-Cookie: token=<jwt>; Path=/; HttpOnly; SameSite=Lax
```

**Verify NO token in response body:**
```json
{
  "success": true,
  "user": { ... }
  // NO "token" field here
}
```

#### 5.3 Test Authenticated Request

```bash
# Test /me endpoint with cookie
curl http://localhost:3000/api/auth/me \
  -b cookies.txt \
  -v
```

Should return user data.

#### 5.4 Frontend Test

```bash
# Start frontend
cd ..
npm start
```

Open browser to `http://localhost:4200`

**Test Flow:**
1. **Open DevTools** → Application → Cookies
2. **Login** with `buyer@example.com` / `DemoPassword123!`
3. **Check Cookies** - should see `token` cookie with:
   - ✅ HttpOnly: true
   - ✅ Secure: false (true in production)
   - ✅ SameSite: Lax (Strict in production)
4. **Check localStorage** - should be EMPTY (no token)
5. **Navigate** to protected routes - should work
6. **Logout** - cookie should be cleared

---

### Step 6: Verify Security (5 minutes)

#### 6.1 Check Cookie Attributes

**Browser DevTools → Application → Cookies → localhost**

Should see:
```
Name: token
Value: eyJhbGciOiJIUzI1NiIs... (JWT)
Domain: localhost
Path: /
HttpOnly: ✓
Secure: - (in dev, ✓ in production)
SameSite: Lax (Strict in production)
```

#### 6.2 Test XSS Protection

**Open Browser Console:**

```javascript
// Try to access cookie via JavaScript
document.cookie
// Should NOT include the token cookie (httpOnly protection)

// Try to access localStorage
localStorage.getItem('token')
// Should return null (no token stored)

// The token is INACCESSIBLE to JavaScript ✓
```

#### 6.3 Test Auto-Logout on Cookie Expiry

Cookies will expire after 7 days (configurable in `.env`).

To test:
1. Login
2. Manually delete cookie in DevTools
3. Try to access protected route
4. Should redirect to login (automatic)

---

## 🔍 Troubleshooting

### Issue: "401 Unauthorized" on all requests

**Cause:** Cookies not being sent

**Solutions:**
1. Check `withCredentials: true` in interceptor
2. Verify `credentials: true` in backend CORS config
3. Check `apiUrl` in environment.ts matches backend
4. Clear browser cache and cookies

### Issue: Cookie not visible in DevTools

**Cause:** Cookie might be set but httpOnly (as intended)

**Solution:**
- Check Network tab → Response Headers → Set-Cookie
- Should see: `Set-Cookie: token=...; HttpOnly`

### Issue: "CORS error" in browser console

**Cause:** Backend CORS not configured correctly

**Solution:**

**File:** `backend/server.js:40-45`

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,  // ← Must be true
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Issue: Cookie cleared on refresh

**Cause:** Cookie expiration too short

**Solution:**

**File:** `backend/.env`

```env
JWT_COOKIE_EXPIRE=7  # Days
```

### Issue: "Cookie not sent to different subdomain"

**Cause:** Domain attribute restriction

**Solution:**

Set cookie domain in production:

```javascript
const cookieOptions = {
  // ... other options
  domain: '.yourdomain.com'  // Include subdomain
};
```

---

## 📊 Verification Checklist

After migration, verify:

### Backend
- [ ] `authController.js` updated with secure version
- [ ] No `token` in login/register response bodies
- [ ] `sameSite` attribute set in cookie options
- [ ] Logout properly clears cookies
- [ ] Backend running and healthy

### Frontend
- [ ] `credentialsInterceptor` added to app.config
- [ ] `auth.service.ts` updated with secure version
- [ ] No localStorage usage for tokens
- [ ] All HTTP calls use `withCredentials: true`
- [ ] Old localStorage tokens cleared on app start

### Security
- [ ] Cookies have `HttpOnly` flag
- [ ] Cookies have `SameSite` attribute
- [ ] Cookies have `Secure` flag in production
- [ ] Token NOT accessible via JavaScript
- [ ] No tokens in localStorage
- [ ] Login/logout works correctly
- [ ] Protected routes work
- [ ] Auto-logout on cookie expiry works

---

## 🚀 Production Deployment Considerations

### Environment Variables

**Backend `.env` (Production):**
```env
NODE_ENV=production
JWT_SECRET=<strong-256-bit-secret>
JWT_COOKIE_EXPIRE=7
FRONTEND_URL=https://your-production-url.com
```

### HTTPS Required

In production, cookies with `Secure` flag require HTTPS:

```javascript
secure: process.env.NODE_ENV === 'production'  // ← true in production
```

**Deploy backend with HTTPS:**
- Heroku (automatic HTTPS)
- AWS with Load Balancer + SSL
- Nginx with Let's Encrypt
- Vercel/Netlify (automatic HTTPS)

### SameSite Strict

For maximum security in production:

```javascript
sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
```

**Note:** `strict` prevents cookies on cross-site navigation. Use `lax` if you need to support links from external sites.

### Cookie Domain

For multi-subdomain support:

```javascript
domain: process.env.COOKIE_DOMAIN || undefined
```

```env
# .env (production)
COOKIE_DOMAIN=.yourdomain.com
```

---

## 📚 Additional Resources

- [OWASP: HttpOnly Cookie](https://owasp.org/www-community/HttpOnly)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Auth0: Token Storage Best Practices](https://auth0.com/docs/secure/security-guidance/data-security/token-storage)
- [Angular: HttpClient withCredentials](https://angular.io/api/common/http/HttpRequest#withCredentials)

---

## ✅ Success Criteria

Migration is complete when:

1. ✅ Login sets httpOnly cookie (visible in Network tab)
2. ✅ Cookie NOT accessible via `document.cookie`
3. ✅ No tokens in localStorage
4. ✅ Protected routes work
5. ✅ Logout clears cookie
6. ✅ Auto-logout on session expiry
7. ✅ All tests pass

**Security Status:** 🔒 **XSS-Proof Authentication**

---

**Estimated Total Time:** 30-45 minutes
**Difficulty:** Medium
**Security Improvement:** HIGH (eliminates XSS token theft)
