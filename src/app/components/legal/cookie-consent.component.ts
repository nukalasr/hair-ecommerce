import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cookie-consent.component.html',
  styleUrls: ['./cookie-consent.component.css']
})
export class CookieConsentComponent implements OnInit {
  showBanner = false;

  ngOnInit(): void {
    // Check if user has already accepted/rejected cookies
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      // Show banner after a short delay for better UX
      setTimeout(() => {
        this.showBanner = true;
      }, 1000);
    }
  }

  acceptAll(): void {
    localStorage.setItem('cookieConsent', 'all');
    this.showBanner = false;
  }

  acceptNecessary(): void {
    localStorage.setItem('cookieConsent', 'necessary');
    this.showBanner = false;
  }

  closeBanner(): void {
    this.showBanner = false;
  }
}
