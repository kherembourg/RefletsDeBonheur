/**
 * Integration Tests: Wedding check-slug API Endpoint
 *
 * Tests the GET /api/weddings/check-slug endpoint that checks
 * slug availability, format validation, and reserved slug handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './check-slug';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/slugValidation', () => ({
  RESERVED_SLUGS: new Set(['admin', 'api', 'test', 'demo', 'connexion', 'pricing']),
  isValidSlugFormat: vi.fn((slug: string) => {
    return /^[a-z0-9-]{3,50}$/.test(slug);
  }),
  generateSlugSuggestions: vi.fn((slug: string) => [
    `${slug}-2026`,
    `${slug}-wedding`,
    `${slug}-celebration`,
  ]),
}));

vi.mock('../../../lib/rateLimit', async () => {
  const { createRateLimitMock } = await import('../../../test/helpers/rateLimitMock');
  return createRateLimitMock();
});

describe('GET /api/weddings/check-slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return available: true for available slug', async () => {
    const { isValidSlugFormat } = await import('../../../lib/slugValidation');
    (isValidSlugFormat as any).mockReturnValue(true);

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    const { supabase } = await import('../../../lib/supabase/client');
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const request = new Request('http://localhost:4321/api/weddings/check-slug?slug=available-slug', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(true);
    expect(data.reason).toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith('weddings');
    expect(mockSelect).toHaveBeenCalledWith('slug');
  });

  it('should return available: false for taken slug', async () => {
    const { isValidSlugFormat } = await import('../../../lib/slugValidation');
    (isValidSlugFormat as any).mockReturnValue(true);

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { slug: 'taken-slug' },
          error: null,
        }),
      }),
    });

    const { supabase } = await import('../../../lib/supabase/client');
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const request = new Request('http://localhost:4321/api/weddings/check-slug?slug=taken-slug', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
    expect(data.reason).toBe('taken');
    expect(data.message).toBe('This URL is already in use.');
    expect(data.suggestions).toBeDefined();
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  it('should return 400 when slug parameter is missing', async () => {
    const request = new Request('http://localhost:4321/api/weddings/check-slug', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing slug parameter');
    expect(data.available).toBe(false);
  });

  it('should return available: false for invalid slug format', async () => {
    const { isValidSlugFormat } = await import('../../../lib/slugValidation');
    (isValidSlugFormat as any).mockReturnValue(false);

    const request = new Request('http://localhost:4321/api/weddings/check-slug?slug=INVALID_SLUG!', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
    expect(data.reason).toBe('invalid_format');
    expect(data.message).toBe('Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only.');
  });

  it('should return available: false for reserved slugs', async () => {
    const { isValidSlugFormat } = await import('../../../lib/slugValidation');
    (isValidSlugFormat as any).mockReturnValue(true);

    const request = new Request('http://localhost:4321/api/weddings/check-slug?slug=admin', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
    expect(data.reason).toBe('reserved');
    expect(data.message).toBe('This URL is reserved and cannot be used.');
    expect(data.suggestions).toBeDefined();
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  it('should return 500 on database errors', async () => {
    const { isValidSlugFormat } = await import('../../../lib/slugValidation');
    (isValidSlugFormat as any).mockReturnValue(true);

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST_ERROR', message: 'Database connection failed' },
        }),
      }),
    });

    const { supabase } = await import('../../../lib/supabase/client');
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const request = new Request('http://localhost:4321/api/weddings/check-slug?slug=test-slug', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
    expect(data.available).toBe(false);
  });

  it('should handle unexpected errors gracefully', async () => {
    const { isValidSlugFormat } = await import('../../../lib/slugValidation');
    (isValidSlugFormat as any).mockReturnValue(true);

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockRejectedValue(new Error('Unexpected error')),
      }),
    });

    const { supabase } = await import('../../../lib/supabase/client');
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const request = new Request('http://localhost:4321/api/weddings/check-slug?slug=test-slug', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.available).toBe(false);
  });
});
