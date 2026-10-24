# CLAUDE.md

Consignes pour Claude sur ce dépôt.

## Le projet

GRIM (GitHub Repo AI Monitor) : tableau de bord qui affiche des projets sous forme de grille, à partir du `summary.md` de chaque dépôt GitHub. Un clic montre les attentes, les blocages et les prochaines étapes, puis ouvre le projet dans Claude (d'autres IA sont prévues).

Le dépôt est **public** : rien de personnel ni de confidentiel dans le code, la documentation ou les messages de commit.

Feuille de route :
1. **v0 Electron** : application de bureau.
2. **PWA**, une fois la v0 validée, à partir de la même base de code.

## Architecture (pensée pour la PWA)

- `src/` : l'interface et **toute** la logique (lecture GitHub, lecture de `summary.md`, choix de la branche). Code web pur : aucun import de Node ni d'Electron. C'est ce dossier qui deviendra la PWA.
  - `src/summary/` et `src/github/` : lecture de `summary.md` et de GitHub, sans React.
  - `src/token/` : stockage du token (`localStorage`, identique dans Electron et dans la PWA).
  - `src/ui/` : logique d'interface testable sans navigateur (messages d'erreur, statuts, garde contre les réponses périmées) et le hook `useProjects`.
  - `src/components/` : composants React (formulaire du token, grille, détail).
- `electron/` : coque mince. Elle ouvre la fenêtre, envoie les liens https vers le navigateur du système et bloque toute autre navigation. Rien de métier ici.
- Les appels à GitHub partent de l'interface (`fetch` vers `api.github.com`, autorisé par CORS), pour fonctionner à l'identique dans Electron et dans un navigateur.
- Si un besoin diffère entre Electron et la PWA (par exemple le stockage du token), l'isoler derrière une petite interface dans `src/platform/`, au moment où le besoin apparaît, pas avant.
- La politique de sécurité du contenu (CSP) est ajoutée au build dans `vite.config.ts` ; toute nouvelle origine externe doit y être déclarée.

## Design

Inspiré des design systems de Fluxo et de Bitojel, sombre par défaut, sans bascule de thème.

- **Jetons** : toutes les couleurs sont des variables CSS dans `src/index.css`, comme dans Fluxo. Elles sont nommées dans `tailwind.config.js`, sauf les voyants (`--lamp-*`), utilisés par les classes `.lamp-*` d'`index.css`. Ne pas écrire de couleur en dur dans les composants, et écrire les noms de classes en entier (Tailwind ignore les noms construits dynamiquement).
- **Palette** : « Minuit & Cobalt » de Fluxo. Deux écarts volontaires, pour atteindre le contraste AA :
  - texte secondaire `#A8C0D6` au lieu de `#6B8CAE`, insuffisant (3,9:1) sur la tuile choisie ;
  - texte foncé sur l'accent, comme les boutons de Bitojel, au lieu du blanc de Fluxo (3,45:1).
- **Signature de Bitojel** :
  - police Jura, embarquée via `@fontsource/jura` (la CSP interdit Google Fonts) ;
  - voyant lumineux (`.lamp`) ;
  - sigle « GRIM » à coins (`.logo-mark`) ;
  - coins d'accent sur la tuile choisie (`.tile-selected`) ;
  - liseré au survol ;
  - boutons à étiquette espacée en capitales (`.button-*`).
- **Écarts avec Bitojel** : coins arrondis de Fluxo (4 à 8 px) au lieu de coins droits ; voyant de 8 px sans clignotement (7 px et pulsation dans Bitojel) ; boutons un peu plus compacts (10/20 px au lieu de 12/28 px).
- **Accessibilité** : vérifier le contraste de toute nouvelle couleur (4,5:1 pour le texte, 3:1 pour les voyants et les bordures de champ) ; le liseré au survol respecte `prefers-reduced-motion`.

## Commandes

- `npm run dev` : l'interface seule dans le navigateur (http://localhost:5173).
- `npm run dev:electron` : la fenêtre Electron branchée sur `npm run dev`, à lancer dans un second terminal.
- `npm start` : construit puis lance l'application.
- `npm run package` : l'installateur du système courant, dans `release/`. Publier une release sur GitHub construit et y attache les installateurs macOS (dmg arm64 et x64) et Windows (exe), non signés (`.github/workflows/release.yml`). La release doit s'appeler `v` + la version de `package.json`.
- `npm run lint`, `npm run typecheck`, `npm test` : vérifications lancées aussi par la CI.

ESLint interdit dans `src/` tout import d'Electron ou de Node, statique ou dynamique : c'est le garde-fou de l'architecture. Le moindre avertissement ESLint fait échouer la CI.

## Avant d'ouvrir une PR

Le quota de revue Copilot est limité et coûteux : la PR doit arriver propre. Copilot ne doit trouver que ce qu'une relecture sérieuse aurait raté.

1. **Vérifications automatiques** : `npm run lint`, `npm run typecheck`, `npm test` et `npm run build` passent.
2. **Lancer réellement le changement** (navigateur ou écran virtuel) et observer le résultat, pas seulement les tests.
3. **Relire le diff avec la liste ci-dessous**, tirée des retours Copilot sur les autres dépôts (octobre 2026), du plus fréquent au plus rare. Pour chaque point : soit il est traité, soit il est sans objet, et la description de la PR le dit.
   - **Accès concurrents** : toute séquence « lire puis écrire » est-elle atomique ? Deux clics rapides, deux requêtes simultanées, deux onglets ou deux appareils donnent-ils le bon résultat ?
   - **Réponses périmées** : une réponse qui arrive en retard (après un changement de sélection, de session, ou le démontage d'un composant) peut-elle écraser un état plus récent ? Ignorer les résultats qui ne correspondent plus à la demande courante.
   - **Validation des entrées, aux frontières** : `null`, champs absents, doublons, dates impossibles, casse (UUID), caractères non ASCII, clés héritées d'un objet (`constructor`, `__proto__`), valeurs extrêmes (dépassements). Valider la donnée d'origine, pas sa version normalisée.
   - **Droits et révocation** : retirer un droit coupe-t-il vraiment l'accès partout ? Une révocation peut-elle au contraire en accorder un ?
   - **Erreurs réseau et HTTP** : distinguer une coupure réseau d'un refus du serveur (401, 403, 409, 5xx) ; ne pas relancer à l'infini un refus définitif ; afficher l'erreur là où l'utilisateur regarde.
   - **Stockage local** : un échec d'écriture (quota plein, accès refusé) n'est jamais ignoré silencieusement ; aucun secret (token, code) dans les noms de clés ni après déconnexion ; changements faits dans un autre onglet pris en compte.
   - **Données personnelles** dans les exports, journaux et messages d'erreur.
   - **Erreurs non rattrapées** : événements `error`, promesses sans `catch`, valeurs de configuration invalides au démarrage.
   - **Particularités de plateforme** : comportement propre à Electron, au navigateur, ou à un système d'exploitation.
   - **Documentation fidèle au code** : `CLAUDE.md`, `README.md` et commentaires décrivent ce que fait le code, pas une intention.
4. **Revue indépendante** : un agent séparé, qui n'a pas vu le code s'écrire, relit le diff avec la consigne d'un relecteur exigeant et cette liste. Corriger ce qu'il trouve, puis seulement ouvrir la PR.
5. **Description de la PR** : ce qui change, ce qui a été vérifié, et le passage de la liste point par point.

## Règles de travail

1. Partir de l'existant : vérifier les outils connectés (GitHub, Vercel, Railway) et comment les projets existants (ex. NSILI) font les choses avant de proposer du neuf.
2. Garder le périmètre simple : challenger chaque nouvelle notion ou fonctionnalité ; décider explicitement du niveau de complexité avant de construire.
3. Code : toujours via une branche et une PR, jamais directement sur `main` ; demander une revue Copilot et traiter ses retours ; c'est Jean Luc qui merge. Commits signés `Claude <noreply@anthropic.com>`.
4. Avant de livrer du code : appliquer la section « Avant d'ouvrir une PR » ci-dessus (elle reprend toute la liste de contrôle : droits et révocation, actions simultanées, coupure réseau, réponses périmées, plusieurs onglets/appareils, stockage plein, données personnelles dans les exports).
5. Regrouper les corrections avant de redemander une revue Copilot (quota limité). Pour une revue de tout le code : base vide sans historique commun.
6. Déploiement : reprendre la configuration d'un projet existant (ex. NSILI sur Vercel) plutôt que réinventer. La PWA suivra ce modèle.
7. Quand Jean Luc dit qu'une configuration est faite, la vérifier aussitôt.
8. Toujours mettre la réponse à sa question dans le message final.
9. Annoncer d'emblée les limites de l'environnement (actions impossibles depuis la session).
10. Garder ces règles à jour dans ce fichier.
11. Qualité du code : principes SOLID et Software Craftsmanship, code facile à comprendre pour un développeur de niveau moyen.
    - Simplicité d'abord : pas d'abstraction, de patron de conception ou de dépendance sans besoin réel et justifié.
    - Lisibilité : noms explicites, fonctions courtes à responsabilité unique, pas d'astuce obscure.
    - Commentaires sur le « pourquoi », pas sur le « quoi ».
    - Tests : chaque comportement ajouté ou modifié est couvert (un cas par test, nom qui décrit le comportement attendu). Lanceur intégré de Node (`node:test` via `tsx`).
    - Cohérence : suivre les conventions déjà en place.
    - Petits pas : PR limitées et faciles à relire ; un refactoring séparé d'un changement de comportement.
    - Entre élégance et clarté, choisir la clarté.
12. Tenir à jour `summary.md` à la racine (en-tête `status`, puis Attentes, Blocages, Prochaines étapes). Le mettre à jour et le commiter sur la branche de travail à chaque PR ouverte, ou quand Jean Luc dit qu'on s'arrête. Dépôt public : **aucun lien vers un compte d'IA** (ni `claude_project`, ni lien de session dans les commits ou les PR), et aucune information sur un client, un employeur ou un nom de code interne.
