import { Routes } from '@angular/router';
import { ProductListComponent } from './components/product-list/product-list.component';
import { ProductDetailsComponent } from './components/product-details/product-details.component';
import { CartComponent } from './components/cart/cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';
import { SellerDashboardComponent } from './components/seller-dashboard/seller-dashboard.component';
import { OrderSuccessComponent } from './components/order-success/order-success.component';
import { PrivacyPolicyComponent } from './components/legal/privacy-policy.component';
import { TermsOfServiceComponent } from './components/legal/terms-of-service.component';
import { RefundPolicyComponent } from './components/legal/refund-policy.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', component: ProductListComponent },
  { path: 'products', component: ProductListComponent },
  { path: 'products/:id', component: ProductDetailsComponent },
  { path: 'cart', component: CartComponent },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [authGuard]
  },
  {
    path: 'order-success',
    component: OrderSuccessComponent,
    canActivate: [authGuard]
  },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  {
    path: 'seller/dashboard',
    component: SellerDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'seller' }
  },
  // Legal Pages
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: 'terms-of-service', component: TermsOfServiceComponent },
  { path: 'refund-policy', component: RefundPolicyComponent },
  { path: '**', redirectTo: '' }
];
