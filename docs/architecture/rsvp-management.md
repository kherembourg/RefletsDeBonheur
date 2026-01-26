# RSVP Management System

## Overview

The RSVP Management System allows wedding administrators to create customizable RSVP forms with custom questions, view and manage responses, and export data. The system is built with a focus on flexibility, user experience, and data protection.

## Architecture

### Components

```
src/
├── components/admin/
│   ├── rsvp/
│   │   ├── RSVPManager.tsx          # Main container component
│   │   ├── RSVPQuestionBuilder.tsx  # Question creation/editing
│   │   ├── RSVPResponsesViewer.tsx  # Paginated response viewer
│   │   └── index.ts                 # Exports
│   └── ui/                          # Reusable admin UI components
│       ├── AdminButton.tsx
│       ├── AdminCard.tsx
│       ├── AdminInput.tsx
│       ├── AdminToggle.tsx
│       ├── AdminModal.tsx
│       ├── AdminPagination.tsx
│       ├── AdminBadge.tsx
│       ├── AdminSelect.tsx
│       ├── AdminSection.tsx
│       └── index.ts
├── lib/rsvp/
│   ├── types.ts                     # Type definitions
│   ├── rsvpService.ts               # Data service layer
│   └── index.ts                     # Exports
└── styles/
    └── admin-theme.ts               # Admin theme system
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        RSVPManager                              │
│  ┌─────────────┬─────────────┬─────────────────────────────┐   │
│  │  Settings   │  Questions  │      Responses              │   │
│  │    Tab      │     Tab     │         Tab                 │   │
│  │             │             │                             │   │
│  │ ┌─────────┐ │ ┌─────────┐ │ ┌───────────────────────┐   │   │
│  │ │ Toggle  │ │ │Question │ │ │ RSVPResponsesViewer   │   │   │
│  │ │ Inputs  │ │ │ Builder │ │ │   - Search/Filter     │   │   │
│  │ │ etc.    │ │ │         │ │ │   - Pagination        │   │   │
│  │ └─────────┘ │ └─────────┘ │ │   - Response cards    │   │   │
│  │             │             │ └───────────────────────┘   │   │
│  └─────────────┴─────────────┴─────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┬─┘
                                                                │
                                                                ▼
┌───────────────────────────────────────────────────────────────┐
│                       RSVPService                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Demo Mode                            │ │
│  │                  (localStorage)                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Production Mode                        │ │
│  │                    (Supabase)                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

#### `rsvp_config`
Per-wedding RSVP configuration including custom questions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| wedding_id | uuid | Foreign key to weddings |
| enabled | boolean | Whether RSVP is active |
| questions | jsonb | Array of question objects |
| deadline | timestamptz | Response deadline |
| welcome_message | text | Displayed on form |
| thank_you_message | text | Displayed after submit |
| allow_plus_one | boolean | Allow additional guests |
| ask_dietary_restrictions | boolean | Show dietary field |
| max_guests_per_response | integer | Limit per response (1-20) |

#### `rsvp_responses`
Guest responses with answers to custom questions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| wedding_id | uuid | Foreign key to weddings |
| respondent_name | text | Guest name (max 100 chars) |
| respondent_email | text | Optional email |
| respondent_phone | text | Optional phone |
| attendance | text | 'yes', 'no', or 'maybe' |
| guests | jsonb | Array of additional guests |
| answers | jsonb | Answers to custom questions |
| message | text | Optional message (max 2000) |

### Question JSON Schema

```typescript
interface Question {
  id: string;
  weddingId: string;
  type: 'text' | 'single_choice' | 'multiple_choice';
  label: string;
  description?: string;
  required: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;

  // Text-specific
  validation?: {
    minLength?: number;
    maxLength: number;
    pattern?: string;
  };
  placeholder?: string;
  multiline?: boolean;

  // Choice-specific
  options?: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  displayAs?: 'radio' | 'dropdown';  // single_choice only
  minSelections?: number;             // multiple_choice only
  maxSelections?: number;             // multiple_choice only
}
```

## Question Types

### Text Questions
Free-form text input with configurable:
- Maximum length (required, to protect database)
- Minimum length (optional)
- Placeholder text
- Multiline support (textarea vs input)

### Single Choice Questions
Select one option from a list:
- Minimum 2 options
- Maximum 15 options
- Display as radio buttons or dropdown

### Multiple Choice Questions
Select multiple options:
- Minimum 2 options
- Maximum 15 options
- Optional min/max selection limits

## Data Limits

To protect the database and ensure good performance:

| Limit | Value |
|-------|-------|
| Questions per wedding | 20 |
| Options per question | 15 |
| Label length | 200 chars |
| Description length | 500 chars |
| Text answer length | 1000 chars |
| Message length | 2000 chars |
| Name length | 100 chars |
| Email length | 254 chars |
| Phone length | 20 chars |
| Dietary length | 500 chars |

## API

### RSVPService

```typescript
class RSVPService {
  constructor(options: { weddingId: string; demoMode?: boolean });

  // Configuration
  getConfig(): Promise<RSVPConfig>;
  saveConfig(config: RSVPConfig): Promise<void>;
  toggleEnabled(enabled: boolean): Promise<void>;

  // Questions
  getQuestions(): Promise<RSVPQuestion[]>;
  addQuestion(question: RSVPQuestion): Promise<void>;
  updateQuestion(question: RSVPQuestion): Promise<void>;
  deleteQuestion(questionId: string): Promise<void>;
  reorderQuestions(questionIds: string[]): Promise<void>;

  // Responses
  getResponses(options?: {
    page?: number;
    pageSize?: number;
    attendance?: 'yes' | 'no' | 'maybe';
    search?: string;
  }): Promise<{ responses: RSVPResponse[]; total: number }>;
  getResponse(responseId: string): Promise<RSVPResponse | null>;
  submitResponse(response: Omit<RSVPResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<RSVPResponse>;
  deleteResponse(responseId: string): Promise<void>;

  // Statistics
  getStatistics(): Promise<RSVPStatistics>;
}
```

## Admin Theme System

The admin dashboard uses a dedicated theme system (`src/styles/admin-theme.ts`) for consistent styling:

### Color Palette
- Primary: Burgundy (#ae1725)
- Success: Sage green (#8b9d83)
- Background: Cream (#f5f0e8)
- Text: Charcoal (#333333)

### Component Styles
- Cards: White background with subtle borders
- Buttons: Multiple variants (primary, secondary, outline, ghost, danger, success)
- Form inputs: Consistent sizing and focus states
- Toggles: Custom animated switches

### Usage

```tsx
import { AdminButton, AdminCard, AdminToggle, cn } from '../ui';
import { adminStyles } from '../../../styles/admin-theme';

// Use pre-built components
<AdminButton variant="primary" size="md">Click me</AdminButton>
<AdminCard padding="md">Content</AdminCard>
<AdminToggle enabled={true} onChange={setEnabled} />

// Or use style classes directly
<div className={cn(adminStyles.card.base, 'custom-class')}>
  Content
</div>
```

## Testing

### Unit Tests
- `src/lib/rsvp/types.test.ts` - Type helpers and factories
- `src/lib/rsvp/rsvpService.test.ts` - Service layer
- `src/components/admin/ui/*.test.tsx` - UI components
- `src/components/admin/rsvp/RSVPManager.test.tsx` - Main component

### Functional Tests
- `src/test/functional/rsvp-scenarios.test.ts` - User flows

### UI/Screenshot Tests
- `src/test/ui/admin-dashboard.spec.ts` - Dashboard snapshots
- `src/test/ui/rsvp-manager.spec.ts` - RSVP manager snapshots

### Running Tests

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# UI tests (Playwright)
npm run test:e2e

# All tests
npm run test:all
```

## Security Considerations

1. **Input Validation**: All inputs have maximum length limits
2. **SQL Injection**: Protected via Supabase parameterized queries
3. **XSS**: React automatically escapes output
4. **Rate Limiting**: Consider adding on production
5. **RLS**: Row-level security policies in Supabase

## Future Improvements

1. **Real-time Updates**: WebSocket for live response tracking
2. **Email Notifications**: Send confirmation emails
3. **Conditional Questions**: Show questions based on previous answers
4. **Question Templates**: Pre-built question sets
5. **Export Formats**: PDF, Excel in addition to CSV
6. **Analytics**: Response time trends, completion rates
