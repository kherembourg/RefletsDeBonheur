/**
 * GDPR Utilities
 *
 * Constants and helpers for GDPR compliance across the platform.
 */

/** Default data retention period in days after the wedding date */
export const DEFAULT_DATA_RETENTION_DAYS = 365;

/** localStorage key for cookie consent */
export const COOKIE_CONSENT_KEY = 'reflets_cookie_consent';

/** Possible cookie consent values */
export type CookieConsentValue = 'accepted' | 'rejected';

/**
 * Calculate the data expiration date for a wedding.
 *
 * @param weddingDate - ISO date string of the wedding
 * @param retentionDays - Number of days after the wedding to retain data
 * @returns ISO date string of the expiration date
 */
export function getDataExpirationDate(
  weddingDate: string,
  retentionDays: number = DEFAULT_DATA_RETENTION_DAYS
): string {
  const date = new Date(weddingDate);
  date.setDate(date.getDate() + retentionDays);
  return date.toISOString();
}

/**
 * Check whether data for a wedding has expired based on its retention policy.
 */
export function isDataExpired(
  weddingDate: string,
  retentionDays: number = DEFAULT_DATA_RETENTION_DAYS
): boolean {
  const expirationDate = new Date(getDataExpirationDate(weddingDate, retentionDays));
  return new Date() > expirationDate;
}
