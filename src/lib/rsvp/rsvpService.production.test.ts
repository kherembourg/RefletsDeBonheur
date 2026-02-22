/**
 * RSVPService Production Mode Tests
 * Tests the production mode (Supabase) paths of rsvpService.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted - inline all values in the factory
vi.mock('../supabase', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
  supabase: {
    from: vi.fn(),
  },
}));

import { RSVPService } from './rsvpService';
import { DEFAULT_RSVP_CONFIG } from './types';
import * as supabaseModule from '../supabase';

// Get the mocked supabase object
const getMockFrom = () => vi.mocked(supabaseModule.supabase!.from);

function createChain(returnValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    upsert: vi.fn().mockResolvedValue(returnValue),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(returnValue),
  };
  return chain;
}

describe('RSVPService - Production Mode', () => {
  let service: RSVPService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseModule.isSupabaseConfigured).mockReturnValue(true);
    service = new RSVPService({ weddingId: 'wedding-prod-123', demoMode: false });
  });

  describe('getConfig', () => {
    it('returns default config when no record found (PGRST116)', async () => {
      const chain = createChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const config = await service.getConfig();
      expect(config.enabled).toBe(DEFAULT_RSVP_CONFIG.enabled);
    });

    it('returns default config on other errors', async () => {
      const chain = createChain({ data: null, error: { code: 'OTHER', message: 'Error' } });
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const config = await service.getConfig();
      expect(config).toEqual(expect.objectContaining({ enabled: expect.any(Boolean) }));
    });

    it('maps config from database record', async () => {
      const mockDbConfig = {
        enabled: true,
        questions: [],
        deadline: '2026-12-31',
        welcome_message: 'Welcome!',
        thank_you_message: 'Thank you!',
        allow_plus_one: true,
        ask_dietary_restrictions: false,
        max_guests_per_response: 5,
      };

      const chain = createChain({ data: mockDbConfig, error: null });
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const config = await service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.deadline).toBe('2026-12-31');
      expect(config.welcomeMessage).toBe('Welcome!');
      expect(config.thankYouMessage).toBe('Thank you!');
      expect(config.allowPlusOne).toBe(true);
      expect(config.askDietaryRestrictions).toBe(false);
      expect(config.maxGuestsPerResponse).toBe(5);
    });
  });

  describe('saveConfig', () => {
    it('saves config to supabase via upsert', async () => {
      const chain = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const config = { ...DEFAULT_RSVP_CONFIG, questions: [] };
      await expect(service.saveConfig(config)).resolves.toBeUndefined();
      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ wedding_id: 'wedding-prod-123' })
      );
    });

    it('throws when supabase returns an error', async () => {
      const chain = {
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const config = { ...DEFAULT_RSVP_CONFIG, questions: [] };
      await expect(service.saveConfig(config)).rejects.toBeTruthy();
    });
  });

  describe('getResponses', () => {
    it('returns empty responses with count from supabase', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const result = await service.getResponses();
      expect(result.responses).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('returns empty array on error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' }, count: null }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const result = await service.getResponses();
      expect(result.responses).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('filters by attendance when provided', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      await service.getResponses({ attendance: 'yes' });
      expect(chain.eq).toHaveBeenCalledWith('attendance', 'yes');
    });

    it('applies search filter when provided', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      await service.getResponses({ search: 'John' });
      expect(chain.or).toHaveBeenCalledWith(
        expect.stringContaining('John')
      );
    });
  });

  describe('getResponse', () => {
    it('returns null when response not found (PGRST116)', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const result = await service.getResponse('nonexistent-id');
      expect(result).toBeNull();
    });

    it('returns null on other errors', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'ERROR', message: 'Fail' } }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const result = await service.getResponse('id-123');
      expect(result).toBeNull();
    });

    it('returns mapped response on success', async () => {
      const mockDbResponse = {
        id: 'resp-123',
        wedding_id: 'wedding-prod-123',
        respondent_name: 'John Doe',
        respondent_email: 'john@example.com',
        respondent_phone: null,
        attendance: 'yes',
        guests: [],
        answers: [],
        message: 'Happy to attend!',
        created_at: '2024-06-15T10:00:00Z',
        updated_at: '2024-06-15T10:00:00Z',
      };

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDbResponse, error: null }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const result = await service.getResponse('resp-123');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('resp-123');
      expect(result!.respondentName).toBe('John Doe');
      expect(result!.attendance).toBe('yes');
    });
  });

  describe('submitResponse', () => {
    it('inserts response to supabase and returns mapped result', async () => {
      const mockDbResponse = {
        id: 'new-resp-id',
        wedding_id: 'wedding-prod-123',
        respondent_name: 'Jane Smith',
        respondent_email: null,
        respondent_phone: null,
        attendance: 'no',
        guests: [],
        answers: [],
        message: null,
        created_at: '2024-06-15T10:00:00Z',
        updated_at: '2024-06-15T10:00:00Z',
      };

      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDbResponse, error: null }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const response = await service.submitResponse({
        weddingId: 'wedding-prod-123',
        respondentName: 'Jane Smith',
        attendance: 'no',
        guests: [],
        answers: [],
      });

      expect(response.id).toBe('new-resp-id');
      expect(response.respondentName).toBe('Jane Smith');
    });

    it('throws on supabase error', async () => {
      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Constraint violation' } }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      await expect(service.submitResponse({
        weddingId: 'wedding-prod-123',
        respondentName: 'Test',
        attendance: 'yes',
        guests: [],
        answers: [],
      })).rejects.toBeTruthy();
    });
  });

  describe('deleteResponse', () => {
    it('deletes response from supabase', async () => {
      const chain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // The last eq() call returns the final result
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      await expect(service.deleteResponse('resp-to-delete')).resolves.toBeUndefined();
    });
  });

  describe('getStatistics', () => {
    it('returns statistics from supabase', async () => {
      const mockData = [
        { attendance: 'yes', guests: [{ name: 'Plus One' }] },
        { attendance: 'yes', guests: [] },
        { attendance: 'no', guests: [] },
        { attendance: 'maybe', guests: [] },
      ];

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const stats = await service.getStatistics();
      expect(stats.total).toBe(4);
      expect(stats.attending).toBe(2);
      expect(stats.notAttending).toBe(1);
      expect(stats.maybe).toBe(1);
      // 2 attending + 1 additional guest for first response = 3
      expect(stats.totalGuests).toBe(3);
    });

    it('returns zeros on error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      };
      getMockFrom().mockReturnValue(chain as ReturnType<typeof getMockFrom>);

      const stats = await service.getStatistics();
      expect(stats.total).toBe(0);
      expect(stats.attending).toBe(0);
      expect(stats.notAttending).toBe(0);
    });
  });
});
