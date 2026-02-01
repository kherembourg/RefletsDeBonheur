import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyProfileOwnership, validateSameOrigin, errorResponse, jsonResponse } from './apiAuth';

// Mock Supabase client with proper chaining
const createMockSupabaseClient = (singleResult: { data: any; error: any }) => {
  const chainMock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleResult),
  };

  return {
    from: vi.fn().mockReturnValue(chainMock),
  };
};

describe('apiAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyProfileOwnership', () => {
    it('returns unauthorized when no token is provided', async () => {
      const request = new Request('http://localhost:4321/api/test', {
        method: 'POST',
      });

      const mockClient = createMockSupabaseClient({ data: null, error: null }) as any;
      const result = await verifyProfileOwnership(request, 'profile-123', mockClient);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Missing authentication token');
    });

    it('returns unauthorized when token is invalid', async () => {
      const request = new Request('http://localhost:4321/api/test', {
        method: 'POST',
        headers: { 'x-client-token': 'invalid-token' },
      });

      const mockClient = createMockSupabaseClient({ data: null, error: { message: 'Not found' } }) as any;
      const result = await verifyProfileOwnership(request, 'profile-123', mockClient);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Invalid or expired session');
    });

    it('returns unauthorized when user does not own the profile', async () => {
      const request = new Request('http://localhost:4321/api/test', {
        method: 'POST',
        headers: { 'x-client-token': 'valid-token' },
      });

      const mockClient = createMockSupabaseClient({
        data: { user_id: 'different-user-id' },
        error: null,
      }) as any;
      const result = await verifyProfileOwnership(request, 'profile-123', mockClient);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Unauthorized access to profile');
    });

    it('returns authorized when user owns the profile', async () => {
      const request = new Request('http://localhost:4321/api/test', {
        method: 'POST',
        headers: { 'x-client-token': 'valid-token' },
      });

      const mockClient = createMockSupabaseClient({
        data: { user_id: 'profile-123' },
        error: null,
      }) as any;
      const result = await verifyProfileOwnership(request, 'profile-123', mockClient);

      expect(result.authorized).toBe(true);
      expect(result.profileId).toBe('profile-123');
    });
  });

  describe('validateSameOrigin', () => {
    it('returns true for same-origin URLs', () => {
      expect(validateSameOrigin('http://localhost:4321/success', 'http://localhost:4321')).toBe(true);
      expect(validateSameOrigin('https://example.com/path', 'https://example.com')).toBe(true);
      expect(validateSameOrigin('https://example.com/a/b/c?query=1', 'https://example.com/')).toBe(true);
    });

    it('returns false for different-origin URLs', () => {
      expect(validateSameOrigin('https://evil.com', 'https://example.com')).toBe(false);
      expect(validateSameOrigin('http://localhost:4321', 'https://localhost:4321')).toBe(false);
      expect(validateSameOrigin('http://localhost:3000', 'http://localhost:4321')).toBe(false);
    });

    it('returns false for invalid URLs', () => {
      expect(validateSameOrigin('not-a-url', 'https://example.com')).toBe(false);
      expect(validateSameOrigin('', 'https://example.com')).toBe(false);
      expect(validateSameOrigin('javascript:alert(1)', 'https://example.com')).toBe(false);
    });

    it('handles trailing slashes correctly', () => {
      expect(validateSameOrigin('https://example.com/path', 'https://example.com/')).toBe(true);
      expect(validateSameOrigin('https://example.com/', 'https://example.com')).toBe(true);
    });
  });

  describe('errorResponse', () => {
    it('creates a JSON error response with default status 400', async () => {
      const response = errorResponse('Something went wrong');

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body.error).toBe('Something went wrong');
    });

    it('creates a JSON error response with custom status', async () => {
      const response = errorResponse('Not found', 404);

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe('Not found');
    });

    it('includes error code when provided', async () => {
      const response = errorResponse('Already exists', 400, 'ALREADY_ACTIVE');

      const body = await response.json();
      expect(body.error).toBe('Already exists');
      expect(body.code).toBe('ALREADY_ACTIVE');
    });
  });

  describe('jsonResponse', () => {
    it('creates a JSON response with default status 200', async () => {
      const response = jsonResponse({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body.data).toBe('test');
    });

    it('creates a JSON response with custom status', async () => {
      const response = jsonResponse({ created: true }, 201);

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.created).toBe(true);
    });
  });
});
