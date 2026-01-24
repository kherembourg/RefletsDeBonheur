/**
 * RSVP Management Types
 *
 * Type definitions for the RSVP question builder and response management system.
 */

/**
 * Question types supported by the RSVP system
 */
export type RSVPQuestionType = 'text' | 'single_choice' | 'multiple_choice';

/**
 * Choice option for single/multiple choice questions
 */
export interface RSVPQuestionOption {
  id: string;
  label: string;
  value: string;
}

/**
 * Text field validation rules
 */
export interface RSVPTextValidation {
  minLength?: number;
  maxLength: number;  // Required to protect database
  pattern?: string;   // Optional regex pattern
}

/**
 * Base question properties
 */
interface RSVPQuestionBase {
  id: string;
  weddingId: string;
  label: string;
  description?: string;
  required: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Text question type
 */
export interface RSVPTextQuestion extends RSVPQuestionBase {
  type: 'text';
  validation: RSVPTextValidation;
  placeholder?: string;
  multiline?: boolean;
}

/**
 * Single choice question type
 */
export interface RSVPSingleChoiceQuestion extends RSVPQuestionBase {
  type: 'single_choice';
  options: RSVPQuestionOption[];
  displayAs?: 'radio' | 'dropdown';
}

/**
 * Multiple choice question type
 */
export interface RSVPMultipleChoiceQuestion extends RSVPQuestionBase {
  type: 'multiple_choice';
  options: RSVPQuestionOption[];
  minSelections?: number;
  maxSelections?: number;
}

/**
 * Union type for all question types
 */
export type RSVPQuestion = RSVPTextQuestion | RSVPSingleChoiceQuestion | RSVPMultipleChoiceQuestion;

/**
 * RSVP configuration for a wedding
 */
export interface RSVPConfig {
  enabled: boolean;
  questions: RSVPQuestion[];
  deadline?: string;  // ISO date string
  welcomeMessage?: string;
  thankYouMessage?: string;
  allowPlusOne: boolean;
  askDietaryRestrictions: boolean;
  maxGuestsPerResponse: number;
}

/**
 * Default RSVP configuration
 */
export const DEFAULT_RSVP_CONFIG: RSVPConfig = {
  enabled: true,
  questions: [],
  allowPlusOne: true,
  askDietaryRestrictions: true,
  maxGuestsPerResponse: 5,
};

/**
 * Answer to a single question
 */
export interface RSVPQuestionAnswer {
  questionId: string;
  value: string | string[];  // string for text/single, string[] for multiple
}

/**
 * Guest information in an RSVP response
 */
export interface RSVPGuest {
  name: string;
  dietaryRestrictions?: string;
  isChild?: boolean;
}

/**
 * Complete RSVP response from a respondent
 */
export interface RSVPResponse {
  id: string;
  weddingId: string;
  respondentName: string;
  respondentEmail?: string;
  respondentPhone?: string;
  attendance: 'yes' | 'no' | 'maybe';
  guests: RSVPGuest[];
  answers: RSVPQuestionAnswer[];
  message?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Summary statistics for RSVP responses
 */
export interface RSVPStatistics {
  total: number;
  attending: number;
  notAttending: number;
  maybe: number;
  totalGuests: number;
  responseRate?: number;  // If we know expected count
}

/**
 * Validation limits to protect database
 */
export const RSVP_LIMITS = {
  maxQuestionsPerWedding: 20,
  maxOptionsPerQuestion: 15,
  maxLabelLength: 200,
  maxDescriptionLength: 500,
  maxTextAnswerLength: 1000,
  maxMessageLength: 2000,
  maxNameLength: 100,
  maxEmailLength: 254,
  maxPhoneLength: 20,
  maxDietaryLength: 500,
} as const;

/**
 * Check if a question is a text question
 */
export function isTextQuestion(question: RSVPQuestion): question is RSVPTextQuestion {
  return question.type === 'text';
}

/**
 * Check if a question is a single choice question
 */
export function isSingleChoiceQuestion(question: RSVPQuestion): question is RSVPSingleChoiceQuestion {
  return question.type === 'single_choice';
}

/**
 * Check if a question is a multiple choice question
 */
export function isMultipleChoiceQuestion(question: RSVPQuestion): question is RSVPMultipleChoiceQuestion {
  return question.type === 'multiple_choice';
}

/**
 * Check if a question has options
 */
export function hasOptions(question: RSVPQuestion): question is RSVPSingleChoiceQuestion | RSVPMultipleChoiceQuestion {
  return question.type === 'single_choice' || question.type === 'multiple_choice';
}

/**
 * Generate a unique ID for questions and options
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new text question with defaults
 */
export function createTextQuestion(weddingId: string, order: number): RSVPTextQuestion {
  return {
    id: generateId(),
    weddingId,
    type: 'text',
    label: '',
    required: false,
    order,
    validation: {
      maxLength: RSVP_LIMITS.maxTextAnswerLength,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a new single choice question with defaults
 */
export function createSingleChoiceQuestion(weddingId: string, order: number): RSVPSingleChoiceQuestion {
  return {
    id: generateId(),
    weddingId,
    type: 'single_choice',
    label: '',
    required: false,
    order,
    options: [
      { id: generateId(), label: 'Option 1', value: 'option_1' },
      { id: generateId(), label: 'Option 2', value: 'option_2' },
    ],
    displayAs: 'radio',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a new multiple choice question with defaults
 */
export function createMultipleChoiceQuestion(weddingId: string, order: number): RSVPMultipleChoiceQuestion {
  return {
    id: generateId(),
    weddingId,
    type: 'multiple_choice',
    label: '',
    required: false,
    order,
    options: [
      { id: generateId(), label: 'Option 1', value: 'option_1' },
      { id: generateId(), label: 'Option 2', value: 'option_2' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a new question option
 */
export function createQuestionOption(index: number): RSVPQuestionOption {
  return {
    id: generateId(),
    label: `Option ${index}`,
    value: `option_${index}`,
  };
}
