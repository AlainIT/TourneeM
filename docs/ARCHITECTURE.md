# Architecture — TourneeM

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| App mobile/tablette | Expo (React Native) + TypeScript, Expo Router | Une seule base de code iOS/Android/tablette, layout adaptatif via breakpoints (`useWindowDimensions`), écosystème mûr pour géoloc/carte/fichiers. |
| Carte | MapLibre GL Native (`@maplibre/maplibre-react-native`) + tuiles vectorielles MapTiler (style OSM détaillé : rues, bâtiments) | Fond de carte réel, pas de vendor lock-in Google, coût maîtrisé. Nécessite un *development build* (pas Expo Go) car c'est du code natif. |
| Géocodage | API Adresse (adresse.data.gouv.fr) en priorité pour la France, fallback Google Geocoding si échec/étranger | Gratuite, illimitée, très précise sur adresses françaises. |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions + Realtime) | Coût quasi nul pour MVP mono-utilisateur, RLS native = chiffrement/isolation par compte dès la V1, migration douce vers multi-utilisateurs en V2 (voir plus bas), hébergement UE disponible (region `eu-west-*`). |
| Sync / cache offline | TanStack Query + persistance AsyncStorage, stratégie cache-first | Consultation hors-ligne (carte, fiches médecins, tournée du jour) sans la complexité d'un moteur offline-first complet ; suffisant pour le besoin V1 ("hors connexion a minima pour la consultation"). |
| Optimisation de tournée | Calcul côté Edge Function : plus-proche-voisin + amélioration 2-opt sur distances à vol d'oiseau/Haversine (V1), avec possibilité d'appeler une API de routage (Mapbox/Google Directions) en V2 pour un temps de trajet réel | Pas de dépendance à une API payante pour ~10-20 points/jour ; algorithme déterministe, rapide, exécuté côté serveur pour ne pas geler l'UI. |

## Pourquoi Supabase plutôt que Firebase

Le modèle de données est fortement relationnel (médecins ↔ tournées ↔ arrêts ↔ visites, filtres combinés, agrégations par secteur). Postgres + RLS colle mieux à ce besoin que Firestore (NoSQL, requêtes composées limitées). Supabase fournit aussi Auth, Storage (fichiers Excel importés) et des Edge Functions (Deno) dans un seul projet, avec un tier gratuit suffisant pour un MVP mono-utilisateur.

## Chemin vers la V2 (multi-utilisateurs) sans refonte

Toutes les tables métier sont scopées par `sector_id`, jamais directement par `user_id`. Une table `sector_members` (secteur ↔ utilisateur ↔ rôle) existe dès la V1, vide en usage réel (seul le propriétaire y a accès). En V2 :

- ajouter des lignes dans `sector_members` pour donner à un manager l'accès à plusieurs secteurs ;
- les politiques RLS (déjà écrites autour de `has_sector_access()`) n'ont pas besoin de changer ;
- aucune migration de schéma sur `doctors`, `routes`, `visits`, etc.

## Modèle de données

Voir `supabase/migrations/0001_init.sql`. Aligné sur les colonnes réelles du fichier de ciblage fourni (`CIBLAGE_S16.xlsx`) :

- `doctors` reprend une à une les colonnes du fichier (ONEKEY, RPPS, SPECIALITE, NOM, PRENOM, LIEU D'EXERCICE PRINCIPAL, ETABLISSEMENT, ADRESSE, VILLE, CODE POSTAL, UGA, SECTEUR, PRESSION VM, MODE RECEPTION, CIBLAGE PROPOSE, ACTION, RATIONNEL, FREQUENCE MAXIMUM) + les champs calculés par l'app (`latitude`/`longitude`, `potentiel_score`, `geocoding_status`, `actif`).
- `doctor_product_weights` reprend les colonnes `POIDS UGA <PRODUIT>` (une ligne par produit et par médecin), pour rester extensible si le fichier ajoute des produits sans migration de schéma.
- `mode_reception` normalise les 6 valeurs vues dans le fichier réel (`LIBRE`, `SUR RDV`→`SUR_RDV`, `ALÉATOIRE`→`ALEATOIRE`, `NRP`, `NPP`, `INACTIF`) vers les 4 catégories du brief (libre / sur RDV / aléatoire / ne reçoit pas) au niveau de l'UI.
- `potentiel_score` (0-100) est calculé à l'import : normalisation percentile de `PRESSION VM` (et, si plusieurs produits, du poids maximum) sur l'ensemble du fichier importé. Les valeurs brutes (`pression_vm`, `doctor_product_weights.poids`) restent stockées pour audit/recalcul futur.

### Gestion des mises à jour de ciblage (imports répétés)

Clé de rapprochement : `(sector_id, onekey)`. À chaque import :

1. upsert des médecins présents dans le fichier (mise à jour des champs, `ciblage_precedent` ← ancien `ciblage` si différent, `actif = true`) ;
2. les médecins déjà en base pour ce secteur mais absents du nouveau fichier passent à `actif = false` (retrait de ciblage) — jamais supprimés, pour conserver l'historique de visites ;
3. une ligne `imports` trace le fichier, la date, et les compteurs (créés / mis à jour / retirés).

## Sécurité & RGPD

- RLS Postgres sur toutes les tables métier : un compte ne peut lire/écrire que les données de ses secteurs.
- Chiffrement au repos (Postgres géré) et en transit (TLS) assuré par Supabase.
- Auth email/mot de passe (Supabase Auth, hachage bcrypt géré par la plateforme).
- Droit à l'export : vue/export CSV des médecins + visites du secteur (fonctionnalité V1 export CSV + requête directe possible).
- Droit à l'effacement : suppression du compte Supabase Auth entraîne, via `on delete cascade`, la suppression de `sectors` → `doctors`/`routes`/`visits` associés.
- Hébergement : projet Supabase à créer en région UE (ex. `eu-west-1`/`eu-central-1`) — à documenter avec l'ID de région exact une fois le projet créé, pour toute présentation DPO/conformité.

## Découpage en étapes de développement

1. **Backend minimal** (ce commit) : schéma + RLS + Edge Function d'import (parsing Excel/CSV + géocodage + upsert).
2. Écran carte (MapLibre, clustering, marqueurs par priorité/potentiel/mode de réception) + filtres.
3. Construction de tournée + optimisation + export navigation (Google Maps/Apple Plans).
4. Suivi de visite + export CSV.
5. Tests mobile + tablette (layout adaptatif), ajustements responsive.
