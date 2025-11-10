import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import * as Sentry from '@sentry/angular';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private isDevelopment = !environment.production;

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, ...args: any[]): void {
    console.info(`[INFO] ${message}`, ...args);

    if (environment.sentryDsn) {
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
  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);

    if (environment.sentryDsn) {
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
  error(message: string, error?: Error | any, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, error, ...args);

    if (environment.sentryDsn) {
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
   * Log user events (for analytics and debugging)
   */
  logEvent(eventName: string, data?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.log(`[EVENT] ${eventName}`, data);
    }

    if (environment.sentryDsn) {
      Sentry.addBreadcrumb({
        category: 'user-event',
        message: eventName,
        level: 'info',
        data
      });
    }
  }

  /**
   * Set user context for Sentry
   */
  setUser(user: { id?: string; email?: string; username?: string }): void {
    if (environment.sentryDsn) {
      Sentry.setUser(user);
    }
  }

  /**
   * Clear user context from Sentry
   */
  clearUser(): void {
    if (environment.sentryDsn) {
      Sentry.setUser(null);
    }
  }

  /**
   * Add custom context to all future error reports
   */
  setContext(key: string, context: Record<string, any>): void {
    if (environment.sentryDsn) {
      Sentry.setContext(key, context);
    }
  }

  /**
   * Add tags to all future error reports
   */
  setTag(key: string, value: string): void {
    if (environment.sentryDsn) {
      Sentry.setTag(key, value);
    }
  }
}
