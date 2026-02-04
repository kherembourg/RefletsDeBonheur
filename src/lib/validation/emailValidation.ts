/**
 * Email Validation Utility
 *
 * Centralized email validation to ensure consistency across the application.
 * All email validation should use this module to avoid duplication and
 * maintain a single source of truth.
 */

/**
 * Email validation regex pattern
 *
 * Basic pattern: requires local part + @ + domain + TLD
 * This pattern rejects:
 * - Emails without @
 * - Emails without domain or TLD
 * - Emails with whitespace
 *
 * Note: This is a simplified pattern. For production, consider using
 * a more robust validation library or service for edge cases.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates an email address format
 *
 * @param email - The email address to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidEmail('test@example.com') // true
 * isValidEmail('invalid') // false
 * isValidEmail('test@') // false
 * isValidEmail('@example.com') // false
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  return EMAIL_PATTERN.test(email.trim());
}

/**
 * Validates an email and returns an error message if invalid
 *
 * @param email - The email address to validate
 * @param requiredMessage - Message to return if email is empty
 * @param invalidMessage - Message to return if email format is invalid
 * @returns error message or null if valid
 */
export function validateEmailWithMessage(
  email: string,
  requiredMessage = 'Email is required',
  invalidMessage = 'Please enter a valid email address'
): string | null {
  if (!email || !email.trim()) {
    return requiredMessage;
  }

  if (!isValidEmail(email)) {
    return invalidMessage;
  }

  return null;
}
