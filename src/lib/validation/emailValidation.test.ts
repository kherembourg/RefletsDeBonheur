import { describe, it, expect } from 'vitest';
import { isValidEmail, validateEmailWithMessage, EMAIL_PATTERN } from './emailValidation';

describe('Email Validation', () => {
  describe('EMAIL_PATTERN', () => {
    it('should be a valid regex pattern', () => {
      expect(EMAIL_PATTERN).toBeInstanceOf(RegExp);
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'firstname.lastname@company.org',
        'user123@test-domain.com',
        'a@b.c',
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        'test@',
        '@example.com',
        'test @example.com',
        'test@example',
        '',
        ' ',
        'test@.com',
        'user@',
        '@domain.com',
        'no-at-sign.com',
        'missing@tld',
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('   ')).toBe(false);
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
      expect(isValidEmail(123 as any)).toBe(false);
      expect(isValidEmail({} as any)).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      expect(isValidEmail('  test@example.com  ')).toBe(true);
      expect(isValidEmail('\ntest@example.com\n')).toBe(true);
      expect(isValidEmail('\ttest@example.com\t')).toBe(true);
    });

    it('should match the exact pattern used in production code', () => {
      // This ensures our shared utility matches what was used before
      const productionEmails = [
        'test@example.com',
        'invalid',
        'test@',
        '@example.com',
        'test @example.com',
      ];

      const expectedResults = [true, false, false, false, false];

      productionEmails.forEach((email, index) => {
        expect(isValidEmail(email)).toBe(expectedResults[index]);
      });
    });
  });

  describe('validateEmailWithMessage', () => {
    it('should return null for valid emails', () => {
      expect(validateEmailWithMessage('test@example.com')).toBeNull();
      expect(validateEmailWithMessage('user@domain.org')).toBeNull();
    });

    it('should return required message for empty email', () => {
      expect(validateEmailWithMessage('')).toBe('Email is required');
      expect(validateEmailWithMessage('   ')).toBe('Email is required');
    });

    it('should return invalid message for malformed email', () => {
      expect(validateEmailWithMessage('invalid')).toBe('Please enter a valid email address');
      expect(validateEmailWithMessage('test@')).toBe('Please enter a valid email address');
      expect(validateEmailWithMessage('@example.com')).toBe('Please enter a valid email address');
    });

    it('should accept custom error messages', () => {
      const customRequired = 'You must provide an email';
      const customInvalid = 'Email format is incorrect';

      expect(validateEmailWithMessage('', customRequired, customInvalid)).toBe(customRequired);
      expect(validateEmailWithMessage('invalid', customRequired, customInvalid)).toBe(customInvalid);
    });

    it('should trim whitespace before validation', () => {
      expect(validateEmailWithMessage('  test@example.com  ')).toBeNull();
    });
  });
});
