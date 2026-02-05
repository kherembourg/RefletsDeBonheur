/**
 * Tests: Customization Save API
 * 
 * Tests the customization POST endpoint that saves wedding customization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './save';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
}));

describe('POST /api/customization/save', () => {
  let mockSupabaseFrom: any;
  let mockSupabaseAuthGetUser: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { supabase } = await import('../../../lib/supabase/client');
    mockSupabaseFrom = vi.fn();
    mockSupabaseAuthGetUser = vi.fn();
    vi.mocked(supabase.from).mockImplementation(mockSupabaseFrom);
    vi.mocked(supabase.auth.getUser).mockImplementation(mockSupabaseAuthGetUser);
  });

  it('should save customization data successfully', async () => {
    const mockCustomization = {
      themeId: 'romantic' as const,
      customPalette: {
        primary: '#ff6b9d',
        accent: '#c44569',
      },
      customContent: {
        heroTitle: 'Our Special Day',
        welcomeMessage: 'Welcome to our wedding!',
      },
    };

    // Mock auth
    mockSupabaseAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    // Mock wedding fetch (first call)
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        config: {},
        owner_id: 'user-123',
      },
      error: null,
    });

    // Mock wedding update (second call)
    const mockEq = vi.fn().mockResolvedValue({
      error: null,
    });

    // Track call count
    let callCount = 0;
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'weddings') {
        callCount++;
        if (callCount === 1) {
          // First call: select
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: mockSingle,
          };
        } else {
          // Second call: update
          return {
            update: vi.fn().mockReturnThis(),
            eq: mockEq,
          };
        }
      }
    });

    const request = new Request('http://localhost/api/customization/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        weddingId: 'wedding-123',
        customization: mockCustomization,
      }),
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Customization saved successfully');
    expect(mockSupabaseAuthGetUser).toHaveBeenCalledWith('valid-token');
  });

  it('should return 400 when wedding ID is missing', async () => {
    const request = new Request('http://localhost/api/customization/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customization: { themeId: 'classic' },
      }),
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Wedding ID is required');
  });

  it('should return 400 when customization data is missing', async () => {
    const request = new Request('http://localhost/api/customization/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        weddingId: 'wedding-123',
      }),
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Customization data is required');
  });

  it('should return 401 when authorization header is missing', async () => {
    const request = new Request('http://localhost/api/customization/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        weddingId: 'wedding-123',
        customization: { themeId: 'classic' },
      }),
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Authorization required');
  });

  it('should return 401 when token is invalid', async () => {
    mockSupabaseAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const request = new Request('http://localhost/api/customization/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      },
      body: JSON.stringify({
        weddingId: 'wedding-123',
        customization: { themeId: 'classic' },
      }),
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Invalid or expired token');
  });

  it('should return 404 when wedding is not found', async () => {
    mockSupabaseAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/customization/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        weddingId: 'nonexistent',
        customization: { themeId: 'classic' },
      }),
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Wedding not found');
  });

  it('should return 403 when user is not the wedding owner', async () => {
    mockSupabaseAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        config: {},
        owner_id: 'other-user', // Different user
      },
      error: null,
    });

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/customization/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        weddingId: 'wedding-123',
        customization: { themeId: 'classic' },
      }),
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Not authorized to modify this wedding');
  });

  it('should handle update errors gracefully', async () => {
    mockSupabaseAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    // Mock wedding fetch (first call)
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        config: {},
        owner_id: 'user-123',
      },
      error: null,
    });

    // Mock wedding update error (second call)
    const mockEq = vi.fn().mockResolvedValue({
      error: { message: 'Database error' },
    });

    // Track call count
    let callCount = 0;
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'weddings') {
        callCount++;
        if (callCount === 1) {
          // First call: select
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: mockSingle,
          };
        } else {
          // Second call: update with error
          return {
            update: vi.fn().mockReturnThis(),
            eq: mockEq,
          };
        }
      }
    });

    const request = new Request('http://localhost/api/customization/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        weddingId: 'wedding-123',
        customization: { themeId: 'classic' },
      }),
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to save customization');
  });

  it('should handle unexpected errors gracefully', async () => {
    mockSupabaseAuthGetUser.mockRejectedValue(new Error('Network error'));

    const request = new Request('http://localhost/api/customization/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        weddingId: 'wedding-123',
        customization: { themeId: 'classic' },
      }),
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
