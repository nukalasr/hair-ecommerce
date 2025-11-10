# Hair Bundles Ecommerce - Angular SPA

A full-featured ecommerce Single Page Application (SPA) built with Angular for buying and selling raw hair bundles.

## Features

### For Buyers
- Browse products with advanced filtering (category, texture, length, price, origin)
- View detailed product information
- Add products to shopping cart
- Update cart quantities
- Complete checkout process
- User authentication (login/register)
- Persistent cart (localStorage)

### For Sellers
- Seller dashboard to manage products
- Add new products
- Edit existing products
- Delete products
- View product statistics (ratings, reviews, stock)

### Technical Features
- Angular 17+ with standalone components
- Reactive forms and services
- RxJS for state management
- Routing with lazy loading support
- Responsive design (mobile-friendly)
- LocalStorage for cart and authentication
- TypeScript strict mode

## Project Structure

```
hair-ecommerce/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── header/              # Navigation header
│   │   │   ├── product-list/        # Product listing with filters
│   │   │   ├── product-details/     # Individual product page
│   │   │   ├── cart/                # Shopping cart
│   │   │   ├── checkout/            # Checkout process
│   │   │   ├── auth/                # Login & Register
│   │   │   └── seller-dashboard/    # Seller product management
│   │   ├── models/                  # TypeScript interfaces
│   │   │   ├── product.model.ts
│   │   │   ├── cart.model.ts
│   │   │   ├── user.model.ts
│   │   │   └── order.model.ts
│   │   ├── services/                # Business logic services
│   │   │   ├── product.service.ts
│   │   │   ├── cart.service.ts
│   │   │   └── auth.service.ts
│   │   ├── app.component.ts         # Root component
│   │   ├── app.routes.ts            # Route configuration
│   │   └── app.config.ts            # App configuration
│   ├── styles.css                   # Global styles
│   └── index.html                   # Entry HTML
├── angular.json                     # Angular CLI config
├── package.json                     # Dependencies
└── tsconfig.json                    # TypeScript config
```

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI (v17 or higher)

### Step 1: Install Node.js
Download and install Node.js from [nodejs.org](https://nodejs.org/)

### Step 2: Install Angular CLI
```bash
npm install -g @angular/cli
```

### Step 3: Install Dependencies
Navigate to the project directory and run:
```bash
cd hair-ecommerce
npm install
```

### Step 4: Run the Application
```bash
npm start
# or
ng serve
```

The application will be available at `http://localhost:4200`

## Usage

### Demo Accounts

**Buyer Account:**
- Email: `buyer@example.com`
- Password: any password

**Seller Account:**
- Email: `seller@example.com`
- Password: any password

### Buyer Workflow
1. Browse products on the home page
2. Use filters to find specific products
3. Click on a product to view details
4. Add products to cart
5. Navigate to cart to review items
6. Proceed to checkout (requires login)
7. Fill in shipping/billing address
8. Select payment method
9. Place order

### Seller Workflow
1. Register as a seller or login with seller account
2. Navigate to "My Products" in the header
3. Click "Add New Product" to create a listing
4. Fill in product details (name, price, description, etc.)
5. Manage existing products (edit/delete)
6. View product statistics

## Payment Integration

This application includes **Stripe payment integration** for secure payment processing.

### Features
- Stripe Checkout for PCI-compliant payment processing
- Order management with payment tracking
- Mock payment mode for testing without backend
- Order confirmation page with details
- Automatic tax and shipping calculation

### Setup Required

To enable real Stripe payments, you need:

1. **Stripe Account** - Create at https://stripe.com
2. **Backend API** - Server to create payment sessions (Node.js example provided)
3. **Configuration** - Add Stripe keys to environment files

**See `PAYMENT_INTEGRATION.md` for complete setup instructions.**

### Demo Mode

Without a backend, use "Mock Payment" to test the checkout flow:
- No real payment processing
- Orders saved locally
- Full order confirmation experience

## API Integration

This application currently uses mock data stored in-memory. To integrate with a real backend:

1. Update the services in `src/app/services/` to make HTTP calls
2. Replace mock data with API endpoints
3. Add HTTP client module to `app.config.ts`
4. Implement proper error handling

Example:
```typescript
import { HttpClient } from '@angular/common/http';

constructor(private http: HttpClient) {}

getAllProducts(): Observable<Product[]> {
  return this.http.get<Product[]>('https://your-api.com/products');
}
```

### Payment Backend

For Stripe payments, see the complete backend example in `PAYMENT_INTEGRATION.md` including:
- Creating checkout sessions
- Handling webhooks
- Order confirmation
- Refund processing

## Building for Production

```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## Testing

Run unit tests:
```bash
ng test
```

Run end-to-end tests:
```bash
ng e2e
```

## Customization

### Adding New Product Categories
Edit `src/app/models/product.model.ts` and add to the category type:
```typescript
category: 'virgin-hair' | 'remy-hair' | 'synthetic' | 'closure' | 'frontal' | 'your-new-category';
```

### Changing Theme Colors
Edit `src/styles.css` and update the color variables:
```css
/* Primary color (purple) */
background-color: #4a148c;

/* Secondary color */
background-color: #757575;
```

### Adding New Payment Methods
Edit `src/app/components/checkout/checkout.component.ts`:
```typescript
paymentMethod: 'credit-card' | 'debit-card' | 'paypal' | 'cash-on-delivery' | 'your-new-method';
```

## Future Enhancements

- [ ] Product reviews and ratings system
- [ ] Order history for buyers
- [ ] Order management for sellers
- [ ] Email notifications
- [ ] Advanced search with autocomplete
- [ ] Wishlist functionality
- [ ] Product comparison
- [ ] Social media sharing
- [ ] Multiple product images
- [ ] Video product demonstrations
- [ ] Live chat support
- [ ] Analytics dashboard for sellers

## Technologies Used

- **Angular 17+** - Framework
- **TypeScript** - Programming language
- **RxJS** - Reactive programming
- **CSS3** - Styling
- **LocalStorage** - Client-side storage

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please open an issue in the project repository.

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request
