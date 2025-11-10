# Full-Stack Setup Guide
# Hair Ecommerce Application - Frontend + Backend

Complete guide to set up and run the full-stack hair ecommerce application with Angular frontend and Node.js backend.

---

## 🎯 Overview

This guide will help you:
1. Set up MongoDB database
2. Configure and run the backend API
3. Configure and run the Angular frontend
4. Connect everything together
5. Test with Stripe payments

**Total Setup Time:** ~30 minutes

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- ✅ **npm** >= 9.0.0 (comes with Node.js)
- ✅ **MongoDB** (local or Atlas account)
- ✅ **Stripe Account** ([Sign up](https://stripe.com))
- ✅ **Angular CLI** >= 17.0.0
- ✅ **Git** (optional, for version control)

### Verify Installation

```bash
node --version   # Should be >= 18.0.0
npm --version    # Should be >= 9.0.0
ng version       # Should be >= 17.0.0
```

---

## 🗄️ Step 1: Database Setup

### Option A: Local MongoDB (Recommended for Development)

**macOS:**
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
brew services list | grep mongodb
```

**Windows:**
```bash
# Download from https://www.mongodb.com/try/download/community
# Install and run as service
# MongoDB will be available at mongodb://localhost:27017
```

**Linux (Ubuntu):**
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Option B: MongoDB Atlas (Cloud - Free Tier Available)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create new cluster (M0 free tier)
4. Wait for cluster to deploy (~5 minutes)
5. Click "Connect" → "Connect your application"
6. Copy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/hair-ecommerce
   ```
7. Add your IP to whitelist (or allow from anywhere for testing: 0.0.0.0/0)

---

## 🔧 Step 2: Backend Setup

### 2.1 Navigate to Backend Directory

```bash
cd hair-ecommerce/backend
```

### 2.2 Install Dependencies

```bash
npm install
```

This will install:
- express (Web framework)
- mongoose (MongoDB ODM)
- stripe (Payment processing)
- jsonwebtoken (Authentication)
- bcryptjs (Password hashing)
- And more...

### 2.3 Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server
NODE_ENV=development
PORT=3000

# Database (choose one)
# Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/hair-ecommerce

# MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hair-ecommerce

# JWT Secret (generate a random 256-bit string)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-random-min-256-bits
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Stripe (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend URL
FRONTEND_URL=http://localhost:4200

# Security Settings
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### 2.4 Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Sign up / Log in
3. Click "Developers" → "API keys"
4. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)
5. Add to `.env` file

### 2.5 Seed Sample Data (Optional but Recommended)

```bash
npm run seed
```

This creates:
- **3 demo users** (buyer, seller, admin)
- **8 sample products**

**Demo Accounts:**
```
Buyer:  buyer@example.com / DemoPassword123!
Seller: seller@example.com / DemoPassword123!
Admin:  admin@example.com / AdminPassword123!
```

### 2.6 Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

**You should see:**
```
╔════════════════════════════════════════╗
║   Hair Ecommerce API Server            ║
║   Environment: DEVELOPMENT             ║
║   Port: 3000                           ║
║   Status: RUNNING ✓                    ║
╚════════════════════════════════════════╝

✅ MongoDB Connected: localhost:27017
📊 Database: hair-ecommerce
```

**Test backend:**
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "success": true,
  "message": "Server is running"
}
```

---

## 🎨 Step 3: Frontend Setup

### 3.1 Navigate to Frontend Directory

```bash
# Open a new terminal window/tab
cd hair-ecommerce
```

### 3.2 Install Dependencies

```bash
npm install
```

This installs:
- @angular/core (Angular framework)
- @stripe/stripe-js (Stripe SDK)
- rxjs (Reactive programming)
- And more...

### 3.3 Configure Environment

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,

  // API URL (backend)
  apiUrl: 'http://localhost:3000/api',

  // Stripe Publishable Key
  stripePublishableKey: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE',

  // Payment settings
  taxRate: 0.08,
  shippingCost: 10.00,
  freeShippingThreshold: 100.00
};
```

### 3.4 Update Angular Services to Use Backend

The frontend is already configured to use mock data. To connect to the real backend, we need to update the services.

**Update `src/app/app.config.ts`:**

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient()  // Add HTTP client
  ]
};
```

### 3.5 Start Frontend Server

```bash
npm start
```

**You should see:**
```
** Angular Live Development Server is listening on localhost:4200 **
✔ Browser application bundle generation complete.
```

Open browser to: **http://localhost:4200**

---

## 🔗 Step 4: Connect Frontend to Backend

The frontend services need to be updated to make HTTP calls to the backend instead of using mock data.

### Quick Integration Checklist

- [ ] Backend running on `http://localhost:3000`
- [ ] Frontend running on `http://localhost:4200`
- [ ] MongoDB connected
- [ ] Stripe keys configured in both frontend and backend
- [ ] CORS enabled in backend (already configured)

---

## 🧪 Step 5: Test the Integration

### Test 1: User Registration

1. Go to http://localhost:4200
2. Click "Login/Register"
3. Register a new account:
   ```
   First Name: Test
   Last Name: User
   Email: test@test.com
   Password: TestPassword123!
   ```
4. Check backend logs - should see user created

### Test 2: Browse Products

1. Go to home page
2. Should see 8 products (if you ran seed script)
3. Filter by category, price, etc.
4. Click on a product to view details

### Test 3: Add to Cart

1. Click a product
2. Select quantity
3. Click "Add to Cart"
4. View cart - should show items

### Test 4: Checkout Process

**Option A: Mock Payment (No Stripe Required)**
1. Add items to cart
2. Click "Checkout"
3. Fill in shipping address
4. Select "Mock Payment (Demo Only)"
5. Click "Place Order"
6. Should see success page

**Option B: Real Stripe Payment**
1. Ensure Stripe webhook is configured (see below)
2. Add items to cart
3. Click "Checkout"
4. Fill in shipping address
5. Select "Stripe (Secure Payment)"
6. Click "Place Order"
7. Redirected to Stripe Checkout
8. Use test card: `4242 4242 4242 4242`
9. Expiry: Any future date (12/34)
10. CVV: Any 3 digits (123)
11. Complete payment
12. Redirected back to success page

---

## 🔔 Step 6: Stripe Webhook Setup

Webhooks are required for production Stripe payments to work correctly.

### Development (Using Stripe CLI)

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases

   # Linux
   wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_amd64.tar.gz
   tar -xvf stripe_linux_amd64.tar.gz
   sudo mv stripe /usr/local/bin
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server:**
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

4. **Copy webhook signing secret** from output:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxx
   ```

5. **Add to backend `.env`:**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

6. **Test webhook:**
   ```bash
   # In another terminal
   stripe trigger checkout.session.completed
   ```

### Production (Stripe Dashboard)

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://your-api-url.com/api/payments/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy webhook signing secret
7. Add to production environment variables

---

## 📊 Step 7: Verify Everything Works

### Backend Health Check

```bash
curl http://localhost:3000/health
```

Expected:
```json
{
  "success": true,
  "message": "Server is running",
  "environment": "development",
  "timestamp": "2025-01-08T..."
}
```

### API Test - Get Products

```bash
curl http://localhost:3000/api/products
```

Should return array of products.

### API Test - Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "API",
    "lastName": "Test",
    "email": "apitest@test.com",
    "password": "ApiTest123!@#"
  }'
```

Should return user object and JWT token.

### Frontend Check

1. Open http://localhost:4200
2. Check browser console for errors
3. Check network tab - should see API calls to localhost:3000

---

## 🚀 Production Deployment

### Backend Deployment (Heroku Example)

```bash
cd backend

# Login to Heroku
heroku login

# Create app
heroku create your-app-name-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_atlas_uri
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
heroku config:set FRONTEND_URL=https://your-frontend-url.com

# Deploy
git init
git add .
git commit -m "Initial commit"
git push heroku main

# View logs
heroku logs --tail
```

### Frontend Deployment (Vercel/Netlify)

```bash
# Build for production
ng build --configuration production

# Deploy to Vercel
npx vercel --prod

# Or deploy to Netlify
npx netlify deploy --prod --dir=dist/hair-ecommerce/browser
```

---

## 🐛 Troubleshooting

### Backend Issues

**Problem:** Can't connect to MongoDB
```
Solution:
- Check MongoDB is running: brew services list | grep mongodb
- Verify connection string in .env
- Check IP whitelist in MongoDB Atlas
```

**Problem:** JWT token errors
```
Solution:
- Ensure JWT_SECRET is set in .env
- Logout and login again to get fresh token
- Check token expiration (default 7 days)
```

### Frontend Issues

**Problem:** CORS errors
```
Solution:
- Backend already has CORS configured for localhost:4200
- Check FRONTEND_URL in backend .env
- Verify backend is running
```

**Problem:** Stripe not loading
```
Solution:
- Check STRIPE_PUBLISHABLE_KEY in environment.ts
- Ensure key matches environment (test vs live)
- Check browser console for errors
```

### Stripe Issues

**Problem:** Webhook not receiving events
```
Solution:
- Check webhook endpoint is publicly accessible
- Verify signing secret matches
- Test with Stripe CLI: stripe trigger checkout.session.completed
- Check backend logs
```

---

## 📚 Next Steps

Once everything is running:

1. **Explore the API** - Use Postman or cURL to test endpoints
2. **Customize Products** - Add your own products via seller dashboard
3. **Test Payments** - Use Stripe test cards
4. **Review Security** - Check SECURITY_IMPROVEMENTS.md
5. **Deploy** - Follow production deployment guide

---

## 📖 Additional Resources

- **Backend README:** `backend/README.md`
- **Frontend README:** `README.md`
- **API Documentation:** `backend/README.md#api-endpoints`
- **Security Guide:** `SECURITY_IMPROVEMENTS.md`
- **Payment Integration:** `PAYMENT_INTEGRATION.md`
- **Stripe Docs:** https://stripe.com/docs
- **Angular Docs:** https://angular.io/docs
- **MongoDB Docs:** https://docs.mongodb.com

---

## 🎉 Success!

If you've made it here, you should have:

✅ Backend API running on port 3000
✅ Frontend app running on port 4200
✅ MongoDB connected and seeded
✅ Stripe payment integration working
✅ Full-stack ecommerce application operational

**Happy coding! 🚀**

---

**Last Updated:** 2025-01-08
**Version:** 1.0.0
