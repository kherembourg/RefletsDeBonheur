# Component Architecture

## Component Types

### Astro Components (`.astro`)
- Server-rendered, static by default
- Used for layouts and page shells
- No client-side JavaScript unless specified

### React Components (`.tsx`)
- Interactive islands that hydrate on the client
- Use `client:load` for immediate hydration
- Use `client:only="react"` for client-only rendering (no SSR)

## Directory Structure

```
src/components/
├── admin/              # Admin dashboard
│   ├── AdminPanel.tsx          # Main admin container
│   ├── WebsiteEditor.tsx       # Visual customization
│   ├── ColorPaletteEditor.tsx  # Color editing
│   ├── ContentEditor.tsx       # Text editing
│   ├── ImageManager.tsx        # Image uploads
│   ├── ThemeSelector.tsx       # Theme picker
│   ├── AlbumManager.tsx        # Photo albums
│   ├── QRCodeGenerator.tsx     # QR codes
│   ├── EnhancedStatistics.tsx  # Charts & stats
│   ├── StatsCard.tsx           # Stat display
│   ├── SettingsToggle.tsx      # Toggle switches
│   ├── SubscriptionStatus.tsx  # Billing info
│   └── TopUploaders.tsx        # Leaderboard
│
├── gallery/            # Photo gallery
│   ├── GalleryGrid.tsx         # Main gallery
│   ├── MediaCard.tsx           # Photo/video card
│   ├── UploadModal.tsx         # Upload dialog
│   ├── UploadForm.tsx          # Upload form
│   ├── Lightbox.tsx            # Full-screen view
│   ├── Slideshow.tsx           # Auto-play mode
│   ├── SearchFilters.tsx       # Filter controls
│   ├── BulkActions.tsx         # Multi-select
│   └── ReactionsPanel.tsx      # Emoji reactions
│
├── guestbook/          # Guestbook
│   ├── GuestbookContainer.tsx  # Main container
│   ├── GuestbookForm.tsx       # Message form
│   ├── MessageList.tsx         # Messages display
│   └── AIAssistant.tsx         # AI message help
│
├── wedding/            # Wedding microsite
│   ├── WeddingHero.tsx         # Hero section
│   ├── WeddingTimeline.tsx     # Event schedule
│   ├── WeddingInfo.tsx         # Venue info
│   ├── WeddingRSVP.tsx         # RSVP form
│   ├── ThemedHero.tsx          # Theme-aware hero
│   ├── LuxeHero.tsx            # Luxe theme hero
│   ├── LuxeNav.tsx             # Luxe navigation
│   ├── LuxeUploadCard.tsx      # Luxe upload
│   └── LuxeGalleryPreview.tsx  # Luxe gallery
│
├── auth/               # Authentication
│   └── LoginForm.tsx           # Login form
│
├── layout/             # Layout components
│   ├── Header.astro            # Main header
│   ├── Footer.astro            # Main footer
│   ├── LanguageToggle.tsx      # i18n switcher
│   └── LanguageDetector.astro  # Auto-detect lang
│
├── ui/                 # Shared UI
│   ├── Toast.tsx               # Notifications
│   ├── Skeleton.tsx            # Loading states
│   └── PageTransition.tsx      # Animations
│
├── pwa/                # PWA features
│   └── InstallPrompt.tsx       # Install banner
│
└── decorative/         # Visual elements
    └── FloralDecoration.astro  # Decorations
```

## Key Component Patterns

### DataService Injection

Components receive DataService via props, never create their own:

```tsx
// Parent component
const serviceRef = useRef<DataService | null>(null);
if (!serviceRef.current) {
  serviceRef.current = new DataService({ demoMode, weddingId });
}

// Pass to children
<GalleryGrid dataService={serviceRef.current} />
<AlbumManager dataService={serviceRef.current} />
```

### Hydration Directives

```astro
<!-- Hydrate immediately when page loads -->
<Component client:load />

<!-- Hydrate only when visible -->
<Component client:visible />

<!-- Client-only, no SSR (for localStorage access) -->
<Component client:only="react" />
```

### Conditional Rendering with Features

```tsx
// Check wedding config features
{config.features.photoGallery && (
  <GallerySection />
)}

{config.features.guestbook && (
  <GuestbookSection />
)}
```

## Component Communication

### Parent → Child
Props passed down the tree:
```tsx
<WebsiteEditor
  weddingId={wedding.id}
  weddingSlug={slug}
  demoMode={demoMode}
/>
```

### Child → Parent
Callback functions:
```tsx
<ColorPaletteEditor
  onChange={(palette) => setCustomization({...customization, customPalette: palette})}
/>
```

### Cross-Component (Preview)
localStorage + postMessage for iframe communication:
```tsx
// Editor writes
localStorage.setItem(PREVIEW_KEY, JSON.stringify(data));
iframe.contentWindow.postMessage({ type: 'UPDATE', data }, '*');

// Preview reads
window.addEventListener('message', (e) => { ... });
```

---

*Last updated: January 21, 2026*
