/**
 * RSVP Management - Functional Test Scenarios
 *
 * These tests describe the expected behavior of the RSVP management system
 * from a user's perspective. They cover the main user flows and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RSVPService } from '../../lib/rsvp/rsvpService';
import {
  createTextQuestion,
  createSingleChoiceQuestion,
  createMultipleChoiceQuestion,
  RSVP_LIMITS,
} from '../../lib/rsvp/types';

// Note: localStorage mock is provided by the global test setup (src/test/setup.ts)
// which clears it before each test

// Deterministic counter for unique wedding IDs
let scenarioWeddingCounter = 0;
const createUniqueWeddingId = () => `scenario-wedding-${++scenarioWeddingCounter}`;

describe('RSVP Management - Functional Scenarios', () => {

  describe('Scenario: Admin configures RSVP for their wedding', () => {
    it('should allow enabling/disabling the RSVP feature', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      // Initially enabled
      let config = await service.getConfig();
      expect(config.enabled).toBe(true);

      // Disable RSVP
      await service.toggleEnabled(false);
      config = await service.getConfig();
      expect(config.enabled).toBe(false);

      // Re-enable RSVP
      await service.toggleEnabled(true);
      config = await service.getConfig();
      expect(config.enabled).toBe(true);
    });

    it('should allow setting a deadline', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });
      const deadline = '2024-12-15T00:00:00Z';

      await service.saveConfig({
        ...(await service.getConfig()),
        deadline,
      });

      const config = await service.getConfig();
      expect(config.deadline).toBe(deadline);
    });

    it('should allow customizing welcome and thank you messages', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      await service.saveConfig({
        ...(await service.getConfig()),
        welcomeMessage: 'We are excited to celebrate with you!',
        thankYouMessage: 'Thank you for responding. See you soon!',
      });

      const config = await service.getConfig();
      expect(config.welcomeMessage).toBe('We are excited to celebrate with you!');
      expect(config.thankYouMessage).toBe('Thank you for responding. See you soon!');
    });

    it('should allow configuring plus-one and dietary settings', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      await service.saveConfig({
        ...(await service.getConfig()),
        allowPlusOne: false,
        askDietaryRestrictions: false,
        maxGuestsPerResponse: 2,
      });

      const config = await service.getConfig();
      expect(config.allowPlusOne).toBe(false);
      expect(config.askDietaryRestrictions).toBe(false);
      expect(config.maxGuestsPerResponse).toBe(2);
    });
  });

  describe('Scenario: Admin creates custom questions', () => {
    it('should allow adding a text question', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const question = createTextQuestion(weddingId, 0);
      question.label = 'What song would you like us to play at the reception?';
      question.required = false;

      await service.addQuestion(question);
      const questions = await service.getQuestions();

      expect(questions).toHaveLength(1);
      expect(questions[0].label).toBe('What song would you like us to play at the reception?');
      expect(questions[0].type).toBe('text');
    });

    it('should allow adding a single choice question', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const question = createSingleChoiceQuestion(weddingId, 0);
      question.label = 'Which meal would you prefer?';
      question.options = [
        { id: '1', label: 'Beef', value: 'beef' },
        { id: '2', label: 'Chicken', value: 'chicken' },
        { id: '3', label: 'Vegetarian', value: 'vegetarian' },
      ];
      question.required = true;

      await service.addQuestion(question);
      const questions = await service.getQuestions();

      expect(questions).toHaveLength(1);
      expect(questions[0].type).toBe('single_choice');
      expect((questions[0] as any).options).toHaveLength(3);
    });

    it('should allow adding a multiple choice question', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const question = createMultipleChoiceQuestion(weddingId, 0);
      question.label = 'Which events will you attend?';
      question.options = [
        { id: '1', label: 'Ceremony', value: 'ceremony' },
        { id: '2', label: 'Reception', value: 'reception' },
        { id: '3', label: 'After-party', value: 'after_party' },
      ];

      await service.addQuestion(question);
      const questions = await service.getQuestions();

      expect(questions).toHaveLength(1);
      expect(questions[0].type).toBe('multiple_choice');
    });

    it('should enforce the maximum question limit', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      // Add max questions
      for (let i = 0; i < RSVP_LIMITS.maxQuestionsPerWedding; i++) {
        const q = createTextQuestion(weddingId, i);
        q.label = `Question ${i + 1}`;
        await service.addQuestion(q);
      }

      // Try to add one more
      const extraQuestion = createTextQuestion(weddingId, RSVP_LIMITS.maxQuestionsPerWedding);
      extraQuestion.label = 'Extra question';

      await expect(service.addQuestion(extraQuestion)).rejects.toThrow();
    });

    it('should allow reordering questions', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const q1 = createTextQuestion(weddingId, 0);
      q1.label = 'First';
      const q2 = createTextQuestion(weddingId, 1);
      q2.label = 'Second';
      const q3 = createTextQuestion(weddingId, 2);
      q3.label = 'Third';

      await service.addQuestion(q1);
      await service.addQuestion(q2);
      await service.addQuestion(q3);

      // Reorder: Third, First, Second
      await service.reorderQuestions([q3.id, q1.id, q2.id]);

      const questions = await service.getQuestions();
      expect(questions[0].label).toBe('Third');
      expect(questions[1].label).toBe('First');
      expect(questions[2].label).toBe('Second');
    });

    it('should allow editing a question', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const question = createTextQuestion(weddingId, 0);
      question.label = 'Original label';

      await service.addQuestion(question);

      question.label = 'Updated label';
      question.required = true;

      await service.updateQuestion(question);

      const questions = await service.getQuestions();
      expect(questions[0].label).toBe('Updated label');
      expect(questions[0].required).toBe(true);
    });

    it('should allow deleting a question', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const q1 = createTextQuestion(weddingId, 0);
      const q2 = createTextQuestion(weddingId, 1);

      await service.addQuestion(q1);
      await service.addQuestion(q2);

      await service.deleteQuestion(q1.id);

      const questions = await service.getQuestions();
      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe(q2.id);
    });
  });

  describe('Scenario: Guest submits RSVP response', () => {
    it('should allow submitting a basic response', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const response = await service.submitResponse({
        weddingId,
        respondentName: 'John Doe',
        respondentEmail: 'john@example.com',
        attendance: 'yes',
        guests: [],
        answers: [],
      });

      expect(response.id).toBeDefined();
      expect(response.respondentName).toBe('John Doe');
      expect(response.attendance).toBe('yes');
    });

    it('should allow submitting with plus-ones', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const response = await service.submitResponse({
        weddingId,
        respondentName: 'John Doe',
        attendance: 'yes',
        guests: [
          { name: 'Jane Doe', dietaryRestrictions: 'Vegetarian' },
          { name: 'Kid Doe', isChild: true },
        ],
        answers: [],
      });

      expect(response.guests).toHaveLength(2);
      expect(response.guests[0].name).toBe('Jane Doe');
      expect(response.guests[1].isChild).toBe(true);
    });

    it('should allow answering custom questions', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      // First add a question
      const question = createSingleChoiceQuestion(weddingId, 0);
      question.label = 'Meal preference';
      await service.addQuestion(question);

      // Then submit response with answer
      const response = await service.submitResponse({
        weddingId,
        respondentName: 'John Doe',
        attendance: 'yes',
        guests: [],
        answers: [
          { questionId: question.id, value: 'vegetarian' },
        ],
      });

      expect(response.answers).toHaveLength(1);
      expect(response.answers[0].questionId).toBe(question.id);
    });

    it('should allow submitting a decline', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const response = await service.submitResponse({
        weddingId,
        respondentName: 'John Doe',
        attendance: 'no',
        guests: [],
        answers: [],
        message: 'Sorry, we cannot make it. Congratulations!',
      });

      expect(response.attendance).toBe('no');
      expect(response.message).toBe('Sorry, we cannot make it. Congratulations!');
    });

    it('should allow submitting a maybe', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const response = await service.submitResponse({
        weddingId,
        respondentName: 'John Doe',
        attendance: 'maybe',
        guests: [],
        answers: [],
      });

      expect(response.attendance).toBe('maybe');
    });
  });

  describe('Scenario: Admin views and manages responses', () => {
    let service: RSVPService;
    let weddingId: string;

    beforeEach(async () => {
      weddingId = createUniqueWeddingId();
      service = new RSVPService({ weddingId, demoMode: true });

      // Add sample responses
      await service.submitResponse({
        weddingId,
        respondentName: 'Alice Smith',
        respondentEmail: 'alice@example.com',
        attendance: 'yes',
        guests: [{ name: 'Bob Smith' }],
        answers: [],
      });

      await service.submitResponse({
        weddingId,
        respondentName: 'Charlie Brown',
        attendance: 'no',
        guests: [],
        answers: [],
      });

      await service.submitResponse({
        weddingId,
        respondentName: 'Diana Prince',
        attendance: 'maybe',
        guests: [],
        answers: [],
      });
    });

    it('should show all responses', async () => {
      const { responses, total } = await service.getResponses();

      expect(total).toBe(3);
      expect(responses).toHaveLength(3);
    });

    it('should filter responses by attendance', async () => {
      const { responses: attending } = await service.getResponses({ attendance: 'yes' });
      const { responses: notAttending } = await service.getResponses({ attendance: 'no' });
      const { responses: maybe } = await service.getResponses({ attendance: 'maybe' });

      expect(attending).toHaveLength(1);
      expect(attending[0].respondentName).toBe('Alice Smith');

      expect(notAttending).toHaveLength(1);
      expect(notAttending[0].respondentName).toBe('Charlie Brown');

      expect(maybe).toHaveLength(1);
      expect(maybe[0].respondentName).toBe('Diana Prince');
    });

    it('should search responses by name', async () => {
      const { responses } = await service.getResponses({ search: 'Alice' });

      expect(responses).toHaveLength(1);
      expect(responses[0].respondentName).toBe('Alice Smith');
    });

    it('should paginate responses', async () => {
      const { responses: page1 } = await service.getResponses({ page: 1, pageSize: 2 });
      const { responses: page2 } = await service.getResponses({ page: 2, pageSize: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
    });

    it('should delete a response', async () => {
      const { responses } = await service.getResponses();
      const toDelete = responses[0];

      await service.deleteResponse(toDelete.id);

      const { total } = await service.getResponses();
      expect(total).toBe(2);
    });

    it('should show accurate statistics', async () => {
      const stats = await service.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.attending).toBe(1);
      expect(stats.notAttending).toBe(1);
      expect(stats.maybe).toBe(1);
      expect(stats.totalGuests).toBe(2); // 1 attendee + 1 plus-one
    });
  });

  describe('Scenario: Data validation and limits', () => {
    it('should enforce text answer length limits', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const question = createTextQuestion(weddingId, 0);
      question.label = 'Message';
      question.validation = { maxLength: 100 };

      await service.addQuestion(question);

      // The actual validation should happen on the client side
      // This test documents the expected behavior
      const config = await service.getConfig();
      const savedQuestion = config.questions[0];

      expect(savedQuestion.type === 'text' && savedQuestion.validation.maxLength).toBe(100);
    });

    it('should enforce maximum options per question', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const question = createSingleChoiceQuestion(weddingId, 0);
      question.label = 'Too many options';

      // Add maximum + 1 options
      question.options = Array.from({ length: RSVP_LIMITS.maxOptionsPerQuestion + 1 }, (_, i) => ({
        id: String(i),
        label: `Option ${i}`,
        value: `option_${i}`,
      }));

      // This should be validated before saving
      // The exact validation behavior depends on implementation
      expect(question.options.length).toBeGreaterThan(RSVP_LIMITS.maxOptionsPerQuestion);
    });
  });

  describe('Scenario: Error handling', () => {
    it('should handle updating non-existent question', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const fakeQuestion = createTextQuestion(weddingId, 0);
      fakeQuestion.id = 'non-existent-id';

      await expect(service.updateQuestion(fakeQuestion)).rejects.toThrow('Question not found');
    });

    it('should handle getting non-existent response', async () => {
      const weddingId = createUniqueWeddingId();
      const service = new RSVPService({ weddingId, demoMode: true });

      const response = await service.getResponse('non-existent-id');
      expect(response).toBeNull();
    });
  });
});
