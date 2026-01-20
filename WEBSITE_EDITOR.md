# Website Customization & Editor - Documentation

## Overview

The **Website Editor** is a comprehensive visual customization system that allows wedding clients to personalize their wedding website without coding. It features a split-screen interface with real-time preview and supports customization of themes, colors, content, and images.

**Last Updated**: January 20, 2026

---

## Features

### 1. Visual Split-Screen Editor
- **Left Panel**: Real-time preview of the wedding website
- **Right Panel**: Tabbed editor interface with four customization categories
- **Auto-save indicator**: Visual feedback for unsaved changes
- **Instant preview**: Changes reflect immediately in the preview pane

### 2. Theme Selection
- Choose between predefined themes (Classic, Luxe)
- Visual theme cards with live previews
- Color swatches for quick identification
- One-click theme switching

### 3. Color Palette Customization
- Override any theme color individually
- Color picker with hex code input
- Visual indicators for customized colors
- Reset individual colors to theme defaults
- Validation for color formats (hex, rgba)
- Organized by categories:
  - **Primary colors**: Main CTA, hover states, accents
  - **Background colors**: Page backgrounds, cards
  - **Text colors**: Primary, secondary, muted text
  - **Other**: Borders, glass effects

### 4. Content Editor
- Edit all text content across the website
- Organized by sections:
  - **Hero**: Title, subtitle, date
  - **Welcome**: Title and message
  - **About Us**: Title and description
  - **Gallery**: Title, description, CTA
  - **Guestbook**: Title, description, CTA
  - **RSVP**: Title and description
  - **Footer**: Footer text
- Character count tracking
- Visual indicators for customized fields
- Reset individual fields to defaults

### 5. Image Manager
- Upload custom images for:
  - Hero section (main and background)
  - Couple photo
  - Gallery placeholder
  - Logo
  - Favicon
- Dual upload methods:
  - Direct file upload (drag-and-drop)
  - URL input
- Image preview thumbnails
- Recommended dimensions guide
- File validation (size, format)
- Remove/reset functionality

---

## Architecture

### File Structure

```
src/
├── lib/
│   ├── customization.ts          # Types and helper functions
│   ├── customization.test.ts     # Unit tests (21 tests)
│   ├── applyCustomization.ts     # Application helpers
│   └── applyCustomization.test.ts # Unit tests (16 tests)
├── components/admin/
│   ├── WebsiteEditor.tsx         # Main editor component
│   ├── ColorPaletteEditor.tsx    # Color customization
│   ├── ContentEditor.tsx         # Text content editing
│   ├── ImageManager.tsx          # Image upload/management
│   └── AdminPanel.tsx            # Updated with editor link
├── pages/
│   ├── admin/
│   │   └── website-editor.astro  # Editor page
│   ├── api/customization/
│   │   ├── save.ts              # Save API endpoint
│   │   └── get.ts               # Fetch API endpoint
│   └── [slug]/
│       └── index.astro          # Updated to use customization
```

### Data Model

#### WeddingCustomization

```typescript
interface WeddingCustomization {
  themeId: ThemeId;                 // 'classic' | 'luxe'
  customPalette?: CustomPalette;    // Color overrides
  customContent?: CustomContent;     // Text overrides
  customImages?: CustomImages;       // Image URLs
  lastUpdated?: string;             // ISO timestamp
}
```

#### CustomPalette

```typescript
interface CustomPalette {
  primary?: string;
  primaryHover?: string;
  accent?: string;
  background?: string;
  backgroundAlt?: string;
  text?: string;
  textLight?: string;
  textMuted?: string;
  border?: string;
  card?: string;
  glass?: string;
}
```

#### CustomContent

```typescript
interface CustomContent {
  // Hero section
  heroTitle?: string;
  heroSubtitle?: string;
  heroDate?: string;

  // Welcome section
  welcomeTitle?: string;
  welcomeMessage?: string;

  // About us section
  aboutUsTitle?: string;
  aboutUsText?: string;

  // Gallery section
  galleryTitle?: string;
  galleryDescription?: string;
  galleryCallToAction?: string;

  // Guestbook section
  guestbookTitle?: string;
  guestbookDescription?: string;
  guestbookCallToAction?: string;

  // RSVP section
  rsvpTitle?: string;
  rsvpDescription?: string;

  // Footer
  footerText?: string;
}
```

#### CustomImages

```typescript
interface CustomImages {
  heroImage?: string;
  heroBackgroundImage?: string;
  couplePhoto?: string;
  galleryPlaceholder?: string;
  logoImage?: string;
  faviconUrl?: string;
}
```

### Database Storage

Customizations are stored in the `weddings.config` JSONB field:

```json
{
  "theme": { ... },
  "features": { ... },
  "customization": {
    "themeId": "classic",
    "customPalette": {
      "primary": "#ff0000",
      "accent": "#00ff00"
    },
    "customContent": {
      "heroTitle": "Marie & Jean",
      "welcomeMessage": "Welcome to our special day!"
    },
    "customImages": {
      "heroImage": "https://r2.example.com/hero.jpg"
    },
    "lastUpdated": "2026-01-20T18:00:00Z"
  }
}
```

---

## API Endpoints

### POST /api/customization/save

Saves wedding customization to the database.

**Request Body:**
```json
{
  "weddingId": "uuid",
  "customization": {
    "themeId": "classic",
    "customPalette": { ... },
    "customContent": { ... },
    "customImages": { ... }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Customization saved successfully"
}
```

### GET /api/customization/get?weddingId=xxx

Fetches wedding customization from the database.

**Response:**
```json
{
  "customization": {
    "themeId": "classic",
    "customPalette": { ... },
    "customContent": { ... },
    "customImages": { ... },
    "lastUpdated": "2026-01-20T18:00:00Z"
  }
}
```

---

## Usage

### Accessing the Editor

1. Navigate to the admin dashboard: `/admin` or `/[slug]/admin`
2. Scroll to the "Thème" section
3. Click "Ouvrir l'éditeur" in the "Éditeur de site web avancé" card
4. You'll be redirected to `/admin/website-editor`

### Using the Editor

#### Theme Tab
1. Select a predefined theme (Classic or Luxe)
2. Changes apply immediately to the preview

#### Colors Tab
1. Click on a color picker to choose a new color
2. Or enter a hex code directly (#RRGGBB)
3. Click "Par défaut" to reset a color to the theme default
4. Click "Réinitialiser" to reset all colors

#### Content Tab
1. Navigate through section tabs (Hero, Welcome, About, etc.)
2. Edit text fields as needed
3. Character count updates in real-time
4. Click "Par défaut" to reset a field
5. Empty fields use the default text

#### Images Tab
1. Click "Télécharger" to upload a file
2. Or click "URL" to paste an image URL
3. Preview appears immediately
4. Click "Supprimer" to remove a custom image
5. Recommended dimensions are shown for each image

### Saving Changes

1. Make your desired changes across any tabs
2. An "unsaved changes" indicator appears at the bottom
3. Click "Enregistrer" in the top-right to save
4. Preview refreshes automatically after save
5. Click "Réinitialiser" to discard all changes

---

## Helper Functions

### mergeCustomPalette

Merges custom palette with theme colors.

```typescript
const merged = mergeCustomPalette(themeColors, customPalette);
```

### generateCustomizationCSS

Generates CSS variables for custom colors.

```typescript
const css = generateCustomizationCSS(theme, customPalette);
```

### getEffectiveContent

Gets content value with fallback.

```typescript
const title = getEffectiveContent(customContent, 'heroTitle', 'Default Title');
```

### getEffectiveImage

Gets image URL with fallback.

```typescript
const heroImage = getEffectiveImage(customImages, 'heroImage', '/default.jpg');
```

### extractCustomization

Extracts customization from wedding config.

```typescript
const customization = extractCustomization(wedding.config);
```

### createCustomizationProps

Creates props for React components.

```typescript
const props = createCustomizationProps(customization, 'classic');
// Returns: { effectiveTheme, customContent, customImages }
```

---

## Applying Customizations to Pages

Wedding pages automatically apply customizations using the helpers in `applyCustomization.ts`.

**Example** (from `/[slug]/index.astro`):

```astro
---
import {
  extractCustomization,
  createCustomizationProps,
  generateCustomizationCSS,
  getEffectiveContent,
} from '../../lib/applyCustomization';

const wedding = await getWeddingBySlugAsync(slug);
const { config } = wedding;
const themeId = config.theme.id || 'classic';

// Extract and apply customization
const customization = extractCustomization(config);
const { effectiveTheme, customContent, customImages } =
  createCustomizationProps(customization, themeId);

// Use custom content with fallbacks
const welcomeMessage = getEffectiveContent(
  customContent,
  'welcomeMessage',
  config.welcomeMessage || ''
);
---

<!-- Render with custom content -->
<p>{welcomeMessage}</p>

<!-- Apply custom styles -->
{customization?.customPalette && (
  <style is:inline set:html={
    generateCustomizationCSS(effectiveTheme, customization.customPalette)
  } />
)}
```

---

## Testing

### Test Coverage

- **customization.test.ts**: 21 tests ✅
  - Type validations
  - Helper functions
  - Color validation
  - URL validation

- **applyCustomization.test.ts**: 16 tests ✅
  - Customization extraction
  - Theme merging
  - CSS generation
  - Props creation

**Total**: 37 tests passing

### Running Tests

```bash
# Run all customization tests
npm test -- src/lib/customization.test.ts src/lib/applyCustomization.test.ts

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

---

## Future Enhancements

### Phase 2
- [ ] Font family selection
- [ ] Advanced typography controls (size, weight, spacing)
- [ ] Layout customization (card styles, border radius)
- [ ] Background patterns and gradients
- [ ] Animation preferences

### Phase 3
- [ ] Component visibility toggles
- [ ] Section reordering (drag-and-drop)
- [ ] Custom CSS injection (advanced users)
- [ ] Template presets (save & load)
- [ ] A/B testing for themes

### Phase 4
- [ ] AI-powered design suggestions
- [ ] Color harmony recommendations
- [ ] Accessibility checker (WCAG compliance)
- [ ] Mobile-specific customizations
- [ ] Export theme as downloadable package

---

## Troubleshooting

### Colors not applying
1. Check browser console for CSS errors
2. Ensure hex color format is valid (#RRGGBB)
3. Clear browser cache and reload
4. Check that customization was saved successfully

### Images not loading
1. Verify image URL is accessible
2. Check CORS settings for external images
3. Ensure R2 bucket permissions are correct
4. Check file size (max 10 MB)

### Preview not updating
1. Click "Actualiser" to force refresh
2. Check browser console for iframe errors
3. Ensure wedding slug is correct
4. Try opening in a new tab using the link

### Changes not saving
1. Check network tab for API errors
2. Verify Supabase connection
3. Check authentication status
4. Ensure database permissions are correct

---

## Performance Considerations

- **CSS Variables**: Used for dynamic theming (no page reload needed)
- **Lazy Loading**: Images loaded on-demand
- **Debouncing**: Text inputs debounced to reduce re-renders
- **Memoization**: React components use useMemo/useCallback where appropriate
- **Code Splitting**: Editor loaded separately from main bundle (26.70 kB gzipped)

---

## Security

- **Authentication**: Only wedding owners can access the editor
- **Validation**: All inputs validated on client and server
- **Sanitization**: User content sanitized to prevent XSS
- **File Upload**: File type and size validation
- **API**: CSRF protection, rate limiting (TODO)

---

## Accessibility

- **Keyboard Navigation**: All controls accessible via keyboard
- **ARIA Labels**: Proper labeling for screen readers
- **Color Contrast**: Validation for WCAG AA compliance (TODO)
- **Focus Indicators**: Clear focus states for all interactive elements

---

## Browser Support

- **Chrome**: 90+ ✅
- **Firefox**: 88+ ✅
- **Safari**: 14+ ✅
- **Edge**: 90+ ✅
- **Mobile**: iOS 14+, Android 8+ ✅

---

## Contributing

When adding new customization options:

1. Update types in `src/lib/customization.ts`
2. Add UI controls in appropriate editor component
3. Update `applyCustomization.ts` helpers
4. Write tests for new functionality
5. Update this documentation
6. Test on all supported browsers

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/anthropics/reflets-de-bonheur/issues
- Developer: Kevin
- Email: support@refletsDebonheur.com

---

*This feature represents a major enhancement to the Reflets de Bonheur platform, empowering clients to create truly unique and personalized wedding websites.*
