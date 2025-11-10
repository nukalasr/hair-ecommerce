# Sentry Error Monitoring Integration

This document explains how to set up and use Sentry error monitoring for the Hair Ecommerce application.

## What is Sentry?

Sentry is a real-time error tracking and monitoring platform that helps developers identify, diagnose, and fix issues in production. It provides:

- **Real-time error tracking**: Instant notifications when errors occur
- **Stack traces**: Detailed error information with file names and line numbers
- **Breadcrumbs**: Context about what led to the error
- **User context**: Information about affected users
- **Performance monitoring**: Track slow operations and bottlenecks
- **Session replay**: See what users experienced before an error

## Why We're Using Sentry

For a production e-commerce application, Sentry is critical for:

1. **Early error detection**: Find bugs before users report them
2. **Better debugging**: Get full context about errors in production
3. **User experience**: Identify and fix issues affecting customers
4. **Performance**: Monitor slow database queries and API calls
5. **Reliability**: Track application stability over time

## Setup Instructions

### 1. Create a Sentry Account

1. Go to [https://sentry.io](https://sentry.io)
2. Sign up for a free account (includes 5,000 errors/month)
3. Create a new organization for your project

### 2. Create Sentry Projects

You need **two separate projects** (one for frontend, one for backend):

#### Frontend Project (Angular)
1. Click "Create Project"
2. Select platform: **Angular**
3. Set alert frequency: Your preference
4. Name: `hair-ecommerce-frontend`
5. Copy the DSN (looks like: `https://abc123@o0.ingest.sentry.io/1234567`)

#### Backend Project (Node.js)
1. Click "Create Project"
2. Select platform: **Node.js** / **Express**
3. Set alert frequency: Your preference
4. Name: `hair-ecommerce-backend`
5. Copy the DSN

### 3. Configure Frontend

Update `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  sentryDsn: 'https://YOUR_FRONTEND_DSN@o0.ingest.sentry.io/1234567',
  // ... other config
};
```

For development (optional), update `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  sentryDsn: '', // Leave empty to disable Sentry in development
  // ... other config
};
```

### 4. Configure Backend

Update `backend/.env`:

```bash
# Add this line (copy from your backend project in Sentry)
SENTRY_DSN=https://YOUR_BACKEND_DSN@o0.ingest.sentry.io/7654321
```

For production deployment, set the `SENTRY_DSN` environment variable on your hosting platform (Heroku, Railway, AWS, etc.).

### 5. Build and Deploy

#### Frontend
```bash
npm run build:prod
```

Source maps will be generated (hidden) to help Sentry show readable stack traces.

#### Backend
```bash
cd backend
npm start
```

Sentry will automatically start monitoring once `SENTRY_DSN` is set.

## Using the Logger Service

Instead of using `console.log`, use the Logger service which integrates with Sentry.

### Frontend (Angular)

```typescript
import { LoggerService } from './services/logger.service';

@Component({...})
export class MyComponent {
  constructor(private logger: LoggerService) {}

  someMethod() {
    // Debug (only in development)
    this.logger.debug('Processing started');

    // Info
    this.logger.info('User viewed product', { productId: 123 });

    // Warning
    this.logger.warn('Cart is empty', { userId: user.id });

    // Error
    try {
      // ... code
    } catch (error) {
      this.logger.error('Failed to process payment', error);
    }

    // User events
    this.logger.logEvent('add_to_cart', { productId: 123, quantity: 2 });
  }

  onLogin(user: User) {
    // Set user context for error tracking
    this.logger.setUser({
      id: user.id,
      email: user.email,
      username: user.name
    });
  }

  onLogout() {
    this.logger.clearUser();
  }
}
```

### Backend (Node.js)

```javascript
const logger = require('./utils/logger');

// Info
logger.info('Server started', { port: 3000 });

// Warning
logger.warn('Payment gateway slow to respond', { duration: 5000 });

// Error
try {
  // ... code
} catch (error) {
  logger.error('Database connection failed', error);
}

// HTTP logging
logger.http('POST', '/api/orders', 200, 150);

// Database logging
logger.database('find', 'products', 45);

// Auth logging
logger.auth('login', userId, true);

// Set user context
logger.setUser(req.user);

// Capture exception manually
logger.captureException(error, {
  tags: { feature: 'payments' },
  extra: { orderId: order.id }
});
```

## Testing Error Reporting

### Frontend Test

Add a test button in your component:

```typescript
testSentry() {
  this.logger.error('Test error from frontend');
  throw new Error('This is a test error!');
}
```

```html
<button (click)="testSentry()">Test Sentry</button>
```

### Backend Test

Add a test endpoint in your server:

```javascript
app.get('/api/test-sentry', (req, res) => {
  logger.error('Test error from backend');
  throw new Error('This is a test error!');
});
```

Then visit: `http://localhost:3000/api/test-sentry`

### Verify in Sentry

1. Go to [https://sentry.io](https://sentry.io)
2. Select your project
3. You should see the test error in the "Issues" tab
4. Click on the error to see:
   - Stack trace
   - Breadcrumbs
   - User context
   - Environment info

## Best Practices

### 1. Use Structured Logging

**Good:**
```typescript
this.logger.error('Payment failed', error, {
  orderId: order.id,
  amount: order.total,
  userId: user.id
});
```

**Bad:**
```typescript
console.log('error happened');
```

### 2. Set User Context

Always set user context after login:
```typescript
this.logger.setUser({ id: user.id, email: user.email });
```

This helps identify which users are affected by errors.

### 3. Add Breadcrumbs

Use breadcrumbs to track user actions:
```typescript
this.logger.logEvent('viewed_product', { productId: 123 });
this.logger.logEvent('added_to_cart', { productId: 123 });
// If an error occurs, Sentry will show these events
```

### 4. Use Tags for Organization

```typescript
this.logger.setTag('feature', 'checkout');
this.logger.setTag('payment_method', 'stripe');
```

Tags help filter and search errors in Sentry.

### 5. Don't Log Sensitive Data

**Never log:**
- Credit card numbers
- Passwords
- API keys
- Social security numbers
- Personal health information

```typescript
// BAD - Don't do this!
logger.info('Processing payment', { cardNumber: '4111111111111111' });

// GOOD - Log non-sensitive identifiers
logger.info('Processing payment', { last4: '1111', orderId: order.id });
```

### 6. Set Appropriate Sample Rates

In production, use lower sample rates to control costs:

```javascript
// backend/server.js
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
// 10% in production, 100% in development
```

### 7. Use Error Boundaries (Frontend)

Sentry's ErrorHandler catches most errors, but you can add custom handling:

```typescript
@Component({...})
export class ErrorBoundaryComponent implements OnInit {
  constructor(private logger: LoggerService) {}

  ngOnInit() {
    // Custom error handling logic
  }
}
```

## Monitoring Best Practices

### 1. Set Up Alerts

In Sentry dashboard:
- Configure email/Slack alerts for new errors
- Set up threshold alerts (e.g., >100 errors/hour)
- Create alerts for specific error types

### 2. Regular Review

- Check Sentry daily for new errors
- Prioritize errors affecting many users
- Mark errors as "resolved" after fixing

### 3. Performance Monitoring

Enable performance monitoring in Sentry:
- Track slow API endpoints
- Monitor database query performance
- Identify frontend performance bottlenecks

### 4. Release Tracking

Tag releases in Sentry to track when errors were introduced:

```bash
# Frontend
npm run build:prod
# Upload source maps to Sentry (requires @sentry/cli)

# Backend
SENTRY_RELEASE=1.0.0 npm start
```

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN configuration**
   - Frontend: Verify `environment.sentryDsn` is set
   - Backend: Verify `SENTRY_DSN` env variable is set

2. **Check network connectivity**
   - Ensure your server can reach `sentry.io`
   - Check firewall rules

3. **Check error filtering**
   - Some errors are filtered by `ignoreErrors` config
   - Check Sentry project settings

### Stack Traces Show Minified Code

1. **Verify source maps are enabled**
   - Check `angular.json` has `sourceMap.hidden: true` for production

2. **Upload source maps to Sentry**
   - Install: `npm install @sentry/cli`
   - Configure `.sentryclirc`
   - Upload: `sentry-cli sourcemaps upload dist/`

### Too Many Errors

1. **Increase sample rate filtering**
2. **Add more specific `ignoreErrors` patterns**
3. **Fix underlying issues causing error spam**

## Cost Optimization

Sentry free tier includes:
- 5,000 errors/month
- 10,000 performance transactions/month
- 30-day data retention

To optimize costs:

1. **Use development mode for testing**
   - Disable Sentry in development by leaving DSN empty

2. **Adjust sample rates**
   - Lower `tracesSampleRate` in production (0.1 = 10%)
   - Lower `replaysSessionSampleRate` (0.1 = 10%)

3. **Filter noisy errors**
   - Add common browser errors to `ignoreErrors`
   - Example: `'ResizeObserver loop limit exceeded'`

4. **Upgrade plan if needed**
   - Team plan: $26/month (50,000 errors)
   - Business plan: $80/month (150,000 errors)

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Angular SDK Docs](https://docs.sentry.io/platforms/javascript/guides/angular/)
- [Node.js SDK Docs](https://docs.sentry.io/platforms/node/)
- [Best Practices](https://docs.sentry.io/product/accounts/quotas/manage-event-stream-guide/)
- [Source Maps Guide](https://docs.sentry.io/platforms/javascript/sourcemaps/)

## Support

For issues with this integration:
1. Check this documentation
2. Review Sentry logs in the dashboard
3. Check the [Sentry Status Page](https://status.sentry.io/)
4. Contact the development team

---

**Last Updated:** November 2025
**Sentry SDK Versions:**
- Frontend: `@sentry/angular` v8.0.0
- Backend: `@sentry/node` v8.0.0
