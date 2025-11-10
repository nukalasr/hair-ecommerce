import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { PaymentService } from '../../services/payment.service';
import { OrderService } from '../../services/order.service';
import { Cart } from '../../models/cart.model';
import { Address, User } from '../../models/user.model';
import { ValidationUtil } from '../../utils/validation.util';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cart: Cart = { items: [], totalItems: 0, totalPrice: 0 };
  isAuthenticated: boolean = false;
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  shippingAddress: Address = {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  };

  billingAddress: Address = {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  };

  sameAsShipping: boolean = true;
  paymentMethod: 'stripe' | 'mock' = 'stripe';

  isProcessing: boolean = false;
  errorMessage: string = '';

  // Order totals
  orderTotals = {
    subtotal: 0,
    shipping: 0,
    tax: 0,
    total: 0
  };

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private paymentService: PaymentService,
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cart) => {
          this.cart = cart;
          if (cart.items.length === 0) {
            this.router.navigate(['/cart']);
          } else {
            this.calculateOrderTotals();
          }
        },
        error: (error) => {
          console.error('Error loading cart:', error);
          this.errorMessage = 'Failed to load cart. Please try again.';
        }
      });

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isAuthenticated = !!user;

          // Pre-fill address if user has one
          if (user?.address) {
            this.shippingAddress = { ...user.address };
          }
        },
        error: (error) => {
          console.error('Error checking authentication:', error);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleBillingAddress(): void {
    if (this.sameAsShipping) {
      this.billingAddress = { ...this.shippingAddress };
    }
  }

  calculateOrderTotals(): void {
    this.orderTotals = this.paymentService.calculateOrderTotal(this.cart.totalPrice);
  }

  placeOrder(): void {
    this.errorMessage = '';

    if (!this.validateForm()) {
      return;
    }

    if (!this.currentUser) {
      this.errorMessage = 'Please log in to complete your order';
      return;
    }

    this.isProcessing = true;

    // Use billing address same as shipping if checkbox is selected
    const finalBillingAddress = this.sameAsShipping ? this.shippingAddress : this.billingAddress;

    // Create order
    const order = this.orderService.createOrder(
      this.currentUser,
      this.cart,
      this.shippingAddress,
      finalBillingAddress,
      this.paymentMethod,
      this.orderTotals
    );

    if (this.paymentMethod === 'stripe') {
      this.processStripePayment(order);
    } else {
      this.processMockPayment(order);
    }
  }

  private processStripePayment(order: any): void {
    // In production, this would create a Stripe Checkout Session via backend API
    const orderData = {
      amount: this.paymentService.formatAmountForStripe(this.orderTotals.total),
      currency: 'usd',
      customerEmail: this.currentUser?.email || '',
      orderItems: this.cart.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      shippingAddress: this.shippingAddress
    };

    // NOTE: In production, call backend API to create checkout session
    console.warn('⚠️  Stripe Integration: Backend API required');
    console.log('📦 Order data ready for Stripe:', orderData);
    console.log('💰 Total amount (cents):', orderData.amount);

    this.isProcessing = false;

    // Show information about Stripe integration
    alert(
      `Stripe Payment Integration\n\n` +
      `This demo requires a backend API to:\n` +
      `1. Create Stripe Checkout Session\n` +
      `2. Handle payment webhooks\n` +
      `3. Confirm payment server-side\n\n` +
      `Order Total: $${this.orderTotals.total.toFixed(2)}\n\n` +
      `See PAYMENT_INTEGRATION.md for setup instructions.`
    );

    // For demo, save order and redirect to mock success page
    this.orderService.saveOrder(order).subscribe(() => {
      this.router.navigate(['/order-success'], {
        queryParams: { orderId: order.id, demo: 'true' }
      });
    });
  }

  private processMockPayment(order: any): void {
    console.warn('⚠️  Using mock payment processing');

    this.paymentService.processMockPayment(order).subscribe({
      next: (result) => {
        this.isProcessing = false;

        if (result.success) {
          // Update order with mock transaction ID
          order.transactionId = result.orderId;
          order.paymentStatus = 'paid';
          order.orderStatus = 'processing';
          order.paidAt = new Date();

          // Save order
          this.orderService.saveOrder(order).subscribe(() => {
            // Clear cart
            this.cartService.clearCart();

            // Navigate to success page
            this.router.navigate(['/order-success'], {
              queryParams: { orderId: order.id }
            });
          });
        } else {
          this.errorMessage = 'Payment failed. Please try again.';
        }
      },
      error: (error) => {
        this.isProcessing = false;
        this.errorMessage = 'An error occurred while processing payment. Please try again.';
        console.error('Payment error:', error);
      }
    });
  }

  validateForm(): boolean {
    // Validate shipping address
    if (!this.shippingAddress.street || !this.shippingAddress.city ||
        !this.shippingAddress.state || !this.shippingAddress.zipCode) {
      this.errorMessage = 'Please fill in all shipping address fields';
      return false;
    }

    // Validate ZIP code format
    if (!ValidationUtil.isValidZipCode(this.shippingAddress.zipCode)) {
      this.errorMessage = 'Please enter a valid ZIP code';
      return false;
    }

    // Validate billing address if different from shipping
    if (!this.sameAsShipping) {
      if (!this.billingAddress.street || !this.billingAddress.city ||
          !this.billingAddress.state || !this.billingAddress.zipCode) {
        this.errorMessage = 'Please fill in all billing address fields';
        return false;
      }

      if (!ValidationUtil.isValidZipCode(this.billingAddress.zipCode)) {
        this.errorMessage = 'Please enter a valid ZIP code for billing address';
        return false;
      }
    }

    // Validate cart has items
    if (this.cart.items.length === 0) {
      this.errorMessage = 'Your cart is empty';
      return false;
    }

    return true;
  }
}
