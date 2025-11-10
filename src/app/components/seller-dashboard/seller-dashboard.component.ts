import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seller-dashboard.component.html',
  styleUrls: ['./seller-dashboard.component.css']
})
export class SellerDashboardComponent implements OnInit {
  products: Product[] = [];
  showAddForm: boolean = false;
  editingProduct: Product | null = null;

  newProduct: Partial<Product> = {
    name: '',
    description: '',
    price: 0,
    category: 'virgin-hair',
    length: 18,
    texture: 'straight',
    color: 'Natural Black',
    origin: 'Brazilian',
    stock: 0,
    imageUrl: 'https://via.placeholder.com/300x400?text=Hair+Bundle',
    rating: 0,
    reviews: 0
  };

  categories = ['virgin-hair', 'remy-hair', 'synthetic', 'closure', 'frontal'];
  textures = ['straight', 'body-wave', 'deep-wave', 'curly', 'kinky'];
  origins = ['Brazilian', 'Peruvian', 'Malaysian', 'Indian'];
  lengths = [12, 14, 16, 18, 20, 22, 24, 26];

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !this.authService.isSeller()) {
      alert('Access denied. Seller account required.');
      this.router.navigate(['/']);
      return;
    }

    this.loadSellerProducts(user.id);
  }

  loadSellerProducts(sellerId: string): void {
    this.productService.getProductsBySeller(sellerId).subscribe(products => {
      this.products = products;
    });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  addProduct(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const product: Product = {
      id: 'prod_' + Date.now(),
      name: this.newProduct.name || '',
      description: this.newProduct.description || '',
      price: this.newProduct.price || 0,
      category: this.newProduct.category as any || 'virgin-hair',
      length: this.newProduct.length || 18,
      texture: this.newProduct.texture as any || 'straight',
      color: this.newProduct.color || 'Natural Black',
      origin: this.newProduct.origin || 'Brazilian',
      stock: this.newProduct.stock || 0,
      imageUrl: this.newProduct.imageUrl || 'https://via.placeholder.com/300x400?text=Hair+Bundle',
      sellerId: user.id,
      rating: 0,
      reviews: 0,
      createdAt: new Date()
    };

    this.productService.addProduct(product).subscribe(() => {
      this.loadSellerProducts(user.id);
      this.toggleAddForm();
      alert('Product added successfully!');
    });
  }

  editProduct(product: Product): void {
    this.editingProduct = { ...product };
  }

  saveProduct(): void {
    if (!this.editingProduct) return;

    this.productService.updateProduct(this.editingProduct.id, this.editingProduct).subscribe(() => {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.loadSellerProducts(user.id);
      }
      this.editingProduct = null;
      alert('Product updated successfully!');
    });
  }

  cancelEdit(): void {
    this.editingProduct = null;
  }

  deleteProduct(id: string): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.productService.deleteProduct(id).subscribe(() => {
        const user = this.authService.getCurrentUser();
        if (user) {
          this.loadSellerProducts(user.id);
        }
        alert('Product deleted successfully!');
      });
    }
  }

  resetForm(): void {
    this.newProduct = {
      name: '',
      description: '',
      price: 0,
      category: 'virgin-hair',
      length: 18,
      texture: 'straight',
      color: 'Natural Black',
      origin: 'Brazilian',
      stock: 0,
      imageUrl: 'https://via.placeholder.com/300x400?text=Hair+Bundle',
      rating: 0,
      reviews: 0
    };
  }
}
