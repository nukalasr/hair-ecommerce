import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  cartItemCount: number = 0;
  isAuthenticated: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isAuthenticated = !!user;
        },
        error: (error) => {
          console.error('Error loading user:', error);
        }
      });

    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cart) => {
          this.cartItemCount = cart.totalItems;
        },
        error: (error) => {
          console.error('Error loading cart count:', error);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.authService.logout();
  }

  isSeller(): boolean {
    return this.authService.isSeller();
  }
}
