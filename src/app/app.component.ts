import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { CookieConsentComponent } from './components/legal/cookie-consent.component';
import { SecureStorageService } from './services/secure-storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, HeaderComponent, CookieConsentComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Hair Bundles Ecommerce';
  private secureStorage = inject(SecureStorageService);

  ngOnInit(): void {
    // Migrate from old localStorage-based encryption to IndexedDB with non-extractable keys
    this.migrateSecureStorage();
  }

  /**
   * Migrate data from old localStorage-based encryption to secure IndexedDB storage
   * SECURITY: New storage uses non-extractable CryptoKey - key material cannot be read by JavaScript
   */
  private async migrateSecureStorage(): Promise<void> {
    const oldDeviceKey = localStorage.getItem('__device_key');

    if (oldDeviceKey) {
      // Migrate encrypted data to new secure storage
      const keysToMigrate = ['currentUser', 'encrypted_orders'];
      await this.secureStorage.migrateFromLocalStorage(keysToMigrate);
    }

    // Clean up any remaining old localStorage tokens
    if (localStorage.getItem('currentUser') || localStorage.getItem('token')) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');

      // Clear any other sensitive storage keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('secure_') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }
}
