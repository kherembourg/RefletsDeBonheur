---
title: "fix: Website Editor Live Preview"
type: fix
date: 2026-01-29
complexity: low
estimated_changes: ~30 lines
---

# fix: Website Editor Live Preview

Le preview du Website Editor ne se met pas à jour en temps réel. Actuellement, l'utilisateur doit cliquer "Save" pour voir les changements dans l'iframe.

## Acceptance Criteria

- [x] Preview se rafraîchit automatiquement 500ms après chaque changement de customization
- [x] Overlay semi-transparent avec spinner pendant le chargement de l'iframe
- [x] Pas de flickering excessif (debounce empêche les reloads répétés)
- [x] Fonctionne pour tous les types : thème, couleurs, contenu, images
- [x] Fonctionnalité "Save" existante inchangée
- [x] Tests unitaires pour le debounce et loading state

## Context

**Problème actuel** : `previewKey` est seulement incrémenté après un save réussi (`WebsiteEditor.tsx:214`).

**Solution** : Ajouter un `useEffect` qui debounce les changements de `customization` et trigger un reload de l'iframe.

**Patterns existants à réutiliser** :
- Debounce pattern : `WebsiteEditor.tsx:170-194`
- Loader2 spinner : déjà importé et utilisé dans le composant
- previewKey mechanism : `WebsiteEditor.tsx:59,214,453`

## Implementation

### WebsiteEditor.tsx

**1. Ajouter state pour loading** (~ligne 60) :

```typescript
const [isPreviewLoading, setIsPreviewLoading] = useState(false);
```

**2. Ajouter useEffect pour debounced preview reload** (après ligne 194) :

```typescript
// Debounce customization changes → trigger preview reload
useEffect(() => {
  // Skip initial render
  if (!initialCustomization) return;

  const timer = setTimeout(() => {
    setPreviewKey((prev) => prev + 1);
  }, 500);

  return () => clearTimeout(timer);
}, [customization]);
```

**3. Ajouter useEffect pour loading state** :

```typescript
// Set loading when preview key changes
useEffect(() => {
  setIsPreviewLoading(true);
}, [previewKey]);
```

**4. Ajouter handler pour iframe onLoad** :

```typescript
const handleIframeLoad = useCallback(() => {
  setIsPreviewLoading(false);
}, []);
```

**5. Modifier le rendu de l'iframe** (~ligne 452) :

```tsx
{/* Preview Panel */}
<div className="flex-1 bg-[#1a1a1a] p-4 overflow-hidden relative">
  {/* ... existing device frame wrapper ... */}
  <div className="relative w-full h-full">
    <iframe
      key={previewKey}
      ref={iframeRef}
      src={`/${weddingSlug}?preview=true&t=${Date.now()}`}
      onLoad={handleIframeLoad}
      className="w-full h-full bg-white"
      style={{
        height: devicePreview !== 'desktop' ? 'calc(100% - 24px)' : '100%'
      }}
      title="Aperçu du site"
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
    />

    {/* Loading overlay */}
    {isPreviewLoading && (
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )}
  </div>
</div>
```

## Testing

### WebsiteEditor.test.tsx (nouveaux tests)

```typescript
describe('Live Preview', () => {
  it('reloads preview after 500ms debounce when customization changes', async () => {
    // Setup with initial customization
    // Change customization
    // Verify previewKey increments after 500ms
  });

  it('shows loading overlay when preview is reloading', () => {
    // Trigger preview reload
    // Verify overlay with Loader2 is visible
  });

  it('hides loading overlay when iframe loads', () => {
    // Trigger preview reload
    // Fire iframe onLoad event
    // Verify overlay is hidden
  });

  it('cancels pending reload when customization changes again', () => {
    // Change customization
    // Change again before 500ms
    // Verify only one reload happens
  });
});
```

## Files Changed

| File | Changes |
|------|---------|
| `src/components/admin/WebsiteEditor.tsx` | +30 lines (state, effects, UI) |
| `src/components/admin/WebsiteEditor.test.tsx` | +40 lines (4 nouveaux tests) |

## References

- Brainstorm: `docs/brainstorms/2026-01-29-website-editor-live-preview-brainstorm.md`
- Known issue documented in `CLAUDE.md` section "Website Editor"
- Existing debounce pattern: `WebsiteEditor.tsx:170-194`
