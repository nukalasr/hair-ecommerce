import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { CookieConsentComponent } from './components/legal/cookie-consent.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, HeaderComponent, CookieConsentComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Hair Bundles Ecommerce';

  ngOnInit(): void {
    // Clear old localStorage tokens (migration from localStorage to httpOnly cookies)
    // This is a one-time cleanup for existing users
    if (localStorage.getItem('currentUser') || localStorage.getItem('token') || localStorage.getItem('__device_key')) {
      console.warn('🔒 Security Migration: Clearing old localStorage tokens');
      console.warn('🔒 Authentication now uses secure httpOnly cookies');

      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      localStorage.removeItem('__device_key');

      // Clear any other encrypted storage keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('secure_') || key.includes('user') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.warn('✅ Migration complete - Please log in again');
    }
  }
}
