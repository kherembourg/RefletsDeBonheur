# Changelog

All notable changes to **Reflets de Bonheur** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **RSVP Management System** - Full-featured RSVP management for wedding administrators
  - Toggle to enable/disable RSVP feature per wedding
  - Custom question builder supporting 3 question types:
    - Text fields (with configurable character limits)
    - Single choice (radio buttons or dropdown)
    - Multiple choice (checkboxes)
  - Paginated responses viewer with search and filters
  - CSV export functionality
  - Real-time statistics (responses, attendance counts, total guests)
  - Configurable settings: deadline, plus-ones, dietary restrictions, custom messages
  - Database limits for protection (max 20 questions, 15 options per question)

- **Admin Dashboard Redesign** - Modern, ergonomic admin interface
  - New card-based quick actions grid
  - RSVP management access card with navigation
  - Improved statistics overview (4-card layout)
  - Dedicated admin theme system (`src/styles/admin-theme.ts`)

- **Reusable Admin UI Components** (`src/components/admin/ui/`)
  - AdminButton - Configurable buttons with variants and sizes
  - AdminCard - Card containers with headers, footers
  - AdminInput - Form inputs with labels, errors, icons
  - AdminTextarea - Multiline inputs with character counts
  - AdminToggle - Animated toggle switches
  - AdminModal - Accessible modal dialogs
  - AdminPagination - Paginated navigation controls
  - AdminBadge - Status badges with variants
  - AdminSelect - Styled select dropdowns
  - AdminSection - Section headers with icons
  - AdminDivider - Decorative dividers
  - AdminEmptyState - Empty state placeholders

- **Database Schema** - New tables for RSVP management
  - `rsvp_config` - Per-wedding RSVP configuration with custom questions (JSONB)
  - `rsvp_responses` - Guest responses with custom question answers
  - Migration: `supabase/migrations/003_rsvp_custom_questions.sql`

- **Testing Infrastructure**
  - Unit tests for RSVP types and service (`src/lib/rsvp/*.test.ts`)
  - Component tests for admin UI (`src/components/admin/ui/*.test.tsx`)
  - RSVP manager component tests (`src/components/admin/rsvp/*.test.tsx`)
  - Functional test scenarios (`src/test/functional/rsvp-scenarios.test.ts`)
  - Playwright screenshot tests (`src/test/ui/*.spec.ts`)
  - Added `@playwright/test` dependency
  - New npm scripts: `test:e2e`, `test:e2e:ui`, `test:all`

- **Documentation**
  - Architecture documentation: `docs/architecture/rsvp-management.md`
  - Updated CLAUDE.md with RSVP management details

### Changed
- AdminPanel now uses new AdminSection and AdminCard components
- Statistics cards use responsive 2x2/1x4 grid layout
- Quick actions displayed as interactive cards with hover effects

### Technical Details
- RSVP Service (`src/lib/rsvp/rsvpService.ts`) supports both demo mode (localStorage) and production mode (Supabase)
- Admin theme system provides consistent colors, spacing, typography across admin pages
- All RSVP components follow existing patterns (DataService abstraction, French localization)

---

## [1.0.0] - 2026-01-21

### Added
- Initial production-ready release
- Complete UI implementation with Astro 5 + React
- Multi-language support (EN, FR, ES)
- PWA with offline support
- Photo gallery with masonry layout
- Guestbook with AI-assisted message writing
- Admin dashboard with statistics
- Website Editor for visual customization
- 6 wedding themes (Classic, Luxe, Jardin Moderne, Cobalt, Editorial, French Minimalist)
- Supabase integration for database and authentication
- Cloudflare R2 for media storage
- Stripe subscription management
- QR code generation for sharing
