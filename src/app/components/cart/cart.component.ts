import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { Cart, CartItem } from '../../models/cart.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  cart: Cart = { items: [], totalItems: 0, totalPrice: 0 };
  private destroy$ = new Subject<void>();

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cart) => {
          this.cart = cart;
        },
        error: (error) => {
          console.error('Error loading cart:', error);
          alert('Failed to load cart. Please refresh the page.');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateQuantity(productId: string, quantity: number): void {
    const result = this.cartService.updateQuantity(productId, quantity);
    if (!result.success) {
      alert(result.message);
      // Reload cart to reflect actual quantities
      this.cartService.getCart().subscribe(cart => {
        this.cart = cart;
      });
    }
  }

  removeItem(productId: string): void {
    if (confirm('Are you sure you want to remove this item?')) {
      this.cartService.removeFromCart(productId);
    }
  }

  clearCart(): void {
    if (confirm('Are you sure you want to clear your cart?')) {
      this.cartService.clearCart();
    }
  }

  getItemSubtotal(item: CartItem): number {
    return item.product.price * item.quantity;
  }
}
