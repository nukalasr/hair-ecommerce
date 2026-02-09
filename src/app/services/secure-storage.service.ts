import { Injectable } from '@angular/core';

/**
 * Secure storage service using IndexedDB with non-extractable CryptoKey
 *
 * SECURITY: This implementation stores encryption keys as non-extractable CryptoKey
 * objects in IndexedDB. The key material CANNOT be read by JavaScript, even during XSS attacks.
 *
 * How it works:
 * 1. A non-extractable AES-GCM key is generated using Web Crypto API
 * 2. The CryptoKey is stored in IndexedDB (supports structured clone of CryptoKey)
 * 3. The key can only be used for encrypt/decrypt operations, never exported
 * 4. Even if XSS occurs, attackers cannot steal the key material
 *
 * IMPORTANT: In production:
 * - Store highly sensitive data server-side only
 * - Use httpOnly cookies for auth tokens
 * - Never store passwords or payment data client-side
 */
@Injectable({
  providedIn: 'root'
})
export class SecureStorageService {
  private readonly DB_NAME = 'SecureStorageDB';
  private readonly DB_VERSION = 1;
  private readonly KEY_STORE = 'cryptoKeys';
  private readonly DATA_STORE = 'encryptedData';
  private readonly MASTER_KEY_ID = 'masterKey';

  private dbPromise: Promise<IDBDatabase> | null = null;
  private masterKeyPromise: Promise<CryptoKey> | null = null;

  constructor() {
    // Initialize database and master key on service creation
    this.initializeAsync();
  }

  /**
   * Initialize database and master key asynchronously
   */
  private async initializeAsync(): Promise<void> {
    try {
      await this.getDatabase();
      await this.getMasterKey();
    } catch (error) {
      console.error('SecureStorage initialization failed:', error);
    }
  }

  /**
   * Get or create IndexedDB database
   */
  private getDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for CryptoKey objects
        if (!db.objectStoreNames.contains(this.KEY_STORE)) {
          db.createObjectStore(this.KEY_STORE, { keyPath: 'id' });
        }

        // Store for encrypted data
        if (!db.objectStoreNames.contains(this.DATA_STORE)) {
          db.createObjectStore(this.DATA_STORE, { keyPath: 'key' });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Get or create the master encryption key
   * Key is non-extractable - cannot be read by JavaScript
   */
  private getMasterKey(): Promise<CryptoKey> {
    if (this.masterKeyPromise) {
      return this.masterKeyPromise;
    }

    this.masterKeyPromise = (async () => {
      const db = await this.getDatabase();

      // Try to retrieve existing key
      const existingKey = await this.getKeyFromDB(db);
      if (existingKey) {
        return existingKey;
      }

      // Generate new non-extractable key
      const newKey = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        false, // NON-EXTRACTABLE - key material cannot be read
        ['encrypt', 'decrypt']
      );

      // Store the key in IndexedDB
      await this.storeKeyInDB(db, newKey);

      return newKey;
    })();

    return this.masterKeyPromise;
  }

  /**
   * Retrieve CryptoKey from IndexedDB
   */
  private getKeyFromDB(db: IDBDatabase): Promise<CryptoKey | null> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.KEY_STORE], 'readonly');
      const store = transaction.objectStore(this.KEY_STORE);
      const request = store.get(this.MASTER_KEY_ID);

      request.onerror = () => reject(new Error('Failed to retrieve key'));
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.cryptoKey : null);
      };
    });
  }

  /**
   * Store CryptoKey in IndexedDB
   */
  private storeKeyInDB(db: IDBDatabase, key: CryptoKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.KEY_STORE], 'readwrite');
      const store = transaction.objectStore(this.KEY_STORE);
      const request = store.put({
        id: this.MASTER_KEY_ID,
        cryptoKey: key,
        createdAt: new Date().toISOString()
      });

      request.onerror = () => reject(new Error('Failed to store key'));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Encrypt data using the non-extractable master key
   */
  private async encryptData(data: string): Promise<{ iv: string; ciphertext: string }> {
    const masterKey = await this.getMasterKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      masterKey,
      dataBuffer
    );

    return {
      iv: this.bufferToBase64(iv),
      ciphertext: this.bufferToBase64(encrypted)
    };
  }

  /**
   * Decrypt data using the non-extractable master key
   */
  private async decryptData(iv: string, ciphertext: string): Promise<string> {
    const masterKey = await this.getMasterKey();
    const ivBuffer = this.base64ToBuffer(iv);
    const ciphertextBuffer = this.base64ToBuffer(ciphertext);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer.buffer as ArrayBuffer },
      masterKey,
      ciphertextBuffer.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Store encrypted data in IndexedDB
   */
  async setItem(key: string, value: unknown): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      const encrypted = await this.encryptData(jsonString);

      const db = await this.getDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.DATA_STORE], 'readwrite');
        const store = transaction.objectStore(this.DATA_STORE);
        const request = store.put({
          key,
          iv: encrypted.iv,
          ciphertext: encrypted.ciphertext,
          updatedAt: new Date().toISOString()
        });

        request.onerror = () => reject(new Error('Failed to store encrypted data'));
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Failed to store encrypted data');
    }
  }

  /**
   * Retrieve and decrypt data from IndexedDB
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDatabase();
      const record = await new Promise<{ iv: string; ciphertext: string } | null>((resolve, reject) => {
        const transaction = db.transaction([this.DATA_STORE], 'readonly');
        const store = transaction.objectStore(this.DATA_STORE);
        const request = store.get(key);

        request.onerror = () => reject(new Error('Failed to retrieve data'));
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? { iv: result.iv, ciphertext: result.ciphertext } : null);
        };
      });

      if (!record) {
        return null;
      }

      const decrypted = await this.decryptData(record.iv, record.ciphertext);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Error decrypting data:', error);
      // If decryption fails, remove corrupted data
      await this.removeItem(key);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.DATA_STORE], 'readwrite');
        const store = transaction.objectStore(this.DATA_STORE);
        const request = store.delete(key);

        request.onerror = () => reject(new Error('Failed to remove data'));
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error removing data:', error);
    }
  }

  /**
   * Clear all encrypted data (preserves master key)
   */
  async clearData(): Promise<void> {
    try {
      const db = await this.getDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.DATA_STORE], 'readwrite');
        const store = transaction.objectStore(this.DATA_STORE);
        const request = store.clear();

        request.onerror = () => reject(new Error('Failed to clear data'));
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }

  /**
   * Clear everything including master key (full reset)
   * WARNING: All encrypted data becomes unrecoverable
   */
  async clear(): Promise<void> {
    try {
      // Close database connection
      if (this.dbPromise) {
        const db = await this.dbPromise;
        db.close();
      }

      // Delete entire database
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(this.DB_NAME);
        request.onerror = () => reject(new Error('Failed to delete database'));
        request.onsuccess = () => resolve();
      });

      // Reset promises to reinitialize on next use
      this.dbPromise = null;
      this.masterKeyPromise = null;

      // Also clear localStorage for backwards compatibility cleanup
      localStorage.removeItem('__device_key');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  /**
   * Check if item exists
   */
  async hasItem(key: string): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.DATA_STORE], 'readonly');
        const store = transaction.objectStore(this.DATA_STORE);
        const request = store.count(IDBKeyRange.only(key));

        request.onerror = () => reject(new Error('Failed to check item'));
        request.onsuccess = () => resolve(request.result > 0);
      });
    } catch {
      return false;
    }
  }

  /**
   * Store data without encryption (use sparingly, only for non-sensitive data)
   * Uses localStorage for backwards compatibility
   */
  setItemPlaintext(key: string, value: unknown): void {
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

  /**
   * Migrate data from old localStorage-based storage to IndexedDB
   * Call this once during app initialization for backwards compatibility
   */
  async migrateFromLocalStorage(keys: string[]): Promise<void> {
    const oldDeviceKey = localStorage.getItem('__device_key');
    if (!oldDeviceKey) {
      return; // No old data to migrate
    }

    // Import old CryptoUtil for migration
    const { CryptoUtil } = await import('../utils/crypto.util');

    for (const key of keys) {
      try {
        const encryptedData = localStorage.getItem(key);
        if (encryptedData) {
          // Decrypt with old key
          const decrypted = await CryptoUtil.decrypt(encryptedData, oldDeviceKey);
          const data = JSON.parse(decrypted);

          // Re-encrypt with new secure storage
          await this.setItem(key, data);

          // Remove old data
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn(`Failed to migrate ${key}:`, error);
        localStorage.removeItem(key);
      }
    }

    // Remove old device key
    localStorage.removeItem('__device_key');
  }

  // Utility methods for Base64 conversion
  private bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
