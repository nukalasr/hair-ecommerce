# Testing Setup Guide

## ✅ What's Been Configured

The testing infrastructure has been set up for the Hair Ecommerce application.

### Completed Setup

1. **✅ Karma Configuration** (`karma.conf.js`)
   - Jasmine test framework configured
   - Code coverage enabled
   - ChromeHeadless support for CI/CD
   - HTML and text-summary reporters

2. **✅ Enhanced Test Scripts** (`package.json`)
   ```bash
   npm test              # Interactive testing with Chrome
   npm run test:headless # Headless mode (no browser UI)
   npm run test:coverage # Generate coverage report
   npm run test:ci       # CI/CD mode (headless + coverage)
   ```

3. **✅ Sample Test Files Created**
   - `src/app/utils/validation.util.spec.ts` (15 test suites, 40+ tests)
   - `src/app/services/auth.service.spec.ts` (8 test suites, 30+ tests)

### Test Coverage

**validation.util.spec.ts** tests:
- Email validation
- Password strength validation
- Text sanitization (XSS protection)
- Price validation
- Quantity validation
- Name validation
- ZIP code validation
- URL validation
- Stock validation
- Product name/description validation
- Secure ID generation

**auth.service.spec.ts** tests:
- User login (buyer & seller)
- Password verification
- Registration flow
- Session management
- Role-based access
- Logout functionality

---

## 🚀 How to Run Tests

### Prerequisites

You need Chrome or Chromium installed to run tests.

**macOS:**
```bash
# Install Chrome if not already installed
brew install --cask google-chrome
```

**Ubuntu/Debian:**
```bash
sudo apt-get install chromium-browser
```

**Windows:**
Download from: https://www.google.com/chrome/

### Running Tests

Once Chrome is installed:

```bash
# Run tests interactively (opens browser)
npm test

# Run tests in headless mode (no UI)
npm run test:headless

# Run tests with code coverage
npm run test:coverage

# View coverage report
open coverage/hair-ecommerce/index.html  # macOS
xdg-open coverage/hair-ecommerce/index.html  # Linux
start coverage/hair-ecommerce/index.html  # Windows
```

### CI/CD Mode

For continuous integration:

```bash
npm run test:ci
```

This runs tests in headless mode with coverage reporting, perfect for GitHub Actions, GitLab CI, etc.

---

## 📊 Current Test Status

### ✅ Tests Created
- **Validation Utility**: Comprehensive tests for all validation functions
- **Auth Service**: Tests for login, registration, session management

### ❌ Tests Needed

To reach production readiness, add tests for:

#### High Priority
1. **Services**
   - `product.service.spec.ts` - Product CRUD operations
   - `cart.service.spec.ts` - Cart management
   - `payment.service.spec.ts` - Stripe integration
   - `order.service.spec.ts` - Order creation
   - `secure-storage.service.spec.ts` - Encryption

2. **Guards**
   - `auth.guard.spec.ts` - Authentication protection
   - `role.guard.spec.ts` - Role-based access

3. **Components**
   - `product-list.component.spec.ts`
   - `cart.component.spec.ts`
   - `checkout.component.spec.ts`
   - `login.component.spec.ts`
   - `register.component.spec.ts`
   - `seller-dashboard.component.spec.ts`

4. **Utilities**
   - `crypto.util.spec.ts` - Password hashing, encryption

#### Medium Priority
5. **Integration Tests**
   - End-to-end user flows
   - Payment processing
   - Order placement

6. **E2E Tests** (using Playwright or Cypress)
   - Complete user journeys
   - Multi-page workflows
   - Real browser testing

---

## 🎯 Test Coverage Goals

### Current
- **Utilities**: ~60% (2 of 2 utilities tested)
- **Services**: ~17% (1 of 6 services tested)
- **Components**: 0%
- **Overall**: ~15%

### Production Target
- **Utilities**: 90%+
- **Services**: 85%+
- **Components**: 75%+
- **Overall**: 80%+

---

## 📝 Writing Tests - Quick Guide

### Testing a Service

```typescript
import { TestBed } from '@angular/core/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [YourService]
    });
    service = TestBed.inject(YourService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return expected value', () => {
    const result = service.someMethod();
    expect(result).toBe(expectedValue);
  });
});
```

### Testing a Component

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YourComponent } from './your.component';

describe('YourComponent', () => {
  let component: YourComponent;
  let fixture: ComponentFixture<YourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YourComponent]  // Standalone components use imports
    }).compileComponents();

    fixture = TestBed.createComponent(YourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### Testing with Mocks/Spies

```typescript
// Create a spy object
const mockService = jasmine.createSpyObj('ServiceName', ['method1', 'method2']);

// Provide the spy in TestBed
TestBed.configureTestingModule({
  providers: [
    { provide: ServiceName, useValue: mockService }
  ]
});

// Assert spy was called
expect(mockService.method1).toHaveBeenCalled();
expect(mockService.method1).toHaveBeenCalledWith('arg');
```

---

## 🔧 Troubleshooting

### Chrome Not Found

**Error**: `Can not find the binary /Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

**Solution**: Install Chrome or set `CHROME_BIN`:
```bash
export CHROME_BIN=/path/to/chrome
npm test
```

### Tests Timing Out

Increase timeout in `karma.conf.js`:
```javascript
browserNoActivityTimeout: 60000
```

### Coverage Report Not Generating

Ensure you're using the right command:
```bash
npm run test:coverage
```

The report will be in `coverage/hair-ecommerce/index.html`

---

## 🚀 Next Steps

1. **Install Chrome** (if not already installed)
2. **Run existing tests** to verify setup
   ```bash
   npm test
   ```
3. **Create remaining test files** using the templates above
4. **Aim for 80%+ coverage** before production
5. **Add E2E tests** for critical user flows
6. **Integrate with CI/CD** pipeline

---

## 📚 Resources

- [Angular Testing Guide](https://angular.dev/guide/testing)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Karma Documentation](https://karma-runner.github.io/)
- [Testing Best Practices](https://angular.dev/guide/testing/best-practices)

---

## ✅ Production Checklist

Before deploying to production, ensure:

- [ ] All tests passing
- [ ] Code coverage ≥ 80%
- [ ] E2E tests for critical flows
- [ ] Tests run in CI/CD pipeline
- [ ] No console errors in tests
- [ ] All edge cases covered
- [ ] Security tests (XSS, injection)
- [ ] Performance tests (load time)
