import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Product, ProductFilter } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private products: Product[] = [
    {
      id: '1',
      name: 'Brazilian Straight Hair Bundle',
      description: '100% Virgin Brazilian straight hair, soft and silky texture',
      price: 89.99,
      category: 'virgin-hair',
      length: 18,
      texture: 'straight',
      color: 'Natural Black',
      origin: 'Brazilian',
      stock: 25,
      imageUrl: 'https://via.placeholder.com/300x400?text=Brazilian+Straight',
      sellerId: 'seller1',
      rating: 4.8,
      reviews: 124,
      createdAt: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'Peruvian Body Wave',
      description: 'Premium Peruvian body wave hair with natural bounce',
      price: 99.99,
      category: 'virgin-hair',
      length: 20,
      texture: 'body-wave',
      color: 'Natural Black',
      origin: 'Peruvian',
      stock: 30,
      imageUrl: 'https://via.placeholder.com/300x400?text=Peruvian+Body+Wave',
      sellerId: 'seller2',
      rating: 4.9,
      reviews: 98,
      createdAt: new Date('2024-02-10')
    },
    {
      id: '3',
      name: 'Malaysian Deep Wave Bundle',
      description: 'Deep wave texture with natural shine and minimal shedding',
      price: 109.99,
      category: 'virgin-hair',
      length: 22,
      texture: 'deep-wave',
      color: 'Natural Black',
      origin: 'Malaysian',
      stock: 20,
      imageUrl: 'https://via.placeholder.com/300x400?text=Malaysian+Deep+Wave',
      sellerId: 'seller1',
      rating: 4.7,
      reviews: 76,
      createdAt: new Date('2024-03-05')
    },
    {
      id: '4',
      name: 'Indian Curly Hair',
      description: 'Natural curly Indian hair, bouncy and voluminous',
      price: 119.99,
      category: 'remy-hair',
      length: 16,
      texture: 'curly',
      color: 'Natural Black',
      origin: 'Indian',
      stock: 15,
      imageUrl: 'https://via.placeholder.com/300x400?text=Indian+Curly',
      sellerId: 'seller3',
      rating: 4.6,
      reviews: 54,
      createdAt: new Date('2024-04-20')
    },
    {
      id: '5',
      name: 'Brazilian Kinky Straight',
      description: 'Kinky straight texture perfect for natural look',
      price: 94.99,
      category: 'virgin-hair',
      length: 14,
      texture: 'kinky',
      color: 'Natural Black',
      origin: 'Brazilian',
      stock: 22,
      imageUrl: 'https://via.placeholder.com/300x400?text=Kinky+Straight',
      sellerId: 'seller2',
      rating: 4.8,
      reviews: 89,
      createdAt: new Date('2024-05-15')
    },
    {
      id: '6',
      name: 'HD Lace Frontal Closure',
      description: '13x4 HD lace frontal, pre-plucked with baby hair',
      price: 79.99,
      category: 'frontal',
      length: 18,
      texture: 'straight',
      color: 'Natural Black',
      origin: 'Brazilian',
      stock: 18,
      imageUrl: 'https://via.placeholder.com/300x400?text=Lace+Frontal',
      sellerId: 'seller1',
      rating: 4.9,
      reviews: 142,
      createdAt: new Date('2024-06-01')
    }
  ];

  private productsSubject = new BehaviorSubject<Product[]>(this.products);
  products$ = this.productsSubject.asObservable();

  constructor() { }

  getAllProducts(): Observable<Product[]> {
    return this.products$;
  }

  getProductById(id: string): Observable<Product | undefined> {
    const product = this.products.find(p => p.id === id);
    return of(product);
  }

  getProductsBySeller(sellerId: string): Observable<Product[]> {
    const sellerProducts = this.products.filter(p => p.sellerId === sellerId);
    return of(sellerProducts);
  }

  filterProducts(filter: ProductFilter): Observable<Product[]> {
    let filtered = [...this.products];

    if (filter.category) {
      filtered = filtered.filter(p => p.category === filter.category);
    }
    if (filter.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= filter.minPrice!);
    }
    if (filter.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= filter.maxPrice!);
    }
    if (filter.length) {
      filtered = filtered.filter(p => p.length === filter.length);
    }
    if (filter.texture) {
      filtered = filtered.filter(p => p.texture === filter.texture);
    }
    if (filter.origin) {
      filtered = filtered.filter(p => p.origin === filter.origin);
    }

    return of(filtered);
  }

  addProduct(product: Product): Observable<Product> {
    this.products.push(product);
    this.productsSubject.next(this.products);
    return of(product);
  }

  updateProduct(id: string, updates: Partial<Product>): Observable<Product | undefined> {
    const index = this.products.findIndex(p => p.id === id);
    if (index !== -1) {
      this.products[index] = { ...this.products[index], ...updates };
      this.productsSubject.next(this.products);
      return of(this.products[index]);
    }
    return of(undefined);
  }

  deleteProduct(id: string): Observable<boolean> {
    const index = this.products.findIndex(p => p.id === id);
    if (index !== -1) {
      this.products.splice(index, 1);
      this.productsSubject.next(this.products);
      return of(true);
    }
    return of(false);
  }
}
