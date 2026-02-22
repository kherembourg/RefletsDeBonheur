/**
 * Integration Tests: Upload Presign Authorization and Validation
 *
 * Tests the presigned URL generation with comprehensive authorization,
 * subscription status checks, validation, and rate limiting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './presign';

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

vi.mock('../../../lib/rateLimit', async () => {
  const { createRateLimitMock } = await import('../../../test/helpers/rateLimitMock');
  return createRateLimitMock();
});

vi.mock('../../../lib/api/middleware', () => ({
  apiGuards: {
    requireR2: vi.fn().mockReturnValue(null),
  },
  apiResponse: {
    success: vi.fn((data) => new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })),
  },
}));

// Mock R2
vi.mock('../../../lib/r2', () => ({
  generatePresignedUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: 'https://r2.example.com/presigned-url',
    key: 'weddings/wedding-123/media/photo.jpg',
    publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
    expiresAt: new Date('2026-02-04T12:00:00Z'),
  }),
}));

describe('Upload Presign API - Authorization Tests', () => {
  let mockAdminClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset rate limit to allowed
    const { checkRateLimit } = await import('../../../lib/rateLimit');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, limit: 20, remaining: 15, retryAfter: 0 });

    // Mock Supabase admin client
    mockAdminClient = createMockAdminClient();

    const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
    vi.mocked(getSupabaseAdminClient).mockReturnValue(mockAdminClient);

    // Mock supabase auth - default to valid owner
    const { supabase } = await import('../../../lib/supabase/client');
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: { id: 'owner-123', email: 'test@example.com' } as any,
      },
      error: null,
    });
  });

  describe('1. Authorization', () => {
    it('should succeed with valid Bearer token (wedding owner)', async () => {
      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBeDefined();
      expect(data.key).toBeDefined();
      expect(data.publicUrl).toBeDefined();
      expect(data.expiresAt).toBeDefined();
    });

    it('should reject invalid Bearer token with 401', async () => {
      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' } as any,
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer invalid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should succeed with valid guest session token', async () => {
      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'No token' } as any,
      });

      // Mock guest session validation
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'guest_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'guest-123', wedding_id: 'wedding-123' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        guestIdentifier: 'guest-token-123',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBeDefined();
    });

    it('should reject missing guestIdentifier with no auth (401)', async () => {
      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'No token' } as any,
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject wedding owner_id mismatch (401)', async () => {
      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: { id: 'different-user', email: 'other@example.com' } as any,
        },
        error: null,
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject expired guest session (401)', async () => {
      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'No token' } as any,
      });

      // Mock no guest session found
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'guest_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        guestIdentifier: 'expired-token',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle malformed Authorization header', async () => {
      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Invalid-Format token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject valid auth but wrong wedding (401)', async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { 
                    owner_id: 'other-owner',
                    profiles: { subscription_status: 'active' }
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-456',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject guest session for wrong wedding (401)', async () => {
      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'No token' } as any,
      });

      // Mock guest session for different wedding
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'guest_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // No match for wedding-123
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        guestIdentifier: 'guest-token-for-other-wedding',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should prioritize Bearer token over guest token when both provided', async () => {
      // Create a spy-able mock function for .from()
      const fromSpy = vi.fn((table: string) => createMockTable(table));
      mockAdminClient.from = fromSpy;
      
      // Update the mock reference
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      vi.mocked(getSupabaseAdminClient).mockReturnValue(mockAdminClient);

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        guestIdentifier: 'guest-token-123',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBeDefined();
      
      // Verify guest session was NOT checked
      const fromCalls = fromSpy.mock.calls;
      const guestSessionCalls = fromCalls.filter((call: any[]) => call[0] === 'guest_sessions');
      expect(guestSessionCalls.length).toBe(0);
    });
  });

  describe('2. Subscription Status', () => {
    it('should reject photo upload when trial photo limit reached (50)', async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    owner_id: 'owner-123',
                    profiles: { subscription_status: 'trial' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 50, // At limit
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Trial limit reached');
      expect(data.code).toBe('TRIAL_PHOTO_LIMIT');
      expect(data.limit).toBe(50);
      expect(data.current).toBe(50);
    });

    it('should reject video upload when trial video limit reached (1)', async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    owner_id: 'owner-123',
                    profiles: { subscription_status: 'trial' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 1, // At limit
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'video.mp4',
        contentType: 'video/mp4',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Trial limit reached');
      expect(data.code).toBe('TRIAL_VIDEO_LIMIT');
      expect(data.limit).toBe(1);
      expect(data.current).toBe(1);
    });

    it('should optimize count query for photos only (not both)', async () => {
      let mediaQueryCalls = 0;
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    owner_id: 'owner-123',
                    profiles: { subscription_status: 'trial' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          mediaQueryCalls++;
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 10,
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      await POST({ request } as any);

      // Should only query media table once (for photos, not videos)
      expect(mediaQueryCalls).toBe(1);
    });

    it('should allow unlimited uploads for active subscription', async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    owner_id: 'owner-123',
                    profiles: { subscription_status: 'active' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBeDefined();
      
      // Verify media table was NOT queried for count
      const fromCalls = mockAdminClient.from.mock.calls;
      const mediaCalls = fromCalls.filter((call: any[]) => call[0] === 'media');
      expect(mediaCalls.length).toBe(0);
    });

    it('should reject expired subscription uploads', async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    owner_id: 'owner-123',
                    profiles: { subscription_status: 'expired' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Subscription required');
      expect(data.code).toBe('SUBSCRIPTION_EXPIRED');
    });

    it('should reject cancelled subscription uploads', async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    owner_id: 'owner-123',
                    profiles: { subscription_status: 'cancelled' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Subscription required');
      expect(data.code).toBe('SUBSCRIPTION_EXPIRED');
    });

    it('should fail-safe when database count error occurs (503)', async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    owner_id: 'owner-123',
                    profiles: { subscription_status: 'trial' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Database error');
      expect(data.message).toContain('Unable to verify upload limits');
    });

    it('should allow upload when under trial limit (49 photos, 0 videos)', async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    owner_id: 'owner-123',
                    profiles: { subscription_status: 'trial' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 49, // Under limit
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBeDefined();
    });
  });

  describe('3. Validation', () => {
    it('should reject missing weddingId (400)', async () => {
      const request = createRequest({
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should reject missing fileName (400)', async () => {
      const request = createRequest({
        weddingId: 'wedding-123',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should reject missing contentType (400)', async () => {
      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should reject invalid content type (text/plain not allowed)', async () => {
      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'document.txt',
        contentType: 'text/plain',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid content type');
      expect(data.message).toContain('text/plain');
    });

    it('should accept all 10 allowed content types', async () => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
        'video/mp4',
        'video/quicktime',
        'video/webm',
        'video/x-msvideo',
      ];

      for (const contentType of allowedTypes) {
        vi.clearAllMocks();
        
        // Reset the admin client mock for each iteration
        const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
        vi.mocked(getSupabaseAdminClient).mockReturnValue(createMockAdminClient());
        
        const request = createRequest({
          weddingId: 'wedding-123',
          fileName: 'test-file',
          contentType,
        }, 'Bearer valid-token');

        const response = await POST({ request } as any);
        
        expect(response.status).toBe(200);
      }
    });

    it('should return 404 when wedding not found', async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'nonexistent-wedding',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Wedding not found');
    });

    it('should return 404 when profile not found', async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    owner_id: 'owner-123',
                    profiles: null, // Profile not found
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockTable(table);
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Profile not found');
    });

    it('should reject empty fileName (400)', async () => {
      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: '',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });
  });

  describe('4. Rate Limiting', () => {
    it('should return 429 when IP-based rate limit exceeded', async () => {
      const { checkRateLimit, createRateLimitResponse } = await import('../../../lib/rateLimit');
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: false,
        limit: 20,
        remaining: 0,
        retryAfter: 45,
      });
      vi.mocked(createRateLimitResponse).mockReturnValue(
        new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again in 45 seconds.',
            retryAfter: 45,
            limit: 20,
            remaining: 0,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '45',
              'X-RateLimit-Limit': '20',
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      );

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.retryAfter).toBe(45);
      expect(data.limit).toBe(20);
      expect(data.remaining).toBe(0);
    });

    it('should include rate limit headers in response', async () => {
      const { checkRateLimit, createRateLimitResponse } = await import('../../../lib/rateLimit');
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: false,
        limit: 20,
        remaining: 0,
        retryAfter: 45,
      });
      vi.mocked(createRateLimitResponse).mockReturnValue(
        new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again in 45 seconds.',
            retryAfter: 45,
            limit: 20,
            remaining: 0,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '45',
              'X-RateLimit-Limit': '20',
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      );

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);

      expect(response.headers.get('Retry-After')).toBe('45');
      expect(response.headers.get('X-RateLimit-Limit')).toBe('20');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should allow when within rate limit', async () => {
      const { checkRateLimit } = await import('../../../lib/rateLimit');
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        limit: 20,
        remaining: 15,
        retryAfter: 0,
      });

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);

      expect(response.status).toBe(200);
    });

    it('should return correct rate limit message format', async () => {
      const { checkRateLimit, createRateLimitResponse } = await import('../../../lib/rateLimit');
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: false,
        limit: 20,
        remaining: 0,
        retryAfter: 60,
      });
      vi.mocked(createRateLimitResponse).mockReturnValue(
        new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again in 60 seconds.',
            retryAfter: 60,
            limit: 20,
            remaining: 0,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
              'X-RateLimit-Limit': '20',
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      );

      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(data.message).toContain('Too many requests');
      expect(data.message).toContain('60 seconds');
    });
  });

  describe('5. Presigned URL Generation', () => {
    it('should generate successful URL with correct fields', async () => {
      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBe('https://r2.example.com/presigned-url');
      expect(data.key).toBe('weddings/wedding-123/media/photo.jpg');
      expect(data.publicUrl).toBe('https://r2.example.com/weddings/wedding-123/media/photo.jpg');
      expect(data.expiresAt).toBeDefined();
    });

    it('should return expiration timestamp in ISO string format', async () => {
      const request = createRequest({
        weddingId: 'wedding-123',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }, 'Bearer valid-token');

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(data.expiresAt).toBe('2026-02-04T12:00:00.000Z');
      
      // Verify it's a valid ISO string
      const expiresDate = new Date(data.expiresAt);
      expect(expiresDate).toBeInstanceOf(Date);
      expect(expiresDate.toISOString()).toBe(data.expiresAt);
    });
  });
});

// Helper functions

function createRequest(body: any, authHeader?: string): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  return new Request('http://localhost/api/upload/presign', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function createMockAdminClient() {
  return {
    from: (table: string) => createMockTable(table),
  };
}

function createMockTable(table: string) {
  if (table === 'weddings') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              owner_id: 'owner-123',
              profiles: { subscription_status: 'active' },
            },
            error: null,
          }),
        }),
      }),
    };
  }
  
  if (table === 'guest_sessions') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    };
  }
  
  return {};
}
