# Installer TourneeM sur ton iPhone

L'app utilise une vraie carte (MapLibre), un module natif : elle ne peut pas s'installer via l'App Store "classique" pour l'instant (V1 non publiée) ni tourner dans l'app Expo Go. On passe par **EAS Build**, le service cloud d'Expo qui construit l'app pour toi (pas besoin de Mac ni de Xcode).

Tout se fait depuis un navigateur, sauf une étape en ligne de commande si tu n'as pas encore de compte Apple Developer lié.

## Coût à prévoir

Apple exige un **compte Apple Developer Program (99 $/an)** pour installer une app sur un iPhone physique en dehors de l'App Store — même via EAS. C'est la seule dépense obligatoire. (Alternative gratuite : si tu as accès à un Mac, tu peux installer via Xcode avec un Apple ID gratuit, mais l'app expire au bout de 7 jours et il faut réinstaller à chaque fois — je peux détailler cette option si tu préfères.)

## Étape 1 — Backend (obligatoire avant tout)

Suis `docs/SETUP.md`, sections 1 et 2 :
1. Créer le projet Supabase → récupérer **URL** + **clé anon**
2. Créer une clé **MapTiler**

Garde ces 3 valeurs sous la main, on les renseignera à l'étape 4.

## Étape 2 — Compte Expo (EAS)

1. Créer un compte gratuit sur https://expo.dev/signup
2. Une fois connecté, cliquer sur **Create a project** (ou "New project")
3. Lier le projet à ton dépôt GitHub `AlainIT/TourneeM` — Expo détecte automatiquement le dossier `mobile/` comme racine du projet Expo (sinon, le préciser manuellement dans les réglages du projet)

## Étape 3 — Compte Apple Developer

1. Créer/rejoindre le programme sur https://developer.apple.com/programs/ (99 $/an, identifiant Apple classique)
2. Rien d'autre à faire ici — EAS gère les certificats et profils de provisionnement à ta place au moment du build (il te demandera de te connecter avec ton Apple ID lors de la première build).

## Étape 4 — Variables d'environnement dans EAS

Dans le dashboard du projet Expo : **Project settings → Environment variables → Create**. Ajouter ces 3 variables, en cochant l'environnement **Preview** (et Production si tu comptes publier plus tard) :

| Nom | Valeur |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL de ton projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | clé anon Supabase |
| `EXPO_PUBLIC_MAPTILER_KEY` | ta clé MapTiler |

## Étape 5 — Lancer le build iOS

Dans le dashboard : **Builds → Create a build**
- Plateforme : **iOS**
- Profil : **preview**
- Branche : `claude/medical-tour-app-architecture-fay3zt` (ou `main` une fois la branche fusionnée)

Lance le build. Ça prend **15 à 30 minutes**. La première fois, EAS te proposera d'enregistrer ton iPhone (un lien/QR code à ouvrir *depuis l'iPhone* pour capturer son identifiant — nécessaire pour l'installation ad-hoc).

## Étape 6 — Installer sur l'iPhone

1. Une fois le build terminé, ouvre la page du build sur ton **iPhone** (Safari) et appuie sur **Install** — ou scanne le QR code affiché avec l'appareil photo de l'iPhone.
2. iOS va afficher "Impossible d'installer l'app" la première fois : va dans **Réglages → Général → VPN et gestion de l'appareil**, sélectionne le profil développeur correspondant à ton compte Apple, et appuie sur **Faire confiance**.
3. Relance l'installation depuis le lien EAS — l'app s'installe normalement sur l'écran d'accueil.

## Mises à jour ultérieures

Tant que le code JavaScript seul change (pas de nouvelle dépendance native), tu n'as pas besoin de refaire un build complet : `eas update` (ou la mise à jour OTA automatique si configurée) pousse le changement directement sur l'app déjà installée. Si une dépendance native est ajoutée (rare, ex. une nouvelle lib de carte), il faut relancer un build comme à l'étape 5.

## Une fois que ça marche

Dis-le-moi et je peux :
- configurer les mises à jour OTA (`eas update`) pour que les futures évolutions arrivent sans réinstallation,
- t'aider à passer en distribution TestFlight si tu veux la partager à d'autres personnes plus simplement,
- préparer la publication App Store si vous décidez de la sortir officiellement.
