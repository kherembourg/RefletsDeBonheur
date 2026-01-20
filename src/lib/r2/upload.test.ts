import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrialModeError } from './upload';

// Mock fetch for upload tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TrialModeError', () => {
  describe('Constructor', () => {
    it('should create error with correct message', () => {
      const error = new TrialModeError('Cloud uploads require subscription', 'trial');

      expect(error.message).toBe('Cloud uploads require subscription');
    });

    it('should have correct name property', () => {
      const error = new TrialModeError('Test message', 'trial');

      expect(error.name).toBe('TrialModeError');
    });

    it('should have TRIAL_MODE code', () => {
      const error = new TrialModeError('Test message', 'trial');

      expect(error.code).toBe('TRIAL_MODE');
    });

    it('should store subscription status', () => {
      const error = new TrialModeError('Test message', 'trial');

      expect(error.subscriptionStatus).toBe('trial');
    });

    it('should accept expired subscription status', () => {
      const error = new TrialModeError('Subscription expired', 'expired');

      expect(error.subscriptionStatus).toBe('expired');
    });

    it('should accept cancelled subscription status', () => {
      const error = new TrialModeError('Subscription cancelled', 'cancelled');

      expect(error.subscriptionStatus).toBe('cancelled');
    });
  });

  describe('Error Inheritance', () => {
    it('should be instance of Error', () => {
      const error = new TrialModeError('Test', 'trial');

      expect(error).toBeInstanceOf(Error);
    });

    it('should be instance of TrialModeError', () => {
      const error = new TrialModeError('Test', 'trial');

      expect(error).toBeInstanceOf(TrialModeError);
    });

    it('should have stack trace', () => {
      const error = new TrialModeError('Test', 'trial');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TrialModeError');
    });
  });

  describe('Type Checking', () => {
    it('should be distinguishable from regular Error', () => {
      const regularError = new Error('Regular error');
      const trialError = new TrialModeError('Trial error', 'trial');

      const isTrialError = (e: Error): e is TrialModeError => {
        return e instanceof TrialModeError;
      };

      expect(isTrialError(regularError)).toBe(false);
      expect(isTrialError(trialError)).toBe(true);
    });

    it('should allow type-safe property access after type guard', () => {
      const error: Error = new TrialModeError('Trial error', 'trial');

      if (error instanceof TrialModeError) {
        expect(error.code).toBe('TRIAL_MODE');
        expect(error.subscriptionStatus).toBe('trial');
      } else {
        // This branch should not be reached
        expect.fail('Error should be TrialModeError');
      }
    });
  });
});

describe('Upload Module Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadToR2 with Trial Mode Response', () => {
    it('should throw TrialModeError when presign returns TRIAL_MODE', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: 'Subscription required',
          code: 'TRIAL_MODE',
          message: 'Cloud uploads require active subscription',
          subscriptionStatus: 'trial',
        }),
      });

      // Dynamic import to get the actual uploadToR2 function
      const { uploadToR2 } = await import('./upload');

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      await expect(
        uploadToR2({
          weddingId: 'wedding-123',
          file,
        })
      ).rejects.toThrow(TrialModeError);
    });

    it('should include subscription status in TrialModeError', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: 'Subscription required',
          code: 'TRIAL_MODE',
          message: 'Cloud uploads require active subscription',
          subscriptionStatus: 'expired',
        }),
      });

      const { uploadToR2 } = await import('./upload');

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      try {
        await uploadToR2({
          weddingId: 'wedding-123',
          file,
        });
        expect.fail('Should have thrown TrialModeError');
      } catch (error) {
        expect(error).toBeInstanceOf(TrialModeError);
        if (error instanceof TrialModeError) {
          expect(error.subscriptionStatus).toBe('expired');
        }
      }
    });

    it('should throw regular Error for non-trial errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: 'Server error',
          message: 'Something went wrong',
        }),
      });

      const { uploadToR2 } = await import('./upload');

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      await expect(
        uploadToR2({
          weddingId: 'wedding-123',
          file,
        })
      ).rejects.toThrow(Error);

      await expect(
        uploadToR2({
          weddingId: 'wedding-123',
          file,
        })
      ).rejects.not.toThrow(TrialModeError);
    });
  });

  describe('isR2UploadAvailable', () => {
    it('should return true when API responds with 200', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      const { isR2UploadAvailable } = await import('./upload');
      const result = await isR2UploadAvailable();

      expect(result).toBe(true);
    });

    it('should return true when API responds with 400 (configured but invalid request)', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 400,
        ok: false,
      });

      const { isR2UploadAvailable } = await import('./upload');
      const result = await isR2UploadAvailable();

      expect(result).toBe(true);
    });

    it('should return false when API responds with 503 (not configured)', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 503,
        ok: false,
      });

      const { isR2UploadAvailable } = await import('./upload');
      const result = await isR2UploadAvailable();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { isR2UploadAvailable } = await import('./upload');
      const result = await isR2UploadAvailable();

      expect(result).toBe(false);
    });
  });
});
