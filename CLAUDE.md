# Reflets de Bonheur - Quick Reference

## Project Overview

Wedding photo/video sharing platform built with Astro 5, React 19, Supabase, and Stripe.

**Status:** Production-ready with Supabase & Stripe backend complete.
**Critical Gap:** Stripe checkout not integrated into pricing → signup flow.

## Quick Commands

```bash
npm run dev           # Dev server (localhost:4321)
npm run build         # Production build
npm test              # Run tests
npm run test:coverage # Test coverage
```

## Development Process

### Shell Tools

| Task | Tool |
|------|------|
| Find files | `fd` |
| Find text/strings | `rg` |
| Find code structures | `ast-grep` |
| Select from results | pipe to `fzf` |
| Process JSON | `jq` |
| Process YAML/XML | `yq` |

### Process

Use git worktrees.
Use sub-agents for each task. Parallelize tasks that can be parallelized.
When picking up a milestone from a roadmap or general plan, if the milestone does not have a
dedicated plan, a dedicated plan should be created.
When a plan is deepened, the plan should be updated to reflect it (eg **Enhanced:** 2026-01-29 (via
`/deepen-plan`) in the header).
When a plan is reviewed, the plan should be updated to reflect it (eg **Reviewed:** 2026-01-29 (via
`/$SKILL / $COMMAND`) in the header).
When a plan is completed, the plan should be updated to reflect it (eg **Completed:** 2026-01-29 in
the header).

### Conventions

- Use `ast-grep` for code search (not grep)
- Use git worktrees for parallel work
- Use sub-agents and parallelize tasks
- TDD approach: write tests first
- Commit early and atomically
- Run tests/linting regularly

## Documentation

**Architecture:** See `docs/architecture/` for:
- Pages, Components, Data Flow, Authentication, Website Editor, RSVP Management

**Code Quality:** See `docs/` for:
- [Prevention Strategies Summary](docs/PREVENTION_STRATEGIES_SUMMARY.md) - Security, data integrity, code quality rules
- [Code Review Checklist](docs/CODE_REVIEW_CHECKLIST.md) - PR review checklist
- [Automated Checks](docs/AUTOMATED_CHECKS_SETUP.md) - CI/CD setup

**Key Security Rules:**
- 🔴 Never store plaintext passwords
- 🔴 Use database transactions for multi-step operations
- 🔴 No race conditions in financial flows

## Pages

- `/` - Landing page
- `/pricing` - Pricing (Stripe integration pending)
- `/connexion` - Login
- `/demo_gallery`, `/demo_livre-or` - Demo pages
- `/[slug]/` - Dynamic wedding pages (photos, livre-or, rsvp, infos, admin)

## Code Search: mgrep

**Store:** `reflets-de-bonheur`

**Usage:**
```bash
# Start watcher (once)
mgrep watch --store "reflets-de-bonheur"

# Search with natural language
mgrep "your question" --store "reflets-de-bonheur" -a -m 20
```

**Rules:**
- Use mgrep for ALL code searches (not grep/Grep/Glob)
- Use natural language questions, not keywords
- For complex queries, run multiple mgrep queries in parallel
- When using subagents: copy mgrep instructions into their prompt

## Library Documentation: Context7

**Always use before upgrading dependencies or using external libraries.**

```
1. resolve-library-id (query, libraryName)
2. query-docs (libraryId, query)
```

## Tech Stack

- **Frontend:** Astro 5, React 19, TypeScript, Tailwind CSS 4
- **Backend:** Supabase (auth + database), Cloudflare R2 (storage), Stripe (payments)
- **Features:** PWA, i18n (EN/FR/ES), DataService abstraction

## Architecture Patterns

**DataService Abstraction:**
- All components use `DataService` (`src/lib/services/dataService.ts`)
- Never import directly from `mockData.ts`
- Auto-detects demo vs production mode

```typescript
// Standard pattern
const serviceRef = useRef<DataService | null>(null);
if (!serviceRef.current) {
  serviceRef.current = new DataService({ demoMode, weddingId });
}
```

**Database Schema:**
- No `clients` table - use Supabase Auth (`auth.users`) + `profiles`
- `weddings` linked to `profiles.id` (owner)
- See `supabase/database.sql` for full schema
- See `docs/architecture/` for detailed documentation

**Media Storage (R2):**
1. Request presigned URL (`/api/upload/presign`)
2. Upload directly to R2
3. Confirm upload (`/api/upload/confirm`)

**Authentication:**
- Client: Supabase Auth → `auth_sessions`
- Guest: PIN/magic token → `guest_sessions`
- God admin: Separate table → `auth_sessions`

## Environment Setup

See `.env.example`. Key variables:
- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Testing

**Coverage:** ~39% overall (Auth: 91%, Admin: 91%, i18n: 97%)
**Goal:** 70%+ overall, 90%+ critical paths

## Next Steps

**🚨 CRITICAL (Blocking Launch):**
1. **Stripe → Signup Integration** - Wire Stripe checkout into pricing page (2-4h)
2. **Email Notifications** - Welcome emails after payment (4-6h)
3. **Image Thumbnails** - Generate 400px thumbnails for gallery (6-8h)

**Pre-Launch:**
- Increase test coverage to 70%+ overall

**Future:**
- Real-time sync, video transcoding, AI features, analytics

---

**Last Updated:** February 4, 2026
