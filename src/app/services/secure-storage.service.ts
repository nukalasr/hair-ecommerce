import { Injectable } from '@angular/core';
import { CryptoUtil } from '../utils/crypto.util';

/**
 * Secure storage service that encrypts data before storing in localStorage
 *
 * IMPORTANT: This provides basic encryption for client-side storage.
 * In production:
 * - Store sensitive data server-side only
 * - Use httpOnly cookies for auth tokens
 * - Never store passwords or payment data client-side
 */
@Injectable({
  providedIn: 'root'
})
export class SecureStorageService {
  // In production, this should be derived from a server-provided session key
  // For demo purposes, we use a device-specific key
  private readonly ENCRYPTION_KEY = this.getDeviceKey();

  constructor() {}

  /**
   * Get device-specific encryption key
   * In production, combine this with server-provided session key
   */
  private getDeviceKey(): string {
    let deviceKey = localStorage.getItem('__device_key');

    if (!deviceKey) {
      // Generate new device key using crypto
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      deviceKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('__device_key', deviceKey);
    }

    return deviceKey;
  }

  /**
   * Store encrypted data in localStorage
   */
  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      const encrypted = await CryptoUtil.encrypt(jsonString, this.ENCRYPTION_KEY);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Failed to store encrypted data');
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const encrypted = localStorage.getItem(key);

      if (!encrypted) {
        return null;
      }

      const decrypted = await CryptoUtil.decrypt(encrypted, this.ENCRYPTION_KEY);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Error decrypting data:', error);
      // If decryption fails, remove corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all encrypted storage
   * Note: This also clears the device key
   */
  clear(): void {
    localStorage.clear();
  }

  /**
   * Check if item exists
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Store data without encryption (use sparingly, only for non-sensitive data)
   */
  setItemPlaintext(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Get data stored without encryption
   */
  getItemPlaintext<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }
}
