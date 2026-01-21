# Pages & Routing Architecture

## URL Structure

### SaaS Platform Pages (Static)

| URL | File | Description |
|-----|------|-------------|
| `/` | `pages/index.astro` | Landing page (English) |
| `/fr` | `pages/fr/index.astro` | Landing page (French) |
| `/es` | `pages/es/index.astro` | Landing page (Spanish) |
| `/pricing` | `pages/pricing.astro` | Pricing page |
| `/fr/tarification` | `pages/fr/tarification.astro` | Pricing (French) |
| `/connexion` | `pages/connexion.astro` | Login page |
| `/admin` | `pages/admin.astro` | Global admin (demo mode) |

### Demo Pages

| URL | File | Description |
|-----|------|-------------|
| `/demo_gallery` | `pages/demo_gallery.astro` | Demo photo gallery |
| `/demo_livre-or` | `pages/demo_livre-or.astro` | Demo guestbook |

### Wedding Microsite Pages (Dynamic SSR)

All wedding pages use dynamic routing with `[slug]` parameter.

| URL Pattern | File | Description |
|-------------|------|-------------|
| `/{slug}` | `pages/[slug]/index.astro` | Wedding homepage |
| `/{slug}/photos` | `pages/[slug]/photos.astro` | Photo gallery |
| `/{slug}/livre-or` | `pages/[slug]/livre-or.astro` | Guestbook |
| `/{slug}/rsvp` | `pages/[slug]/rsvp.astro` | RSVP form |
| `/{slug}/infos` | `pages/[slug]/infos.astro` | Practical info |
| `/{slug}/admin` | `pages/[slug]/admin.astro` | Wedding admin panel |
| `/{slug}/admin/website-editor` | `pages/[slug]/admin/website-editor.astro` | Visual website editor |

### API Endpoints (SSR)

| URL | File | Method | Description |
|-----|------|--------|-------------|
| `/api/admin/create-client` | `pages/api/admin/create-client.ts` | POST | Create new client |
| `/api/weddings/by-slug` | `pages/api/weddings/by-slug.ts` | GET | Get wedding by slug |
| `/api/upload/presign` | `pages/api/upload/presign.ts` | POST | Get presigned URL |
| `/api/upload/confirm` | `pages/api/upload/confirm.ts` | POST | Confirm upload |
| `/api/customization/save` | `pages/api/customization/save.ts` | POST | Save customization |
| `/api/customization/get` | `pages/api/customization/get.ts` | GET | Get customization |

## Page Hierarchy

```
/                           # SaaS Landing
├── /fr                     # French Landing
├── /es                     # Spanish Landing
├── /pricing                # Pricing
├── /connexion              # Login
├── /admin                  # Global Admin (demo)
│   └── /website-editor     # Global Editor (demo) - DEPRECATED
├── /demo_gallery           # Demo Gallery
├── /demo_livre-or          # Demo Guestbook
└── /{slug}                 # Wedding Microsite
    ├── /photos             # Gallery
    ├── /livre-or           # Guestbook
    ├── /rsvp               # RSVP
    ├── /infos              # Info
    └── /admin              # Admin Panel
        └── /website-editor # Visual Editor
```

## Navigation Logic

### Header Navigation (`Header.astro`)

The header dynamically shows different navigation based on page context:

1. **Public Pages** (`/`, `/pricing`, `/fr/*`, `/es/*`):
   - Home | Pricing | Demo | Login
   - Language toggle visible

2. **Demo Pages** (`/demo_*`):
   - Site Web | Galerie | Livre d'Or | Commander

3. **App Pages** (`/account/*`, `/guestbook`, `/admin`):
   - Galerie | Livre d'Or | Admin (if admin) | Logout

### Wedding Layout Navigation (`WeddingLayout.astro`)

Wedding microsites have their own navigation:
- Site Web → `/{slug}`
- Photos → `/{slug}/photos`
- Livre d'or → `/{slug}/livre-or`
- Infos → `/{slug}/infos`
- RSVP → `/{slug}/rsvp`

## SSR Configuration

Dynamic pages must disable prerendering:

```astro
---
export const prerender = false;
---
```

This is required for:
- All `[slug]` pages
- All `/api/*` endpoints

## Mock Wedding Slugs (Demo Mode)

Available in `weddingData.ts`:
- `julie-thomas` - Classic theme demo
- `marie-pierre` - Luxe theme demo

---

*Last updated: January 21, 2026*
