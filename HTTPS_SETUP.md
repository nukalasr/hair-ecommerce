# HTTPS Enforcement Guide

This document explains how HTTPS enforcement is configured for the Hair Ecommerce application and how to enable it in production.

## Overview

The application enforces HTTPS through multiple layers:

1. **Backend API**: Automatic HTTP → HTTPS redirect middleware
2. **Frontend**: Nginx configuration with HTTPS redirect
3. **Security Headers**: HSTS (HTTP Strict Transport Security)
4. **Cookies**: Secure flag enabled in production

## Why HTTPS is Critical

HTTPS (HTTP Secure) encrypts all traffic between clients and servers using TLS/SSL. This is **essential** for e-commerce because:

- **Protects sensitive data**: Credit cards, passwords, personal information
- **Prevents man-in-the-middle attacks**: Attackers can't intercept traffic
- **Builds user trust**: Browser shows padlock icon
- **SEO ranking**: Google penalizes non-HTTPS sites
- **Required for modern features**: Service Workers, PWA, Geolocation API
- **PCI DSS compliance**: Required for handling payments
- **Cookie security**: httpOnly + Secure cookies only work over HTTPS

## Current Configuration

### Backend (Node.js/Express)

**Location**: `backend/server.js` and `backend/middleware/httpsRedirect.js`

The backend automatically redirects HTTP to HTTPS in production:

```javascript
// HTTPS redirect middleware
app.use(httpsRedirect);

// Trust proxy for load balancer headers
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
```

**How it works:**
1. Checks if `NODE_ENV === 'production'`
2. Examines `req.secure`, `X-Forwarded-Proto`, and `X-Forwarded-SSL` headers
3. Redirects HTTP requests to HTTPS with `301` status (permanent redirect)
4. HTTPS requests pass through unchanged

**HSTS Header:**
```javascript
strictTransportSecurity: {
  maxAge: 31536000,        // 1 year
  includeSubDomains: true,
  preload: true
}
```

This tells browsers to **always** use HTTPS for 1 year, even if users type `http://`.

### Frontend (Angular/Nginx)

**Location**: `nginx.conf`

The Nginx configuration includes:

1. **HTTP server (port 80)**: Redirects to HTTPS (commented for development)
2. **HTTPS server (port 443)**: Full production configuration (commented, ready to enable)
3. **Development server (port 8080)**: HTTP only for local development

**To enable HTTPS in production:**

1. Uncomment the HTTPS redirect in the HTTP server block:
   ```nginx
   # Uncomment this line:
   return 301 https://$host$request_uri;
   ```

2. Uncomment the entire HTTPS server block (lines 74-134)

3. Configure SSL certificate paths:
   ```nginx
   ssl_certificate /etc/nginx/ssl/cert.pem;
   ssl_certificate_key /etc/nginx/ssl/key.pem;
   ```

### Cookie Security

**Location**: `backend/controllers/authController.js`

Cookies are configured with security flags:

```javascript
const cookieOptions = {
  httpOnly: true,  // Prevents JavaScript access (XSS protection)
  secure: process.env.NODE_ENV === 'production',  // HTTPS only
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/'
};
```

**In production:**
- `secure: true` - Cookies only sent over HTTPS
- `sameSite: 'strict'` - Maximum CSRF protection
- `httpOnly: true` - No JavaScript access

## Production HTTPS Setup

### Option 1: Using Let's Encrypt (Free SSL)

**Recommended for most deployments**

1. **Install Certbot:**
   ```bash
   # Ubuntu/Debian
   sudo apt install certbot python3-certbot-nginx

   # macOS
   brew install certbot
   ```

2. **Obtain SSL certificate:**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. **Certbot will automatically:**
   - Obtain SSL certificate
   - Update nginx configuration
   - Set up auto-renewal

4. **Verify auto-renewal:**
   ```bash
   sudo certbot renew --dry-run
   ```

### Option 2: Using Cloudflare (Free SSL + CDN)

**Recommended for best performance and DDoS protection**

1. **Sign up at** [cloudflare.com](https://cloudflare.com)

2. **Add your domain** and update nameservers

3. **Enable Full SSL/TLS encryption:**
   - Go to SSL/TLS settings
   - Select "Full (strict)" mode
   - Origin Server: Generate certificate for nginx

4. **Install Cloudflare origin certificate:**
   ```bash
   # Save certificate to:
   /etc/nginx/ssl/cloudflare-cert.pem
   /etc/nginx/ssl/cloudflare-key.pem
   ```

5. **Update nginx.conf:**
   ```nginx
   ssl_certificate /etc/nginx/ssl/cloudflare-cert.pem;
   ssl_certificate_key /etc/nginx/ssl/cloudflare-key.pem;
   ```

6. **Enable features:**
   - Always Use HTTPS
   - Automatic HTTPS Rewrites
   - HSTS (managed by Cloudflare)
   - Minimum TLS Version: 1.2

### Option 3: Platform-Managed SSL

If deploying to managed platforms, SSL is often automatic:

**Vercel** (Frontend):
- Automatic HTTPS for all deployments
- Free SSL certificates
- No configuration needed

**Heroku** (Backend):
```bash
# Automatic HTTPS for all apps
# Ensure backend respects X-Forwarded-Proto header (already configured)
```

**Railway** (Backend):
- Automatic HTTPS
- Custom domains get free SSL

**AWS Elastic Beanstalk**:
- Use AWS Certificate Manager (ACM)
- Attach certificate to load balancer
- Configure security group for HTTPS (port 443)

**DigitalOcean App Platform**:
- Automatic HTTPS for all apps
- Free SSL certificates

## Configuration by Environment

### Development (Local)

**Status**: HTTP only (no HTTPS enforcement)

```bash
NODE_ENV=development npm start        # Backend on http://localhost:3000
ng serve                              # Frontend on http://localhost:4200
```

- HTTPS redirect: **Disabled**
- HSTS header: **Not sent**
- Cookie secure flag: **false**
- SameSite: **lax**

### Staging

**Status**: HTTPS enforced (using test certificates or staging Let's Encrypt)

```bash
NODE_ENV=production
# Use Let's Encrypt staging server for testing
certbot --staging --nginx -d staging.yourdomain.com
```

### Production

**Status**: HTTPS fully enforced

```bash
NODE_ENV=production
# All security features enabled
```

- HTTPS redirect: **Enabled (301)**
- HSTS header: **max-age=31536000**
- Cookie secure flag: **true**
- SameSite: **strict**

## Testing HTTPS Configuration

### 1. Test Redirect

```bash
# Should redirect to HTTPS
curl -I http://yourdomain.com

# Should see:
# HTTP/1.1 301 Moved Permanently
# Location: https://yourdomain.com/
```

### 2. Test HSTS Header

```bash
curl -I https://yourdomain.com

# Should see:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 3. Test SSL Certificate

```bash
# Check certificate expiration and chain
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Or use online tools:
# https://www.ssllabs.com/ssltest/
```

### 4. Test Security Headers

Visit: https://securityheaders.com

Enter your domain and verify you get **A+** rating with:
- ✅ Strict-Transport-Security
- ✅ Content-Security-Policy
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options

### 5. Test Cookie Security

1. Open browser DevTools → Application → Cookies
2. Check the `token` cookie:
   - ✅ `Secure` flag present
   - ✅ `HttpOnly` flag present
   - ✅ `SameSite=Strict`

## Troubleshooting

### Redirect Loop

**Problem**: Browser shows "Too many redirects"

**Cause**: Reverse proxy (load balancer) terminates SSL, backend sees HTTP, redirects to HTTPS, loop occurs

**Solution**: Ensure `trust proxy` is set and check `X-Forwarded-Proto` header

```javascript
// backend/server.js
app.set('trust proxy', 1);  // Trust first proxy
```

### Mixed Content Warnings

**Problem**: Page loads over HTTPS but resources load over HTTP

**Cause**: Hardcoded HTTP URLs in code

**Solution**:
1. Use relative URLs: `/api/products` instead of `http://api.com/products`
2. Use protocol-relative URLs: `//cdn.com/script.js`
3. Update all URLs to HTTPS

### Certificate Errors

**Problem**: Browser shows "Your connection is not private"

**Causes & Solutions:**
- **Expired certificate**: Renew with `certbot renew`
- **Wrong domain**: Certificate doesn't match domain name
- **Missing intermediate certificates**: Install full chain
- **Self-signed certificate**: Use Let's Encrypt or proper CA

### HSTS Not Working

**Problem**: HSTS header not appearing

**Checklist:**
1. ✅ Page loaded over HTTPS (HSTS only sent over HTTPS)
2. ✅ Helmet.js configured correctly
3. ✅ No caching proxy removing headers
4. ✅ Check with `curl -I https://yourdomain.com`

## HSTS Preload List

For maximum security, submit your domain to the HSTS preload list:

**Requirements:**
1. Serve valid HTTPS certificate
2. Redirect HTTP → HTTPS (all subdomains)
3. Serve HSTS header on base domain with:
   - `max-age >= 31536000` (1 year)
   - `includeSubDomains` directive
   - `preload` directive

**Submission:**
1. Verify requirements: https://hstspreload.org
2. Submit domain
3. Wait for inclusion (several months)
4. Once included, browsers will **always** use HTTPS

**Warning**: Difficult to undo! Only submit if you're committed to HTTPS forever.

## Best Practices

### 1. Always Use HTTPS

- ✅ All pages, not just login/checkout
- ✅ All subdomains
- ✅ All API endpoints

### 2. Use Strong TLS Configuration

```nginx
ssl_protocols TLSv1.2 TLSv1.3;  # No TLS 1.0/1.1
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers off;  # Let clients choose
```

### 3. Monitor Certificate Expiration

- Set up alerts 30 days before expiration
- Use monitoring services (UptimeRobot, StatusCake)
- Verify auto-renewal works

### 4. Use Certificate Transparency

- Monitor CT logs for unauthorized certificates
- Use services like https://crt.sh

### 5. Keep Private Keys Secure

```bash
# Restrict permissions
chmod 600 /etc/nginx/ssl/key.pem
chown root:root /etc/nginx/ssl/key.pem

# Never commit to git
# Add to .gitignore:
*.pem
*.key
*.crt
```

### 6. Regular Security Audits

Run these tests monthly:
- https://www.ssllabs.com/ssltest/
- https://securityheaders.com
- https://observatory.mozilla.org

## Performance Considerations

### HTTP/2

HTTPS enables HTTP/2 for better performance:

```nginx
listen 443 ssl http2;  # Enable HTTP/2
```

**Benefits:**
- Multiplexing (multiple requests over one connection)
- Server push
- Header compression
- ~50% faster page loads

### Session Resumption

Reduce TLS handshake overhead:

```nginx
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### OCSP Stapling

Improve certificate validation performance:

```nginx
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/nginx/ssl/chain.pem;
resolver 8.8.8.8 8.8.4.4 valid=300s;
```

## Cost

### Free Options
- **Let's Encrypt**: Free SSL certificates (recommended)
- **Cloudflare**: Free SSL + CDN + DDoS protection
- **Platform SSL**: Vercel, Heroku, Railway (included free)

### Paid Options
- **Commercial SSL**: $10-$300/year (rarely needed)
- **Extended Validation (EV)**: $150-$1500/year (shows company name in browser)
- **Wildcard SSL**: Covers *.yourdomain.com

**Recommendation**: Use Let's Encrypt (free) for most cases.

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Transport Layer Protection](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [Cloudflare SSL/TLS Guide](https://developers.cloudflare.com/ssl/)
- [HSTS Preload List](https://hstspreload.org/)

---

**Last Updated:** November 2025
**Status:** HTTPS enforcement ready for production deployment
