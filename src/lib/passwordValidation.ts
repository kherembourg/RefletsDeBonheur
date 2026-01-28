/**
 * Password Validation Utilities
 *
 * Shared validation logic for both client and server side.
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate password strength
 *
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must include at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must include at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get a human-readable password requirements message
 */
export function getPasswordRequirementsMessage(): string {
  return 'Password must be at least 8 characters with uppercase, lowercase, and a number';
}

/**
 * Get the first validation error, or a combined message
 */
export function getPasswordError(password: string): string | null {
  const result = validatePassword(password);
  if (result.isValid) return null;

  // Return a combined message for better UX
  if (result.errors.length > 1) {
    return getPasswordRequirementsMessage();
  }

  return result.errors[0];
}
