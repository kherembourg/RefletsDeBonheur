/**
 * API Middleware - Reusable configuration checks and response helpers
 *
 * This module provides standardized guards and response builders to eliminate
 * duplication across API endpoints. All guards return a Response on failure
 * or null on success, following the guard pattern.
 */

import { isSupabaseConfigured } from '../supabase/client';
import { isSupabaseServiceRoleConfigured } from '../supabase/server';
import { isStripeConfigured } from '../stripe/server';
import { isR2Configured } from '../r2';

/**
 * API Guards - Configuration requirement checks
 *
 * Each guard returns:
 * - null if the check passes (proceed with request)
 * - Response with appropriate error if check fails (return immediately)
 *
 * Usage:
 * ```typescript
 * export const POST: APIRoute = async ({ request }) => {
 *   const guard = apiGuards.requireSupabase();
 *   if (guard) return guard;
 *
 *   // Continue with main logic...
 * }
 * ```
 */
export const apiGuards = {
  /**
   * Ensure Supabase is configured
   * Returns 503 if not configured
   */
  requireSupabase: (): Response | null => {
    if (!isSupabaseConfigured()) {
      return new Response(
        JSON.stringify({
          error: 'Database not configured',
          message: 'Supabase is not configured. Please set environment variables.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return null;
  },

  /**
   * Ensure Supabase service role key is configured
   * Returns 503 if not configured
   */
  requireServiceRole: (): Response | null => {
    if (!isSupabaseServiceRoleConfigured()) {
      return new Response(
        JSON.stringify({
          error: 'Database admin not configured',
          message: 'Service role key is required for this operation.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return null;
  },

  /**
   * Ensure Stripe is configured
   * Returns 503 if not configured
   */
  requireStripe: (): Response | null => {
    if (!isStripeConfigured()) {
      return new Response(
        JSON.stringify({
          error: 'Payment system not configured',
          message: 'Stripe is not configured.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return null;
  },

  /**
   * Ensure R2 storage is configured
   * Returns 503 if not configured
   */
  requireR2: (): Response | null => {
    if (!isR2Configured()) {
      return new Response(
        JSON.stringify({
          error: 'Storage not configured',
          message: 'R2 storage is not configured. Please set environment variables.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return null;
  },
};

/**
 * API Response Builders - Standardized response formatting
 *
 * Provides consistent response structure across all endpoints.
 * All responses include Content-Type header automatically.
 */
export const apiResponse = {
  /**
   * Success response
   *
   * @param data - Response payload (will be JSON stringified)
   * @param status - HTTP status code (default 200)
   * @returns Response object
   *
   * @example
   * return apiResponse.success({ sessionId: '123', url: 'https://...' });
   */
  success: (data: unknown, status = 200): Response => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  },

  /**
   * Error response
   *
   * @param error - Error code/type (machine-readable)
   * @param message - Human-readable error message
   * @param status - HTTP status code
   * @param field - Optional field name for validation errors
   * @returns Response object
   *
   * @example
   * return apiResponse.error('Invalid email', 'Please enter a valid email.', 400, 'email');
   */
  error: (error: string, message: string, status: number, field?: string): Response => {
    const payload: { error: string; message: string; field?: string } = {
      error,
      message,
    };

    if (field) {
      payload.field = field;
    }

    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
