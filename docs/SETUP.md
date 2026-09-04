# Mise en route

## 1. Créer le projet Supabase

1. Aller sur https://supabase.com, créer un compte puis un nouveau projet.
2. **Région** : choisir une région UE (ex. `eu-west-1` / `eu-central-1`) — important pour l'hébergement des données en Europe (RGPD).
3. Noter dans un endroit sûr : l'**URL du projet** et la clé **anon/public** (Project Settings → API). C'est ce qui va dans `mobile/.env.local`.
4. Dans **SQL Editor**, exécuter le contenu de `supabase/migrations/0001_init.sql` (ou utiliser la Supabase CLI, voir plus bas) pour créer le schéma.
5. Dans **Storage**, créer un bucket privé nommé `imports` (utilisé pour les fichiers Excel/CSV importés). Il n'a pas besoin d'être public : les Edge Functions y accèdent avec la clé `service_role`.
6. Dans **Authentication → Providers**, l'authentification email/mot de passe est activée par défaut. Décider si la confirmation par e-mail est requise (Authentication → Settings) — l'app gère les deux cas.
7. Déployer les Edge Functions (`import-targeting`, `optimize-route`) — voir ci-dessous.

### Avec la Supabase CLI (recommandé, reproductible)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <votre-project-ref>

# Appliquer le schéma
supabase db push

# Déployer les fonctions
supabase functions deploy import-targeting
supabase functions deploy optimize-route

# Créer le bucket de stockage des imports
supabase storage buckets create imports --no-public
```

Les Edge Functions utilisent `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`, injectées automatiquement par Supabase en production — rien à configurer manuellement pour ces trois-là.

## 2. Créer une clé MapTiler (fond de carte)

1. Créer un compte gratuit sur https://www.maptiler.com/.
2. Dans le tableau de bord, récupérer la clé API (Account → Keys).
3. Le tier gratuit (100 000 chargements de carte/mois) est largement suffisant pour un usage mono-utilisateur.

## 3. Configurer l'application mobile

```bash
cd mobile
cp .env.example .env.local
```

Renseigner dans `.env.local` :

```
EXPO_PUBLIC_SUPABASE_URL=<URL du projet Supabase>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<clé anon Supabase>
EXPO_PUBLIC_MAPTILER_KEY=<clé MapTiler>
```

## 4. Lancer l'app

MapLibre est un module natif : l'app ne peut pas tourner dans Expo Go, il faut un **development build**.

```bash
cd mobile
npm install

# Première fois uniquement : génère les projets natifs iOS/Android
npx expo prebuild

# Lancer sur un simulateur/appareil
npx expo run:ios      # nécessite macOS + Xcode
npx expo run:android  # nécessite Android Studio / un appareil en USB
```

Une fois le development build installé sur l'appareil, les lancements suivants peuvent utiliser `npx expo start --dev-client`.

## 5. Créer votre compte

Au premier lancement, créer un compte depuis l'écran d'inscription (e-mail/mot de passe). Un secteur "Mon secteur" est créé automatiquement (trigger `handle_new_user` en base). Importer ensuite votre premier fichier de ciblage depuis l'onglet **Import**.
