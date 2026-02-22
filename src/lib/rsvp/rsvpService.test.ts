import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RSVPService } from './rsvpService';
import {
  DEFAULT_RSVP_CONFIG,
  createTextQuestion,
  createSingleChoiceQuestion,
  RSVP_LIMITS,
  type RSVPConfig,
  type RSVPResponse,
} from './types';

// Note: localStorage mock is provided by the global test setup (src/test/setup.ts)
// which clears it before each test

// Deterministic counter for unique wedding IDs
let weddingCounter = 0;

describe('RSVPService', () => {
  let service: RSVPService;
  let weddingId: string;

  beforeEach(() => {
    // Use a unique weddingId for each test to ensure complete isolation
    weddingId = `test-wedding-${++weddingCounter}`;
    // localStorage is cleared by the global setup's beforeEach
    // Create a fresh service instance for each test
    service = new RSVPService({ weddingId, demoMode: true });
  });

  describe('Configuration Management', () => {
    describe('getConfig', () => {
      it('should return default config when none exists', async () => {
        const config = await service.getConfig();

        expect(config.enabled).toBe(DEFAULT_RSVP_CONFIG.enabled);
        expect(config.questions).toEqual([]);
        expect(config.allowPlusOne).toBe(true);
      });

      it('should return saved config', async () => {
        const customConfig: RSVPConfig = {
          ...DEFAULT_RSVP_CONFIG,
          enabled: false,
          welcomeMessage: 'Welcome!',
        };

        await service.saveConfig(customConfig);
        const config = await service.getConfig();

        expect(config.enabled).toBe(false);
        expect(config.welcomeMessage).toBe('Welcome!');
      });
    });

    describe('saveConfig', () => {
      it('should save configuration', async () => {
        const config: RSVPConfig = {
          ...DEFAULT_RSVP_CONFIG,
          enabled: true,
          deadline: '2024-12-31T00:00:00Z',
        };

        await service.saveConfig(config);
        const saved = await service.getConfig();

        expect(saved.deadline).toBe('2024-12-31T00:00:00Z');
      });

      it('should throw error when exceeding question limit', async () => {
        const questions = Array.from({ length: RSVP_LIMITS.maxQuestionsPerWedding + 1 }, (_, i) =>
          createTextQuestion(weddingId, i)
        );

        const config: RSVPConfig = {
          ...DEFAULT_RSVP_CONFIG,
          questions,
        };

        await expect(service.saveConfig(config)).rejects.toThrow();
      });
    });

    describe('toggleEnabled', () => {
      it('should toggle enabled state to true', async () => {
        await service.toggleEnabled(true);
        const config = await service.getConfig();
        expect(config.enabled).toBe(true);
      });

      it('should toggle enabled state to false', async () => {
        await service.toggleEnabled(false);
        const config = await service.getConfig();
        expect(config.enabled).toBe(false);
      });
    });
  });

  describe('Question Management', () => {
    describe('getQuestions', () => {
      it('should return empty array when no questions', async () => {
        const questions = await service.getQuestions();
        expect(questions).toEqual([]);
      });

      it('should return questions sorted by order', async () => {
        const q1 = createTextQuestion(weddingId, 2);
        const q2 = createTextQuestion(weddingId, 0);
        const q3 = createTextQuestion(weddingId, 1);

        await service.saveConfig({
          ...DEFAULT_RSVP_CONFIG,
          questions: [q1, q2, q3],
        });

        const questions = await service.getQuestions();

        expect(questions[0].order).toBe(0);
        expect(questions[1].order).toBe(1);
        expect(questions[2].order).toBe(2);
      });
    });

    describe('addQuestion', () => {
      it('should add a new question', async () => {
        const question = createTextQuestion(weddingId, 0);
        question.label = 'Test Question';

        await service.addQuestion(question);
        const questions = await service.getQuestions();

        expect(questions).toHaveLength(1);
        expect(questions[0].label).toBe('Test Question');
      });

      it('should throw error when at question limit', async () => {
        const questions = Array.from({ length: RSVP_LIMITS.maxQuestionsPerWedding }, (_, i) =>
          createTextQuestion(weddingId, i)
        );

        await service.saveConfig({
          ...DEFAULT_RSVP_CONFIG,
          questions,
        });

        const newQuestion = createTextQuestion(weddingId, RSVP_LIMITS.maxQuestionsPerWedding);
        await expect(service.addQuestion(newQuestion)).rejects.toThrow();
      });
    });

    describe('updateQuestion', () => {
      it('should update an existing question', async () => {
        const question = createTextQuestion(weddingId, 0);
        question.label = 'Original';

        await service.addQuestion(question);

        question.label = 'Updated';
        await service.updateQuestion(question);

        const questions = await service.getQuestions();
        expect(questions[0].label).toBe('Updated');
      });

      it('should throw error for non-existent question', async () => {
        const question = createTextQuestion(weddingId, 0);
        question.id = 'non-existent';

        await expect(service.updateQuestion(question)).rejects.toThrow('Question not found');
      });
    });

    describe('deleteQuestion', () => {
      it('should delete a question', async () => {
        const q1 = createTextQuestion(weddingId, 0);
        const q2 = createTextQuestion(weddingId, 1);

        await service.saveConfig({
          ...DEFAULT_RSVP_CONFIG,
          questions: [q1, q2],
        });

        await service.deleteQuestion(q1.id);
        const questions = await service.getQuestions();

        expect(questions).toHaveLength(1);
        expect(questions[0].id).toBe(q2.id);
      });

      it('should reorder remaining questions after deletion', async () => {
        const q1 = createTextQuestion(weddingId, 0);
        const q2 = createTextQuestion(weddingId, 1);
        const q3 = createTextQuestion(weddingId, 2);

        await service.saveConfig({
          ...DEFAULT_RSVP_CONFIG,
          questions: [q1, q2, q3],
        });

        await service.deleteQuestion(q1.id);
        const questions = await service.getQuestions();

        expect(questions[0].order).toBe(0);
        expect(questions[1].order).toBe(1);
      });
    });

    describe('reorderQuestions', () => {
      it('should reorder questions', async () => {
        const q1 = createTextQuestion(weddingId, 0);
        q1.label = 'First';
        const q2 = createTextQuestion(weddingId, 1);
        q2.label = 'Second';
        const q3 = createTextQuestion(weddingId, 2);
        q3.label = 'Third';

        await service.saveConfig({
          ...DEFAULT_RSVP_CONFIG,
          questions: [q1, q2, q3],
        });

        // Reverse order
        await service.reorderQuestions([q3.id, q2.id, q1.id]);
        const questions = await service.getQuestions();

        expect(questions[0].label).toBe('Third');
        expect(questions[1].label).toBe('Second');
        expect(questions[2].label).toBe('First');
      });
    });
  });

  describe('Response Management', () => {
    describe('getResponses', () => {
      it('should return empty array when no responses', async () => {
        const { responses, total } = await service.getResponses();

        expect(responses).toEqual([]);
        expect(total).toBe(0);
      });

      it('should return paginated responses', async () => {
        // Submit 15 responses
        for (let i = 0; i < 15; i++) {
          await service.submitResponse({
            weddingId,
            respondentName: `Guest ${i}`,
            attendance: 'yes',
            guests: [],
            answers: [],
          });
        }

        const { responses, total } = await service.getResponses({ page: 1, pageSize: 10 });

        expect(responses).toHaveLength(10);
        expect(total).toBe(15);
      });

      it('should filter by attendance', async () => {
        await service.submitResponse({
          weddingId,
          respondentName: 'Guest 1',
          attendance: 'yes',
          guests: [],
          answers: [],
        });
        await service.submitResponse({
          weddingId,
          respondentName: 'Guest 2',
          attendance: 'no',
          guests: [],
          answers: [],
        });

        const { responses, total } = await service.getResponses({ attendance: 'yes' });

        expect(responses).toHaveLength(1);
        expect(responses[0].respondentName).toBe('Guest 1');
      });

      it('should search by name', async () => {
        await service.submitResponse({
          weddingId,
          respondentName: 'John Smith',
          attendance: 'yes',
          guests: [],
          answers: [],
        });
        await service.submitResponse({
          weddingId,
          respondentName: 'Jane Doe',
          attendance: 'yes',
          guests: [],
          answers: [],
        });

        const { responses } = await service.getResponses({ search: 'John' });

        expect(responses).toHaveLength(1);
        expect(responses[0].respondentName).toBe('John Smith');
      });
    });

    describe('submitResponse', () => {
      it('should submit a new response', async () => {
        const response = await service.submitResponse({
          weddingId,
          respondentName: 'Test Guest',
          respondentEmail: 'test@example.com',
          attendance: 'yes',
          guests: [{ name: 'Plus One' }],
          answers: [{ questionId: 'q1', value: 'Answer' }],
          message: 'Looking forward!',
        });

        expect(response.id).toBeDefined();
        expect(response.respondentName).toBe('Test Guest');
        expect(response.createdAt).toBeDefined();
      });

      it('should set correct attendance', async () => {
        const response = await service.submitResponse({
          weddingId,
          respondentName: 'Guest',
          attendance: 'maybe',
          guests: [],
          answers: [],
        });

        expect(response.attendance).toBe('maybe');
      });
    });

    describe('getResponse', () => {
      it('should return a specific response', async () => {
        const submitted = await service.submitResponse({
          weddingId,
          respondentName: 'Guest',
          attendance: 'yes',
          guests: [],
          answers: [],
        });

        const response = await service.getResponse(submitted.id);

        expect(response).not.toBeNull();
        expect(response?.id).toBe(submitted.id);
      });

      it('should return null for non-existent response', async () => {
        const response = await service.getResponse('non-existent');
        expect(response).toBeNull();
      });
    });

    describe('deleteResponse', () => {
      it('should delete a response', async () => {
        const submitted = await service.submitResponse({
          weddingId,
          respondentName: 'Guest',
          attendance: 'yes',
          guests: [],
          answers: [],
        });

        await service.deleteResponse(submitted.id);

        const { total } = await service.getResponses();
        expect(total).toBe(0);
      });
    });
  });

  describe('Statistics', () => {
    describe('getStatistics', () => {
      it('should return zero statistics when no responses', async () => {
        const stats = await service.getStatistics();

        expect(stats.total).toBe(0);
        expect(stats.attending).toBe(0);
        expect(stats.notAttending).toBe(0);
        expect(stats.maybe).toBe(0);
        expect(stats.totalGuests).toBe(0);
      });

      it('should calculate attendance statistics correctly', async () => {
        await service.submitResponse({
          weddingId,
          respondentName: 'Guest 1',
          attendance: 'yes',
          guests: [],
          answers: [],
        });
        await service.submitResponse({
          weddingId,
          respondentName: 'Guest 2',
          attendance: 'yes',
          guests: [{ name: 'Plus One' }],
          answers: [],
        });
        await service.submitResponse({
          weddingId,
          respondentName: 'Guest 3',
          attendance: 'no',
          guests: [],
          answers: [],
        });
        await service.submitResponse({
          weddingId,
          respondentName: 'Guest 4',
          attendance: 'maybe',
          guests: [],
          answers: [],
        });

        const stats = await service.getStatistics();

        expect(stats.total).toBe(4);
        expect(stats.attending).toBe(2);
        expect(stats.notAttending).toBe(1);
        expect(stats.maybe).toBe(1);
        expect(stats.totalGuests).toBe(3); // 2 attending + 1 plus one
      });
    });
  });
});
