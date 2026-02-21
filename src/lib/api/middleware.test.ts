import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies before importing the module under test
vi.mock('../supabase/client', () => ({
  isSupabaseConfigured: vi.fn(),
}));

vi.mock('../supabase/server', () => ({
  isSupabaseServiceRoleConfigured: vi.fn(),
}));

vi.mock('../stripe/server', () => ({
  isStripeConfigured: vi.fn(),
}));

vi.mock('../r2', () => ({
  isR2Configured: vi.fn(),
}));

import { apiGuards, apiResponse } from './middleware';
import { isSupabaseConfigured } from '../supabase/client';
import { isSupabaseServiceRoleConfigured } from '../supabase/server';
import { isStripeConfigured } from '../stripe/server';
import { isR2Configured } from '../r2';

describe('apiGuards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireSupabase', () => {
    it('returns null when Supabase is configured', () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
      expect(apiGuards.requireSupabase()).toBeNull();
    });

    it('returns 503 Response when Supabase is not configured', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      const response = apiGuards.requireSupabase();

      expect(response).not.toBeNull();
      expect(response!.status).toBe(503);

      const body = await response!.json();
      expect(body.error).toBe('Database not configured');
    });
  });

  describe('requireServiceRole', () => {
    it('returns null when service role is configured', () => {
      vi.mocked(isSupabaseServiceRoleConfigured).mockReturnValue(true);
      expect(apiGuards.requireServiceRole()).toBeNull();
    });

    it('returns 503 Response when service role is not configured', async () => {
      vi.mocked(isSupabaseServiceRoleConfigured).mockReturnValue(false);
      const response = apiGuards.requireServiceRole();

      expect(response).not.toBeNull();
      expect(response!.status).toBe(503);

      const body = await response!.json();
      expect(body.error).toBe('Database admin not configured');
    });
  });

  describe('requireStripe', () => {
    it('returns null when Stripe is configured', () => {
      vi.mocked(isStripeConfigured).mockReturnValue(true);
      expect(apiGuards.requireStripe()).toBeNull();
    });

    it('returns 503 Response when Stripe is not configured', async () => {
      vi.mocked(isStripeConfigured).mockReturnValue(false);
      const response = apiGuards.requireStripe();

      expect(response).not.toBeNull();
      expect(response!.status).toBe(503);

      const body = await response!.json();
      expect(body.error).toBe('Payment system not configured');
    });
  });

  describe('requireR2', () => {
    it('returns null when R2 is configured', () => {
      vi.mocked(isR2Configured).mockReturnValue(true);
      expect(apiGuards.requireR2()).toBeNull();
    });

    it('returns 503 Response when R2 is not configured', async () => {
      vi.mocked(isR2Configured).mockReturnValue(false);
      const response = apiGuards.requireR2();

      expect(response).not.toBeNull();
      expect(response!.status).toBe(503);

      const body = await response!.json();
      expect(body.error).toBe('Storage not configured');
    });
  });
});

describe('apiResponse', () => {
  describe('success', () => {
    it('returns 200 response with JSON body by default', async () => {
      const response = apiResponse.success({ foo: 'bar' });
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body.foo).toBe('bar');
    });

    it('accepts custom status code', async () => {
      const response = apiResponse.success({ id: '123' }, 201);
      expect(response.status).toBe(201);
    });

    it('serializes nested objects', async () => {
      const data = { user: { name: 'Alice', role: 'admin' }, count: 5 };
      const response = apiResponse.success(data);
      const body = await response.json();

      expect(body.user.name).toBe('Alice');
      expect(body.count).toBe(5);
    });
  });

  describe('error', () => {
    it('returns Response with error and message', async () => {
      const response = apiResponse.error('INVALID_EMAIL', 'Please enter a valid email.', 400);
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body.error).toBe('INVALID_EMAIL');
      expect(body.message).toBe('Please enter a valid email.');
    });

    it('includes field when provided', async () => {
      const response = apiResponse.error('REQUIRED', 'Email is required', 422, 'email');
      const body = await response.json();
      expect(body.field).toBe('email');
    });

    it('omits field when not provided', async () => {
      const response = apiResponse.error('SERVER_ERROR', 'Internal error', 500);
      const body = await response.json();
      expect(body.field).toBeUndefined();
    });

    it('handles different HTTP status codes', async () => {
      expect(apiResponse.error('UNAUTHORIZED', 'Login required', 401).status).toBe(401);
      expect(apiResponse.error('FORBIDDEN', 'Access denied', 403).status).toBe(403);
      expect(apiResponse.error('NOT_FOUND', 'Resource not found', 404).status).toBe(404);
      expect(apiResponse.error('SERVER_ERROR', 'Internal error', 500).status).toBe(500);
    });
  });
});
