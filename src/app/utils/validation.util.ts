/**
 * Input validation and sanitization utilities
 * Protects against XSS, injection attacks, and invalid data
 */
import DOMPurify from 'dompurify';

export class ValidationUtil {
  // Email validation regex (RFC 5322 simplified)
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Password strength regex (min 12 chars, uppercase, lowercase, number, special char)
  private static readonly STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

  // URL validation (must be http/https)
  private static readonly URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

  // Phone number validation (US format)
  private static readonly PHONE_REGEX = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

  // ZIP code validation (US format)
  private static readonly ZIP_REGEX = /^\d{5}(-\d{4})?$/;

  // Alphanumeric with spaces and common punctuation
  private static readonly SAFE_TEXT_REGEX = /^[a-zA-Z0-9\s\-_.,!?()]+$/;

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    return this.EMAIL_REGEX.test(email.trim());
  }

  /**
   * Validate password strength
   * Requirements: min 12 chars, uppercase, lowercase, number, special char
   */
  static isStrongPassword(password: string): { valid: boolean; message: string } {
    if (!password || typeof password !== 'string') {
      return { valid: false, message: 'Password is required' };
    }

    if (password.length < 12) {
      return { valid: false, message: 'Password must be at least 12 characters long' };
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/\d/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    if (!/[@$!%*?&]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
    }

    // Check against common passwords
    const commonPasswords = ['password', 'password123', '123456789', 'qwerty'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      return { valid: false, message: 'Password is too common' };
    }

    return { valid: true, message: 'Password is strong' };
  }

  /**
   * Validate URL format (must be http/https)
   */
  static isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    return this.URL_REGEX.test(url.trim());
  }

  /**
   * Validate phone number (US format)
   */
  static isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    return this.PHONE_REGEX.test(phone.trim());
  }

  /**
   * Validate ZIP code (US format)
   */
  static isValidZipCode(zip: string): boolean {
    if (!zip || typeof zip !== 'string') return false;
    return this.ZIP_REGEX.test(zip.trim());
  }

  /**
   * Sanitize text input to prevent XSS
   *
   * IMPORTANT: This is a basic client-side sanitization for defense-in-depth.
   * Angular automatically sanitizes template bindings, so this is an additional layer.
   * For production:
   * - Always validate and sanitize server-side
   * - Use Angular's DomSanitizer for HTML content
   * - Never use [innerHTML] with user input unless sanitized
   *
   * This method strips ALL HTML and encodes special characters.
   */
  static sanitizeText(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') return '';

    // First pass: remove any HTML-like content
    let sanitized = input
      .trim()
      .substring(0, maxLength);

    // Create a temporary element to decode any HTML entities first
    // This prevents double-encoding bypasses
    const temp = document.createElement('div');
    temp.textContent = sanitized;
    sanitized = temp.innerHTML;

    // Aggressive removal of potential XSS vectors
    sanitized = sanitized
      // Remove all HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove script tags with any attributes/content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      // Remove style tags
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Remove event handlers (on*)
      .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      // Remove common XSS patterns
      .replace(/&lt;script/gi, '')
      .replace(/&lt;iframe/gi, '')
      // Encode all special characters
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  /**
   * Sanitize HTML content using DOMPurify
   *
   * SECURITY: Uses DOMPurify library for robust XSS protection.
   * DOMPurify is a trusted, well-maintained sanitization library
   * that handles edge cases that regex-based approaches miss.
   *
   * Configuration:
   * - Allows safe formatting tags (p, b, i, em, strong, ul, ol, li, br)
   * - Strips all event handlers and javascript: URLs
   * - Removes dangerous elements (script, style, iframe, object, embed)
   */
  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') return '';

    // DOMPurify configuration for safe HTML
    const config = {
      ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'u', 'ul', 'ol', 'li', 'br', 'a', 'span'],
      ALLOWED_ATTR: ['href', 'title', 'class'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    };

    return DOMPurify.sanitize(input, config) as string;
  }

  /**
   * Sanitize HTML and strip ALL tags (returns plain text)
   * Use this when you don't need any HTML formatting
   */
  static sanitizeHtmlToText(input: string): string {
    if (!input || typeof input !== 'string') return '';

    // Strip all HTML tags
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], RETURN_DOM: false }) as string;
  }

  /**
   * Validate and sanitize product name
   */
  static validateProductName(name: string): { valid: boolean; sanitized: string; message: string } {
    if (!name || typeof name !== 'string') {
      return { valid: false, sanitized: '', message: 'Product name is required' };
    }

    const sanitized = this.sanitizeText(name, 100);

    if (sanitized.length < 3) {
      return { valid: false, sanitized, message: 'Product name must be at least 3 characters' };
    }

    if (sanitized.length > 100) {
      return { valid: false, sanitized, message: 'Product name must not exceed 100 characters' };
    }

    return { valid: true, sanitized, message: '' };
  }

  /**
   * Validate and sanitize product description
   */
  static validateProductDescription(description: string): { valid: boolean; sanitized: string; message: string } {
    if (!description || typeof description !== 'string') {
      return { valid: false, sanitized: '', message: 'Product description is required' };
    }

    const sanitized = this.sanitizeText(description, 2000);

    if (sanitized.length < 10) {
      return { valid: false, sanitized, message: 'Product description must be at least 10 characters' };
    }

    if (sanitized.length > 2000) {
      return { valid: false, sanitized, message: 'Product description must not exceed 2000 characters' };
    }

    return { valid: true, sanitized, message: '' };
  }

  /**
   * Validate price
   */
  static validatePrice(price: number): { valid: boolean; message: string } {
    if (typeof price !== 'number' || isNaN(price)) {
      return { valid: false, message: 'Price must be a valid number' };
    }

    if (price < 0) {
      return { valid: false, message: 'Price cannot be negative' };
    }

    if (price > 999999.99) {
      return { valid: false, message: 'Price is too high' };
    }

    // Check decimal places (max 2)
    if (price.toFixed(2) !== price.toString() && price.toString().split('.')[1]?.length > 2) {
      return { valid: false, message: 'Price can have at most 2 decimal places' };
    }

    return { valid: true, message: '' };
  }

  /**
   * Validate stock quantity
   */
  static validateStock(stock: number): { valid: boolean; message: string } {
    if (typeof stock !== 'number' || isNaN(stock)) {
      return { valid: false, message: 'Stock must be a valid number' };
    }

    if (!Number.isInteger(stock)) {
      return { valid: false, message: 'Stock must be a whole number' };
    }

    if (stock < 0) {
      return { valid: false, message: 'Stock cannot be negative' };
    }

    if (stock > 1000000) {
      return { valid: false, message: 'Stock quantity is too high' };
    }

    return { valid: true, message: '' };
  }

  /**
   * Validate name (first name, last name)
   */
  static validateName(name: string, fieldName: string = 'Name'): { valid: boolean; sanitized: string; message: string } {
    if (!name || typeof name !== 'string') {
      return { valid: false, sanitized: '', message: `${fieldName} is required` };
    }

    const sanitized = this.sanitizeText(name, 50);

    if (sanitized.length < 2) {
      return { valid: false, sanitized, message: `${fieldName} must be at least 2 characters` };
    }

    if (sanitized.length > 50) {
      return { valid: false, sanitized, message: `${fieldName} must not exceed 50 characters` };
    }

    // Only allow letters, spaces, hyphens, apostrophes
    if (!/^[a-zA-Z\s\-']+$/.test(sanitized)) {
      return { valid: false, sanitized, message: `${fieldName} contains invalid characters` };
    }

    return { valid: true, sanitized, message: '' };
  }

  /**
   * Validate quantity
   */
  static validateQuantity(quantity: number, maxStock?: number): { valid: boolean; message: string } {
    if (typeof quantity !== 'number' || isNaN(quantity)) {
      return { valid: false, message: 'Quantity must be a valid number' };
    }

    if (!Number.isInteger(quantity)) {
      return { valid: false, message: 'Quantity must be a whole number' };
    }

    if (quantity < 1) {
      return { valid: false, message: 'Quantity must be at least 1' };
    }

    if (maxStock !== undefined && quantity > maxStock) {
      return { valid: false, message: `Quantity cannot exceed available stock (${maxStock})` };
    }

    if (quantity > 999) {
      return { valid: false, message: 'Quantity is too high' };
    }

    return { valid: true, message: '' };
  }

  /**
   * Generate a secure random ID using Web Crypto API
   */
  static generateSecureId(prefix: string = ''): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const id = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return prefix ? `${prefix}_${id}` : id;
  }
}
