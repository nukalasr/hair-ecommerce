import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { Product, ProductFilter } from '../../models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  filter: ProductFilter = {};
  private destroy$ = new Subject<void>();

  categories = ['virgin-hair', 'remy-hair', 'synthetic', 'closure', 'frontal'];
  textures = ['straight', 'body-wave', 'deep-wave', 'curly', 'kinky'];
  origins = ['Brazilian', 'Peruvian', 'Malaysian', 'Indian'];
  lengths = [12, 14, 16, 18, 20, 22, 24, 26];

  constructor(
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.productService.getAllProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.filteredProducts = products;
        },
        error: (error) => {
          console.error('Error loading products:', error);
          alert('Failed to load products. Please try again.');
        }
      });
  }

  applyFilter(): void {
    this.productService.filterProducts(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.filteredProducts = products;
        },
        error: (error) => {
          console.error('Error filtering products:', error);
          alert('Failed to filter products. Please try again.');
        }
      });
  }

  clearFilter(): void {
    this.filter = {};
    this.filteredProducts = this.products;
  }

  addToCart(product: Product): void {
    const result = this.cartService.addToCart(product, 1);
    if (result.success) {
      alert(`${product.name} added to cart!`);
    } else {
      alert(result.message);
    }
  }
}
