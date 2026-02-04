# Reflets de Bonheur - Claude AI Context File

## Mandatory Instructions to follow all the time

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

- Favour ast-grep over grep when researching and operating over code
- Commit early and eagerly. Favour atomic commits
- Use a TDD approach
- Run checks and gates (tests, linting,...) regularly to tighten your feedback loop

## Project Overview

**Reflets de Bonheur** (*"Reflections of Happiness"*) is an elegant wedding photo and video sharing platform built with Astro 5 and React, featuring multi-language support, PWA capabilities, and a sophisticated design system.

**Tagline**: *"Où chaque instant devient éternel"* (Where every moment becomes eternal)

### Status: Production-Ready with Supabase Integration

The application is fully functional with:
- Complete UI implementation
- Multi-language support (EN, FR, ES)
- PWA with offline support
- Demo mode with mock data (for `/demo_*` pages)
- **Supabase integration complete** - all components use DataService abstraction
- Supabase Auth + profiles power client accounts
- Client wedding pages (`/[slug]/*`) connect to Supabase when configured
- **Stripe backend complete** - checkout, webhook, security tested in sandbox
- 🚨 **Critical gap**: Stripe not integrated into pricing → signup flow (see Next Steps)

**Last Updated:** February 3, 2026

---

## Architecture Documentation

**IMPORTANT**: Detailed architecture documentation is available in `docs/architecture/`.

**Always update this documentation when making architectural changes.**

| Document | Description |
|----------|-------------|
| [README](docs/architecture/README.md) | Architecture overview and key decisions |
| [Pages](docs/architecture/pages.md) | URL structure and routing |
| [Components](docs/architecture/components.md) | Component hierarchy and patterns |
| [Data Flow](docs/architecture/data-flow.md) | DataService, state, and persistence |
| [Authentication](docs/architecture/authentication.md) | Auth flows for all user types |
| [Website Editor](docs/architecture/website-editor.md) | Visual customization system |
| [RSVP Management](docs/architecture/rsvp-management.md) | Custom questions and response management |

### When to Update Architecture Docs

Update the relevant documentation when:
- Adding new page routes or changing URL structure
- Creating new components or changing component hierarchy
- Modifying DataService or data flow patterns
- Changing authentication flows
- Updating the website editor system

---

## Code Quality & Prevention Strategies

**CRITICAL**: Review these before ANY code changes involving security, payments, or data integrity.

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [Prevention Strategies Summary](docs/PREVENTION_STRATEGIES_SUMMARY.md) | Quick overview of prevention strategies from PR #36 findings | Before starting new features |
| [Prevention Strategies (Full)](docs/PREVENTION_STRATEGIES.md) | Detailed strategies, patterns, and best practices | When implementing security/data features |
| [Code Review Checklist](docs/CODE_REVIEW_CHECKLIST.md) | Quick checklist for PR reviews | Before submitting/reviewing PRs |
| [Automated Checks Setup](docs/AUTOMATED_CHECKS_SETUP.md) | Step-by-step implementation guide for CI/CD | Setting up new checks |

### Prevention Categories

**Based on 7 issues resolved in PR #36:**

1. **Security** (Issues #032)
   - Never store plaintext passwords (even "temporarily")
   - Use magic links for post-payment account setup
   - GDPR Article 32 compliance required

2. **Data Integrity** (Issues #033, #034)
   - Database transactions for multi-step operations
   - Unique constraints prevent race conditions
   - No check-then-act patterns (TOCTOU vulnerabilities)

3. **Code Quality** (Issues #037, #038)
   - DRY: Extract utilities at 3+ repetitions
   - API middleware for cross-cutting concerns
   - Shared validation libraries

4. **Documentation** (Issues #035, #036)
   - All API endpoints documented in CLAUDE.md
   - Scheduled jobs documented in DATABASE_MAINTENANCE.md
   - Agent-native documentation required

### Quick Prevention Rules

**🔴 BLOCK MERGE if:**
- Plaintext passwords stored anywhere
- Payment before resource verification (financial risk)
- Multi-step critical operations without transaction wrapper
- Race conditions in financial flows

**🟡 FIX BEFORE PRODUCTION if:**
- Missing cleanup for temporary data
- Undocumented API endpoints
- No monitoring for scheduled jobs

**🟢 ADDRESS IN FOLLOW-UP if:**
- Code duplication (3-5 instances)
- Missing test coverage (non-critical paths)
- Suboptimal performance

---

## Quick Reference

### Project Location
```
/Users/kevin/Development/WeddingPictures/reflets-de-bonheur/
```

### Demo Access
- **Demo Gallery**: `/demo_gallery`
- **Demo Guestbook**: `/demo_livre-or`
- **Login Page**: `/connexion`

### Key Commands
```bash
npm run dev      # Development server at http://localhost:4321
npm run build    # Production build
npm run preview  # Preview production build
```

Always create a todo list when working on complex tasks to track progress and remain on track.

# mgrep - Your Code Search Assistant

**mgrep is your primary tool for exploring the codebase.** It gives you a natural language answer + the relevant source, all in one.

## Basic Command

First, start mgrep in background mode so it stays up to date:
```bash
mgrep watch --store "project-name"
```

Then when searching for something, start with mgrep first and only use grep if you find nothing:
```bash
mgrep "your question in natural language" --store "project-name" -a -m <number>
```

The store for this project is "reflets-de-bonheur"

## Essential Parameters

| Parameter | Description |
|-----------|-------------|
| `--store "project-name"` | **Required** - the indexed store for the project |
| `-a` | Enables natural language response |
| `-m <n>` | Number of retrieval results (minimum 10) |

## Adjusting `-m` Based on Complexity

| Query Type | Recommended `-m` |
|------------|------------------|
| Simple question (1-2 files) | 10 |
| Medium question (flow, feature) | 20-30 |
| Complex question (debug, architecture) | 30-50 |

## Strategy for Complex Queries

If the query touches **multiple parts of the codebase**, run multiple mgrep queries in parallel rather than a single overloaded query:

```bash
# Example: understanding the complete auth system
mgrep "how does LinkedIn authentication work on the frontend" --store "project-name" -a -m <n>
mgrep "how is the LinkedIn token handled on the Convex side" --store "project-name" -a -m <n>
mgrep "how does the background script manage sessions" --store "project-name" -a -m <n>
```

## Rules

- **REQUIRED**: Use mgrep for ALL code searches. NEVER use grep, the Grep tool, or Glob for code searches.
- **Natural language**: mgrep is an AI agent like you. Talk to it like a colleague, not like a search engine.
  - ❌ `"architecture block icon color complete status"` (robotic keywords)
  - ✅ `"What is the color of the architecture block icon when they are completed?"` (natural question)


---

# Subagents (Task tool)

**Subagents do NOT inherit instructions from this file.**

When launching an Explore subagent, copy-paste the mgrep instructions from this CLAUDE.md into the subagent's prompt.

---

# Context7 - Documentation Lookup

**Always use Context7 when upgrading dependencies or working with external libraries.**

Context7 provides up-to-date documentation for any library. Use it to:
- Verify breaking changes during dependency upgrades
- Look up correct API usage for libraries
- Find migration guides and best practices

## Usage

1. First, resolve the library ID:
```
mcp__plugin_compound-engineering_context7__resolve-library-id
- query: "what you're trying to do"
- libraryName: "package-name"
```

2. Then query the docs:
```
mcp__plugin_compound-engineering_context7__query-docs
- libraryId: "/org/project" (from step 1)
- query: "specific question about the library"
```

## When to Use

- **REQUIRED** before any major dependency upgrade (React, Tailwind, Astro, etc.)
- When implementing features using external libraries
- When debugging library-specific issues
- When unsure about API changes between versions

---

## Technology Stack

### Frontend
- **Astro 5.16+**: Static site generation with islands architecture
- **React 19**: Interactive components (islands only)
- **TypeScript 5.3+**: Type safety throughout
- **Tailwind CSS 4**: Utility-first styling with custom brand tokens
- **Lucide React**: Icon system

### Infrastructure
- **Supabase**: Database and authentication (configured)
- **PWA**: Service Worker with offline caching
- **i18n**: Multi-language support (EN, FR, ES)

### Key Libraries
- `@supabase/supabase-js`: Database client
- `lucide-react`: Icons
- `qrcode`: QR code generation for sharing

---

## Brand Identity

### Color Palette (Current)
```css
/* Primary */
--burgundy: #ae1725          /* Primary CTA, accents */
--burgundy-light: #c92a38    /* Hover states */
--burgundy-dark: #8a121d     /* Dark variant */

/* Neutral */
--cream: #F5F0E8             /* Backgrounds */
--charcoal: #333333          /* Text */
--charcoal-light: #555555    /* Secondary text */

/* Accent */
--olive: #4A5D4A             /* Secondary accents */
--sage: #8B9D83              /* Success states */
--blush: #E8D5D3             /* Soft backgrounds */
--antique-gold: #B8860B      /* Luxury touches */
```

### Typography
- **Headings**: Cormorant Garamond / Playfair Display (serif)
- **Body**: Montserrat / Inter (sans-serif)
- **Accent**: Great Vibes / Allura (script, minimal use)

---

## Project Structure

```
reflets-de-bonheur/
├── src/
│   ├── components/
│   │   ├── admin/           # Admin dashboard components
│   │   │   ├── AdminPanel.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   ├── EnhancedStatistics.tsx
│   │   │   ├── TimelineGraph.tsx
│   │   │   ├── StorageUsage.tsx
│   │   │   ├── ReactionBreakdown.tsx
│   │   │   ├── AlbumManager.tsx
│   │   │   ├── QRCodeGenerator.tsx
│   │   │   ├── SettingsToggle.tsx
│   │   │   ├── TopUploaders.tsx
│   │   │   ├── ThemeSelector.tsx
│   │   │   ├── WebsiteEditor.tsx      # Visual website customization
│   │   │   ├── ColorPaletteEditor.tsx # Color scheme editor
│   │   │   ├── ContentEditor.tsx      # Text content editor
│   │   │   └── ImageManager.tsx       # Image upload/management
│   │   ├── auth/
│   │   │   └── LoginForm.tsx
│   │   ├── gallery/
│   │   │   ├── GalleryGrid.tsx
│   │   │   ├── MediaCard.tsx
│   │   │   ├── UploadModal.tsx
│   │   │   ├── UploadForm.tsx
│   │   │   ├── Lightbox.tsx
│   │   │   ├── Slideshow.tsx
│   │   │   ├── SearchFilters.tsx
│   │   │   ├── BulkActions.tsx
│   │   │   └── ReactionsPanel.tsx
│   │   ├── guestbook/
│   │   │   ├── GuestbookContainer.tsx
│   │   │   ├── GuestbookForm.tsx
│   │   │   ├── AIAssistant.tsx
│   │   │   └── MessageList.tsx
│   │   ├── layout/
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   ├── LanguageToggle.tsx
│   │   │   └── LanguageDetector.astro
│   │   ├── pwa/
│   │   │   └── InstallPrompt.tsx
│   │   ├── ui/
│   │   │   ├── Toast.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── PageTransition.tsx
│   │   ├── wedding/
│   │   │   ├── WeddingHero.tsx
│   │   │   ├── WeddingTimeline.tsx
│   │   │   ├── WeddingInfo.tsx
│   │   │   ├── WeddingRSVP.tsx
│   │   │   ├── ThemedHero.tsx
│   │   │   ├── LuxeHero.tsx
│   │   │   ├── LuxeNav.tsx
│   │   │   ├── LuxeUploadCard.tsx
│   │   │   └── LuxeGalleryPreview.tsx
│   │   └── decorative/
│   │       └── FloralDecoration.astro
│   ├── layouts/
│   │   ├── MainLayout.astro
│   │   ├── WeddingLayout.astro
│   │   └── WeddingLuxeLayout.astro
│   ├── pages/
│   │   ├── index.astro              # Landing page (EN)
│   │   ├── pricing.astro            # Pricing page
│   │   ├── connexion.astro          # Login page
│   │   ├── demo_gallery.astro       # Demo gallery
│   │   ├── demo_livre-or.astro      # Demo guestbook
│   │   ├── guestbook.astro          # Authenticated guestbook
│   │   ├── admin.astro              # Admin dashboard
│   │   ├── offline.astro            # PWA offline page
│   │   ├── mentions-legales.astro   # Legal notices
│   │   ├── cgv.astro                # Terms of service
│   │   ├── politique-confidentialite.astro
│   │   ├── account/
│   │   │   └── gallery.astro        # Authenticated gallery
│   │   ├── fr/                      # French pages
│   │   │   ├── index.astro
│   │   │   └── tarification.astro
│   │   ├── es/                      # Spanish pages
│   │   │   ├── index.astro
│   │   │   └── precios.astro
│   │   ├── [slug]/                  # Dynamic wedding pages
│   │   │   ├── index.astro
│   │   │   ├── photos.astro
│   │   │   ├── livre-or.astro
│   │   │   ├── rsvp.astro
│   │   │   └── infos.astro
│   │   └── api/                     # API endpoints (SSR)
│   │       ├── admin/
│   │       │   └── create-client.ts  # Server-side client creation
│   │       ├── weddings/
│   │       │   └── by-slug.ts        # Lookup wedding by slug
│   │       └── upload/
│   │           ├── presign.ts       # Generate presigned URLs
│   │           └── confirm.ts       # Confirm upload & create DB record
│   ├── lib/
│   │   ├── api.ts                   # API functions
│   │   ├── auth.ts                  # Auth helpers
│   │   ├── mockData.ts              # Demo data
│   │   ├── demoStorage.ts           # Demo persistence
│   │   ├── types.ts                 # TypeScript types
│   │   ├── theme.ts                 # Theme utilities
│   │   ├── themes.ts                # Theme definitions
│   │   ├── statistics.ts            # Stats calculations
│   │   ├── weddingData.ts           # Wedding data helpers
│   │   ├── customization.ts         # Customization types & helpers
│   │   ├── applyCustomization.ts    # Apply custom settings to pages
│   │   ├── services/
│   │   │   ├── index.ts
│   │   │   └── dataService.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── api.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── r2/
│   │       ├── client.ts             # R2 S3-compatible client
│   │       ├── upload.ts             # Client-side upload helpers
│   │       ├── types.ts
│   │       └── index.ts
│   ├── i18n/
│   │   ├── index.ts
│   │   ├── utils.ts
│   │   └── translations.ts
│   └── styles/
│       └── global.css
├── public/
│   ├── sw.js                        # Service Worker
│   ├── manifest.json                # PWA manifest
│   ├── icons/                       # PWA icons
│   └── images/
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
└── CLAUDE.md
```

---

## Core Features

### 1. Landing Page & Marketing
- Elegant hero section with wedding imagery
- Services showcase (Gallery, Guestbook, Website)
- Feature highlights with benefits
- Pricing section ($199 for 2 years)
- Multi-language support (EN, FR, ES)

### 2. Authentication
- Supabase Auth for client accounts (email + password)
- Wedding access via guest PIN / admin magic token
- Guest sessions stored in `guest_sessions` (wedding_id + session_token)
- Persistent session via localStorage
- Protected routes

### 3. Photo Gallery
- **Masonry layout**: Responsive Pinterest-style grid
- **Mixed media**: Photos and videos support
- **Lightbox**: Full-screen viewing with navigation
- **Slideshow**: Auto-play presentation mode
- **Search & Filters**: By author, date, type
- **Reactions**: Like and favorite photos
- **Bulk Actions**: Multi-select for admin operations
- **Upload**: Drag-and-drop with AI caption generation

### 4. Guestbook
- Written messages with author names
- **AI Assistant**: Generates contextual messages based on:
  - Relationship (Friends, Family, Colleague)
  - Tone (Joyful, Emotional, Solemn, Poetic)
- Editable AI suggestions
- Real-time message display

### 5. Admin Dashboard
- **Redesigned UI**: Modern card-based layout with improved ergonomics
  - Quick actions grid for common tasks
  - Statistics overview with 4 cards (Photos, Messages, Favorites, Albums)
  - Dedicated admin theme system (`src/styles/admin-theme.ts`)
- **RSVP Management**: Full-featured RSVP system (see section below)
- **Statistics**: Enhanced stats with graphs
  - Upload timeline
  - Storage usage
  - Reaction breakdown
  - Top uploaders
- **Album Management**: Organize photos into albums
- **QR Code Generator**: Easy sharing
- **Theme Selector**: Customize wedding appearance
- **Upload Toggle**: Enable/disable guest uploads
- **Content Moderation**: Delete inappropriate content
- **Reusable UI Components**: `src/components/admin/ui/`
  - AdminButton, AdminCard, AdminInput, AdminToggle
  - AdminModal, AdminPagination, AdminBadge, AdminSelect
  - AdminSection, AdminDivider, AdminEmptyState

### 5.1 RSVP Management
Access via admin dashboard "Gestion RSVP" card or directly at RSVP view.

**Features:**
- **Toggle Enable/Disable**: Turn RSVP on/off for the wedding
- **Custom Questions**: Build flexible forms with 3 question types:
  - Text fields (with character limits)
  - Single choice (radio/dropdown)
  - Multiple choice (checkboxes)
- **Response Viewer**: Paginated list with search and filters
  - Filter by attendance status (yes/no/maybe)
  - Search by name or email
  - Export to CSV
- **Settings**:
  - Response deadline
  - Plus-one allowance
  - Dietary restrictions
  - Custom welcome/thank you messages
- **Statistics Dashboard**: Real-time counts of responses and guests

**Data Limits** (to protect database):
- Max 20 questions per wedding
- Max 15 options per question
- Text answers max 1000 characters
- Message max 2000 characters

**Documentation**: See `docs/architecture/rsvp-management.md`

### 6. Website Editor
- **Modern Dark Theme UI**: Professional editor interface inspired by Squarespace/Webflow
  - Dark color scheme (#0f0f0f, #1a1a1a, #2a2a2a)
  - Collapsible sidebar (340px) on left with options
  - Large preview panel on right
  - Top toolbar with controls
- **Layout Components**:
  - **Sidebar Tabs**: Thèmes, Couleurs, Contenu, Images
  - **Device Preview**: Desktop/Tablet/Mobile toggles
  - **Zoom Controls**: 100% zoom with +/- buttons
  - **Publish Button**: Save and publish changes
- **Theme Selection**: Choose between 6 predefined themes:
  - **Classic** - Elegant burgundy with timeless design
  - **Luxe** - Minimalist gold accents and sophistication
  - **Jardin Moderne** - Fresh botanical with sage greens and blush
  - **Cobalt** - Bold electric blue with modern aesthetics
  - **Éditorial** - Magazine-style with high contrast and bold typography
  - **French Minimalist** - Ultra-clean Parisian elegance (Herembourg-inspired)
- **Color Customization**: Collapsible color groups (Primary, Backgrounds, Text, Other)
- **Content Editor**: Section tabs (Hero, Bienvenue, À propos, Galerie, etc.) with character counts
- **Image Management**: 6 customizable images (Hero, Background, Couple Photo, Gallery Placeholder, Logo, Favicon)
- **Live Preview**: Preview panel shows current wedding page with auto-refresh (500ms debounce)
- **Responsive Preview**: Test designs at desktop (100%), tablet (768px), mobile (375px) widths
- Access: `/admin/website-editor` from admin dashboard
- **Documentation**: See `WEBSITE_EDITOR.md` for full details

### 7. Wedding Microsites
- Dynamic wedding pages at `/[slug]/`
- 6 custom themes with unique color palettes and typography
- Sections: Home, Photos, Guestbook, RSVP, Info
- Timeline and schedule display
- Fully customizable via Website Editor

### 7. PWA Features
- **Offline support**: Service Worker caching
- **Install prompt**: Mobile-only, shows once
- **App-like experience**: Standalone display mode

### 8. Internationalization
- **Languages**: English (default), French, Spanish
- **URL-based**: `/fr/`, `/es/` prefixes
- **Auto-detection**: Browser language redirect

---

## Data Layer

### Database Architecture (Supabase Auth)
There is **no `clients` table**. User accounts are managed via Supabase Auth:

- **`auth.users`** - Supabase Auth handles user authentication (email + password)
- **`profiles`** - Extends `auth.users` with subscription info (`profiles.id` references `auth.users.id`)
- **`weddings`** - Each wedding belongs to a profile (`weddings.owner_id` references `profiles.id`)

**The `Client` TypeScript type** (in `src/lib/auth/godAuth.ts`) is a **conceptual interface**, not a database table. It's constructed by joining data from `profiles` + `weddings` for use in the UI.

### Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles linked to `auth.users`, includes subscription status |
| `weddings` | Wedding configuration, linked to owner profile |
| `media` | Photos/videos uploaded to weddings |
| `albums` | Photo album organization |
| `album_media` | Junction table for album-media relationships |
| `guestbook_messages` | Guestbook entries |
| `reactions` | Media reactions (emoji) |
| `favorites` | User favorites |
| `rsvp` | Legacy RSVP responses (basic) |
| `rsvp_config` | **NEW** Per-wedding RSVP configuration + custom questions (JSONB) |
| `rsvp_responses` | **NEW** Guest responses with custom question answers |
| `guest_sessions` | Guest authentication sessions (PIN/magic token) |
| `auth_sessions` | Client/God admin authentication sessions |
| `god_admins` | Super admin accounts |
| `god_access_tokens` | Impersonation tokens for god admins |
| `audit_log` | Security audit trail |

### Authentication Flow
- **Client login**: Supabase Auth (email + password) → creates `auth_sessions` entry
- **Guest access**: `weddings.pin_code` (6 chars) or `weddings.magic_token` (admin) → creates `guest_sessions` entry
- **God admin**: Separate `god_admins` table with password hash → creates `auth_sessions` entry

### API Endpoints Reference

#### Authentication APIs

##### POST /api/signup
**Description:** Legacy signup endpoint (deprecated - use payment flow instead)
**Authentication:** None
**Rate Limit:** 5 per IP per hour

##### POST /api/god/create-token
**Description:** Create god admin access token for impersonation
**Authentication:** God admin credentials

##### POST /api/god/verify-token
**Description:** Verify god admin access token
**Authentication:** Token

##### POST /api/god/update-status
**Description:** Update god admin status
**Authentication:** God admin

#### Payment Flow APIs

##### POST /api/signup/create-checkout
**Description:** Create Stripe checkout session for new wedding signup
**Authentication:** None
**Rate Limit:** 5 per IP per hour

**Request Body:**
```typescript
{
  email: string;              // Valid email format
  password: string;           // Min 8 chars, 1 uppercase, 1 number, 1 special
  partner1_name: string;      // Partner 1 name
  partner2_name: string;      // Partner 2 name
  wedding_date?: string;      // ISO date string (optional)
  slug: string;               // 3-50 chars, lowercase, alphanumeric + hyphens
  theme_id: ThemeId;          // "classic" | "luxe" | "jardin-moderne" | "cobalt" | "editorial" | "french-minimalist"
}
```

**Success Response (200):**
```typescript
{
  sessionId: string;          // Stripe session ID (cs_test_...)
  url: string;                // Stripe checkout URL
}
```

**Error Responses:**
- `400 Missing required fields` - Required fields not provided
- `400 Invalid email` - Email format invalid (field: "email")
- `400 Weak password` - Password doesn't meet requirements (field: "password")
- `400 Invalid slug format` - Slug format invalid (field: "slug")
- `400 Slug reserved` - Slug is reserved and cannot be used (field: "slug")
- `400 Slug taken` - Slug already in use (field: "slug")
- `500 Failed to prepare checkout` - Database error
- `503 Database not configured` - Supabase not configured
- `503 Database admin not configured` - Service role key missing
- `503 Payment system not configured` - Stripe not configured

**Notes:**
- Password stored temporarily in `pending_signups` (expires 24h)
- Slug validated before payment to avoid post-payment conflicts
- Creates `pending_signups` record with `stripe_checkout_status: "pending"`

##### POST /api/signup/verify-payment
**Description:** Verify payment and create account after Stripe checkout
**Authentication:** None

**Request Body:**
```typescript
{
  session_id: string;         // Stripe session ID from checkout
}
```

**Success Response (200):**
```typescript
{
  success: true;
  slug: string;               // Wedding slug
  redirect: string;           // Redirect URL (/{slug}/admin)
  session?: {                 // Auth session (if auto-login succeeded)
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  user?: {                    // User info (if auto-login succeeded)
    id: string;
    email: string;
    wedding_id: string;
  };
  alreadyCompleted?: boolean; // True if account was already created (idempotency)
  needsLogin?: boolean;       // True if auto-login failed
  message?: string;           // Status message
}
```

**Error Responses:**
- `400 Missing session ID` - session_id not provided
- `400 Payment not completed` - Stripe payment not paid
- `404 Signup data not found` - No pending_signups record for session_id
- `409 Slug taken after payment` - Race condition: slug taken after checkout (code: `SLUG_CONFLICT_POST_PAYMENT`)
- `400 Account error` - Email already registered (code: `ACCOUNT_EXISTS_OR_ERROR`, field: "email")
- `500 Failed to create account` - Auth user creation failed
- `500 Profile creation failed` - Profile creation failed (user cleaned up)
- `500 Wedding creation failed` - Wedding creation failed (user + profile cleaned up)
- `503 Database not configured` - Supabase not configured
- `503 Payment system not configured` - Stripe not configured

**Notes:**
- **Idempotent:** Safe to call multiple times with same session_id
- Creates: auth.users → profiles → weddings
- Sets subscription_status to "active" for 2 years
- Generates 6-char PIN code for guest access
- Attempts auto-login after account creation
- Marks `pending_signups` as completed
- Cleans up auth.users and profiles on failure

##### POST /api/stripe/webhook
**Description:** Stripe webhook handler for payment events
**Authentication:** Stripe signature verification
**Security:** Atomic idempotency via `stripe_events` table (prevents TOCTOU)

**Handled Events:**
- `checkout.session.completed` - Payment completed (marks pending_signups or upgrades profile)
- `customer.subscription.updated` - Subscription status changed
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Renewal payment succeeded (extends 1 year)
- `invoice.payment_failed` - Payment failed (marks expired)

**Response:**
```typescript
{
  received: true;
  duplicate?: boolean;        // True if event already processed
}
```

**Error Responses:**
- `400 Missing signature` - stripe-signature header missing
- `400 Webhook Error: ...` - Signature verification failed
- `503 Database not configured` - Supabase not configured
- `503 Payment system not configured` - Stripe not configured
- `500 Webhook handler failed` - Processing error (event marked as "failed")

**Notes:**
- Idempotent: Uses `stripe_events` table with unique constraint on `stripe_event_id`
- If duplicate detected (23505 error), returns 200 immediately
- New signups: updates `pending_signups.stripe_checkout_status`
- Upgrades: extends `profiles.subscription_end_date` by 2 years (initial) or 1 year (renewal)

##### POST /api/stripe/checkout
**Description:** Create Stripe checkout for existing profile upgrade
**Authentication:** Supabase Auth token

##### POST /api/stripe/portal
**Description:** Create Stripe customer portal session
**Authentication:** Supabase Auth token

#### Upload APIs

##### POST /api/upload/presign
**Description:** Generate presigned URL for R2 upload (with authorization + trial limits)
**Authentication:** Supabase Auth token OR guest session token
**Rate Limit:** 20 per IP per minute

**Request Body:**
```typescript
{
  weddingId: string;          // Wedding UUID
  fileName: string;           // Original filename
  contentType: string;        // MIME type (image/* or video/*)
  guestIdentifier?: string;   // Guest session token (if not authenticated)
}
```

**Success Response (200):**
```typescript
{
  uploadUrl: string;          // R2 presigned upload URL
  key: string;                // R2 object key (weddings/{id}/media/{timestamp}-{random}-{name})
  publicUrl: string;          // Public URL for accessing uploaded file
  expiresAt: string;          // ISO timestamp when presigned URL expires
}
```

**Error Responses:**
- `400 Missing required fields` - weddingId, fileName, or contentType missing
- `400 Invalid content type` - contentType not in allowed list
- `401 Unauthorized` - No valid auth token or guest identifier
- `403 Trial limit reached` - Trial limits hit (code: `TRIAL_PHOTO_LIMIT` or `TRIAL_VIDEO_LIMIT`)
- `403 Subscription required` - Subscription expired (code: `SUBSCRIPTION_EXPIRED`)
- `404 Wedding not found` - Wedding ID doesn't exist
- `404 Profile not found` - Wedding owner profile doesn't exist
- `503 Storage not configured` - R2 not configured
- `503 Database error` - Failed to verify limits
- `500 Internal server error` - Unexpected error

**Allowed Content Types:**
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`, `image/heif`
- Videos: `video/mp4`, `video/quicktime`, `video/webm`, `video/x-msvideo`

**Trial Limits:**
- Photos: 50
- Videos: 1

**Notes:**
- Optimized: Single JOIN query (weddings + profiles) instead of 2 sequential queries
- Authorization: Either wedding owner (via auth token) OR valid guest session
- Trial enforcement: Only queries relevant media type count (photo or video)
- Fail-safe: If count query fails, denies upload (secure by default)

##### POST /api/upload/confirm
**Description:** Confirm R2 upload and create database record
**Authentication:** Service role
**Rate Limit:** 20 per IP per minute

**Request Body:**
```typescript
{
  weddingId: string;          // Wedding UUID
  key: string;                // R2 object key
  publicUrl: string;          // Public URL
  fileName: string;           // Original filename
  contentType: string;        // MIME type
  fileSize: number;           // File size in bytes
  uploaderId: string;         // User ID or "guest:{session_id}"
  guestName?: string;         // Guest name (if guest upload)
  caption?: string;           // AI-generated caption
}
```

**Success Response (200):**
```typescript
{
  id: string;                 // Media UUID
  wedding_id: string;
  url: string;                // Public URL
  type: "photo" | "video";
  uploaded_by: string;
  uploaded_by_name?: string;
  caption?: string;
  created_at: string;         // ISO timestamp
}
```

##### POST /api/upload/website-image
**Description:** Upload website customization images
**Authentication:** Wedding owner auth token

#### Customization APIs

##### POST /api/customization/save
**Description:** Save website customization (theme, colors, content, images)
**Authentication:** Wedding owner auth token

**Request Body:**
```typescript
{
  weddingId: string;
  customization: {
    theme?: {
      id: ThemeId;
      name: string;
      description?: string;
    };
    colors?: {
      primary?: string;
      primaryHover?: string;
      secondary?: string;
      // ... (40+ color properties)
    };
    content?: {
      hero?: { title?: string; subtitle?: string; };
      welcome?: { title?: string; text?: string; };
      about?: { title?: string; text?: string; };
      // ... (12+ content sections)
    };
    images?: {
      hero?: { url?: string; alt?: string; };
      background?: { url?: string; };
      // ... (6 image properties)
    };
  }
}
```

**Success Response (200):**
```typescript
{
  success: true;
  message: "Customization saved successfully";
}
```

**Error Responses:**
- `400 Wedding ID is required`
- `400 Customization data is required`
- `401 Authorization required` - No Bearer token
- `401 Invalid or expired token` - Auth failed
- `403 Not authorized to modify this wedding` - User is not owner
- `404 Wedding not found`
- `500 Failed to save customization`

##### GET /api/customization/get
**Description:** Fetch website customization
**Query:** `?weddingId={uuid}`

#### Wedding APIs

##### GET /api/weddings/by-slug
**Description:** Get wedding info by slug
**Query:** `?slug={slug}`

##### GET /api/weddings/check-slug
**Description:** Check if slug is available
**Query:** `?slug={slug}`

#### Admin APIs

##### POST /api/admin/create-client
**Description:** Create client account (god admin only)
**Authentication:** God admin token

---

### API Error Code Reference

| Code | Description | Action |
|------|-------------|--------|
| `TRIAL_PHOTO_LIMIT` | Trial photo limit reached (50) | Upgrade subscription |
| `TRIAL_VIDEO_LIMIT` | Trial video limit reached (1) | Upgrade subscription |
| `SUBSCRIPTION_EXPIRED` | Subscription expired or cancelled | Renew subscription |
| `SLUG_CONFLICT_POST_PAYMENT` | Slug taken after payment | Contact support for new slug |
| `ACCOUNT_EXISTS_OR_ERROR` | Email already registered | Contact support or use different email |

### Supabase Database SQL
Available at `supabase/database.sql` (reference schema for context, not for execution)

### Architecture: DataService Abstraction
All components use `DataService` (`src/lib/services/dataService.ts`) which provides a unified API for both demo and production modes. Components never import directly from `mockData.ts`.

**Key Pattern:**
```typescript
// In parent component (e.g., GalleryGrid, AdminPanel)
const serviceRef = useRef<DataService | null>(null);
if (!serviceRef.current) {
  serviceRef.current = new DataService({ demoMode, weddingId });
}
const dataService = serviceRef.current;

// Pass to child components via props
<AlbumManager dataService={dataService} />
<ReactionsPanel mediaId={id} dataService={dataService} />
```

### Demo Mode
- **When:** `demoMode={true}` passed to component OR Supabase not configured
- **Pages:** `/demo_gallery`, `/demo_livre-or`
- **Storage:** Mock data in `mockData.ts`, persisted via `demoStorage.ts`
- **Use case:** Demonstrations, development without database

### Production Mode
- **When:** Supabase configured AND `demoMode` not explicitly true
- **Pages:** `/[slug]/photos`, `/[slug]/livre-or`, `/[slug]/admin`
- **Database:** Supabase (profiles, weddings, media)
- **File Storage:** Cloudflare R2 (media files)
- **Auto-detection:** DataService checks `isSupabaseConfigured()`

### Media Storage (R2)
Files are stored in Cloudflare R2 using presigned URLs:
1. Client requests presigned URL from `/api/upload/presign`
2. Client uploads directly to R2
3. Client confirms upload via `/api/upload/confirm`
4. Database record created in Supabase via service role

**Storage Structure:**
```
weddings/{weddingId}/media/{timestamp}-{random}-{filename}.{ext}
```

### DataService Methods
- **Media:** `getMedia()`, `addMedia()`, `deleteMedia()`, `uploadMedia()`, `uploadMediaBatch()`
- **Albums:** `getAlbums()`, `createAlbum()`, `updateAlbum()`, `deleteAlbum()`
- **Guestbook:** `getMessages()`, `addMessage()`, `deleteMessage()`
- **Favorites:** `getFavorites()`, `toggleFavorite()`, `isFavorited()`
- **Reactions:** `getReactions()`, `toggleReaction()`, `getUserReaction()`
- **Statistics:** `getStatistics()`
- **Settings:** `getSettings()`, `updateSettings()`

### Empty State UX
When no content exists (new wedding), components show welcoming placeholders:
- **Gallery:** "Votre galerie vous attend" with upload button
- **Guestbook:** "Le livre d'or vous attend" encouraging first message

---

## Service Worker

Located at `public/sw.js`:
- **Cache versioning**: `reflets-v1.0.2`
- **Strategies**:
  - Navigation: Network-first, cache fallback
  - Resources (CSS/JS): Cache-first with background update
  - Images: Cache-first, network fallback
- **Auto-update**: Prompts user when new version available

**Important**: Bump `CACHE_VERSION` when making CSS/JS changes.

---

## Key Configuration Files

### `tailwind.config.mjs`
- Custom color palette (burgundy, cream, olive, etc.)
- Custom fonts (Cormorant Garamond, Montserrat, Great Vibes)
- Dark mode support (`class` strategy)

### `astro.config.mjs`
- React integration
- Tailwind integration
- Vite optimization for lucide-react
- `output: "server"` for API routes

### Environment Variables

#### Supabase (Database)
```
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=server-only-key
```

#### Supabase Auth
```
SUPABASE_AUTH_SITE_URL=http://localhost:4321
```

#### Cloudflare R2 (Media Storage)
```
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=reflets-media
R2_PUBLIC_URL=https://your-r2-public-url
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

See `.env.example` for all configuration options.

---

## Development Workflow

### Starting Development
```bash
cd /Users/kevin/Development/WeddingPictures/reflets-de-bonheur
npm install
npm run dev
```

### Testing Changes
1. Make changes
2. Hard refresh (`Cmd+Shift+R`) to bypass service worker cache
3. If styles don't update, bump `CACHE_VERSION` in `public/sw.js`

### Building for Production
```bash
npm run build
npm run preview
```

---

## Testing

Always add tests for every new feature or bug fix.
Always run tests before committing.

### Test Framework
- **Vitest**: Unit tests with fast execution
- **React Testing Library**: Component testing
- **jsdom**: Browser environment simulation
- **Playwright**: E2E and screenshot testing

### Running Tests
```bash
npm test                 # Run all unit tests
npm run test:coverage    # Run with coverage report
npm test -- path/to/file # Run specific test file
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Playwright with UI
npm run test:e2e:headed  # Run in visible browser
npm run test:e2e:update-snapshots  # Update screenshot baselines
npm run test:all         # Run all tests (unit + E2E)
```

### Test Coverage (as of January 2026)
- **Overall Coverage**: ~39% statements
- **Auth Module**: ~91% statements
  - `godAuth.ts`: ~96% coverage
  - `clientAuth.ts`: ~87% coverage
- **Admin Components**: ~91% coverage
- **i18n Module**: ~97% coverage

### Test Files Location
```
src/
├── lib/
│   ├── auth/
│   │   ├── godAuth.test.ts     # God admin auth tests (60 tests)
│   │   └── clientAuth.test.ts  # Client/guest auth tests (37 tests)
│   ├── auth.test.ts            # Core auth utilities (30 tests)
│   ├── mockData.test.ts        # Mock data tests (41 tests)
│   ├── rsvp/
│   │   ├── types.test.ts       # RSVP type helpers and factories
│   │   └── rsvpService.test.ts # RSVP service layer tests
│   └── services/
│       └── dataService.test.ts # Data service tests (27 tests)
├── components/
│   └── admin/
│       ├── AdminPanel.test.tsx
│       ├── AlbumManager.test.tsx
│       ├── ui/
│       │   ├── AdminButton.test.tsx   # Button component tests
│       │   ├── AdminToggle.test.tsx   # Toggle component tests
│       │   └── AdminPagination.test.tsx
│       ├── rsvp/
│       │   └── RSVPManager.test.tsx   # RSVP manager component tests
│       └── ... (more component tests)
├── i18n/
│   └── utils.test.ts           # i18n utility tests (36 tests)
└── test/
    ├── setup.ts                # Test setup & mocks
    ├── integration/
    │   └── demoPages.test.ts   # Integration tests (28 tests)
    ├── functional/
    │   └── rsvp-scenarios.test.ts  # RSVP user flow scenarios
    └── ui/
        ├── admin-dashboard.spec.ts  # Dashboard screenshot tests (Playwright)
        └── rsvp-manager.spec.ts     # RSVP screenshot tests (Playwright)
```

### God Access Token TTL
God access tokens (for impersonation) have a **24-hour TTL** and are automatically cleaned up:
- Tokens expire 24 hours after creation
- Database trigger cleans up expired tokens on new inserts (1% probability)
- Hourly cleanup via `pg_cron` if enabled
- Manual cleanup available via `cleanup_expired_god_tokens()` function
- View token status: `SELECT * FROM god_tokens_status;`

---

## Next Steps

### Immediate Priorities (CRITICAL - Blocking Launch)
1. ~~**Supabase Integration**: Connect components to real database~~ ✅ DONE
2. ~~**R2 Media Storage**: Cloudflare R2 for file uploads~~ ✅ DONE
3. ~~**Testing & God Token Fix**: Auth tests and 24h TTL~~ ✅ DONE
4. ~~**Website Editor**: Visual customization for themes, colors, content, images~~ ✅ DONE
5. ~~**Admin Dashboard Redesign**: Modern card-based UI with admin theme system~~ ✅ DONE
6. ~~**RSVP Management**: Custom questions, responses viewer, pagination~~ ✅ DONE
7. ~~**Website Editor Live Preview**: Fix real-time preview updates~~ ✅ DONE
8. **Stripe Payment → Signup Integration**: 🚨 **CRITICAL GAP**
   - Backend complete: checkout endpoint, webhook, security fixes, tested in sandbox ✅
   - **Missing**: Pricing page doesn't trigger Stripe checkout before signup
   - **Issue**: `/pricing` → `/signup` creates free account, bypassing payment
   - **Fix needed**: Wire Stripe checkout into pricing → signup flow (2-4 hours)
9. **Email Notifications**: Welcome emails after payment/signup (4-6 hours)
   - Required for customer onboarding
   - Service: Resend, SendGrid, or Supabase Auth emails
10. **Image Thumbnails & Optimization**: Generate 400px thumbnails (6-8 hours)
   - Current: Serving full-size images, slow gallery loads
   - Impact: Performance issue with real usage

### Pre-Launch Priorities
11. **Increase Test Coverage**: Target 70%+ overall, 90%+ for critical paths
   - Current: 39% overall (Auth: 91%, Admin: 91%, i18n: 97%)
   - Focus: End-to-end Stripe flow, upload flow, RSVP responses

### Future Enhancements
1. **Real-time sync**: WebSocket updates for gallery
2. **Video transcoding**: Cloudflare Stream integration
3. **Photo AI**: Face recognition, auto-tagging
4. **Export**: Google Drive integration
5. **Analytics**: Usage tracking dashboard
6. **Error handling**: User-friendly error messages when Supabase fails
7. **Optimistic updates**: Update UI immediately, sync in background
8. **Offline support**: Queue uploads when offline

---

## Troubleshooting

### Styles Not Updating
1. Bump `CACHE_VERSION` in `public/sw.js`
2. Hard refresh: `Cmd+Shift+R`
3. Clear site data in DevTools > Application > Storage

### React Component Not Hydrating
Ensure `client:load` directive is present:
```astro
<Component client:load />
```

### Tailwind Classes Not Working
Check that the file is in the `content` array in `tailwind.config.mjs`

---

## Contact

**Developer**: Kevin
**Started**: January 2026
**Last Updated**: February 3, 2026

---

*This file serves as the single source of truth for the project. Architecture details are embedded above rather than in separate files.*
