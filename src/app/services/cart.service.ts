import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cart, CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';
import { ValidationUtil } from '../utils/validation.util';
import { SecureStorageService } from './secure-storage.service';

/**
 * Cart Service with Encrypted Storage
 *
 * SECURITY: Cart data is now encrypted in IndexedDB using non-extractable keys.
 * This prevents XSS attacks from reading or modifying cart contents/prices.
 */
@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_KEY = 'encrypted_cart';

  private cart: Cart = {
    items: [],
    totalItems: 0,
    totalPrice: 0
  };

  private cartSubject = new BehaviorSubject<Cart>(this.cart);
  cart$ = this.cartSubject.asObservable();

  constructor(private secureStorage: SecureStorageService) {
    // Load cart from encrypted storage
    this.loadCart();
  }

  /**
   * Load cart from encrypted IndexedDB storage
   * SECURITY: Uses AES-GCM encryption with non-extractable keys
   */
  private async loadCart(): Promise<void> {
    try {
      const savedCart = await this.secureStorage.getItem<Cart>(this.CART_KEY);
      if (savedCart) {
        this.cart = savedCart;
        this.cartSubject.next(this.cart);
      }
    } catch (error) {
      console.error('Error loading cart from secure storage:', error);
      // If decryption fails, start with empty cart
      this.cart = { items: [], totalItems: 0, totalPrice: 0 };
      this.cartSubject.next(this.cart);
    }
  }

  /**
   * Save cart to encrypted IndexedDB storage
   * SECURITY: Uses AES-GCM encryption with non-extractable keys
   */
  private async saveCart(): Promise<void> {
    try {
      await this.secureStorage.setItem(this.CART_KEY, this.cart);
      this.cartSubject.next(this.cart);
    } catch (error) {
      console.error('Error saving cart to secure storage:', error);
      // Still update the subject so UI reflects changes
      this.cartSubject.next(this.cart);
    }
  }

  private calculateTotals(): void {
    this.cart.totalItems = this.cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate price and validate each product price
    this.cart.totalPrice = this.cart.items.reduce((sum, item) => {
      // Validate price from product
      const priceValidation = ValidationUtil.validatePrice(item.product.price);
      if (!priceValidation.valid) {
        console.error('Invalid product price detected:', item.product.name, item.product.price);
        return sum;
      }
      return sum + (item.product.price * item.quantity);
    }, 0);

    // Round to 2 decimal places to avoid floating point errors
    this.cart.totalPrice = Math.round(this.cart.totalPrice * 100) / 100;
  }

  getCart(): Observable<Cart> {
    return this.cart$;
  }

  addToCart(product: Product, quantity: number = 1): { success: boolean; message: string } {
    // Validate quantity
    const quantityValidation = ValidationUtil.validateQuantity(quantity, product.stock);
    if (!quantityValidation.valid) {
      return { success: false, message: quantityValidation.message };
    }

    const existingItem = this.cart.items.find(item => item.product.id === product.id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      // Check stock availability
      if (newQuantity > product.stock) {
        return {
          success: false,
          message: `Cannot add ${quantity} more. Only ${product.stock - existingItem.quantity} items available.`
        };
      }

      existingItem.quantity = newQuantity;
    } else {
      // Verify product stock is available
      if (quantity > product.stock) {
        return {
          success: false,
          message: `Only ${product.stock} items available in stock.`
        };
      }

      this.cart.items.push({ product, quantity });
    }

    this.calculateTotals();
    // Save asynchronously (fire and forget - UI is already updated via subject)
    this.saveCart().catch(err => console.error('Failed to persist cart:', err));
    return { success: true, message: 'Product added to cart' };
  }

  removeFromCart(productId: string): void {
    this.cart.items = this.cart.items.filter(item => item.product.id !== productId);
    this.calculateTotals();
    this.saveCart().catch(err => console.error('Failed to persist cart:', err));
  }

  updateQuantity(productId: string, quantity: number): { success: boolean; message: string } {
    const item = this.cart.items.find(item => item.product.id === productId);
    if (!item) {
      return { success: false, message: 'Item not found in cart' };
    }

    if (quantity <= 0) {
      this.removeFromCart(productId);
      return { success: true, message: 'Item removed from cart' };
    }

    // Validate quantity
    const quantityValidation = ValidationUtil.validateQuantity(quantity, item.product.stock);
    if (!quantityValidation.valid) {
      return { success: false, message: quantityValidation.message };
    }

    item.quantity = quantity;
    this.calculateTotals();
    this.saveCart().catch(err => console.error('Failed to persist cart:', err));
    return { success: true, message: 'Quantity updated' };
  }

  clearCart(): void {
    this.cart = {
      items: [],
      totalItems: 0,
      totalPrice: 0
    };
    this.saveCart().catch(err => console.error('Failed to persist cart:', err));
  }

  getItemCount(): number {
    return this.cart.totalItems;
  }

  getTotalPrice(): number {
    return this.cart.totalPrice;
  }
}
