import { Injectable } from '@angular/core';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { environment } from '../../environments/environment';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * Payment Service using Stripe
 *
 * IMPORTANT: This demonstrates client-side Stripe integration.
 * In production, you MUST:
 * 1. Create payment intents on your backend server
 * 2. Handle webhooks for payment confirmation
 * 3. Store order data server-side
 * 4. Never expose secret keys client-side
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private stripePromise: Promise<Stripe | null>;
  private stripe: Stripe | null = null;

  constructor() {
    this.stripePromise = loadStripe(environment.stripePublishableKey);
    this.initializeStripe();
  }

  private async initializeStripe(): Promise<void> {
    this.stripe = await this.stripePromise;
  }

  /**
   * Create Stripe Checkout Session
   * NOTE: In production, this should call your backend API to create the session
   */
  createCheckoutSession(orderData: {
    amount: number;
    currency: string;
    customerEmail: string;
    orderItems: Array<{ name: string; quantity: number; price: number }>;
    shippingAddress: any;
  }): Observable<{ sessionId?: string; error?: string }> {
    // In production, this would be an HTTP call to your backend:
    // return this.http.post<{sessionId: string}>('/api/create-checkout-session', orderData);

    // For demo purposes, we'll simulate the session creation
    console.warn('⚠️  DEMO MODE: In production, create checkout session on backend');
    console.log('Order data that would be sent to backend:', orderData);

    // Simulate API call
    return of({
      error: 'Backend API required. See implementation notes in payment.service.ts'
    });
  }

  /**
   * Redirect to Stripe Checkout
   * This is the secure, PCI-compliant way to accept payments
   * NOTE: redirectToCheckout is deprecated but kept for backward compatibility
   */
  async redirectToCheckout(sessionId: string): Promise<{ error?: any }> {
    if (!this.stripe) {
      await this.initializeStripe();
    }

    if (!this.stripe) {
      return { error: 'Stripe failed to initialize' };
    }

    // Type assertion needed because redirectToCheckout is deprecated in newer Stripe types
    const result = await (this.stripe as any).redirectToCheckout({
      sessionId: sessionId
    });

    if (result.error) {
      console.error('Stripe checkout error:', result.error);
      return { error: result.error.message };
    }

    return {};
  }

  /**
   * Create Stripe Elements for custom payment form
   * Use this if you want a custom payment form instead of Stripe Checkout
   */
  async createElements(): Promise<StripeElements | null> {
    if (!this.stripe) {
      await this.initializeStripe();
    }

    if (!this.stripe) {
      return null;
    }

    return this.stripe.elements();
  }

  /**
   * Create Payment Intent (requires backend)
   * In production, call your backend API to create a payment intent
   */
  createPaymentIntent(amount: number, currency: string = 'usd'): Observable<{ clientSecret?: string; error?: string }> {
    // In production:
    // return this.http.post<{clientSecret: string}>('/api/create-payment-intent', { amount, currency });

    console.warn('⚠️  DEMO MODE: Backend required to create payment intent');

    return of({
      error: 'Backend API required for payment intent creation'
    });
  }

  /**
   * Confirm Card Payment using Payment Intent
   */
  async confirmCardPayment(
    clientSecret: string,
    cardElement: StripeCardElement
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.stripe) {
      await this.initializeStripe();
    }

    if (!this.stripe) {
      return { success: false, error: 'Stripe not initialized' };
    }

    const result = await this.stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement
      }
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message
      };
    }

    if (result.paymentIntent?.status === 'succeeded') {
      return { success: true };
    }

    return {
      success: false,
      error: 'Payment not completed'
    };
  }

  /**
   * Mock payment processing for demo purposes
   * NEVER use this in production - always use real Stripe payment processing
   *
   * SECURITY: This method is DISABLED in production mode to prevent abuse
   */
  processMockPayment(orderData: any): Observable<{ success: boolean; orderId: string; message: string }> {
    // CRITICAL SECURITY CHECK: Prevent mock payments in production
    if (environment.production) {
      return new Observable(observer => {
        observer.error({
          success: false,
          message: 'Mock payments are disabled in production. Please configure Stripe payment processing.'
        });
        observer.complete();
      });
    }

    console.warn('⚠️  DEMO MODE: Using mock payment processing');
    console.log('Mock order data:', orderData);

    // Simulate payment processing delay
    return new Observable(observer => {
      setTimeout(() => {
        // Generate mock order ID
        const array = new Uint8Array(8);
        crypto.getRandomValues(array);
        const orderId = 'ORD_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();

        observer.next({
          success: true,
          orderId: orderId,
          message: 'Mock payment processed successfully (DEVELOPMENT ONLY)'
        });
        observer.complete();
      }, 2000);
    });
  }

  /**
   * Calculate order total with tax and shipping
   */
  calculateOrderTotal(subtotal: number): {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
  } {
    const shipping = subtotal >= environment.freeShippingThreshold ? 0 : environment.shippingCost;
    const tax = subtotal * environment.taxRate;
    const total = subtotal + shipping + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Format amount for Stripe (converts dollars to cents)
   */
  formatAmountForStripe(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Format amount for display (converts cents to dollars)
   */
  formatAmountFromStripe(amount: number): number {
    return amount / 100;
  }
}
