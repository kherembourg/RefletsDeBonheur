# Reflets de Bonheur

*Plateforme SaaS de galerie photo et site web de mariage*

---

## Vision du Produit

Plateforme SaaS B2C permettant aux futurs mariés de :
- **Collecter** photos et vidéos des invités en haute qualité
- **Créer** un site web personnalisé pour leur mariage
- **Partager** un livre d'or numérique

**Offre:** 99€ pour 2 ans d'hébergement | Renouvellement optionnel: 19,99€/an

---

## Quick Start

```bash
# Installation
npm install

# Serveur de développement
npm run dev

# Build production
npm run build
```

Visiter `http://localhost:4321`

### Codes d'accès (Demo)
- **Invité:** `MARIAGE2026`
- **Admin:** `ADMIN123`

---

## Stack Technique

| Catégorie | Technologie | Status |
|-----------|-------------|--------|
| **Framework** | Astro 5.16 (Hybrid SSG/SSR) | Actif |
| **UI Library** | React 18 | Actif |
| **Styling** | TailwindCSS 3.4 | Actif |
| **Icons** | Lucide React | Actif |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) | Planifié |
| **Stockage** | Cloudflare R2 | Planifié |
| **Transcodage** | Google Cloud Run + FFmpeg | Planifié |
| **Paiement** | Stripe | Planifié |

---

## Fonctionnalités Actuelles

### Pages
- **Landing Page** - Page d'accueil marketing avec CTA et design luxe
- **Galerie** - Grille masonry avec upload, filtres, lightbox, décorations florales
- **Livre d'Or** - Messages style "carte de vœux" avec bordures ondulées
- **Admin** - Tableau de bord élégant avec statistiques, QR codes, albums
- **Tarification** - Plans et pricing (multilingue FR/EN/ES)
- **Pages légales** - Mentions légales, CGV, Politique de confidentialité
- **Sites de mariage** - Pages dynamiques `/julie-thomas`, `/marie-pierre` avec thèmes Classic et Luxe

### Features
- PWA installable (mode hors-ligne)
- Thème sombre/clair
- Responsive mobile-first
- Système de favoris
- Téléchargement en lot (ZIP)
- Réactions sur les photos
- Diaporama automatique
- Générateur de QR codes
- Statistiques d'usage
- **Démo fonctionnelle** - Upload et livre d'or persistants (localStorage)
- **Design luxe** - Décorations florales SVG, typographie script, dividers élégants
- **i18n** - Support multilingue (FR/EN/ES) pour le marketing

---

## Structure du Projet

```
reflets-de-bonheur/
├── src/
│   ├── components/
│   │   ├── admin/       # Composants admin (stats, albums, QR, thèmes)
│   │   ├── auth/        # Authentification
│   │   ├── decorative/  # Éléments décoratifs (FloralDecoration.astro)
│   │   ├── gallery/     # Galerie (cards, lightbox, upload)
│   │   ├── guestbook/   # Livre d'or (cartes style voeux)
│   │   ├── layout/      # Header, Footer
│   │   ├── pwa/         # Install prompt
│   │   ├── ui/          # Composants réutilisables
│   │   └── wedding/     # Pages mariage (Hero, Layout, Timeline, RSVP)
│   ├── layouts/
│   │   ├── MainLayout.astro    # Layout marketing
│   │   └── WeddingLayout.astro # Layout sites de mariage
│   ├── lib/
│   │   ├── api.ts         # Mock API (upload, guestbook)
│   │   ├── auth.ts        # Gestion auth
│   │   ├── demoStorage.ts # Persistance démo (localStorage)
│   │   ├── mockData.ts    # Données mock + initialiseur
│   │   ├── themes.ts      # Système de thèmes
│   │   ├── types.ts       # Types TypeScript
│   │   └── weddingData.ts # Config mariages démo
│   ├── pages/
│   │   ├── [slug]/        # Routes dynamiques mariage
│   │   ├── fr/, en/, es/  # Pages multilingues
│   │   └── *.astro        # Pages statiques
│   └── styles/          # Global CSS, Tailwind, animations
├── public/
│   ├── icons/           # PWA icons
│   └── manifest.json    # PWA manifest
└── *.md                 # Documentation
```

---

## Palette de Couleurs

```css
--burgundy: #ae1725        /* Accent principal */
--burgundy-light: #c92a38  /* Hover states */
--ivory: #FFFFF0           /* Background clair */
--deep-charcoal: #2C2C2C   /* Texte principal */
--silver-mist: #C0C0C0     /* Éléments secondaires */
--pearl-white: #F8F6F0     /* Background sections */
--warm-taupe: #9B8B80      /* Texte secondaire */
--cream: #F5F0E8           /* CTA backgrounds */
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [ROADMAP.md](./ROADMAP.md) | Fonctionnalités à implémenter |
| [USER-GUIDE.md](./USER-GUIDE.md) | Guide utilisateur invité |
| [ADMIN-GUIDE.md](./ADMIN-GUIDE.md) | Guide administrateur |
| [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | Guide de déploiement |
| [QUICK-START.md](./QUICK-START.md) | Démarrage rapide |
| [PWA-IMPLEMENTATION.md](./PWA-IMPLEMENTATION.md) | Détails PWA |
| [PROFITABILITY-ANALYSIS.md](./PROFITABILITY-ANALYSIS.md) | Analyse rentabilité |

---

## Commandes

```bash
npm run dev        # Serveur de développement
npm run build      # Build production
npm run preview    # Prévisualiser le build
npx astro check    # Vérification TypeScript
```

---

## Licence

Propriétaire - Tous droits réservés

---

**Reflets de Bonheur** - 2026
