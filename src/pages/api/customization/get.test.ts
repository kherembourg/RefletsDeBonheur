/**
 * Tests: Customization GET API
 * 
 * Tests the customization GET endpoint that retrieves wedding customization settings.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './get';
import { DEFAULT_CUSTOMIZATION } from '../../../lib/customization';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('GET /api/customization/get', () => {
  let mockSupabaseFrom: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { supabase } = await import('../../../lib/supabase/client');
    mockSupabaseFrom = vi.fn();
    vi.mocked(supabase.from).mockImplementation(mockSupabaseFrom);
  });

  it('should return customization data for valid wedding ID', async () => {
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

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        config: {
          customization: mockCustomization,
        },
      },
      error: null,
    });

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/customization/get?weddingId=wedding-123', {
      method: 'GET',
    });

    const response = await GET({
      url: new URL(request.url),
      request,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.customization).toEqual(mockCustomization);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('weddings');
  });

  it('should return default customization when wedding has no customization', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        config: {}, // No customization in config
      },
      error: null,
    });

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/customization/get?weddingId=wedding-123', {
      method: 'GET',
    });

    const response = await GET({
      url: new URL(request.url),
      request,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.customization).toEqual(DEFAULT_CUSTOMIZATION);
  });

  it('should return 400 when wedding ID is missing', async () => {
    const request = new Request('http://localhost/api/customization/get', {
      method: 'GET',
    });

    const response = await GET({
      url: new URL(request.url),
      request,
    } as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Wedding ID is required');
  });

  it('should return 404 when wedding is not found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/customization/get?weddingId=nonexistent', {
      method: 'GET',
    });

    const response = await GET({
      url: new URL(request.url),
      request,
    } as any);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Wedding not found');
  });

  it('should handle database errors gracefully', async () => {
    const mockSingle = vi.fn().mockRejectedValue(new Error('Database connection error'));

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/customization/get?weddingId=wedding-123', {
      method: 'GET',
    });

    const response = await GET({
      url: new URL(request.url),
      request,
    } as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
