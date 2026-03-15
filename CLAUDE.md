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
4. Automatic thumbnail generation (async, 400px WEBP)

**Thumbnails:**
- Automatically generated for all images
- 400px WEBP format for optimal performance
- Async processing (non-blocking uploads)
- Graceful degradation if generation fails
- See `docs/architecture/THUMBNAIL_GENERATION.md`

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

**Security Follow-up:**
- Continue CSP hardening for inline styles.
- PR `#60` removed inline-script dependency and dropped the legacy Stripe auth header fallback.
- PR `#61` reduced inline styles on marketing pages only.
- The repository still needs follow-up work before `style-src 'unsafe-inline'` can be removed globally.
- Prioritize remaining inline `style=` attributes and inline `<style>` blocks on dynamic wedding pages, admin/editor surfaces, and shared Astro layouts/components.
- Use a dedicated git worktree and a separate PR for each continuation slice to avoid colliding with other agents.

**Pre-Launch:**
- Increase test coverage to 70%+ overall

**Future:**
- Real-time sync, video transcoding, AI features, analytics

---

**Last Updated:** February 4, 2026

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->
