---
title: 30-Day Execution Plan
type: plan
date: 2026-03-14
---

# Plan d'exécution sur 30 jours

## Objectif

Transformer un produit déjà avancé en version pré-lancement plus cohérente, plus simple à activer et plus lisible pour l'équipe.

## Semaine 1 - Vérité produit et activation

- Mettre à jour `README.md`, `ROADMAP.md` et la doc d'architecture
- Ajouter un onboarding guidé dans l'admin
- Clarifier les chemins critiques du funnel dans la doc
- Vérifier les parcours login / signup / admin avec QA manuelle

## Semaine 2 - Funnel et opérations

- Finaliser les points critiques du parcours paiement si besoin
- Documenter et tester les scénarios Stripe réels
- Améliorer les messages d'erreur orientés utilisateur
- Ajouter des garde-fous sur les actions admin “coming soon”

## Semaine 3 - Simplification technique

- Réduire les branches `demoMode` dans les composants les plus centraux
- Continuer l'extraction de l'éditeur de site
- Uniformiser l'i18n dans les composants React les plus visibles
- Ajouter un peu d'observabilité applicative

## Semaine 4 - Différenciation produit

- Ajouter des relances RSVP
- Ajouter un kit de partage premium (QR, cartes, liens courts)
- Ajouter une archive souvenir read-only / export enrichi
- Préparer une démo commerciale plus convaincante

## Critères de succès

- Doc alignée avec l'état réel du dépôt
- Nouvel utilisateur activé sans flottement après création de compte
- Admin plus guidé, moins “boîte à outils”
- Parcours business testable de bout en bout
- Réduction visible de la dette de complexité sur les zones critiques
