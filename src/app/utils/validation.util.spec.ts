import { ValidationUtil } from './validation.util';

describe('ValidationUtil', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(ValidationUtil.isValidEmail('test@example.com')).toBe(true);
      expect(ValidationUtil.isValidEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(ValidationUtil.isValidEmail('user@subdomain.example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(ValidationUtil.isValidEmail('invalid')).toBe(false);
      expect(ValidationUtil.isValidEmail('invalid@')).toBe(false);
      expect(ValidationUtil.isValidEmail('@example.com')).toBe(false);
      expect(ValidationUtil.isValidEmail('user@.com')).toBe(false);
      expect(ValidationUtil.isValidEmail('')).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(ValidationUtil.isValidEmail(null as any)).toBe(false);
      expect(ValidationUtil.isValidEmail(undefined as any)).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should validate strong passwords', () => {
      const result1 = ValidationUtil.isStrongPassword('DemoPassword123!');
      expect(result1.valid).toBe(true);
      expect(result1.message).toBe('Password is strong');

      const result2 = ValidationUtil.isStrongPassword('MyP@ssw0rd123');
      expect(result2.valid).toBe(true);
    });

    it('should reject passwords that are too short', () => {
      const result = ValidationUtil.isStrongPassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('12 characters');
    });

    it('should reject passwords without uppercase', () => {
      const result = ValidationUtil.isStrongPassword('nouppercase123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should reject passwords without lowercase', () => {
      const result = ValidationUtil.isStrongPassword('NOLOWERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should reject passwords without numbers', () => {
      const result = ValidationUtil.isStrongPassword('NoNumbers!Abc');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should reject passwords without special characters', () => {
      const result = ValidationUtil.isStrongPassword('NoSpecialChar123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('special character');
    });

    it('should reject common passwords', () => {
      const result = ValidationUtil.isStrongPassword('Password123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('common');
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = ValidationUtil.sanitizeText(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should handle empty and null values', () => {
      expect(ValidationUtil.sanitizeText('')).toBe('');
      expect(ValidationUtil.sanitizeText(null as any)).toBe('');
      expect(ValidationUtil.sanitizeText(undefined as any)).toBe('');
    });

    it('should enforce max length', () => {
      const longText = 'a'.repeat(2000);
      const result = ValidationUtil.sanitizeText(longText, 100);
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('validatePrice', () => {
    it('should validate correct prices', () => {
      expect(ValidationUtil.validatePrice(99.99).valid).toBe(true);
      expect(ValidationUtil.validatePrice(0.01).valid).toBe(true);
      expect(ValidationUtil.validatePrice(1000).valid).toBe(true);
      expect(ValidationUtil.validatePrice(0).valid).toBe(true);
    });

    it('should reject negative prices', () => {
      const result = ValidationUtil.validatePrice(-10);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('negative');
    });

    it('should reject non-numbers', () => {
      expect(ValidationUtil.validatePrice(NaN).valid).toBe(false);
      expect(ValidationUtil.validatePrice('100' as any).valid).toBe(false);
    });

    it('should reject prices that are too high', () => {
      const result = ValidationUtil.validatePrice(9999999);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('too high');
    });
  });

  describe('validateQuantity', () => {
    it('should validate correct quantities', () => {
      expect(ValidationUtil.validateQuantity(1).valid).toBe(true);
      expect(ValidationUtil.validateQuantity(10).valid).toBe(true);
      expect(ValidationUtil.validateQuantity(100).valid).toBe(true);
    });

    it('should reject zero and negative quantities', () => {
      const result1 = ValidationUtil.validateQuantity(0);
      expect(result1.valid).toBe(false);
      expect(result1.message).toContain('at least 1');

      const result2 = ValidationUtil.validateQuantity(-5);
      expect(result2.valid).toBe(false);
    });

    it('should reject decimal quantities', () => {
      const result = ValidationUtil.validateQuantity(1.5);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('whole number');
    });

    it('should respect max stock limit', () => {
      const result = ValidationUtil.validateQuantity(50, 10);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('stock');
    });
  });

  describe('validateName', () => {
    it('should validate correct names', () => {
      expect(ValidationUtil.validateName('John Doe').valid).toBe(true);
      expect(ValidationUtil.validateName('Mary-Jane').valid).toBe(true);
      expect(ValidationUtil.validateName("O'Brien").valid).toBe(true);
    });

    it('should reject names that are too short', () => {
      const result = ValidationUtil.validateName('A');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 2');
    });

    it('should reject names with numbers', () => {
      const result = ValidationUtil.validateName('Name123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('invalid characters');
    });

    it('should reject names with special characters', () => {
      const result = ValidationUtil.validateName('Name@#$');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('invalid characters');
    });

    it('should sanitize and return cleaned names', () => {
      const result = ValidationUtil.validateName('John Doe');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('John Doe');
    });
  });

  describe('isValidZipCode', () => {
    it('should validate US zip codes', () => {
      expect(ValidationUtil.isValidZipCode('12345')).toBe(true);
      expect(ValidationUtil.isValidZipCode('12345-6789')).toBe(true);
    });

    it('should reject invalid zip codes', () => {
      expect(ValidationUtil.isValidZipCode('1234')).toBe(false);
      expect(ValidationUtil.isValidZipCode('123456')).toBe(false);
      expect(ValidationUtil.isValidZipCode('abcde')).toBe(false);
      expect(ValidationUtil.isValidZipCode('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(ValidationUtil.isValidUrl('https://example.com')).toBe(true);
      expect(ValidationUtil.isValidUrl('http://example.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(ValidationUtil.isValidUrl('not-a-url')).toBe(false);
      expect(ValidationUtil.isValidUrl('ftp://example.com')).toBe(false);
      expect(ValidationUtil.isValidUrl('')).toBe(false);
    });
  });

  describe('validateStock', () => {
    it('should validate correct stock values', () => {
      expect(ValidationUtil.validateStock(0).valid).toBe(true);
      expect(ValidationUtil.validateStock(100).valid).toBe(true);
      expect(ValidationUtil.validateStock(1000).valid).toBe(true);
    });

    it('should reject negative stock', () => {
      const result = ValidationUtil.validateStock(-10);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('negative');
    });

    it('should reject decimal stock values', () => {
      const result = ValidationUtil.validateStock(10.5);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('whole number');
    });
  });

  describe('validateProductName', () => {
    it('should validate and sanitize product names', () => {
      const result = ValidationUtil.validateProductName('Virgin Hair Bundle');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeTruthy();
    });

    it('should reject names that are too short', () => {
      const result = ValidationUtil.validateProductName('AB');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 3');
    });
  });

  describe('validateProductDescription', () => {
    it('should validate and sanitize product descriptions', () => {
      const desc = 'This is a high-quality hair bundle made from premium materials.';
      const result = ValidationUtil.validateProductDescription(desc);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeTruthy();
    });

    it('should reject descriptions that are too short', () => {
      const result = ValidationUtil.validateProductDescription('Short');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 10');
    });
  });

  describe('generateSecureId', () => {
    it('should generate secure random IDs', () => {
      const id1 = ValidationUtil.generateSecureId();
      const id2 = ValidationUtil.generateSecureId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBe(32); // 16 bytes * 2 hex chars
    });

    it('should generate IDs with prefix', () => {
      const id = ValidationUtil.generateSecureId('order');
      expect(id).toContain('order_');
    });
  });
});
