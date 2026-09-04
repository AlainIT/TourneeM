# TourneeM

Application de tournée pour délégués médicaux : carte des médecins ciblés, filtres, construction et optimisation de tournée, suivi des visites, import périodique des fichiers de ciblage.

## Structure du dépôt

```
mobile/     App Expo (React Native + TypeScript) — iOS, Android, tablette
supabase/   Backend Supabase : schéma Postgres, RLS, Edge Functions
docs/       Architecture et guide de mise en route
```

## Démarrage rapide

1. Lire `docs/ARCHITECTURE.md` pour le choix de stack et le modèle de données.
2. Suivre `docs/SETUP.md` pour créer les comptes (Supabase, MapTiler), configurer les variables d'environnement et lancer l'app.

## État de la V1

- [x] Schéma Supabase + RLS (`supabase/migrations/0001_init.sql`)
- [x] Edge Function d'import (parsing Excel/CSV + géocodage API Adresse + upsert) — `supabase/functions/import-targeting`
- [x] Edge Function d'optimisation de tournée (plus proche voisin + 2-opt) — `supabase/functions/optimize-route`
- [x] Auth email/mot de passe
- [x] Écran carte (MapLibre, clustering, filtres, tri par proximité/potentiel)
- [x] Construction de tournée depuis la carte/liste + optimisation + export navigation
- [x] Suivi de visite + historique + export CSV
- [x] Layout adaptatif mobile/tablette
- [ ] Tests sur appareil réel (nécessite un development build — voir `docs/SETUP.md`)

## V2 (hors périmètre actuel, anticipé dans l'architecture)

Multi-utilisateurs avec rôle manager multi-secteurs, notes de visite structurées, statistiques de couverture, notifications de relance — voir `docs/ARCHITECTURE.md` § "Chemin vers la V2".
