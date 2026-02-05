/**
 * Integration Tests: Wedding by-slug API Endpoint
 *
 * Tests the GET /api/weddings/by-slug endpoint that retrieves
 * a wedding by its slug identifier.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './by-slug';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../lib/api/middleware', () => ({
  apiGuards: {
    requireSupabase: vi.fn().mockReturnValue(null),
  },
  apiResponse: {
    success: vi.fn((data) => new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })),
  },
}));

describe('GET /api/weddings/by-slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return wedding data with valid slug (200)', async () => {
    const mockWedding = {
      id: 'wedding-123',
      ownerId: 'user-123',
      slug: 'sarah-and-john-2026',
      name: 'Sarah & John',
      date: '2026-06-15',
      pinCode: '1234',
      magicToken: 'magic-token-123',
      config: {
        theme: { id: 'classic' },
        features: { rsvp: true },
      },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockWedding,
          error: null,
        }),
      }),
    });

    const { supabase } = await import('../../../lib/supabase/client');
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const request = new Request('http://localhost:4321/api/weddings/by-slug?slug=sarah-and-john-2026', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.wedding).toEqual(mockWedding);
    expect(supabase.from).toHaveBeenCalledWith('weddings');
    expect(mockSelect).toHaveBeenCalledWith('*');
  });

  it('should return 404 when wedding not found', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      }),
    });

    const { supabase } = await import('../../../lib/supabase/client');
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const request = new Request('http://localhost:4321/api/weddings/by-slug?slug=non-existent-slug', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(data.message).toBe('Wedding not found');
  });

  it('should return 400 when slug parameter is missing', async () => {
    const request = new Request('http://localhost:4321/api/weddings/by-slug', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing slug');
    expect(data.message).toBe('slug is required');
  });

  it('should return 500 on database errors', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      }),
    });

    const { supabase } = await import('../../../lib/supabase/client');
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const request = new Request('http://localhost:4321/api/weddings/by-slug?slug=test-slug', {
      method: 'GET',
    });

    const response = await GET({ url: new URL(request.url), request } as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.message).toBe('Database connection failed');
  });
});
