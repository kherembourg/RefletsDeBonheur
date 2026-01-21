# Website Editor Architecture

The website editor allows wedding clients to visually customize their microsite's appearance.

## URL Structure

```
/{slug}/admin/website-editor
```

**Important**: The editor URL is wedding-specific. Each wedding has its own editor instance.

| URL | Purpose |
|-----|---------|
| `/julie-thomas/admin/website-editor` | Edit Julie & Thomas wedding |
| `/mariage-de-kevin/admin/website-editor` | Edit Kevin's wedding |
| `/admin/website-editor` | DEPRECATED - was demo mode |

## Component Architecture

```
WebsiteEditor.tsx
├── Header Toolbar
│   ├── Back Button (→ /{slug}/admin)
│   ├── Status Indicator (idle/saving/saved/error)
│   ├── Device Preview (desktop/tablet/mobile)
│   └── Zoom/Refresh/Reset controls
├── Sidebar (EditorContent)
│   ├── Theme Tab (ThemeSelector)
│   ├── Colors Tab (ColorPaletteEditor)
│   ├── Content Tab (ContentEditor)
│   └── Images Tab (ImageManager)
└── Preview Panel
    └── <iframe src="/{slug}?preview=true">
```

## Props

```typescript
interface WebsiteEditorProps {
  weddingId: string;      // Database ID (e.g., 'w-001')
  weddingSlug: string;    // URL slug (e.g., 'julie-thomas')
  demoMode?: boolean;     // True if Supabase not configured
  initialCustomization?: WeddingCustomization;
  onSave?: (customization: WeddingCustomization) => Promise<void>;
}
```

## Data Flow

### Live Preview (Instant Updates)

```
┌──────────────────┐    localStorage     ┌──────────────────┐
│  WebsiteEditor   │ ──────────────────▶ │  Preview Iframe  │
│                  │                     │  /{slug}?preview │
│  setCustomization│                     │                  │
│        │         │    postMessage      │  PreviewProvider │
│        ▼         │ ──────────────────▶ │        │         │
│  localStorage    │                     │        ▼         │
│  (preview key)   │                     │  Apply CSS vars  │
└──────────────────┘                     └──────────────────┘
```

1. User changes color in editor
2. `setCustomization()` updates React state
3. `useEffect` writes to `wedding_preview_customization` localStorage
4. `useEffect` sends postMessage to iframe
5. `PreviewCustomizationProvider` in iframe receives update
6. CSS variables updated instantly (no reload)

### Auto-Save (2-second Debounce)

```
User Change → State Update → 2s Debounce → Save
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                                               │
              Demo Mode                                      Production Mode
                    │                                               │
                    ▼                                               ▼
        localStorage.setItem(                           fetch('/api/customization/save')
          `wedding_customization_${slug}`,                         │
          JSON.stringify(customization)                            ▼
        )                                                   Supabase Database
```

### Status Indicators

| Status | Display | Meaning |
|--------|---------|---------|
| `idle` | (nothing) | No changes |
| `idle` + unsaved | "Modifications..." (amber) | Changes pending |
| `saving` | "Enregistrement..." (blue) | Save in progress |
| `saved` | "Enregistré" (green) | Successfully saved |
| `error` | "Erreur" (red) | Save failed |

## localStorage Keys

| Key | Scope | Purpose |
|-----|-------|---------|
| `wedding_preview_customization` | Temporary | Live preview sync |
| `wedding_customization_{slug}` | Persistent | Demo mode persistence |

## Demo Mode Detection

Demo mode is determined server-side in the Astro page:

```astro
---
import { isSupabaseConfigured } from '../../../lib/supabase/client';
const demoMode = !isSupabaseConfigured();
---

<WebsiteEditor demoMode={demoMode} ... />
```

In demo mode:
- Saves go to localStorage instead of API
- No 404 errors from missing Supabase records
- Customizations persist across page reloads

## Customization Schema

```typescript
interface WeddingCustomization {
  themeId: ThemeId;  // 'classic' | 'luxe' | 'jardin-moderne' | etc.
  customPalette?: {
    primary?: string;    // Main accent color
    secondary?: string;  // Secondary color
    accent?: string;     // Accent highlights
    background?: string;
    text?: string;
    muted?: string;
  };
  customContent?: {
    heroTitle?: string;
    heroSubtitle?: string;
    welcomeMessage?: string;
    galleryTitle?: string;
    guestbookTitle?: string;
  };
  customImages?: {
    heroImage?: string;
    logo?: string;
    backgroundPattern?: string;
  };
  lastUpdated?: string;  // ISO timestamp
}
```

## Available Themes

| ID | Name | Description |
|----|------|-------------|
| `classic` | Classique | Elegant burgundy with timeless design |
| `luxe` | Luxe | Minimalist gold accents |
| `jardin-moderne` | Jardin Moderne | Fresh botanical greens |
| `cobalt` | Cobalt | Bold electric blue |
| `editorial` | Éditorial | Magazine-style high contrast |
| `french-minimalist` | French Minimalist | Ultra-clean Parisian elegance |

## Security

The editor page includes client-side auth checks:

```javascript
// Allow access if:
// 1. Client is logged in (clientToken + clientSession)
// 2. God admin is impersonating
// 3. Guest has admin code access (magic token)
// 4. Demo auth (reflets_is_admin === 'true')
```

## Integration Points

### AdminPanel.tsx
Links to editor using dynamic slug:
```tsx
<a href={weddingSlug ? `/${weddingSlug}/admin/website-editor` : '/admin/website-editor'}>
  Ouvrir l'éditeur
</a>
```

### Preview Iframe
Loads wedding page with preview flag:
```tsx
<iframe src={`/${weddingSlug}?preview=true&t=${Date.now()}`} />
```

### PreviewCustomizationProvider
Placed in wedding pages when `?preview=true`:
```astro
{isPreviewMode && (
  <PreviewCustomizationProvider weddingSlug={slug} client:only="react" />
)}
```

---

*Last updated: January 21, 2026*
