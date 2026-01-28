# feat: Onboarding Flow with 1-Month Free Trial

---
title: Onboarding Flow with 1-Month Free Trial
type: feat
date: 2026-01-28
---

## Overview

Create a multi-step onboarding wizard accessible from the `/pricing` page "Get Started Now" button. Users complete signup without a credit card and receive a 1-month free trial with limits (50 photos, 1 video). Payment integration will be added separately.

## Problem Statement / Motivation

Currently, the "Get Started Now" button on `/pricing` redirects to `/connexion` (the login page), which only supports existing users. There is no self-service signup flow - clients can only be created by God admins via `CreateClientModal`. This blocks user acquisition and requires manual intervention for every new customer.

## Proposed Solution

Build a 4-step onboarding wizard:

1. **Account** - Email + password
2. **Wedding Details** - Partner names (2 fields) + wedding date
3. **Site Setup** - Slug/subdomain selection with real-time availability check
4. **Theme Selection** - Choose from 6 available themes

After completion, auto-login the user and redirect to `/{slug}/admin`.

## User Flow

```
/pricing "Get Started Now"
    │
    ▼
/signup (new page)
    │
    ├─► Step 1: Account
    │       • Email (required)
    │       • Password (min 8 chars)
    │       • Password confirmation
    │
    ├─► Step 2: Wedding Details
    │       • Partner 1 name (required)
    │       • Partner 2 name (required)
    │       • Wedding date (optional)
    │
    ├─► Step 3: Site Setup
    │       • Slug input with real-time availability
    │       • Auto-generate suggestion from names
    │       • Reserved slug validation
    │
    ├─► Step 4: Theme Selection
    │       • 6 theme cards with color previews
    │       • Selection persists on back navigation
    │
    └─► Submit → Create account → Auto-login
            │
            ▼
      /{slug}/admin (admin dashboard)
```

## Technical Approach

### 1. New Pages & Components

| File | Purpose |
|------|---------|
| `src/pages/signup.astro` | Signup page wrapper (EN) |
| `src/pages/fr/inscription.astro` | French signup |
| `src/pages/es/registro.astro` | Spanish signup |
| `src/components/signup/SignupWizard.tsx` | Multi-step wizard container |
| `src/components/signup/steps/AccountStep.tsx` | Email/password form |
| `src/components/signup/steps/WeddingStep.tsx` | Names/date form |
| `src/components/signup/steps/SlugStep.tsx` | Subdomain selection |
| `src/components/signup/steps/ThemeStep.tsx` | Theme picker |
| `src/components/signup/StepIndicator.tsx` | Progress indicator (1/4) |

### 2. New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/signup` | POST | Create user, profile, wedding (public endpoint) |
| `/api/weddings/check-slug` | GET | Real-time slug availability check |

### 3. Database Changes

**profiles table** - Add trial limit tracking:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_photo_limit INTEGER DEFAULT 50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_video_limit INTEGER DEFAULT 1;
```

**weddings table** - Track upload counts (or query from media table):
```sql
-- Option A: Denormalized counters (faster reads)
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS photo_count INTEGER DEFAULT 0;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS video_count INTEGER DEFAULT 0;

-- Option B: Query media table on demand (simpler, always accurate)
-- No schema change, use: SELECT COUNT(*) FROM media WHERE wedding_id = ? AND type = 'photo'
```

### 4. Modify Existing Code

| File | Change |
|------|--------|
| `src/pages/pricing.astro:139,384` | Change href from `/connexion` to `/signup` |
| `src/pages/api/upload/presign.ts:109-122` | Change trial block to count-based limit enforcement |
| `src/lib/auth/clientAuth.ts` | Add `signup()` function for public registration |
| `src/i18n/translations.ts` | Add all signup wizard strings |

### 5. Trial Limit Enforcement

Modify `/api/upload/presign.ts` to check counts instead of blocking all trial uploads:

```typescript
// Current (blocks all trial uploads):
if (profile.subscription_status === 'trial') {
  return new Response(JSON.stringify({
    error: 'trial_upload_blocked'
  }), { status: 403 });
}

// New (count-based limits):
if (profile.subscription_status === 'trial') {
  const { count: photoCount } = await supabase
    .from('media')
    .select('*', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)
    .eq('type', 'photo');

  if (fileType.startsWith('image/') && photoCount >= 50) {
    return new Response(JSON.stringify({
      error: 'trial_photo_limit_reached',
      limit: 50,
      current: photoCount
    }), { status: 403 });
  }

  // Similar for video (limit: 1)
}
```

### 6. Slug Validation Rules

| Rule | Implementation |
|------|----------------|
| Format | `^[a-z0-9][a-z0-9-]*[a-z0-9]$` (lowercase, alphanumeric, hyphens) |
| Length | 3-50 characters |
| Reserved | `admin`, `api`, `demo`, `demo_gallery`, `demo_livre-or`, `connexion`, `pricing`, `offline`, `fr`, `es`, `account`, `god`, `test`, `signup`, `inscription`, `registro` |
| Uniqueness | Query `weddings` table |

Auto-suggestion algorithm:
```typescript
function suggestSlug(name1: string, name2: string): string {
  const base = `${name1}-${name2}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base.slice(0, 30);
}
```

## Acceptance Criteria

### Functional Requirements
- [x] "Get Started Now" on `/pricing` navigates to `/signup`
- [x] Wizard has 4 steps with back/next navigation
- [x] Progress indicator shows current step (1 of 4, 2 of 4, etc.)
- [x] Email validation (format + uniqueness via Supabase)
- [x] Password minimum 8 characters with confirmation match
- [x] Partner names are separate required fields
- [x] Wedding date is optional with date picker
- [x] Slug auto-suggested from partner names
- [x] Slug availability checked on blur (debounced 500ms)
- [x] Reserved slugs blocked with clear error message
- [x] Theme selection shows all 6 themes with color previews
- [x] Successful signup creates user, profile (trial status), and wedding
- [x] User auto-logged in and redirected to `/{slug}/admin`
- [x] Trial limits enforced: 50 photos, 1 video

### Non-Functional Requirements
- [ ] All text translated (EN, FR, ES) - Partial (pages have i18n, wizard text is English)
- [x] Mobile-responsive wizard layout
- [x] Form state persisted in sessionStorage (survives refresh)
- [x] Loading states on all async operations
- [x] Error messages are user-friendly (not technical)

### Edge Cases
- [x] Existing email shows "Account already exists" with login link
- [x] Taken slug shows error + auto-suggestions
- [x] Network error during submit shows retry option
- [x] Browser back button navigates wizard steps correctly

## Success Metrics

- Users can self-register without admin intervention
- Signup completion rate trackable (step abandonment)
- Trial-to-paid conversion measurable (future payment integration)

## Dependencies & Risks

### Dependencies
- Supabase Auth working correctly
- Existing theme system (`src/lib/themes.ts`)
- Admin UI components (`src/components/admin/ui/`)

### Risks
| Risk | Mitigation |
|------|------------|
| Spam signups | Add rate limiting to `/api/signup` (10 per IP per hour) |
| Slug squatting | Reserved list + future: reclaim inactive slugs |
| Email verification bypass | Acceptable for trial; require for payment |

## Out of Scope (Deferred)

- Payment/Stripe integration
- Email verification flow
- Welcome email sending
- First-time admin onboarding checklist
- Social login (Google, Facebook)

## Implementation Sequence

### Phase 1: Foundation
1. Create `/api/weddings/check-slug` endpoint
2. Create `/api/signup` endpoint (adapt from `create-client.ts`)
3. Add trial limit columns to database

### Phase 2: UI Components
4. Create `StepIndicator` component
5. Create `SignupWizard` container with step state
6. Create `AccountStep` (email/password)
7. Create `WeddingStep` (names/date)
8. Create `SlugStep` (with availability check)
9. Create `ThemeStep` (reuse ThemeSelector pattern)

### Phase 3: Integration
10. Create `/signup` page with i18n variants
11. Update `/pricing` CTAs to link to `/signup`
12. Modify presign.ts for count-based trial limits
13. Add translations for all wizard strings

### Phase 4: Polish
14. Add sessionStorage persistence for wizard state
15. Add proper error handling and loading states
16. Mobile responsive testing
17. Write tests for signup flow

## References

### Internal References
- Existing client creation: `src/pages/api/admin/create-client.ts:62-161`
- Theme system: `src/lib/themes.ts:263-270` (`themeList`)
- Admin UI components: `src/components/admin/ui/`
- Current login form pattern: `src/components/auth/EnhancedLoginForm.tsx`
- Slug validation pattern: `src/components/god/CreateClientModal.tsx:125-140`

### Database Schema
- Profiles table: `supabase/migrations/001_initial_schema.sql:12-28`
- Weddings table: `supabase/migrations/001_initial_schema.sql:31-70`

### Planned but not implemented
- Onboarding wizard spec: `ROADMAP.md:454-493`
