# Data Flow Architecture

## DataService Abstraction

All data operations go through `DataService` (`src/lib/services/dataService.ts`), which provides a unified API for both demo and production modes.

```
┌─────────────────────────────────────────────────────────────┐
│                      Components                              │
│  (GalleryGrid, AdminPanel, GuestbookContainer, etc.)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DataService                             │
│  - getMedia(), addMedia(), deleteMedia()                    │
│  - getAlbums(), createAlbum(), updateAlbum()                │
│  - getMessages(), addMessage()                              │
│  - getStatistics(), getSettings()                           │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────┐           ┌─────────────────────┐
│     Demo Mode       │           │  Production Mode    │
│  (localStorage +    │           │    (Supabase)       │
│   mockData.ts)      │           │                     │
└─────────────────────┘           └─────────────────────┘
```

## Mode Detection

```typescript
// Auto-detect based on Supabase configuration
const demoMode = !isSupabaseConfigured();

// Or explicit from props
new DataService({ demoMode: true, weddingId: 'w-001' });
```

## Available Methods

### Media Operations
```typescript
getMedia(): Promise<MediaItem[]>
addMedia(item: Omit<MediaItem, 'id'>): Promise<MediaItem>
deleteMedia(id: string): Promise<void>
uploadMedia(file: File, metadata: UploadMetadata): Promise<MediaItem>
uploadMediaBatch(files: FileList, metadata: UploadMetadata): Promise<MediaItem[]>
```

### Album Operations
```typescript
getAlbums(): Promise<Album[]>
createAlbum(name: string, description?: string): Promise<Album>
updateAlbum(id: string, updates: Partial<Album>): Promise<Album>
deleteAlbum(id: string): Promise<void>
```

### Guestbook Operations
```typescript
getMessages(): Promise<GuestbookMessage[]>
addMessage(message: Omit<GuestbookMessage, 'id' | 'createdAt'>): Promise<GuestbookMessage>
deleteMessage(id: string): Promise<void>
```

### Reactions & Favorites
```typescript
getReactions(mediaId: string): Promise<Reaction[]>
toggleReaction(mediaId: string, emoji: string): Promise<void>
getUserReaction(mediaId: string): Promise<string | null>
getFavorites(): Promise<string[]>
toggleFavorite(mediaId: string): Promise<boolean>
isFavorited(mediaId: string): Promise<boolean>
```

### Statistics & Settings
```typescript
getStatistics(): Promise<WeddingStatistics>
getSettings(): GallerySettings
updateSettings(settings: Partial<GallerySettings>): void
```

## Database Schema (Supabase)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  auth.users  │────▶│   profiles   │────▶│   weddings   │
│              │     │              │     │              │
│  - id        │     │  - id (FK)   │     │  - id        │
│  - email     │     │  - plan      │     │  - owner_id  │
│  - password  │     │  - status    │     │  - slug      │
└──────────────┘     └──────────────┘     │  - config    │
                                          │  - pin_code  │
                                          └──────┬───────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
                    ▼                            ▼                            ▼
          ┌──────────────┐            ┌──────────────┐            ┌──────────────┐
          │    media     │            │  guestbook_  │            │    rsvp      │
          │              │            │   messages   │            │              │
          │  - id        │            │              │            │  - id        │
          │  - wedding_id│            │  - id        │            │  - wedding_id│
          │  - type      │            │  - wedding_id│            │  - name      │
          │  - url       │            │  - author    │            │  - attendance│
          │  - caption   │            │  - message   │            │  - plus_one  │
          └──────┬───────┘            └──────────────┘            └──────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  reactions   │  │  favorites   │
│              │  │              │
│  - media_id  │  │  - media_id  │
│  - user_id   │  │  - user_id   │
│  - emoji     │  └──────────────┘
└──────────────┘
```

## Media Storage (Cloudflare R2)

### Upload Flow
```
1. Client requests presigned URL
   POST /api/upload/presign
   { weddingId, filename, contentType }

2. Server generates presigned URL
   → Returns { uploadUrl, key }

3. Client uploads directly to R2
   PUT {uploadUrl}
   Body: file data

4. Client confirms upload
   POST /api/upload/confirm
   { weddingId, key, caption }

5. Server creates database record
   → Returns MediaItem
```

### Storage Structure
```
weddings/
└── {weddingId}/
    └── media/
        └── {timestamp}-{random}-{filename}.{ext}
```

## localStorage Keys

| Key | Purpose | Scope |
|-----|---------|-------|
| `reflets_client_token` | Client auth token | Global |
| `reflets_client_session` | Client session data | Global |
| `reflets_guest_session` | Guest session data | Global |
| `reflets_is_admin` | Admin flag (demo) | Global |
| `wedding_preview_customization` | Live preview sync | Temporary |
| `wedding_customization_{slug}` | Demo mode persistence | Per-wedding |
| `demo_media` | Demo mode media | Global |
| `demo_messages` | Demo mode messages | Global |
| `demo_albums` | Demo mode albums | Global |

## State Management

### Component-Level State
Most state is managed within components using React hooks:
```tsx
const [media, setMedia] = useState<MediaItem[]>([]);
const [loading, setLoading] = useState(true);
```

### Shared State via Props
Parent components pass DataService and callbacks to children:
```tsx
<GalleryGrid
  dataService={dataService}
  onMediaDelete={handleDelete}
/>
```

### Cross-Component via localStorage
For editor ↔ preview communication:
```tsx
// Write
localStorage.setItem(KEY, JSON.stringify(data));

// Read (with listener)
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    setData(JSON.parse(e.newValue));
  }
});
```

---

*Last updated: January 21, 2026*
