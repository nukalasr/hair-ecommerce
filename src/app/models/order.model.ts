import { Address } from './user.model';

/**
 * Order Item Interface
 * Represents a product in an order with snapshot of price at time of purchase
 */
export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  subtotal: number;
}

/**
 * Order Interface
 * Represents a complete order with payment and shipping details
 */
export interface Order {
  // Identification
  id: string;
  userId: string;
  userEmail: string;
  userName: string;

  // Order Items
  items: OrderItem[];

  // Address Information
  shippingAddress: Address;
  billingAddress: Address;

  // Pricing Breakdown
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;

  // Payment Information
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  transactionId?: string;
  paidAt?: Date;

  // Order Status
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Optional Fields
  estimatedDelivery?: Date;
  trackingNumber?: string;
}
