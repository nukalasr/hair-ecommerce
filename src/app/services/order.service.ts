import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Order } from '../models/order.model';
import { Cart } from '../models/cart.model';
import { User } from '../models/user.model';
import { ValidationUtil } from '../utils/validation.util';

/**
 * Order Service
 * Manages order creation and history
 *
 * NOTE: In production, this should interact with a backend API
 */
@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  orders$ = this.ordersSubject.asObservable();

  private orders: Order[] = [];

  constructor() {
    this.loadOrders();
  }

  /**
   * Load orders from localStorage
   */
  private loadOrders(): void {
    try {
      const savedOrders = localStorage.getItem('orders');
      if (savedOrders) {
        this.orders = JSON.parse(savedOrders);
        this.ordersSubject.next(this.orders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  /**
   * Save orders to localStorage
   */
  private saveOrders(): void {
    try {
      localStorage.setItem('orders', JSON.stringify(this.orders));
      this.ordersSubject.next(this.orders);
    } catch (error) {
      console.error('Error saving orders:', error);
    }
  }

  /**
   * Create a new order
   */
  createOrder(
    user: User,
    cart: Cart,
    shippingAddress: any,
    billingAddress: any,
    paymentMethod: string,
    orderTotal: {
      subtotal: number;
      shipping: number;
      tax: number;
      total: number;
    }
  ): Order {
    const order: Order = {
      id: ValidationUtil.generateSecureId('ORD'),
      userId: user.id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      items: cart.items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.imageUrl,
        price: item.product.price,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity
      })),
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country || 'USA'
      },
      billingAddress: {
        street: billingAddress.street,
        city: billingAddress.city,
        state: billingAddress.state,
        zipCode: billingAddress.zipCode,
        country: billingAddress.country || 'USA'
      },
      subtotal: orderTotal.subtotal,
      shipping: orderTotal.shipping,
      tax: orderTotal.tax,
      total: orderTotal.total,
      paymentMethod: paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return order;
  }

  /**
   * Save order after successful payment
   */
  saveOrder(order: Order): Observable<Order> {
    this.orders.push(order);
    this.saveOrders();
    return of(order);
  }

  /**
   * Update order payment status
   */
  updatePaymentStatus(orderId: string, status: 'pending' | 'paid' | 'failed', transactionId?: string): Observable<Order | undefined> {
    const order = this.orders.find(o => o.id === orderId);

    if (order) {
      order.paymentStatus = status;
      order.updatedAt = new Date();

      if (transactionId) {
        order.transactionId = transactionId;
      }

      if (status === 'paid') {
        order.orderStatus = 'processing';
        order.paidAt = new Date();
      }

      this.saveOrders();
      return of(order);
    }

    return of(undefined);
  }

  /**
   * Get order by ID
   */
  getOrderById(orderId: string): Observable<Order | undefined> {
    const order = this.orders.find(o => o.id === orderId);
    return of(order);
  }

  /**
   * Get orders by user ID
   */
  getOrdersByUserId(userId: string): Observable<Order[]> {
    const userOrders = this.orders.filter(o => o.userId === userId);
    return of(userOrders);
  }

  /**
   * Get all orders (for admin)
   */
  getAllOrders(): Observable<Order[]> {
    return of(this.orders);
  }

  /**
   * Cancel order
   */
  cancelOrder(orderId: string): Observable<{ success: boolean; message: string }> {
    const order = this.orders.find(o => o.id === orderId);

    if (!order) {
      return of({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      return of({ success: false, message: 'Cannot cancel order that has been shipped' });
    }

    order.orderStatus = 'cancelled';
    order.updatedAt = new Date();
    this.saveOrders();

    return of({ success: true, message: 'Order cancelled successfully' });
  }

  /**
   * Clear all orders (for testing)
   */
  clearOrders(): void {
    this.orders = [];
    this.saveOrders();
  }
}
