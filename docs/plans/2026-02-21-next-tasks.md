---
title: Next Tasks & Improvements
type: roadmap
date: 2026-02-21
---

# Next Tasks & Improvements

## Priority 1 - Launch Blockers

- [x] **Fix PR #39 (Email Notifications)** - Fix critical issues found in code review (2026-02-21)
- [ ] **Stripe E2E Manual Testing** - Phase 3 of Stripe plan: setup Stripe CLI, webhook forwarding, test 6 scenarios (happy path, cancel, duplicate payment, idempotency, failed payment, 3D Secure)

## Priority 2 - Pre-Launch

- [ ] **Test Coverage 58% → 70%** - Focus areas: API endpoints (upload/presign, stripe/checkout, stripe/webhook), DataService, critical React components (Gallery, RSVP)
- [ ] **i18n Signup Wizard** - Wizard text is English-only (non-functional requirement from onboarding plan)
- [ ] **Public Site / Landing Page Refresh** - See `docs/public-site-refresh.md`

## Priority 3 - Improvements

- [ ] **Consolidate env vars** - Remove stale `PUBLIC_APP_URL` (unused), keep `PUBLIC_SITE_URL`
- [ ] **Website Editor Phase 6** - Extract into sub-components (currently ~525 lines, target < 200)
- [ ] **Cross-browser testing** - Quality gate from Website Editor plan (Chrome, Safari, Firefox)
- [ ] **Rate limiting on signup** - Protect against spam signups (mentioned in onboarding plan risks)

## Priority 4 - Future

- [ ] Real-time sync (Supabase Realtime for collaborative gallery)
- [ ] Video transcoding (support more video formats)
- [ ] Analytics dashboard (visits, downloads tracking)
- [ ] SEO for public pages
