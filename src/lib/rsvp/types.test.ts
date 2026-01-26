import { describe, it, expect } from 'vitest';
import {
  generateId,
  createTextQuestion,
  createSingleChoiceQuestion,
  createMultipleChoiceQuestion,
  createQuestionOption,
  isTextQuestion,
  isSingleChoiceQuestion,
  isMultipleChoiceQuestion,
  hasOptions,
  RSVP_LIMITS,
  DEFAULT_RSVP_CONFIG,
  type RSVPQuestion,
  type RSVPTextQuestion,
  type RSVPSingleChoiceQuestion,
  type RSVPMultipleChoiceQuestion,
} from './types';

describe('RSVP Types', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with expected format', () => {
      const id = generateId();
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('createTextQuestion', () => {
    it('should create a text question with defaults', () => {
      const question = createTextQuestion('wedding-123', 0);

      expect(question.type).toBe('text');
      expect(question.weddingId).toBe('wedding-123');
      expect(question.order).toBe(0);
      expect(question.required).toBe(false);
      expect(question.label).toBe('');
      expect(question.validation.maxLength).toBe(RSVP_LIMITS.maxTextAnswerLength);
    });

    it('should set correct order', () => {
      const question = createTextQuestion('wedding-123', 5);
      expect(question.order).toBe(5);
    });

    it('should have createdAt and updatedAt timestamps', () => {
      const before = new Date().toISOString();
      const question = createTextQuestion('wedding-123', 0);
      const after = new Date().toISOString();

      expect(question.createdAt).toBeDefined();
      expect(question.updatedAt).toBeDefined();
      expect(question.createdAt >= before).toBe(true);
      expect(question.createdAt <= after).toBe(true);
    });
  });

  describe('createSingleChoiceQuestion', () => {
    it('should create a single choice question with defaults', () => {
      const question = createSingleChoiceQuestion('wedding-123', 0);

      expect(question.type).toBe('single_choice');
      expect(question.weddingId).toBe('wedding-123');
      expect(question.options).toHaveLength(2);
      expect(question.displayAs).toBe('radio');
    });

    it('should have two default options', () => {
      const question = createSingleChoiceQuestion('wedding-123', 0);

      expect(question.options[0].label).toBe('Option 1');
      expect(question.options[1].label).toBe('Option 2');
    });
  });

  describe('createMultipleChoiceQuestion', () => {
    it('should create a multiple choice question with defaults', () => {
      const question = createMultipleChoiceQuestion('wedding-123', 0);

      expect(question.type).toBe('multiple_choice');
      expect(question.weddingId).toBe('wedding-123');
      expect(question.options).toHaveLength(2);
    });

    it('should not have displayAs property', () => {
      const question = createMultipleChoiceQuestion('wedding-123', 0);
      expect((question as any).displayAs).toBeUndefined();
    });
  });

  describe('createQuestionOption', () => {
    it('should create an option with correct label and value', () => {
      const option = createQuestionOption(3);

      expect(option.label).toBe('Option 3');
      expect(option.value).toBe('option_3');
      expect(option.id).toBeDefined();
    });
  });

  describe('type guards', () => {
    describe('isTextQuestion', () => {
      it('should return true for text questions', () => {
        const question = createTextQuestion('w-1', 0);
        expect(isTextQuestion(question)).toBe(true);
      });

      it('should return false for choice questions', () => {
        const question = createSingleChoiceQuestion('w-1', 0);
        expect(isTextQuestion(question)).toBe(false);
      });
    });

    describe('isSingleChoiceQuestion', () => {
      it('should return true for single choice questions', () => {
        const question = createSingleChoiceQuestion('w-1', 0);
        expect(isSingleChoiceQuestion(question)).toBe(true);
      });

      it('should return false for other types', () => {
        const textQ = createTextQuestion('w-1', 0);
        const multiQ = createMultipleChoiceQuestion('w-1', 0);

        expect(isSingleChoiceQuestion(textQ)).toBe(false);
        expect(isSingleChoiceQuestion(multiQ)).toBe(false);
      });
    });

    describe('isMultipleChoiceQuestion', () => {
      it('should return true for multiple choice questions', () => {
        const question = createMultipleChoiceQuestion('w-1', 0);
        expect(isMultipleChoiceQuestion(question)).toBe(true);
      });

      it('should return false for other types', () => {
        const textQ = createTextQuestion('w-1', 0);
        const singleQ = createSingleChoiceQuestion('w-1', 0);

        expect(isMultipleChoiceQuestion(textQ)).toBe(false);
        expect(isMultipleChoiceQuestion(singleQ)).toBe(false);
      });
    });

    describe('hasOptions', () => {
      it('should return true for single choice questions', () => {
        const question = createSingleChoiceQuestion('w-1', 0);
        expect(hasOptions(question)).toBe(true);
      });

      it('should return true for multiple choice questions', () => {
        const question = createMultipleChoiceQuestion('w-1', 0);
        expect(hasOptions(question)).toBe(true);
      });

      it('should return false for text questions', () => {
        const question = createTextQuestion('w-1', 0);
        expect(hasOptions(question)).toBe(false);
      });
    });
  });

  describe('RSVP_LIMITS', () => {
    it('should have reasonable limits', () => {
      expect(RSVP_LIMITS.maxQuestionsPerWedding).toBeGreaterThanOrEqual(10);
      expect(RSVP_LIMITS.maxOptionsPerQuestion).toBeGreaterThanOrEqual(5);
      expect(RSVP_LIMITS.maxLabelLength).toBeGreaterThanOrEqual(100);
      expect(RSVP_LIMITS.maxTextAnswerLength).toBeGreaterThanOrEqual(500);
    });

    it('should have email length limit following standard', () => {
      expect(RSVP_LIMITS.maxEmailLength).toBe(254);
    });
  });

  describe('DEFAULT_RSVP_CONFIG', () => {
    it('should have enabled by default', () => {
      expect(DEFAULT_RSVP_CONFIG.enabled).toBe(true);
    });

    it('should have empty questions array', () => {
      expect(DEFAULT_RSVP_CONFIG.questions).toEqual([]);
    });

    it('should allow plus one by default', () => {
      expect(DEFAULT_RSVP_CONFIG.allowPlusOne).toBe(true);
    });

    it('should ask dietary restrictions by default', () => {
      expect(DEFAULT_RSVP_CONFIG.askDietaryRestrictions).toBe(true);
    });

    it('should have reasonable max guests', () => {
      expect(DEFAULT_RSVP_CONFIG.maxGuestsPerResponse).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_RSVP_CONFIG.maxGuestsPerResponse).toBeLessThanOrEqual(20);
    });
  });
});
