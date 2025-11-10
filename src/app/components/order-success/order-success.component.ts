import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.model';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-success.component.html',
  styleUrls: ['./order-success.component.css']
})
export class OrderSuccessComponent implements OnInit, OnDestroy {
  order: Order | undefined;
  orderId: string = '';
  isDemo: boolean = false;
  loading: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.orderId = params['orderId'];
        this.isDemo = params['demo'] === 'true';

        if (this.orderId) {
          this.loadOrder(this.orderId);
        } else {
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrder(orderId: string): void {
    this.orderService.getOrderById(orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          this.order = order;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading order:', error);
          this.loading = false;
        }
      });
  }

  continueShopping(): void {
    this.router.navigate(['/']);
  }

  viewOrderHistory(): void {
    // Navigate to order history page (to be implemented)
    this.router.navigate(['/']);
  }
}
