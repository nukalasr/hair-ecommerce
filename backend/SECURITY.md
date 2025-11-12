# Backend Security Configuration

This document outlines the security measures implemented in the Hair Ecommerce Backend API.

## Overview

The backend API implements multiple layers of security to protect against common web vulnerabilities and ensure data safety in production.

## Security Headers (Helmet.js)

The API uses [Helmet.js](https://helmetjs.github.io/) to set secure HTTP headers automatically.

### Content Security Policy (CSP)

A minimal but strict CSP is enabled for the API to prevent content injection attacks.

**Configuration:**
```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'none'"],           // Block all resources by default
    baseUri: ["'none'"],               // Prevent <base> tag injection
    fontSrc: ["'none'"],               // No fonts needed
    formAction: ["'none'"],            // No forms in API responses
    frameAncestors: ["'none'"],        // Prevent clickjacking (X-Frame-Options)
    imgSrc: ["'none'"],                // No images in responses
    objectSrc: ["'none'"],             // No plugins (Flash, Java, etc.)
    scriptSrc: ["'none'"],             // No scripts in responses
    scriptSrcAttr: ["'none'"],         // No inline event handlers
    styleSrc: ["'none'"],              // No styles in responses
    upgradeInsecureRequests: [],       // Force HTTPS in production
  },
}
```

**Why these directives?**

Since this is a REST API that only returns JSON data (not HTML pages), we can safely block all content types:
- No scripts, styles, or images are served
- All responses are `application/json`
- Prevents any form of XSS attacks via API responses
- `frameAncestors: 'none'` prevents the API from being embedded in iframes (clickjacking protection)

### Additional Helmet Headers

Helmet also sets these security headers automatically:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-DNS-Prefetch-Control` | `off` | Prevent DNS prefetching |
| `X-Frame-Options` | `DENY` | Prevent clickjacking (via CSP) |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Download-Options` | `noopen` | Prevent IE from executing downloads |
| `X-Permitted-Cross-Domain-Policies` | `none` | Restrict cross-domain policies |
| `Referrer-Policy` | `no-referrer` | Don't send referrer information |
| `Strict-Transport-Security` | `max-age=15552000` | Force HTTPS (production) |

### Cross-Origin Resource Policy

```javascript
crossOriginResourcePolicy: { policy: "cross-origin" }
```

This allows the frontend (running on a different origin) to make requests to the API. Required for CORS functionality.

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured to allow only trusted frontends:

```javascript
cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,                  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

**Important:**
- Set `FRONTEND_URL` environment variable in production
- `credentials: true` allows httpOnly cookies for authentication
- Restricts methods to only those needed by the API
- Only allows necessary headers

## Rate Limiting

Protection against brute force and DoS attacks:

```javascript
rateLimit({
  windowMs: 15 * 60 * 1000,     // 15 minutes
  max: 100,                      // 100 requests per window
  message: 'Too many requests',
  standardHeaders: true,         // Return rate limit info in headers
  legacyHeaders: false,
})
```

**Customization:**
- Set `RATE_LIMIT_WINDOW` env variable (minutes)
- Set `RATE_LIMIT_MAX_REQUESTS` env variable
- Applied to all `/api/*` routes

**Rate limit headers returned:**
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Time when limit resets

## Authentication Security

### JWT Configuration

JSON Web Tokens (JWT) are used for stateless authentication:

```javascript
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-256-bits
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7
```

**Security requirements:**
- `JWT_SECRET` must be at least 256 bits (32 characters) for HS256
- Use cryptographically random secret (e.g., `openssl rand -base64 32`)
- Tokens expire after 7 days
- Stored in httpOnly cookies (not localStorage) to prevent XSS theft

### Password Hashing

Passwords are hashed using bcrypt with configurable rounds:

```javascript
BCRYPT_ROUNDS=12
```

**Security considerations:**
- Default: 12 rounds (recommended for production)
- Higher rounds = more secure but slower
- Increase rounds as computing power increases
- Never store plaintext passwords

### HttpOnly Cookies

Authentication tokens are stored in httpOnly cookies:

**Benefits:**
- Not accessible via JavaScript (prevents XSS attacks)
- Automatically sent with requests
- Can be set as `Secure` (HTTPS only) in production
- Can be set as `SameSite=Strict` (CSRF protection)

**Cookie configuration:**
```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});
```

## Input Validation

All API inputs are validated using `express-validator`:

**Example:**
```javascript
const { body, param, validationResult } = require('express-validator');

// Validation rules
[
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('price').isFloat({ min: 0 }),
]
```

**Protects against:**
- SQL injection (NoSQL injection for MongoDB)
- XSS attacks
- Invalid data types
- Buffer overflow attacks

## Error Handling

Secure error handling prevents information leakage:

**Development:**
```json
{
  "success": false,
  "error": "Detailed error message",
  "stack": "Full stack trace"
}
```

**Production:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

Stack traces and detailed errors are hidden in production to prevent attackers from learning about the system.

## Sentry Integration

Production errors are sent to Sentry for monitoring:
- Errors are logged without sensitive data
- User context tracked (id, email only)
- No passwords, tokens, or credit cards logged
- See `SENTRY.md` for full documentation

## MongoDB Security

### Connection Security

```javascript
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

**Security measures:**
- Use MongoDB Atlas with IP whitelisting
- Enable network encryption (TLS/SSL)
- Use strong passwords for database users
- Create read-only users for analytics
- Never expose MongoDB port (27017) publicly

### Query Security

Mongoose provides automatic protection against:
- NoSQL injection attacks
- Type coercion vulnerabilities
- Malformed query objects

**Example protection:**
```javascript
// Dangerous (vulnerable to injection)
const user = await User.findOne({ email: req.body.email });

// Safe (Mongoose sanitizes input)
const user = await User.findOne({
  email: { $eq: req.body.email }
});
```

## Stripe Payment Security

### Secret Key Management

```javascript
STRIPE_SECRET_KEY=sk_live_...  // NEVER commit to git
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Security requirements:**
- Store keys in environment variables only
- Use test keys (`sk_test_`) in development
- Use live keys (`sk_live_`) only in production
- Rotate keys if compromised
- Never log keys in application code

### Webhook Signature Verification

Stripe webhooks are verified using the webhook secret:

```javascript
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
```

This prevents fake webhook requests from attackers.

### PCI Compliance

**Our approach:**
- Never store credit card numbers
- Never log credit card data
- Use Stripe.js for client-side tokenization
- Process payments server-side only
- Card data never touches our servers

## Production Security Checklist

Before deploying to production:

### Environment Variables
- [ ] Change `JWT_SECRET` to cryptographically random string (32+ chars)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `FRONTEND_URL` to production domain
- [ ] Set up MongoDB Atlas with IP whitelisting
- [ ] Add real Stripe live keys
- [ ] Configure `SENTRY_DSN` for error monitoring
- [ ] Remove any test/debug credentials

### HTTPS Configuration
- [ ] Enable HTTPS on your hosting platform
- [ ] Force HTTPS redirects
- [ ] Set `Secure` flag on cookies
- [ ] Enable HSTS (Strict-Transport-Security)
- [ ] Update CSP `upgradeInsecureRequests` directive

### Server Hardening
- [ ] Disable server signature (`X-Powered-By` removed by Helmet)
- [ ] Configure firewall (only ports 80, 443 open)
- [ ] Enable fail2ban or similar brute-force protection
- [ ] Set up log monitoring
- [ ] Configure automated backups

### Monitoring
- [ ] Set up Sentry alerts
- [ ] Configure uptime monitoring (e.g., UptimeRobot)
- [ ] Set up log aggregation (e.g., Papertrail)
- [ ] Enable MongoDB Atlas monitoring
- [ ] Configure rate limit alerts

### Testing
- [ ] Run security audit: `npm audit`
- [ ] Test HTTPS certificate
- [ ] Verify security headers: https://securityheaders.com
- [ ] Test rate limiting
- [ ] Verify CORS configuration
- [ ] Test error handling (no stack traces leaked)

## Security Headers Verification

Test your security headers using these tools:

1. **Security Headers Scanner**
   - https://securityheaders.com
   - Enter your API URL
   - Should receive A+ rating

2. **Mozilla Observatory**
   - https://observatory.mozilla.org
   - Comprehensive security test
   - Provides actionable recommendations

3. **Manual Testing**
   ```bash
   # Check headers with curl
   curl -I https://your-api.com/health

   # Should include:
   # Content-Security-Policy: default-src 'none'; ...
   # X-Content-Type-Options: nosniff
   # X-Frame-Options: DENY
   # Referrer-Policy: no-referrer
   # Strict-Transport-Security: max-age=15552000
   ```

## Vulnerability Scanning

Regular security audits:

```bash
# Check for vulnerable dependencies
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force fix (may include breaking changes)
npm audit fix --force
```

Run this:
- Weekly in development
- Before every production deployment
- After updating dependencies

## Incident Response

If a security breach occurs:

1. **Immediate actions:**
   - Rotate all secrets (JWT, database, Stripe)
   - Review Sentry logs for suspicious activity
   - Check access logs for unauthorized access
   - Disable compromised user accounts

2. **Investigation:**
   - Identify attack vector
   - Determine data exposure
   - Check database for unauthorized changes
   - Review recent deployments

3. **Remediation:**
   - Patch vulnerability
   - Update dependencies
   - Strengthen security measures
   - Document incident and lessons learned

4. **Communication:**
   - Notify affected users
   - Report breach if required by law (GDPR, CCPA)
   - Update security documentation

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Stripe Security](https://stripe.com/docs/security/stripe)

---

**Last Updated:** November 2025
**Security Contact:** Report vulnerabilities to your security team
