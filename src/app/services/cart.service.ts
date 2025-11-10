import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cart, CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';
import { ValidationUtil } from '../utils/validation.util';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cart: Cart = {
    items: [],
    totalItems: 0,
    totalPrice: 0
  };

  private cartSubject = new BehaviorSubject<Cart>(this.cart);
  cart$ = this.cartSubject.asObservable();

  constructor() {
    // Load cart from localStorage if available
    this.loadCart();
  }

  private loadCart(): void {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      this.cart = JSON.parse(savedCart);
      this.cartSubject.next(this.cart);
    }
  }

  private saveCart(): void {
    localStorage.setItem('cart', JSON.stringify(this.cart));
    this.cartSubject.next(this.cart);
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
    this.saveCart();
    return { success: true, message: 'Product added to cart' };
  }

  removeFromCart(productId: string): void {
    this.cart.items = this.cart.items.filter(item => item.product.id !== productId);
    this.calculateTotals();
    this.saveCart();
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
    this.saveCart();
    return { success: true, message: 'Quantity updated' };
  }

  clearCart(): void {
    this.cart = {
      items: [],
      totalItems: 0,
      totalPrice: 0
    };
    this.saveCart();
  }

  getItemCount(): number {
    return this.cart.totalItems;
  }

  getTotalPrice(): number {
    return this.cart.totalPrice;
  }
}
