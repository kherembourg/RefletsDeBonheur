# Reflets de Bonheur - Architecture Documentation

This folder contains detailed architecture documentation for the Reflets de Bonheur wedding photo sharing platform.

## Quick Links

- [Pages & Routing](./pages.md) - URL structure and page organization
- [Components](./components.md) - React and Astro component architecture
- [Data Flow](./data-flow.md) - Services, state management, and data persistence
- [Authentication](./authentication.md) - Auth flows for clients, guests, and admins
- [Website Editor](./website-editor.md) - Visual customization system

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Astro 5)                        │
├─────────────────────────────────────────────────────────────────┤
│  Static Pages          │  Dynamic Pages (SSR)   │  React Islands │
│  - Landing (/)         │  - /[slug]/*           │  - Gallery     │
│  - Pricing             │  - /api/*              │  - Guestbook   │
│  - Legal pages         │                        │  - Admin Panel │
│                        │                        │  - Editor      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │   DataService     │           │    Supabase       │
        │  (Abstraction)    │           │   (Production)    │
        ├───────────────────┤           ├───────────────────┤
        │ - Demo Mode       │           │ - auth.users      │
        │   (localStorage)  │           │ - profiles        │
        │ - Production      │──────────▶│ - weddings        │
        │   (Supabase)      │           │ - media           │
        └───────────────────┘           │ - guestbook_*     │
                                        └───────────────────┘
                                                │
                                                ▼
                                        ┌───────────────────┐
                                        │  Cloudflare R2    │
                                        │  (Media Storage)  │
                                        └───────────────────┘
```

## Key Architectural Decisions

### 1. Islands Architecture (Astro)
- Static HTML for fast initial load
- React components hydrate only where interactivity is needed
- `client:load` for immediate hydration, `client:only="react"` for client-only components

### 2. DataService Abstraction
- Single interface for all data operations
- Automatic switching between demo mode (localStorage) and production (Supabase)
- Components never import mock data directly

### 3. Per-Wedding URL Structure
- Each wedding has its own slug: `/mariage-de-mathilde-kevin/`
- All wedding pages nested under slug: `/[slug]/photos`, `/[slug]/admin`, etc.
- Website editor at `/[slug]/admin/website-editor`

### 4. Live Preview System
- Editor uses localStorage for real-time preview sync
- Preview iframe loads wedding pages with `?preview=true` parameter
- postMessage API for instant updates without page reload

## Folder Structure Overview

```
src/
├── components/
│   ├── admin/          # Admin dashboard components
│   ├── gallery/        # Photo gallery components
│   ├── guestbook/      # Guestbook components
│   ├── wedding/        # Wedding microsite components
│   └── ui/             # Shared UI components
├── layouts/
│   ├── MainLayout.astro      # SaaS platform layout
│   ├── WeddingLayout.astro   # Wedding microsite layout (Classic)
│   └── WeddingLuxeLayout.astro # Luxe theme layout
├── pages/
│   ├── [slug]/         # Dynamic wedding pages
│   │   ├── admin/      # Per-wedding admin
│   │   └── ...         # photos, livre-or, rsvp, infos
│   ├── api/            # API endpoints (SSR)
│   └── ...             # Static pages
├── lib/
│   ├── services/       # DataService abstraction
│   ├── supabase/       # Supabase client & types
│   └── ...             # Utilities
└── i18n/               # Internationalization
```

## Recent Changes

### January 2026
- **Website Editor Dynamic URLs**: Changed from global `/admin/website-editor` to per-wedding `/{slug}/admin/website-editor`
- **Navigation Updates**: "Accueil" renamed to "Site Web" for wedding microsites
- **Demo Mode Fix**: Editor saves to localStorage in demo mode instead of failing API calls
- **Auto-save Implementation**: 2-second debounced auto-save with status indicators

---

*Last updated: January 21, 2026*
