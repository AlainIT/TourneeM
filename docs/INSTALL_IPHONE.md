# Installer TourneeM sur ton iPhone

L'app utilise une vraie carte (MapLibre), un module natif : elle ne peut pas s'installer via l'App Store "classique" pour l'instant (V1 non publiée) ni tourner dans l'app Expo Go. Deux voies possibles :

- **Voie gratuite via un Mac** (ci-dessous) : signature avec un Apple ID gratuit, réinstallation à prévoir tous les 7 jours.
- **Voie EAS Build + Apple Developer Program (99 $/an)** : aucun Mac requis, pas de réinstallation régulière. Détaillée en bas de page si tu changes d'avis plus tard.

## Étape 1 — Backend (obligatoire avant tout)

Suis `docs/SETUP.md`, sections 1 et 2 :
1. Créer le projet Supabase → récupérer **URL** + **clé anon**
2. Créer une clé **MapTiler**

## Étape 2 — Préparer le Mac

1. Installer **Xcode** depuis le Mac App Store (gratuit, ~10-15 Go, prévoir du temps de téléchargement). Le lancer une première fois pour accepter la licence et laisser les composants additionnels s'installer.
2. Installer **Node.js** (LTS) : https://nodejs.org, ou via Homebrew (`brew install node`) si tu l'as.
3. Récupérer le code :
   ```bash
   git clone https://github.com/AlainIT/TourneeM.git
   cd TourneeM/mobile
   npm install
   ```
4. Créer le fichier d'environnement :
   ```bash
   cp .env.example .env.local
   ```
   Puis éditer `.env.local` et renseigner les 3 valeurs (voir étape 1) :
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   EXPO_PUBLIC_MAPTILER_KEY=...
   ```

## Étape 3 — Lier ton Apple ID gratuit à Xcode

1. Ouvrir Xcode → menu **Xcode → Settings… → Accounts**
2. Cliquer **+** → **Apple ID** → se connecter avec un identifiant Apple classique (celui de ton iPhone convient, pas besoin de payer quoi que ce soit ici)
3. Xcode crée automatiquement un "Personal Team" gratuit associé à ce compte

## Étape 4 — Générer le projet natif et l'installer sur l'iPhone

1. Brancher l'iPhone au Mac en USB (ou WiFi, voir plus bas), et sur l'iPhone : **Faire confiance à cet ordinateur** si demandé
2. Dans le dossier `mobile/` :
   ```bash
   npx expo prebuild --platform ios
   ```
   Ça génère un dossier `ios/` (projet Xcode natif) — normal que ce soit volumineux, il n'est pas commité dans le dépôt.
3. Lancer directement l'installation sur l'iPhone en **configuration Release** (important : sans ça, l'app aurait besoin que le Mac reste allumé et connecté au même WiFi pour fonctionner) :
   ```bash
   npx expo run:ios --device --configuration Release
   ```
   Un menu te demande de choisir ton iPhone dans la liste des appareils détectés — le sélectionner. La première compilation prend 5-15 minutes.

## Étape 5 — Autoriser l'app sur l'iPhone

Au premier lancement, iOS refuse l'app ("Développeur non fiable") :
1. Sur l'iPhone : **Réglages → Général → VPN et gestion de l'appareil**
2. Sélectionner le profil correspondant à ton Apple ID → **Faire confiance**
3. Relancer l'app depuis l'écran d'accueil

## Étape 6 — Renouveler chaque semaine

Avec un Apple ID gratuit, la signature expire au bout de **7 jours** : l'app cesse de s'ouvrir. Pour la renouveler, reconnecter l'iPhone au Mac et relancer :
```bash
npx expo run:ios --device --configuration Release
```
Ça réinstalle en 1-2 minutes (pas besoin de repasser par toutes les étapes précédentes), sans perdre les données (elles sont sur Supabase, pas sur l'appareil).

> Si cette contrainte hebdomadaire devient trop lourde à l'usage, on peut basculer sur la voie payante ci-dessous (99 $/an) qui supprime complètement cette limite — dis-le-moi quand tu veux.

---

## Alternative : EAS Build + Apple Developer Program (99 $/an, sans Mac)

À réserver pour plus tard si la contrainte des 7 jours devient gênante.

1. Créer/rejoindre le programme sur https://developer.apple.com/programs/
2. Créer un compte gratuit sur https://expo.dev/signup, créer un projet lié à `AlainIT/TourneeM` (dossier `mobile/`)
3. Dans **Project settings → Environment variables**, ajouter `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_MAPTILER_KEY` pour l'environnement **Preview**
4. **Builds → Create a build** → iOS → profil **preview** → branche `claude/medical-tour-app-architecture-fay3zt`
5. Une fois le build prêt (15-30 min), ouvrir le lien sur l'iPhone et installer — même étape "Faire confiance" que ci-dessus, mais plus besoin de la refaire chaque semaine.

## Une fois que ça marche

Dis-le-moi et je peux :
- configurer les mises à jour OTA (`eas update`) pour que les futures évolutions du code JS arrivent sans réinstallation,
- t'aider à passer en distribution TestFlight si tu veux la partager à d'autres personnes plus simplement,
- préparer la publication App Store si vous décidez de la sortir officiellement.
