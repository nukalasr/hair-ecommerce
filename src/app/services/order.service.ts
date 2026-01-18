import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Order } from '../models/order.model';
import { Cart } from '../models/cart.model';
import { User } from '../models/user.model';
import { ValidationUtil } from '../utils/validation.util';
import { SecureStorageService } from './secure-storage.service';

/**
 * Order Service
 * Manages order creation and history
 *
 * SECURITY: Orders now use encrypted storage (SecureStorageService) to protect customer PII
 * NOTE: In production, orders should be stored server-side only
 */
@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  orders$ = this.ordersSubject.asObservable();

  private orders: Order[] = [];
  private readonly ORDERS_KEY = 'encrypted_orders';

  constructor(private secureStorage: SecureStorageService) {
    this.loadOrders();
  }

  /**
   * Load orders from encrypted storage
   * SECURITY: Uses AES-GCM encryption to protect customer data
   */
  private async loadOrders(): Promise<void> {
    try {
      const savedOrders = await this.secureStorage.getItem<Order[]>(this.ORDERS_KEY);
      if (savedOrders && Array.isArray(savedOrders)) {
        this.orders = savedOrders;
        this.ordersSubject.next(this.orders);
      }
    } catch (error) {
      console.error('Error loading orders from secure storage:', error);
      // If decryption fails, clear corrupted data
      await this.secureStorage.removeItem(this.ORDERS_KEY);
      this.orders = [];
      this.ordersSubject.next(this.orders);
    }
  }

  /**
   * Save orders to encrypted storage
   * SECURITY: Uses AES-GCM encryption to protect customer data
   */
  private async saveOrders(): Promise<void> {
    try {
      await this.secureStorage.setItem(this.ORDERS_KEY, this.orders);
      this.ordersSubject.next(this.orders);
    } catch (error) {
      console.error('Error saving orders to secure storage:', error);
      throw error;
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
   * SECURITY: Now uses encrypted storage to protect customer data
   */
  async saveOrder(order: Order): Promise<Order> {
    this.orders.push(order);
    await this.saveOrders();
    return order;
  }

  /**
   * Update order payment status
   * SECURITY: Uses encrypted storage
   */
  async updatePaymentStatus(orderId: string, status: 'pending' | 'paid' | 'failed', transactionId?: string): Promise<Order | undefined> {
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

      await this.saveOrders();
      return order;
    }

    return undefined;
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
   * SECURITY: Uses encrypted storage
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    const order = this.orders.find(o => o.id === orderId);

    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      return { success: false, message: 'Cannot cancel order that has been shipped' };
    }

    order.orderStatus = 'cancelled';
    order.updatedAt = new Date();
    await this.saveOrders();

    return { success: true, message: 'Order cancelled successfully' };
  }

  /**
   * Clear all orders (for testing)
   * SECURITY: Uses encrypted storage
   */
  async clearOrders(): Promise<void> {
    this.orders = [];
    await this.saveOrders();
  }
}
