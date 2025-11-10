import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.css']
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  product: Product | undefined;
  quantity: number = 1;
  loading: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProduct(id);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProduct(id: string): void {
    this.productService.getProductById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          this.product = product;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading product:', error);
          this.loading = false;
        }
      });
  }

  addToCart(): void {
    if (this.product) {
      const result = this.cartService.addToCart(this.product, this.quantity);
      if (result.success) {
        alert(`${this.quantity} x ${this.product.name} added to cart!`);
      } else {
        alert(result.message);
      }
    }
  }

  buyNow(): void {
    if (this.product) {
      const result = this.cartService.addToCart(this.product, this.quantity);
      if (result.success) {
        this.router.navigate(['/cart']);
      } else {
        alert(result.message);
      }
    }
  }

  incrementQuantity(): void {
    if (this.product && this.quantity < this.product.stock) {
      this.quantity++;
    }
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }
}
