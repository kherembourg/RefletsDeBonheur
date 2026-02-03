# ROADMAP - Reflets de Bonheur

*Plan d'implémentation basé sur les spécifications techniques*

---

## Statut Actuel

### Implémenté (Frontend/Mock)
- [x] Landing page marketing
- [x] Page tarification (multilingue FR/EN/ES)
- [x] Galerie photos avec upload (mock + persistance localStorage)
- [x] Livre d'or (mock + persistance localStorage)
- [x] Panel admin avec statistiques (mock)
- [x] PWA installable + mode hors-ligne
- [x] Thème sombre/clair
- [x] Lightbox avec navigation
- [x] Diaporama
- [x] Système de favoris (localStorage)
- [x] Réactions sur photos (mock)
- [x] Téléchargement ZIP
- [x] Générateur QR codes
- [x] Pages légales (CGV, mentions, confidentialité)
- [x] **Sites de mariage personnalisés** (pages dynamiques /julie-thomas, /marie-pierre)
- [x] **Thèmes de mariage** (Classic et Luxe)
- [x] **Design luxe** (décorations florales SVG, typographie script)
- [x] **Démo fonctionnelle** (uploads et messages persistants)
- [x] **i18n marketing** (FR/EN/ES)

### Implémenté (Backend)
- [x] **Authentification Supabase** (mariés + invités + god admin)
- [x] **Base de données PostgreSQL** (Supabase)
- [x] **Stockage Cloudflare R2** (presigned URLs)
- [x] **Système RSVP fonctionnel** (custom questions, responses viewer)
- [x] **Modération avec persistance** (admin can delete content)
- [x] **Paiement Stripe** (checkout, webhook, security) - **⚠️ NOT wired into signup flow**
- [x] **Gestion multi-tenant** (profiles, weddings, god admin impersonation)

### Non Implémenté (À venir)
- [ ] Upload resumable (TUS/Uppy) - current: basic multipart upload
- [ ] Transcodage vidéo (Cloud Run + FFmpeg) - current: direct video upload
- [ ] Live Wall temps réel (Supabase Realtime) - current: manual refresh
- [ ] Géo-fencing - planned feature
- [ ] Email notifications (welcome, uploads) - **CRITICAL for launch**
- [ ] Image thumbnails & optimization - **CRITICAL for performance**

---

## Phase 1: Site Web de Mariage

**Objectif:** Permettre aux mariés de créer un site web personnalisé pour leur mariage.

### Pages à créer

```
/[slug]/                    # Page d'accueil du mariage
/[slug]/photos              # Galerie du mariage
/[slug]/livre-or            # Livre d'or
/[slug]/infos               # Infos pratiques (lieu, programme)
/[slug]/rsvp                # Formulaire RSVP
```

### Composants à créer

```
src/components/wedding/
├── WeddingHeader.astro     # En-tête personnalisé (noms, date)
├── WeddingHero.tsx         # Hero avec photo des mariés
├── WeddingInfo.tsx         # Programme, lieu, hébergement
├── WeddingCountdown.tsx    # Compte à rebours
├── WeddingRSVP.tsx         # Formulaire RSVP
├── WeddingTimeline.tsx     # Timeline de la journée
└── WeddingTheme.tsx        # Gestion du thème personnalisé
```

### Configuration par mariage (JSONB)

```typescript
interface WeddingConfig {
  // Identité
  brideName: string;
  groomName: string;
  weddingDate: Date;

  // Lieu
  venue: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    mapUrl?: string;
  };

  // Programme
  timeline: Array<{
    time: string;
    title: string;
    description?: string;
    icon?: string;
  }>;

  // Personnalisation
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    heroImage?: string;
  };

  // Features activées
  features: {
    rsvp: boolean;
    guestbook: boolean;
    photoGallery: boolean;
    liveWall: boolean;
    geoFencing: boolean;
  };

  // Modération
  moderation: {
    enabled: boolean;
    autoApprove: boolean;
  };
}
```

---

## Phase 2: Backend Supabase

### Schéma de Base de Données

#### Table: `profiles` (Mariés)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  subscription_end_date TIMESTAMP
);
```

#### Table: `weddings` (Événements)
```sql
CREATE TABLE weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  date DATE,
  pin_code VARCHAR(4),
  magic_token TEXT UNIQUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_weddings_slug ON weddings(slug);
CREATE INDEX idx_weddings_magic_token ON weddings(magic_token);
```

#### Table: `media` (Photos & Vidéos)
```sql
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  guest_identifier TEXT,
  type VARCHAR(10) CHECK (type IN ('image', 'video')),
  original_url TEXT,
  optimized_url TEXT,
  thumbnail_url TEXT,
  status VARCHAR(20) DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  moderation_status VARCHAR(20) DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_wedding ON media(wedding_id);
CREATE INDEX idx_media_status ON media(status);
```

#### Table: `guestbook_messages` (Livre d'Or)
```sql
CREATE TABLE guestbook_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  relation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `guests_rsvp` (Réponses RSVP)
```sql
CREATE TABLE guests_rsvp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  attendance VARCHAR(10) CHECK (attendance IN ('yes', 'no', 'maybe')),
  plus_one BOOLEAN DEFAULT FALSE,
  dietary_restrictions TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `reactions` (Réactions photos)
```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  guest_identifier TEXT,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(media_id, guest_identifier, emoji)
);
```

### Row Level Security (RLS)

```sql
-- Politique: Les invités peuvent voir le media approuvé
CREATE POLICY "Guests can view approved media"
  ON media FOR SELECT
  USING (moderation_status = 'approved' AND status = 'ready');

-- Politique: Les propriétaires peuvent tout voir
CREATE POLICY "Owners can view all their wedding media"
  ON media FOR SELECT
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );
```

---

## Phase 3: Stockage & Upload

### Cloudflare R2 Setup

```
Buckets:
├── temp-uploads/     # Uploads en cours
├── final-media/      # Fichiers traités
│   ├── originals/    # Fichiers originaux (accès admin)
│   ├── optimized/    # Versions compressées
│   └── thumbnails/   # Miniatures
```

### Upload Resumable (TUS)

```typescript
// src/lib/upload.ts
import Uppy from '@uppy/core';
import Tus from '@uppy/tus';

export function createUploader(weddingId: string) {
  return new Uppy({
    restrictions: {
      maxFileSize: 500 * 1024 * 1024, // 500MB
      allowedFileTypes: ['image/*', 'video/*'],
    },
  })
  .use(Tus, {
    endpoint: '/api/upload',
    chunkSize: 5 * 1024 * 1024, // 5MB chunks
    retryDelays: [0, 1000, 3000, 5000],
  });
}
```

### API Route: Presigned URL

```typescript
// src/pages/api/upload/presign.ts
export async function POST({ request }) {
  const { filename, contentType, weddingId } = await request.json();

  // Générer presigned URL pour R2
  const url = await generatePresignedUrl({
    bucket: 'temp-uploads',
    key: `${weddingId}/${Date.now()}-${filename}`,
    contentType,
    expiresIn: 3600,
  });

  return new Response(JSON.stringify({ url }));
}
```

---

## Phase 4: Transcodage Vidéo

### Cloud Run Service

```dockerfile
# Dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y ffmpeg
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "index.js"]
```

### FFmpeg Command

```bash
ffmpeg -i input \
  -vcodec libx264 \
  -crf 23 \
  -preset medium \
  -acodec aac \
  -movflags +faststart \
  output.mp4
```

### Workflow

```
1. Upload terminé sur R2 (temp-uploads/)
2. Webhook déclenche Cloud Run
3. Cloud Run télécharge le fichier
4. FFmpeg transcode
5. Upload vers final-media/
6. Mise à jour DB: status = 'ready'
7. Notification Supabase Realtime
```

---

## Phase 5: Authentification Invité

### Flow Token Magique

```
URL: monsite.com/julie-thomas?token=XYZ123

1. Extraire le token de l'URL
2. Vérifier en DB: weddings.magic_token = token
3. Si valide: créer session invité (cookie)
4. Rediriger vers la galerie
```

### Flow PIN Code (Fallback)

```
1. Pas de token dans l'URL
2. Afficher clavier numérique
3. Invité entre le code 4 chiffres
4. Vérifier: weddings.pin_code = input
5. Rate limit: 5 tentatives max (Cloudflare WAF)
```

### Composant Auth Invité

```typescript
// src/components/auth/GuestAuth.tsx
export function GuestAuth({ weddingSlug }: { weddingSlug: string }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    const res = await fetch('/api/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ slug: weddingSlug, pin }),
    });

    if (res.ok) {
      window.location.reload();
    } else {
      setError('Code incorrect');
    }
  }

  return (
    <div className="pin-pad">
      <PinInput value={pin} onChange={setPin} length={4} />
      <button onClick={handleSubmit}>Entrer</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

---

## Phase 6: Live Wall (Temps Réel)

### Supabase Realtime

```typescript
// src/lib/realtime.ts
import { createClient } from '@supabase/supabase-js';

export function subscribeToMedia(weddingId: string, onNewMedia: (media) => void) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  return supabase
    .channel(`wedding:${weddingId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'media',
        filter: `wedding_id=eq.${weddingId}`,
      },
      (payload) => {
        if (payload.new.status === 'ready' && payload.new.moderation_status === 'approved') {
          onNewMedia(payload.new);
        }
      }
    )
    .subscribe();
}
```

### Composant Live Wall

```typescript
// src/components/gallery/LiveWall.tsx
export function LiveWall({ weddingId }: { weddingId: string }) {
  const [media, setMedia] = useState<Media[]>([]);

  useEffect(() => {
    const subscription = subscribeToMedia(weddingId, (newMedia) => {
      setMedia(prev => [newMedia, ...prev]);
    });

    return () => subscription.unsubscribe();
  }, [weddingId]);

  return (
    <div className="live-wall">
      <div className="live-indicator">
        <span className="pulse" /> En direct
      </div>
      <div className="grid">
        {media.map(item => (
          <MediaCard key={item.id} media={item} animate />
        ))}
      </div>
    </div>
  );
}
```

---

## Phase 7: Paiement & Onboarding

### Flow Stripe

```
1. Mariés cliquent "Commander" sur /tarification
2. Redirect vers Stripe Checkout (99€)
3. Webhook Stripe confirme paiement
4. Création compte Supabase Auth
5. Création entrée weddings avec slug choisi
6. Email de bienvenue avec lien admin
7. Redirect vers /admin/setup (wizard configuration)
```

### Wizard de Configuration

```
Étape 1: Informations de base
  - Noms des mariés
  - Date du mariage
  - URL personnalisée (slug)

Étape 2: Lieu & Programme
  - Adresse du lieu
  - Timeline de la journée

Étape 3: Personnalisation
  - Couleur du thème
  - Photo de couverture
  - Message de bienvenue

Étape 4: Sécurité
  - Code PIN pour invités
  - Activer/désactiver modération
  - Activer/désactiver géo-fencing

Étape 5: Aperçu & Publication
  - Preview du site
  - Bouton "Publier"
```

---

## Priorités d'Implémentation

| Phase | Feature | Priorité | Effort |
|-------|---------|----------|--------|
| 1 | Site web de mariage (pages, routing) | HAUTE | 2-3 jours |
| 2 | Supabase Auth + Database | HAUTE | 2 jours |
| 3 | Stockage R2 + Upload basique | HAUTE | 1-2 jours |
| 4 | Upload resumable (TUS) | MOYENNE | 1 jour |
| 5 | Transcodage vidéo | MOYENNE | 2 jours |
| 6 | Live Wall temps réel | MOYENNE | 1 jour |
| 7 | Auth invité (PIN/Token) | HAUTE | 1 jour |
| 8 | Système RSVP | BASSE | 1 jour |
| 9 | Paiement Stripe | HAUTE | 1-2 jours |
| 10 | Géo-fencing | BASSE | 0.5 jour |

---

## Prochaines Étapes Immédiates

### Production Ready (Priorité HAUTE)

1. **Configurer Supabase**
   - Créer le projet Supabase
   - Implémenter le schéma de base de données (voir Phase 2)
   - Configurer l'authentification (mariés + invités)
   - Remplacer mockData par appels API réels

2. **Configurer Cloudflare R2**
   - Créer les buckets (temp-uploads, final-media)
   - Implémenter les presigned URLs
   - Remplacer les data URLs par du vrai stockage

3. **Authentification invités**
   - Implémenter le flow PIN code
   - Implémenter le flow token magique
   - Sécuriser les routes `/[slug]/*`

4. **Paiement Stripe**
   - Configurer Stripe Checkout (99€)
   - Implémenter les webhooks
   - Créer le wizard d'onboarding post-paiement

### Déjà Implémenté (Janvier 2026)

- [x] Pages dynamiques `/[slug]` avec routing Astro
- [x] Composants Wedding (Hero, Timeline, Info, RSVP mock)
- [x] Thèmes Classic et Luxe
- [x] Démo fonctionnelle avec localStorage
- [x] Design luxe cohérent sur toutes les pages
- [x] Décorations florales SVG
- [x] i18n marketing (FR/EN/ES)

---

## Notes Techniques

### Démo Storage (demoStorage.ts)
La démo utilise localStorage pour persister:
- **Media uploads**: Convertis en data URLs compressés
- **Messages guestbook**: JSON sérialisé
- **Initialisé** au chargement via `initializeDemoData()`

### Thèmes de Mariage
- **Classic**: Design épuré avec décorations florales
- **Luxe**: Style premium avec polices script élégantes

### Design System
- Police script: Great Vibes (noms des mariés)
- Police serif: Cormorant Garamond (titres)
- Police sans: Montserrat (corps de texte)
- Couleur accent: #ae1725 (bordeaux)

---

*Dernière mise à jour: 18 Janvier 2026*
