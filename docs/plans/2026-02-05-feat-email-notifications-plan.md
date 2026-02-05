---
title: Email Notifications (Welcome + Payment Confirmation)
type: feat
date: 2026-02-05
---

# Email Notifications: Welcome & Payment Confirmation

**Completed:** 2026-02-05

## Overview

Implement transactional email notifications using Resend for:
1. **Welcome email** after successful account creation (with magic link, guest code, wedding URL)
2. **Payment confirmation** email after successful Stripe checkout (receipt with amount, product details)

## Problem Statement

After signup and payment, users received only a Supabase-generated magic link email with no branding, no wedding details, and no payment confirmation. This is the first touchpoint after payment — a branded, informative welcome email is critical for:
- Professional first impression
- Providing guest access code immediately
- Confirming payment receipt
- Guiding next steps

## Solution

### Architecture

```
Resend (email provider)
  ├── src/lib/email/client.ts      → Resend client singleton + config check
  ├── src/lib/email/service.ts     → sendWelcomeEmail(), sendPaymentConfirmationEmail()
  ├── src/lib/email/templates.ts   → HTML email generators (i18n: EN/FR/ES)
  ├── src/lib/email/lang.ts        → Accept-Language header detection
  └── src/lib/email/index.ts       → Public API barrel export
```

### Key Design Decisions

1. **Non-blocking emails**: Email sending is fire-and-forget (`sendEmail().catch(log)`). Email failure never blocks account creation or payment processing.
2. **Graceful degradation**: If `RESEND_API_KEY` is not set, emails are skipped with a warning log. The app works without email configured.
3. **i18n support**: All email content is translated in FR/EN/ES. Language is detected from the HTTP `Accept-Language` header.
4. **No external template engine**: HTML emails are generated with template literals. This avoids adding React Email or MJML dependencies for 2 templates.

### Integration Points

- **`verify-payment.ts`**: After account creation, sends welcome email with magic link + payment confirmation
- **`stripe/webhook.ts`**: After existing user upgrade, sends payment confirmation

## Files Changed

| File | Change |
|------|--------|
| `src/lib/email/client.ts` | NEW: Resend client singleton |
| `src/lib/email/service.ts` | NEW: Email sending functions |
| `src/lib/email/templates.ts` | NEW: HTML email generators (3 languages) |
| `src/lib/email/lang.ts` | NEW: Language detection from request |
| `src/lib/email/index.ts` | NEW: Barrel export |
| `src/pages/api/signup/verify-payment.ts` | Modified: Send welcome + payment emails after account creation |
| `src/pages/api/stripe/webhook.ts` | Modified: Send payment email on profile upgrade |
| `.env.example` | Added: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PUBLIC_SITE_URL` |
| `package.json` | Added: `resend` dependency |

## Tests

44 new tests across 4 test files:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `__tests__/client.test.ts` | 9 | Client config, singleton, error handling |
| `__tests__/templates.test.ts` | 14 | All 3 languages, HTML structure, fallbacks |
| `__tests__/service.test.ts` | 10 | Send success/failure, graceful degradation |
| `__tests__/lang.test.ts` | 11 | Language detection, quality values, edge cases |

## Setup Required

1. Create a [Resend account](https://resend.com)
2. Verify sender domain (or use `onboarding@resend.dev` for testing)
3. Add API key to `.env`:
   ```
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=Reflets de Bonheur <noreply@refletsdebonheur.com>
   ```

## Out of Scope

- Upload notification emails (notify couple when guests upload photos)
- Subscription renewal reminder emails
- Guest invitation emails
- Email template preview/testing tool
