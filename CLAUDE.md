# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a hair bundles ecommerce Angular SPA built with Angular 17+ using standalone components. The application supports both buyer and seller workflows for purchasing and managing raw hair products.

## Development Commands

### Running the Application
```bash
npm start          # Start dev server at http://localhost:4200
ng serve           # Alternative using Angular CLI
```

### Building
```bash
ng build                                    # Production build (outputs to dist/)
ng build --configuration production         # Explicit production build
ng build --watch --configuration development # Watch mode for development
```

### Testing
```bash
ng test            # Run Jasmine/Karma unit tests
```

## Architecture

### Application Structure

This is an Angular 17+ application using **standalone components** (no NgModules). The app follows a service-based architecture with component-service separation.

**Key Architectural Points:**
- All components are standalone (no `app.module.ts`)
- Services use `providedIn: 'root'` for singleton behavior
- State management via RxJS BehaviorSubjects
- Client-side data persistence using localStorage
- Works standalone with mock data OR with optional Node.js backend (see Backend API section)

### Core Services

**ProductService** (`src/app/services/product.service.ts`)
- Manages in-memory product catalog with BehaviorSubject
- Provides filtering by category, price, length, texture, origin
- CRUD operations for seller dashboard
- All operations return Observables for consistency

**CartService** (`src/app/services/cart.service.ts`)
- Manages shopping cart state via BehaviorSubject
- Persists cart to localStorage automatically
- Handles add/remove/update quantity operations
- Calculates totals (items count and total price)

**AuthService** (`src/app/services/auth.service.ts`)
- Secure authentication with PBKDF2 password hashing
- Supports buyer and seller roles
- Uses encrypted storage via SecureStorageService
- Demo accounts (password: `DemoPassword123!`):
  - Buyer: `buyer@example.com`
  - Seller: `seller@example.com`

**PaymentService** (`src/app/services/payment.service.ts`)
- Stripe integration for payment processing
- Creates Stripe checkout sessions
- Handles payment confirmation flow
- Requires backend API for production use

**OrderService** (`src/app/services/order.service.ts`)
- Manages order creation and tracking
- Persists orders to localStorage (demo mode)
- Calculates totals with tax and shipping
- Integrates with PaymentService

**SecureStorageService** (`src/app/services/secure-storage.service.ts`)
- AES-GCM encrypted localStorage wrapper
- Device-specific encryption keys
- Replaces direct localStorage access for sensitive data

### Data Models

All TypeScript interfaces are in `src/app/models/`:
- `product.model.ts` - Product and ProductFilter interfaces
- `cart.model.ts` - Cart and CartItem interfaces
- `user.model.ts` - User interface with role-based types
- `order.model.ts` - Order-related interfaces

**Product categories:** `virgin-hair`, `remy-hair`, `synthetic`, `closure`, `frontal`
**Textures:** `straight`, `body-wave`, `deep-wave`, `curly`, `kinky`

### Routing

Routes defined in `src/app/app.routes.ts`:
- `/` - Product list (home)
- `/products` - Product list
- `/products/:id` - Product details
- `/cart` - Shopping cart
- `/checkout` - Checkout (protected: authGuard)
- `/order-success` - Order confirmation (protected: authGuard)
- `/auth/login` - Login
- `/auth/register` - Registration
- `/seller/dashboard` - Seller product management (protected: authGuard, roleGuard with role='seller')

**Route Guards:**
- `authGuard` (`src/app/guards/auth.guard.ts`) - Requires authentication
- `roleGuard` (`src/app/guards/role.guard.ts`) - Enforces role-based access control

### Component Organization

Components follow the pattern: `*.component.ts`, `*.component.html`, `*.component.css`

**User-facing components:**
- `header` - Navigation with cart count and auth links
- `product-list` - Product grid with filtering sidebar
- `product-details` - Single product view with add-to-cart
- `cart` - Cart items with quantity controls
- `checkout` - Multi-step checkout with Stripe payment
- `order-success` - Order confirmation page

**Seller components:**
- `seller-dashboard` - Product management CRUD interface

**Auth components:**
- `login` - Login form with password validation
- `register` - Registration form with role selection and password strength validation

### State Management Pattern

Services expose state via RxJS:
```typescript
private dataSubject = new BehaviorSubject<T>(initialValue);
data$ = this.dataSubject.asObservable();
```

Components subscribe to these observables in templates using `async` pipe or in component logic.

### TypeScript Configuration

The project uses **strict mode** (`tsconfig.json`):
- `strict: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `strictTemplates: true`

When writing code, ensure full type safety and avoid `any` types.

### Utility Modules

**crypto.util.ts** (`src/app/utils/crypto.util.ts`)
- PBKDF2 password hashing (100k iterations, SHA-256)
- AES-GCM encryption/decryption for localStorage
- Uses Web Crypto API for cryptographic operations
- Timing-attack resistant password verification

**validation.util.ts** (`src/app/utils/validation.util.ts`)
- Comprehensive input validation utilities
- Email, password strength, name, price, stock validation
- XSS protection through sanitization
- ZIP code format validation
- 15+ specialized validators

## Payment Integration

The application includes Stripe payment integration for secure payment processing:

### Stripe Setup
- `@stripe/stripe-js` SDK installed
- `PaymentService` handles Stripe integration
- `OrderService` manages order creation and tracking
- Order success page displays order details

### Environment Configuration
- Test/Production Stripe keys in `src/environments/`
- Publishable keys only (never secret keys client-side)
- API URL configuration for backend

### Order Flow
1. User adds items to cart
2. Proceeds to checkout
3. Selects payment method (Stripe or Mock)
4. Order created with totals (subtotal, shipping, tax)
5. Payment processed (requires backend for real Stripe)
6. Order saved and user redirected to success page

### Important Notes
- **Backend API required** for production Stripe payments
- Demo includes mock payment processing for testing
- See `PAYMENT_INTEGRATION.md` for complete setup guide
- Never store credit card data client-side
- All payment processing via Stripe Checkout (PCI compliant)

## Backend API (Optional)

A full-featured Node.js/Express backend is available in the `backend/` directory.

### Backend Stack
- **Node.js + Express** - REST API framework
- **MongoDB + Mongoose** - Database and ODM
- **JWT** - Authentication with bcrypt password hashing
- **Stripe** - Payment processing with webhook support
- **Security** - Helmet, CORS, rate limiting, input validation

### Running the Backend

```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev           # Start development server (port 3000)
npm start            # Start production server
npm run seed         # Seed database with sample data
```

### Backend API Endpoints

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT)
- `GET /api/auth/me` - Get current user (requires JWT)

**Products:**
- `GET /api/products` - Get all products (with filtering)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (seller only)
- `PUT /api/products/:id` - Update product (seller only)
- `DELETE /api/products/:id` - Delete product (seller only)

**Orders:**
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get single order

**Payments:**
- `POST /api/payments/create-checkout-session` - Create Stripe session
- `POST /api/payments/webhook` - Stripe webhook handler

### Connecting Frontend to Backend

1. The frontend is pre-configured to use `http://localhost:3000/api` (see `src/environments/environment.ts`)
2. Start both servers:
   - Backend: `cd backend && npm run dev` (port 3000)
   - Frontend: `npm start` (port 4200)
3. Frontend services will automatically use backend when `HttpClient` is provided

**Note:** Frontend currently works standalone with mock data. Backend integration is optional for demo purposes.

## Demo Data

Product data is hardcoded in `ProductService` constructor (6 sample products). User data is in `AuthService` (2 demo users). This makes the app immediately functional without a backend.

## Important Patterns

- **Standalone components**: Import all dependencies directly in component decorators
- **Reactive forms**: Used in checkout and auth components
- **Encrypted Storage**: User data encrypted using AES-GCM before localStorage
- **Observable patterns**: All async operations return Observables even for sync data
- **Subscription management**: Use takeUntil pattern to prevent memory leaks
- **Error handling**: All observables have error handlers

## Security Implementation

The application has been hardened with comprehensive security measures:

### Authentication
- Password hashing using PBKDF2 (100k iterations, SHA-256)
- Demo password: `DemoPassword123!` for both buyer@example.com and seller@example.com
- Encrypted session storage using Web Crypto API
- Located in: `src/app/utils/crypto.util.ts`, `src/app/services/secure-storage.service.ts`

### Authorization
- Functional route guards prevent unauthorized access
- `authGuard` - requires authentication, redirects to login
- `roleGuard` - enforces role-based permissions with route data
- Applied to `/checkout`, `/order-success` (auth) and `/seller/dashboard` (seller role)
- Includes returnUrl support for post-login redirects
- Located in: `src/app/guards/`

### Input Validation
- Comprehensive validation utility with 15+ validators
- Email, password strength, name, price, stock, quantity validation
- XSS protection through sanitization
- Located in: `src/app/utils/validation.util.ts`

### Memory Management
- All components implement `ngOnDestroy`
- Subscriptions use `takeUntil(destroy$)` pattern
- Prevents memory leaks from long-lived observables

### Stock & Price Security
- Cart service validates stock availability
- Price validation prevents manipulation
- Quantities checked against available stock
- Returns success/failure objects with messages

### Important Security Notes
- **Do NOT store credit card data** - removed from checkout
- **Payment processing** should use Stripe/PayPal SDKs
- **Backend required** for production - current implementation is demo-only
- See `SECURITY_IMPROVEMENTS.md` for complete security audit

## Additional Documentation

The project includes several comprehensive documentation files:

- **`SECURITY_IMPROVEMENTS.md`** - Complete security audit and hardening details
- **`backend/SECURITY.md`** - Backend security configuration (CSP, Helmet, rate limiting, authentication)
- **`SENTRY.md`** - Error monitoring setup and usage guide
- **`PAYMENT_INTEGRATION.md`** - Stripe payment setup guide with backend examples
- **`FULLSTACK_SETUP_GUIDE.md`** - Step-by-step guide to run frontend + backend
- **`backend/README.md`** - Backend API documentation and setup
- **`IMPLEMENTATION_SUMMARY.md`** - Feature implementation summary
- **`HTTPONLY_MIGRATION_GUIDE.md`** - HTTPOnly cookie security migration (if using backend)
- **`DOCKER.md`** - Docker containerization and deployment guide

Refer to these documents for detailed setup instructions and architectural decisions.
