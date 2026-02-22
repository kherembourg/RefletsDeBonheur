/**
 * Tests: Website Image Upload API
 * 
 * Tests the website image upload endpoint for wedding customization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './website-image';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/api/middleware', () => ({
  apiGuards: {
    requireSupabase: vi.fn().mockReturnValue(null),
    requireServiceRole: vi.fn().mockReturnValue(null),
    requireR2: vi.fn().mockReturnValue(null),
  },
  apiResponse: {
    success: vi.fn((data) => new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })),
    error: vi.fn((error, message, status) => new Response(JSON.stringify({ error, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })),
  },
}));

vi.mock('../../../lib/rateLimit', async () => {
  const { createRateLimitMock } = await import('../../../test/helpers/rateLimitMock');
  return createRateLimitMock();
});

// Mock R2 functions
let mockGetR2Config: any;
let mockGetS3Client: any;
let mockGetSignedUrl: any;

vi.mock('../../../lib/r2', () => ({
  getR2Config: () => mockGetR2Config(),
  getS3Client: () => mockGetS3Client(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

describe('POST /api/upload/website-image', () => {
  let mockAdminClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock R2 config
    mockGetR2Config = vi.fn().mockReturnValue({
      bucketName: 'test-bucket',
      publicUrl: 'https://cdn.example.com',
    });

    // Mock S3 client
    mockGetS3Client = vi.fn().mockReturnValue({});

    // Mock getSignedUrl
    mockGetSignedUrl = vi.fn().mockResolvedValue('https://r2.example.com/presigned-url');

    // Mock Supabase admin client
    mockAdminClient = {
      from: vi.fn(),
    };

    const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
    vi.mocked(getSupabaseAdminClient).mockReturnValue(mockAdminClient);
  });

  const validUploadData = {
    weddingId: 'wedding-123',
    fileName: 'hero.jpg',
    contentType: 'image/jpeg',
    fileSize: 2 * 1024 * 1024, // 2MB
    imageKey: 'heroImage',
  };

  describe('Happy Path', () => {
    it('should generate presigned URL with valid image data and authorization', async () => {
      // Mock wedding fetch
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'wedding-123',
          owner_id: 'user-123',
        },
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        }
      });

      // Mock auth
      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } },
        error: null,
      });

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(validUploadData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.uploadUrl).toBeDefined();
      expect(data.publicUrl).toMatch(/^https:\/\/cdn\.example\.com\/weddings\/wedding-123\/website\/heroImage-/);
      expect(data.key).toMatch(/^weddings\/wedding-123\/website\/heroImage-/);
      expect(data.expiresAt).toBeDefined();
    });
  });

  describe('Authorization', () => {
    it('should return 401 without authorization header', async () => {
      // Mock wedding fetch
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'wedding-123',
          owner_id: 'user-123',
        },
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        }
      });

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validUploadData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('Authorization required');
    });

    it('should return 401 with invalid token', async () => {
      // Mock wedding fetch
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'wedding-123',
          owner_id: 'user-123',
        },
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        }
      });

      // Mock auth failure
      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', name: 'AuthError', status: 401 },
      });

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify(validUploadData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when user is not the wedding owner (IDOR prevention)', async () => {
      // Mock wedding fetch (different owner)
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'wedding-123',
          owner_id: 'other-user',
        },
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        }
      });

      // Mock auth (valid user but not owner)
      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } },
        error: null,
      });

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(validUploadData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('wedding owner');
    });
  });

  describe('Validation', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        weddingId: 'wedding-123',
        // Missing fileName, contentType, imageKey
      };

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(invalidData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 for invalid content type', async () => {
      const invalidData = {
        ...validUploadData,
        contentType: 'video/mp4', // Not allowed
      };

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(invalidData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid content type');
    });

    it('should return 413 for oversized image (>5MB)', async () => {
      const invalidData = {
        ...validUploadData,
        fileSize: 6 * 1024 * 1024, // 6MB
      };

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(invalidData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.error).toBe('File too large');
      expect(data.message).toContain('5 Mo');
    });

    it('should return 400 for invalid image key', async () => {
      const invalidData = {
        ...validUploadData,
        imageKey: 'invalidKey',
      };

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(invalidData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid image key');
    });
  });

  describe('Wedding Validation', () => {
    it('should return 404 when wedding is not found', async () => {
      // Mock wedding not found
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        }
      });

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(validUploadData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Wedding not found');
    });
  });

  describe('R2 Configuration', () => {
    it('should return 503 when R2 is not configured', async () => {
      mockGetR2Config = vi.fn().mockReturnValue(null);

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(validUploadData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toBe('Storage not configured');
    });
  });

  describe('Error Handling', () => {
    it('should handle R2 errors gracefully', async () => {
      // Mock wedding and auth
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'wedding-123', owner_id: 'user-123' },
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        }
      });

      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } },
        error: null,
      });

      // Mock R2 error
      mockGetSignedUrl = vi.fn().mockRejectedValue(new Error('R2 error'));

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(validUploadData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('R2 error');
    });

    it('should handle JSON parse errors', async () => {
      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: 'invalid json',
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting', async () => {
      const { checkRateLimit, createRateLimitResponse } = await import('../../../lib/rateLimit');
      
      vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, retryAfter: 60 });
      vi.mocked(createRateLimitResponse).mockReturnValueOnce(
        new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('http://localhost/api/upload/website-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify(validUploadData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe('Rate limit exceeded');
    });
  });

  describe('Valid Image Keys', () => {
    const validImageKeys = [
      'heroImage',
      'heroBackgroundImage',
      'couplePhoto',
      'galleryPlaceholder',
      'logoImage',
      'faviconUrl',
    ];

    validImageKeys.forEach((imageKey) => {
      it(`should accept valid image key: ${imageKey}`, async () => {
        // Mock wedding and auth
        const mockSingle = vi.fn().mockResolvedValue({
          data: { id: 'wedding-123', owner_id: 'user-123' },
          error: null,
        });

        mockAdminClient.from.mockImplementation((table: string) => {
          if (table === 'weddings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockSingle,
                }),
              }),
            };
          }
        });

        const { supabase } = await import('../../../lib/supabase/client');
        vi.mocked(supabase.auth.getUser).mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } },
          error: null,
        });

        const data = {
          ...validUploadData,
          imageKey,
        };

        const request = new Request('http://localhost/api/upload/website-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
          body: JSON.stringify(data),
        });

        const response = await POST({ request } as any);

        expect(response.status).toBe(200);
        const responseData = await response.json();
        expect(responseData.key).toContain(imageKey);
      });
    });
  });
});
