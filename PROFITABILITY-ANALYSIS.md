# Analyse de Rentabilité - Reflets de Bonheur

**Date**: 17 janvier 2026
**Modèle**: SaaS B2C (Mariages)
**Tarif Initial**: 99€ pour 2 ans (49,50€/an)
**Renouvellement**: 19,99€/an (lecture seule, sans nouveaux uploads)
**Inclus**: 1 domaine personnalisé + tous les services

---

## 📊 Résumé Exécutif

| Métrique | Valeur |
|----------|--------|
| **Prix initial** | 99€ pour 2 ans |
| **Renouvellement** | 19,99€/an (optionnel) |
| **Coût par client (2 ans)** | ~21€ |
| **Marge initiale (2 ans)** | ~78€ |
| **Marge renouvellement** | ~17€/an |
| **Marge (%)** | 79% initial, 85% renouvellement |
| **Seuil de rentabilité** | 50-60 clients |
| **Verdict** | ✅ **TRÈS RENTABLE** |

---

## 💰 Structure des Coûts (par client/an)

### 1. **Hébergement & Infrastructure**

#### Option A: Cloudflare (Recommandé pour scale)
```
Cloudflare Pages       : Gratuit (0€)
Cloudflare R2 Storage  : 0,015€/GB/mois
  → 5 GB/client (estimation haute) = 0,075€/mois × 12 = 0,90€/an
Cloudflare D1 Database : 5M lectures/mois gratuites
  → Largement suffisant pour 1 client = 0€/an
Cloudflare KV         : 1M opérations/mois gratuites = 0€/an

TOTAL HÉBERGEMENT: 0,90€/client/an
```

#### Option B: Netlify/Vercel
```
Netlify/Vercel        : Gratuit jusqu'à 100GB bande passante/mois
  → Par client: ~5GB/mois = 0€/an (dans le forfait gratuit)
  → Au-delà de 20 clients, passer au plan Pro: 19$/mois = 228€/an
    → Coût par client (20 clients): 11,40€/an

TOTAL HÉBERGEMENT: 0€ (< 20 clients) ou 11,40€/client (> 20 clients)
```

**Choix optimal**: Cloudflare = **0,90€/client/an**

---

### 2. **Nom de Domaine (inclus dans l'offre)**

```
Domaine .com/.fr chez Cloudflare : 10,03€/an (wholesale price)
Domaine .fr chez OVH             : 8,99€/an + TVA
Domaine .com chez Cloudflare     : 10,18€/an

Coût moyen: 10€/an par domaine

TOTAL DOMAINE: 10€/client/an
```

**Note**: Si le client choisit un sous-domaine gratuit (ex: marie-thomas.reflets-bonheur.fr), coût = 0€

**Estimation**: 70% prennent domaine personnalisé, 30% sous-domaine
- Coût moyen: 10€ × 0,70 = **7€/client/an**

---

### 3. **SSL/HTTPS**

```
Cloudflare SSL        : Gratuit (certificat automatique)
Let's Encrypt         : Gratuit
Netlify/Vercel SSL    : Gratuit (inclus)

TOTAL SSL: 0€/client/an
```

---

### 4. **CDN & Bande Passante**

```
Cloudflare CDN        : Gratuit (illimité)
Netlify/Vercel CDN    : Gratuit jusqu'à 100GB/mois

Estimation par client:
- Trafic mensuel: 5 GB (50 visiteurs × 100 MB)
- Avec Cloudflare: 0€

TOTAL CDN: 0€/client/an
```

---

### 5. **Backup & Stockage**

```
Cloudflare R2:
- Stockage: 0,015€/GB/mois
- Par client: 5 GB moyenne (200 photos × 3 MB + 5 vidéos × 50 MB)
- Coût: 5 GB × 0,015€ × 12 mois = 0,90€/an

TOTAL BACKUP: 0,90€/client/an
```

---

### 6. **Email Transactionnel** (optionnel)

```
Resend (email service):
- 3 000 emails/mois gratuits
- Par client: ~50 emails/mois (notifications, RSVP, etc.)
- 100 clients × 50 emails = 5 000 emails/mois
- Au-delà de 3 000: 1€/1 000 emails
- Coût: 2 000 emails × 1€/1 000 = 2€/mois = 24€/an
- Par client (100 clients): 0,24€/an

TOTAL EMAIL: 0€ (< 60 clients) ou 0,24€/client (> 60 clients)
```

---

### 7. **Monitoring & Analytics** (optionnel)

```
Google Analytics      : Gratuit
Cloudflare Analytics  : Gratuit (inclus)
Uptime monitoring     : Gratuit (UptimeRobot 50 moniteurs)

TOTAL MONITORING: 0€/client/an
```

---

## 📈 Coût Total par Client

### Scénario Bas (< 20 clients, infrastructure gratuite)
```
Hébergement (Cloudflare)    : 0,90€
Domaine (70% personnalisé)  : 7,00€
SSL                         : 0€
CDN                         : 0€
Backup                      : 0,90€
Email                       : 0€
Monitoring                  : 0€

TOTAL: 8,80€/client/an
```

### Scénario Moyen (20-100 clients)
```
Hébergement (Cloudflare)    : 0,90€
Domaine (70% personnalisé)  : 7,00€
SSL                         : 0€
CDN                         : 0€
Backup                      : 0,90€
Email                       : 0,24€
Monitoring                  : 0€

TOTAL: 10,04€/client/an
```

### Scénario Haut (> 100 clients, infrastructure payante)
```
Hébergement (Cloudflare)    : 0,90€
Domaine (70% personnalisé)  : 7,00€
SSL                         : 0€
CDN                         : 0€
Backup                      : 0,90€
Email (Resend)              : 0,50€
Monitoring                  : 0€
Support tooling (Sentry)    : 0,30€

TOTAL: 10,60€/client/an
```

---

## 💵 Analyse de Marge

### Marge Brute par Client

| Scénario | Coût | Revenu | Marge Brute | Marge (%) |
|----------|------|--------|-------------|-----------|
| **Bas (< 20 clients)** | 8,80€ | 99€ | **90,20€** | **91%** |
| **Moyen (20-100)** | 10,04€ | 99€ | **88,96€** | **90%** |
| **Haut (> 100)** | 10,60€ | 99€ | **88,40€** | **89%** |

**Conclusion**: Marges exceptionnelles de 89-91% ! 🎉

---

## 🎯 Seuil de Rentabilité

### Coûts Fixes (mensuel)
```
Développement/maintenance   : 40h/mois × 50€/h = 2 000€
Marketing (SEO, Ads)        : 500€/mois
Support client              : 300€/mois (10h × 30€/h)
Outils (design, analytics)  : 50€/mois
Frais juridiques/compta     : 150€/mois

TOTAL COÛTS FIXES: 3 000€/mois = 36 000€/an
```

### Nombre de Clients Nécessaires

```
Seuil de rentabilité = Coûts fixes / Marge brute par client

Avec marge de 88,96€/client:
36 000€ / 88,96€ = 405 clients/an

Répartition mensuelle:
405 / 12 = 34 clients/mois à acquérir
```

**Cependant**, si vous êtes solo et réduisez les coûts fixes:

```
Coûts fixes réduits:
- Développement: 0€ (vous le faites)
- Marketing: 200€/mois (SEO organique + Ads)
- Support: 0€ (vous le faites)
- Outils: 30€/mois
- Compta: 100€/mois

TOTAL: 330€/mois = 3 960€/an

Seuil: 3 960€ / 88,96€ = 45 clients/an
ou 4 clients/mois
```

---

## 📊 Projections de Revenus

### Année 1 (Croissance Progressive)

| Mois | Nouveaux Clients | Clients Actifs | MRR | ARR |
|------|------------------|----------------|-----|-----|
| M1 | 5 | 5 | 41€ | 495€ |
| M2 | 8 | 13 | 107€ | 1 287€ |
| M3 | 12 | 25 | 206€ | 2 475€ |
| M6 | 20 | 95 | 783€ | 9 405€ |
| M9 | 30 | 215 | 1 773€ | 21 285€ |
| M12 | 40 | 380 | 3 135€ | 37 620€ |

**Chiffre d'affaires Année 1**: ~37 620€
**Coûts variables**: 380 × 10€ = 3 800€
**Coûts fixes (réduits)**: 3 960€
**Bénéfice net**: 37 620€ - 3 800€ - 3 960€ = **29 860€**

---

### Année 2 (Stabilisation)

Hypothèse: Taux de rétention 70% (mariages = usage temporaire)

| Trimestre | Nouveaux | Désabonnés | Actifs | Revenu Trimestriel |
|-----------|----------|------------|--------|--------------------|
| Q1 | 120 | 115 | 385 | 9 529€ |
| Q2 | 130 | 110 | 405 | 10 022€ |
| Q3 | 140 | 120 | 425 | 10 515€ |
| Q4 | 150 | 125 | 450 | 11 138€ |

**Chiffre d'affaires Année 2**: ~41 204€
**Coûts variables**: 450 × 10€ = 4 500€
**Coûts fixes**: 3 960€
**Bénéfice net**: 41 204€ - 4 500€ - 3 960€ = **32 744€**

---

### Année 3+ (Croissance Mature)

Avec 500 clients actifs:
```
Revenu annuel: 500 × 99€ = 49 500€
Coûts variables: 500 × 10,60€ = 5 300€
Coûts fixes: 4 500€ (scaling up support)
Bénéfice net: 49 500€ - 5 300€ - 4 500€ = 39 700€
```

---

## 🎯 Optimisations pour Augmenter la Marge

### 1. **Réduire le coût du domaine**
- Proposer sous-domaine par défaut (0€ au lieu de 10€)
- Domaine personnalisé = option à 20€/an supplémentaires
- **Nouvelle marge**: 99€ - 3,60€ = **95,40€** (96% de marge)

### 2. **Offres premium (upsell)**
```
Forfait Pro (199€/an):
- 3 domaines inclus
- Stockage illimité haute priorité
- Support prioritaire
- Analytics avancés
- Branding personnalisé complet

Coût supplémentaire: ~15€
Marge: 199€ - 25€ = 174€
```

### 3. **Services additionnels**
```
- Photographie professionnelle: 500€ (one-time)
- Vidéaste partenaire: 800€ (commission 20% = 160€)
- Design graphique (invitations): 100€
- Impression QR codes: 50€

Revenu additionnel potentiel: 200€/client
```

### 4. **Réduire le churn (taux de désabonnement)**
```
Idées:
- Album souvenir permanent (199€ one-time pour garder à vie)
- Conversion en blog/portfolio après mariage
- Offre "bébé" (photos enfant) après mariage: 79€/an
```

---

## 💡 Stratégie de Prix Alternative

### Option 1: Pricing Actuel (Recommandé)
```
Prix: 99€/an
Domaine inclus: Oui
Marge: 88,96€ (90%)
Positionnement: Accessible, tout inclus
```

### Option 2: Pricing Optimisé
```
Prix de base: 79€/an (sans domaine personnalisé)
+ Domaine personnalisé: +30€/an (coûte 10€, marge 20€)
Total: 109€/an (si domaine)

Avantages:
- Prix d'entrée plus bas (79€ vs 99€)
- Meilleure marge sur domaine (20€ vs inclus)
- Flexibilité client

Coût client avec domaine: 10,04€
Revenu avec domaine: 109€
Marge: 98,96€ (91%)
```

### Option 3: Pricing Tiered
```
Essentiel (59€/an):
- Galerie photos uniquement
- Sous-domaine uniquement
- 100 photos max
- Marge: 59€ - 1,80€ = 57,20€ (97%)

Complet (99€/an):
- Tout inclus (offre actuelle)
- Marge: 88,96€ (90%)

Premium (149€/an):
- 3 domaines
- Stockage illimité prioritaire
- Support prioritaire
- Templates exclusifs
- Marge: 149€ - 35€ = 114€ (77%)
```

---

## 🌍 Marché Potentiel

### Taille du Marché (France)
```
Mariages en France: ~240 000/an (2025)
Marché cible: Couples tech-savvy, 25-35 ans
  → ~30% = 72 000 couples/an

Part de marché réaliste (Année 3): 0,5%
  → 72 000 × 0,5% = 360 clients/an
```

### Revenus Potentiels
```
360 clients × 99€ = 35 640€/an (conservateur)

Avec 1% part de marché:
720 clients × 99€ = 71 280€/an

Avec 2% part de marché:
1 440 clients × 99€ = 142 560€/an
```

---

## ⚠️ Risques & Considérations

### 1. **Saisonnalité**
- Mariages concentrés mai-septembre (70% du CA)
- Trésorerie: prévoir 6 mois de charges

### 2. **Taux de rétention**
- Mariages = événement unique
- Solution: pivot vers album permanent ou services récurrents

### 3. **Concurrence**
- Sites gratuits (Google Photos, etc.)
- Solutions premium (Zankyou, Withjoy): 200-400€
- **Positionnement**: Milieu de gamme, tout inclus

### 4. **Support client**
- Pics de support avant/pendant week-ends de mariage
- Solution: FAQ exhaustive + chatbot

### 5. **Coûts de stockage à long terme**
- Si clients gardent photos indéfiniment
- Solution: après 2 ans, proposer migration vers forfait "archive" (29€/an)

---

## ✅ Recommandations Finales

### Verdict: **TRÈS RENTABLE ✅**

Le modèle à 99€/an est **extrêmement rentable** avec:
- ✅ Marge brute de 89-91%
- ✅ Coûts d'infrastructure très bas (10€/client/an)
- ✅ Seuil de rentabilité bas (45 clients solo, 405 clients avec équipe)
- ✅ Marché potentiel important (72 000 couples/an en France)

### Actions Recommandées

1. **Court terme (0-6 mois)**
   - Lancer avec pricing actuel: 99€/an, domaine inclus
   - Focus acquisition organique (SEO, Instagram, bouche-à-oreille)
   - Objectif: 50 clients (bénéfice ~4 400€)

2. **Moyen terme (6-18 mois)**
   - Atteindre 200 clients (bénéfice ~17 700€)
   - Lancer offre Premium (149€/an)
   - Partenariats avec photographes/wedding planners

3. **Long terme (18+ mois)**
   - 400+ clients (bénéfice ~35 000€+)
   - Expansion internationale (Belgique, Suisse, Canada francophone)
   - Services additionnels (design, photo, vidéo)

### Pricing Final Recommandé

**Offre de lancement**: 99€/an (au lieu de 149€)
- Crée urgence
- Acquisition rapide
- Marge reste excellente (90%)
- Après 100 premiers clients: passer à 129€/an

---

## 📊 Dashboard Financier

### KPIs à Suivre

| Métrique | Cible Mois 6 | Cible Année 1 |
|----------|--------------|---------------|
| Clients actifs | 95 | 380 |
| MRR | 783€ | 3 135€ |
| CAC (coût acquisition) | < 30€ | < 25€ |
| LTV (lifetime value) | > 99€ | > 140€ |
| Taux de rétention | > 60% | > 70% |
| NPS (satisfaction) | > 50 | > 60 |

### Formules Importantes

```
MRR (Monthly Recurring Revenue) = Clients actifs × (99€/12)
ARR (Annual Recurring Revenue) = Clients actifs × 99€
LTV (Lifetime Value) = 99€ × durée moyenne abonnement
CAC (Customer Acquisition Cost) = Coûts marketing / Nouveaux clients
Ratio LTV/CAC = LTV / CAC (objectif: > 3)
```

---

## 🎉 Conclusion

Le modèle économique de **Reflets de Bonheur** à **99€/an** est:

✅ **HAUTEMENT RENTABLE** (89-91% de marge)
✅ **SCALABLE** (coûts d'infrastructure quasi-nuls)
✅ **COMPÉTITIF** (prix attractif vs alternatives)
✅ **DURABLE** (marché stable, 240k mariages/an)

**Vous ferez de l'argent** avec ce pricing, même avec seulement 50 clients la première année (bénéfice: 4 400€).

Avec 400 clients en année 3, vous générez un bénéfice net de **~35 000€/an** en travaillant seul, et bien plus avec une équipe ou en augmentant légèrement les prix.

**Feu vert pour lancer ! 🚀**

---

**Notes**:
- Tous les chiffres sont conservateurs (pessimistes)
- Les marges réelles seront probablement meilleures
- Le potentiel d'upsell (Premium, services additionnels) n'est pas inclus dans les projections de base
- Avec 30% de sous-domaines gratuits, marge grimpe à 94%

**Mise à jour**: 17 janvier 2026
