const Sentry = require('@sentry/node');

/**
 * Logger utility that integrates with Sentry
 * Provides consistent logging across the application
 */
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.hasSentry = !!process.env.SENTRY_DSN;
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message, ...args) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log informational messages
   */
  info(message, ...args) {
    console.info(`[INFO] ${message}`, ...args);

    if (this.hasSentry) {
      Sentry.addBreadcrumb({
        category: 'info',
        message,
        level: 'info',
        data: args.length > 0 ? { args } : undefined
      });
    }
  }

  /**
   * Log warning messages
   */
  warn(message, ...args) {
    console.warn(`[WARN] ${message}`, ...args);

    if (this.hasSentry) {
      Sentry.addBreadcrumb({
        category: 'warning',
        message,
        level: 'warning',
        data: args.length > 0 ? { args } : undefined
      });

      // Capture warnings in Sentry (but not as errors)
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: args.length > 0 ? { args } : undefined
      });
    }
  }

  /**
   * Log error messages and send to Sentry
   */
  error(message, error, ...args) {
    console.error(`[ERROR] ${message}`, error, ...args);

    if (this.hasSentry) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          tags: { message },
          extra: args.length > 0 ? { args } : undefined
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: { error, args }
        });
      }
    }
  }

  /**
   * Log HTTP request information
   */
  http(method, url, statusCode, responseTime) {
    const message = `${method} ${url} ${statusCode} ${responseTime}ms`;
    console.log(`[HTTP] ${message}`);

    if (this.hasSentry && statusCode >= 500) {
      Sentry.addBreadcrumb({
        category: 'http',
        message,
        level: 'error',
        data: { method, url, statusCode, responseTime }
      });
    }
  }

  /**
   * Log database operations
   */
  database(operation, collection, duration) {
    if (this.isDevelopment) {
      console.log(`[DB] ${operation} on ${collection} (${duration}ms)`);
    }

    if (this.hasSentry && duration > 1000) {
      Sentry.addBreadcrumb({
        category: 'database',
        message: `Slow query: ${operation} on ${collection}`,
        level: 'warning',
        data: { operation, collection, duration }
      });
    }
  }

  /**
   * Log authentication events
   */
  auth(event, userId, success = true) {
    const message = `Auth: ${event} - User: ${userId} - ${success ? 'Success' : 'Failed'}`;
    console.log(`[AUTH] ${message}`);

    if (this.hasSentry) {
      Sentry.addBreadcrumb({
        category: 'auth',
        message,
        level: success ? 'info' : 'warning',
        data: { event, userId, success }
      });
    }
  }

  /**
   * Set user context for Sentry
   */
  setUser(user) {
    if (this.hasSentry && user) {
      Sentry.setUser({
        id: user._id || user.id,
        email: user.email,
        username: user.name
      });
    }
  }

  /**
   * Clear user context from Sentry
   */
  clearUser() {
    if (this.hasSentry) {
      Sentry.setUser(null);
    }
  }

  /**
   * Add custom context to all future error reports
   */
  setContext(key, context) {
    if (this.hasSentry) {
      Sentry.setContext(key, context);
    }
  }

  /**
   * Add tags to all future error reports
   */
  setTag(key, value) {
    if (this.hasSentry) {
      Sentry.setTag(key, value);
    }
  }

  /**
   * Manually capture an exception
   */
  captureException(error, context) {
    console.error('[EXCEPTION]', error);

    if (this.hasSentry) {
      Sentry.captureException(error, context);
    }
  }

  /**
   * Manually capture a message
   */
  captureMessage(message, level = 'info') {
    console.log(`[CAPTURE] ${message}`);

    if (this.hasSentry) {
      Sentry.captureMessage(message, level);
    }
  }
}

// Export singleton instance
module.exports = new Logger();
