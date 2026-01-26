/**
 * RSVP Service
 *
 * Service layer for RSVP management operations.
 * Handles both demo mode (localStorage) and production mode (Supabase).
 */

import type {
  RSVPConfig,
  RSVPQuestion,
  RSVPResponse,
  RSVPStatistics,
} from './types';
import {
  DEFAULT_RSVP_CONFIG,
  RSVP_LIMITS,
} from './types';
import { isSupabaseConfigured, supabase } from '../supabase';

const DEMO_STORAGE_KEY = 'reflets_demo_rsvp';

interface DemoRSVPData {
  configs: Record<string, RSVPConfig>;
  responses: Record<string, RSVPResponse[]>;
}

/**
 * Get demo data from localStorage
 */
function getDemoData(): DemoRSVPData {
  if (typeof window === 'undefined') {
    return { configs: {}, responses: {} };
  }
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { configs: {}, responses: {} };
  } catch {
    return { configs: {}, responses: {} };
  }
}

/**
 * Save demo data to localStorage
 */
function saveDemoData(data: DemoRSVPData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save demo RSVP data:', error);
  }
}

export interface RSVPServiceOptions {
  weddingId: string;
  demoMode?: boolean;
}

export class RSVPService {
  private weddingId: string;
  private demoMode: boolean;

  constructor({ weddingId, demoMode = false }: RSVPServiceOptions) {
    this.weddingId = weddingId;
    this.demoMode = demoMode || !isSupabaseConfigured();
  }

  // ============================================
  // CONFIGURATION METHODS
  // ============================================

  /**
   * Get RSVP configuration for the wedding
   */
  async getConfig(): Promise<RSVPConfig> {
    if (this.demoMode) {
      const data = getDemoData();
      // IMPORTANT: Create a fresh config with a new questions array to avoid
      // shared state between different wedding configs. Shallow spread would
      // share the same questions array reference across all default configs.
      return data.configs[this.weddingId] || {
        ...DEFAULT_RSVP_CONFIG,
        questions: [], // Fresh array for each wedding
      };
    }

    try {
      const { data, error } = await supabase
        .from('rsvp_config')
        .select('*')
        .eq('wedding_id', this.weddingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No config found, return default
          return { ...DEFAULT_RSVP_CONFIG };
        }
        throw error;
      }

      return this.mapConfigFromDb(data);
    } catch (error) {
      console.error('Failed to get RSVP config:', error);
      return { ...DEFAULT_RSVP_CONFIG };
    }
  }

  /**
   * Save RSVP configuration
   */
  async saveConfig(config: RSVPConfig): Promise<void> {
    // Validate limits
    if (config.questions.length > RSVP_LIMITS.maxQuestionsPerWedding) {
      throw new Error(`Maximum ${RSVP_LIMITS.maxQuestionsPerWedding} questions allowed`);
    }

    if (this.demoMode) {
      const data = getDemoData();
      data.configs[this.weddingId] = config;
      saveDemoData(data);
      return;
    }

    try {
      const { error } = await supabase
        .from('rsvp_config')
        .upsert({
          wedding_id: this.weddingId,
          enabled: config.enabled,
          questions: config.questions,
          deadline: config.deadline,
          welcome_message: config.welcomeMessage,
          thank_you_message: config.thankYouMessage,
          allow_plus_one: config.allowPlusOne,
          ask_dietary_restrictions: config.askDietaryRestrictions,
          max_guests_per_response: config.maxGuestsPerResponse,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save RSVP config:', error);
      throw error;
    }
  }

  /**
   * Toggle RSVP enabled state
   */
  async toggleEnabled(enabled: boolean): Promise<void> {
    const config = await this.getConfig();
    config.enabled = enabled;
    await this.saveConfig(config);
  }

  // ============================================
  // QUESTION METHODS
  // ============================================

  /**
   * Get all questions
   */
  async getQuestions(): Promise<RSVPQuestion[]> {
    const config = await this.getConfig();
    return config.questions.sort((a, b) => a.order - b.order);
  }

  /**
   * Add a new question
   */
  async addQuestion(question: RSVPQuestion): Promise<void> {
    const config = await this.getConfig();

    if (config.questions.length >= RSVP_LIMITS.maxQuestionsPerWedding) {
      throw new Error(`Maximum ${RSVP_LIMITS.maxQuestionsPerWedding} questions allowed`);
    }

    config.questions.push(question);
    await this.saveConfig(config);
  }

  /**
   * Update an existing question
   */
  async updateQuestion(question: RSVPQuestion): Promise<void> {
    const config = await this.getConfig();
    const index = config.questions.findIndex((q) => q.id === question.id);

    if (index === -1) {
      throw new Error('Question not found');
    }

    config.questions[index] = {
      ...question,
      updatedAt: new Date().toISOString(),
    };
    await this.saveConfig(config);
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string): Promise<void> {
    const config = await this.getConfig();
    config.questions = config.questions.filter((q) => q.id !== questionId);

    // Reorder remaining questions
    config.questions.forEach((q, index) => {
      q.order = index;
    });

    await this.saveConfig(config);
  }

  /**
   * Reorder questions
   */
  async reorderQuestions(questionIds: string[]): Promise<void> {
    const config = await this.getConfig();
    const questionsMap = new Map(config.questions.map((q) => [q.id, q]));

    config.questions = questionIds
      .map((id, index) => {
        const question = questionsMap.get(id);
        if (question) {
          return { ...question, order: index };
        }
        return null;
      })
      .filter((q): q is RSVPQuestion => q !== null);

    await this.saveConfig(config);
  }

  // ============================================
  // RESPONSE METHODS
  // ============================================

  /**
   * Get all responses with pagination
   */
  async getResponses(options?: {
    page?: number;
    pageSize?: number;
    attendance?: 'yes' | 'no' | 'maybe';
    search?: string;
  }): Promise<{ responses: RSVPResponse[]; total: number }> {
    const { page = 1, pageSize = 10, attendance, search } = options || {};

    if (this.demoMode) {
      const data = getDemoData();
      let responses = data.responses[this.weddingId] || [];

      // Apply filters
      if (attendance) {
        responses = responses.filter((r) => r.attendance === attendance);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        responses = responses.filter(
          (r) =>
            r.respondentName.toLowerCase().includes(searchLower) ||
            r.respondentEmail?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by creation date (newest first)
      responses.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Paginate
      const total = responses.length;
      const start = (page - 1) * pageSize;
      const paginatedResponses = responses.slice(start, start + pageSize);

      return { responses: paginatedResponses, total };
    }

    try {
      let query = supabase
        .from('rsvp_responses')
        .select('*', { count: 'exact' })
        .eq('wedding_id', this.weddingId);

      if (attendance) {
        query = query.eq('attendance', attendance);
      }

      if (search) {
        query = query.or(
          `respondent_name.ilike.%${search}%,respondent_email.ilike.%${search}%`
        );
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      return {
        responses: (data || []).map(this.mapResponseFromDb),
        total: count || 0,
      };
    } catch (error) {
      console.error('Failed to get RSVP responses:', error);
      return { responses: [], total: 0 };
    }
  }

  /**
   * Get a single response by ID
   */
  async getResponse(responseId: string): Promise<RSVPResponse | null> {
    if (this.demoMode) {
      const data = getDemoData();
      const responses = data.responses[this.weddingId] || [];
      return responses.find((r) => r.id === responseId) || null;
    }

    try {
      const { data, error } = await supabase
        .from('rsvp_responses')
        .select('*')
        .eq('id', responseId)
        .eq('wedding_id', this.weddingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapResponseFromDb(data);
    } catch (error) {
      console.error('Failed to get RSVP response:', error);
      return null;
    }
  }

  /**
   * Submit a new RSVP response (guest-facing)
   */
  async submitResponse(response: Omit<RSVPResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<RSVPResponse> {
    const newResponse: RSVPResponse = {
      ...response,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (this.demoMode) {
      const data = getDemoData();
      if (!data.responses[this.weddingId]) {
        data.responses[this.weddingId] = [];
      }
      data.responses[this.weddingId].push(newResponse);
      saveDemoData(data);
      return newResponse;
    }

    try {
      const { data, error } = await supabase
        .from('rsvp_responses')
        .insert({
          wedding_id: this.weddingId,
          respondent_name: response.respondentName,
          respondent_email: response.respondentEmail,
          respondent_phone: response.respondentPhone,
          attendance: response.attendance,
          guests: response.guests,
          answers: response.answers,
          message: response.message,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapResponseFromDb(data);
    } catch (error) {
      console.error('Failed to submit RSVP response:', error);
      throw error;
    }
  }

  /**
   * Delete a response
   */
  async deleteResponse(responseId: string): Promise<void> {
    if (this.demoMode) {
      const data = getDemoData();
      if (data.responses[this.weddingId]) {
        data.responses[this.weddingId] = data.responses[this.weddingId].filter(
          (r) => r.id !== responseId
        );
        saveDemoData(data);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('rsvp_responses')
        .delete()
        .eq('id', responseId)
        .eq('wedding_id', this.weddingId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete RSVP response:', error);
      throw error;
    }
  }

  // ============================================
  // STATISTICS METHODS
  // ============================================

  /**
   * Get RSVP statistics
   */
  async getStatistics(): Promise<RSVPStatistics> {
    if (this.demoMode) {
      const data = getDemoData();
      const responses = data.responses[this.weddingId] || [];

      const attending = responses.filter((r) => r.attendance === 'yes');
      const totalGuests = attending.reduce((sum, r) => sum + r.guests.length + 1, 0);

      return {
        total: responses.length,
        attending: attending.length,
        notAttending: responses.filter((r) => r.attendance === 'no').length,
        maybe: responses.filter((r) => r.attendance === 'maybe').length,
        totalGuests,
      };
    }

    try {
      const { data, error } = await supabase
        .from('rsvp_responses')
        .select('attendance, guests')
        .eq('wedding_id', this.weddingId);

      if (error) throw error;

      const responses = data || [];
      const attending = responses.filter((r) => r.attendance === 'yes');
      const totalGuests = attending.reduce(
        (sum, r) => sum + (r.guests?.length || 0) + 1,
        0
      );

      return {
        total: responses.length,
        attending: attending.length,
        notAttending: responses.filter((r) => r.attendance === 'no').length,
        maybe: responses.filter((r) => r.attendance === 'maybe').length,
        totalGuests,
      };
    } catch (error) {
      console.error('Failed to get RSVP statistics:', error);
      return {
        total: 0,
        attending: 0,
        notAttending: 0,
        maybe: 0,
        totalGuests: 0,
      };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapConfigFromDb(data: Record<string, unknown>): RSVPConfig {
    return {
      enabled: data.enabled as boolean,
      questions: (data.questions as RSVPQuestion[]) || [],
      deadline: data.deadline as string | undefined,
      welcomeMessage: data.welcome_message as string | undefined,
      thankYouMessage: data.thank_you_message as string | undefined,
      allowPlusOne: data.allow_plus_one as boolean,
      askDietaryRestrictions: data.ask_dietary_restrictions as boolean,
      maxGuestsPerResponse: data.max_guests_per_response as number,
    };
  }

  private mapResponseFromDb(data: Record<string, unknown>): RSVPResponse {
    return {
      id: data.id as string,
      weddingId: data.wedding_id as string,
      respondentName: data.respondent_name as string,
      respondentEmail: data.respondent_email as string | undefined,
      respondentPhone: data.respondent_phone as string | undefined,
      attendance: data.attendance as 'yes' | 'no' | 'maybe',
      guests: (data.guests as RSVPResponse['guests']) || [],
      answers: (data.answers as RSVPResponse['answers']) || [],
      message: data.message as string | undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}
