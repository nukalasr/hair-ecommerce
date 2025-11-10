# Hair Ecommerce Backend API

Production-ready REST API for the Hair Bundles Ecommerce application built with Node.js, Express, MongoDB, and Stripe.

## Features

- 🔐 **JWT Authentication** with secure password hashing (bcrypt)
- 💳 **Stripe Payment Integration** with webhook support
- 📦 **Order Management** with status tracking
- 🛍️ **Product CRUD** with advanced filtering
- 🔒 **Security Hardening** (Helmet, CORS, Rate Limiting)
- ✅ **Input Validation** with express-validator
- 📊 **MongoDB** with Mongoose ODM
- 🚀 **Production Ready** with error handling and logging

---

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- Stripe Account

### Installation

```bash
cd backend
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables in `.env`:
```env
# Required
MONGODB_URI=mongodb://localhost:27017/hair-ecommerce
JWT_SECRET=your-super-secret-jwt-key-min-256-bits
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=http://localhost:4200

# Optional (has defaults)
PORT=3000
NODE_ENV=development
```

### Database Setup

**Option 1: Local MongoDB**
```bash
# Install MongoDB
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Connection string
MONGODB_URI=mongodb://localhost:27017/hair-ecommerce
```

**Option 2: MongoDB Atlas (Cloud)**
```bash
# Sign up at https://www.mongodb.com/cloud/atlas
# Create cluster and get connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hair-ecommerce
```

### Stripe Setup

1. Sign up at [https://stripe.com](https://stripe.com)
2. Get your API keys from Dashboard → Developers → API Keys
3. Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

4. Set up webhooks:
   - Go to Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-api-url.com/api/payments/webhook`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy webhook secret to `.env`

### Run the Server

```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

Server will start at `http://localhost:3000`

---

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

All authenticated routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## API Endpoints

### 📍 Authentication (`/api/auth`)

#### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!@#",
  "role": "buyer"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "buyer"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!@#"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Update User Details
```http
PUT /api/auth/updatedetails
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "phone": "555-1234"
}
```

#### Update Password
```http
PUT /api/auth/updatepassword
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!@#",
  "newPassword": "NewPass123!@#"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

### 📦 Products (`/api/products`)

#### Get All Products
```http
GET /api/products?category=virgin-hair&minPrice=50&maxPrice=200&page=1&limit=20
```

**Query Parameters:**
- `category`: virgin-hair, remy-hair, synthetic, closure, frontal, wig
- `texture`: straight, wavy, curly, kinky, body-wave, deep-wave
- `origin`: brazilian, peruvian, malaysian, indian, cambodian, vietnamese
- `minPrice`, `maxPrice`: Price range
- `minLength`, `maxLength`: Length range (8-40 inches)
- `inStock`: true/false
- `featured`: true/false
- `search`: Text search
- `sort`: price-asc, price-desc, name-asc, name-desc, rating, newest
- `page`, `limit`: Pagination

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "data": [...]
}
```

#### Get Single Product
```http
GET /api/products/:id
```

#### Create Product (Seller/Admin)
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Brazilian Virgin Hair Bundle",
  "description": "Premium quality Brazilian virgin hair...",
  "price": 149.99,
  "category": "virgin-hair",
  "texture": "straight",
  "length": 20,
  "origin": "brazilian",
  "stock": 50,
  "imageUrl": "https://example.com/image.jpg"
}
```

#### Update Product (Seller/Admin - own products)
```http
PUT /api/products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "price": 129.99,
  "stock": 45
}
```

#### Delete Product (Seller/Admin - own products)
```http
DELETE /api/products/:id
Authorization: Bearer <token>
```

---

### 💳 Payments (`/api/payments`)

#### Create Stripe Checkout Session
```http
POST /api/payments/create-checkout-session
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "product": "product_id_here",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "billingAddress": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### Stripe Webhook (Called by Stripe)
```http
POST /api/payments/webhook
Stripe-Signature: <signature>
Content-Type: application/json

{
  "type": "checkout.session.completed",
  "data": { ... }
}
```

---

### 📋 Orders (`/api/orders`)

#### Get All Orders (User's own or all for admin)
```http
GET /api/orders
Authorization: Bearer <token>
```

#### Get Single Order
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

#### Create Order (Mock Payment)
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "product": "product_id",
      "quantity": 1
    }
  ],
  "shippingAddress": { ... },
  "billingAddress": { ... },
  "paymentMethod": "mock"
}
```

#### Update Order Status (Admin/Seller)
```http
PUT /api/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "shipped",
  "trackingNumber": "1Z999AA10123456784"
}
```

#### Cancel Order
```http
PUT /api/orders/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

---

## Security Features

### Implemented Security Measures

1. **Authentication**
   - JWT tokens with expiration
   - Bcrypt password hashing (12 rounds)
   - Account locking after failed login attempts
   - Secure password requirements (12+ chars, mixed case, numbers, special chars)

2. **Authorization**
   - Role-based access control (buyer, seller, admin)
   - Ownership verification for resources

3. **Input Validation**
   - express-validator for all inputs
   - MongoDB query sanitization
   - XSS prevention

4. **Rate Limiting**
   - 100 requests per 15 minutes per IP
   - Configurable via environment variables

5. **HTTP Security Headers**
   - Helmet.js for security headers
   - CORS configuration
   - Content Security Policy

6. **Error Handling**
   - No sensitive data in error responses
   - Stack traces only in development
   - Custom error messages

---

## Database Models

### User
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  role: String (buyer/seller/admin),
  phone: String,
  address: Object,
  isActive: Boolean,
  loginAttempts: Number,
  lockUntil: Date
}
```

### Product
```javascript
{
  name: String,
  description: String,
  price: Number,
  category: String,
  texture: String,
  length: Number,
  origin: String,
  stock: Number,
  imageUrl: String,
  rating: Number,
  numReviews: Number,
  seller: ObjectId (ref: User),
  isActive: Boolean,
  isFeatured: Boolean
}
```

### Order
```javascript
{
  orderNumber: String (auto-generated),
  user: ObjectId (ref: User),
  items: Array,
  shippingAddress: Object,
  billingAddress: Object,
  subtotal: Number,
  shipping: Number,
  tax: Number,
  total: Number,
  paymentMethod: String,
  paymentStatus: String (pending/paid/failed/refunded),
  orderStatus: String (pending/processing/shipped/delivered/cancelled),
  stripePaymentIntentId: String,
  trackingNumber: String,
  paidAt: Date
}
```

---

## Testing

### Manual Testing with cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "TestPass123!@#"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!@#"
  }'

# Get products
curl http://localhost:3000/api/products
```

### Testing with Postman

Import this collection:
```
File → Import → Link → https://www.postman.com/collections/...
```

---

## Deployment

### Heroku Deployment

```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login
heroku login

# Create app
heroku create hair-ecommerce-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_atlas_uri
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
heroku config:set FRONTEND_URL=https://your-frontend-url.com

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<256-bit-secure-random-string>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://your-frontend-url.com
BCRYPT_ROUNDS=12
```

---

## Troubleshooting

### Database Connection Failed

**Error:** `MongoNetworkError: failed to connect to server`

**Solution:**
- Check MongoDB is running: `brew services list`
- Check connection string in `.env`
- For Atlas: Check IP whitelist

### Stripe Webhook Not Working

**Error:** `Webhook signature verification failed`

**Solution:**
- Verify webhook secret in `.env`
- Check endpoint URL in Stripe dashboard
- Ensure using raw body for webhook route

### JWT Token Invalid

**Error:** `Invalid or expired token`

**Solution:**
- Check JWT_SECRET matches between requests
- Token may have expired (default 7 days)
- Get new token by logging in again

---

## Project Structure

```
backend/
├── config/
│   ├── database.js         # MongoDB connection
│   └── stripe.js           # Stripe configuration
├── controllers/
│   ├── authController.js   # Authentication logic
│   ├── productController.js # Product CRUD
│   ├── orderController.js  # Order management
│   └── paymentController.js # Stripe integration
├── middleware/
│   ├── auth.js             # JWT authentication
│   ├── errorHandler.js     # Global error handling
│   └── validators.js       # Input validation
├── models/
│   ├── User.js             # User schema
│   ├── Product.js          # Product schema
│   └── Order.js            # Order schema
├── routes/
│   ├── auth.js             # Auth routes
│   ├── products.js         # Product routes
│   ├── orders.js           # Order routes
│   └── payments.js         # Payment routes
├── .env.example            # Environment template
├── package.json            # Dependencies
├── server.js               # App entry point
└── README.md              # This file
```

---

## Support

For issues and questions:
- Check the troubleshooting section
- Review environment variables
- Check server logs: `npm run dev`
- Verify database connection
- Test with Postman/cURL

---

**Version:** 1.0.0
**Last Updated:** 2025-01-08
