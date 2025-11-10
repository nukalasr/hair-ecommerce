export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'virgin-hair' | 'remy-hair' | 'synthetic' | 'closure' | 'frontal';
  length: number; // in inches
  texture: 'straight' | 'body-wave' | 'deep-wave' | 'curly' | 'kinky';
  color: string;
  origin: string; // e.g., Brazilian, Peruvian, Malaysian
  stock: number;
  imageUrl: string;
  sellerId: string;
  rating: number;
  reviews: number;
  createdAt: Date;
}

export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  length?: number;
  texture?: string;
  color?: string;
  origin?: string;
}
