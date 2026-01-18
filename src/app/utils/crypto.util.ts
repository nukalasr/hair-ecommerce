/**
 * Crypto utilities for password hashing and data encryption
 * Uses Web Crypto API for secure client-side operations
 *
 * NOTE: In production, password hashing should be done server-side.
 * This is for demonstration/offline functionality only.
 */

export class CryptoUtil {
  /**
   * Hash a password using PBKDF2
   * @param password Plain text password
   * @param salt Salt value (if not provided, generates new one)
   * @returns Object with hash and salt
   */
  static async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    // Generate or decode salt
    const saltBuffer = salt
      ? this.base64ToBuffer(salt)
      : crypto.getRandomValues(new Uint8Array(16));

    // Import password as key
    const key = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Derive key using PBKDF2
    // Using 600,000 iterations (OWASP 2023 recommendation, matches encryption strength)
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer as BufferSource,
        iterations: 600000,  // Increased from 100k to modern security standards
        hash: 'SHA-256'
      },
      key,
      256
    );

    return {
      hash: this.bufferToBase64(hashBuffer),
      salt: this.bufferToBase64(saltBuffer)
    };
  }

  /**
   * Verify a password against a hash
   * Uses constant-time comparison to prevent timing attacks
   * @param password Plain text password to verify
   * @param hash Stored hash
   * @param salt Stored salt
   * @returns True if password matches
   */
  static async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const result = await this.hashPassword(password, salt);
    return this.constantTimeEqual(result.hash, hash);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a First string
   * @param b Second string
   * @returns True if strings are equal
   */
  private static constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still compare something to prevent timing leak
      b = a;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Encrypt data using AES-GCM
   * @param data Data to encrypt
   * @param key Encryption key
   * @returns Encrypted data with IV
   */
  static async encrypt(data: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Import key
    const keyBuffer = await this.deriveKey(key);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      keyBuffer,
      dataBuffer
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return this.bufferToBase64(combined);
  }

  /**
   * Decrypt data using AES-GCM
   * @param encryptedData Encrypted data with IV
   * @param key Encryption key
   * @returns Decrypted data
   */
  static async decrypt(encryptedData: string, key: string): Promise<string> {
    try {
      const combined = this.base64ToBuffer(encryptedData);

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      // Import key
      const keyBuffer = await this.deriveKey(key);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        keyBuffer,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Derive encryption key from password
   * Uses password-specific salt derived from SHA-256 hash
   */
  private static async deriveKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();

    // Derive a unique salt from the password using SHA-256
    // This ensures each password/device key has a unique salt
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const salt = new Uint8Array(saltBuffer);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 600000, // Increased from 100k to 600k for better security
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private static bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to Uint8Array
   */
  private static base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
