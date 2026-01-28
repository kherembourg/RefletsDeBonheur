import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  getPasswordError,
  getPasswordRequirementsMessage,
} from './passwordValidation';

describe('passwordValidation', () => {
  describe('validatePassword', () => {
    it('returns valid for strong password', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns invalid for password too short', () => {
      const result = validatePassword('Pass1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('returns invalid for password without uppercase', () => {
      const result = validatePassword('password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must include at least one uppercase letter');
    });

    it('returns invalid for password without lowercase', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must include at least one lowercase letter');
    });

    it('returns invalid for password without number', () => {
      const result = validatePassword('PasswordAbc');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must include at least one number');
    });

    it('returns multiple errors for weak password', () => {
      const result = validatePassword('abc');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('accepts passwords with special characters', () => {
      const result = validatePassword('Password123!@#');
      expect(result.isValid).toBe(true);
    });

    it('accepts long complex passwords', () => {
      const result = validatePassword('MyVeryLongAndSecure1Password');
      expect(result.isValid).toBe(true);
    });
  });

  describe('getPasswordError', () => {
    it('returns null for valid password', () => {
      expect(getPasswordError('Password123')).toBeNull();
    });

    it('returns first error for single issue', () => {
      const error = getPasswordError('password123');
      expect(error).toContain('uppercase');
    });

    it('returns combined message for multiple issues', () => {
      const error = getPasswordError('abc');
      expect(error).toBe(getPasswordRequirementsMessage());
    });
  });

  describe('getPasswordRequirementsMessage', () => {
    it('returns a descriptive message', () => {
      const message = getPasswordRequirementsMessage();
      expect(message).toContain('8 characters');
      expect(message).toContain('uppercase');
      expect(message).toContain('lowercase');
      expect(message).toContain('number');
    });
  });
});
