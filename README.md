# Neon Rift — Le dernier phare

Un roguelite d’arène original, en français, jouable au clavier ou sur écran tactile. Trois appareils, cinq secteurs et un Gardien à vaincre. Une partie dure environ trois minutes, selon le pilotage et les améliorations choisies.

## Jouer

**[Lancer Neon Rift](https://jdrye.github.io/neon/)**

Choisissez Spectre (équilibré), Bastion (résistant) ou Nova (agile), puis lancez la mission. Le canon vise et tire automatiquement sur la menace la plus proche. Neutralisez toutes les menaces d’un secteur pour choisir une amélioration et avancer. Le dernier secteur se termine en éliminant le Gardien.

- **Dash** : traverse les ennemis et leurs tirs avec une courte invulnérabilité.
- **Noyaux** : approchez-vous pour les attirer et recharger l’énergie. Les réparations rendent 18 PV.
- **Relais** : restez dans un cercle pendant 2,6 secondes pour gagner 20 PV, 40 énergie et 350 points. La capture est facultative et se dégrade lentement si vous quittez la zone.
- **Impulsion** : à 100 énergie, inflige des dégâts et efface les projectiles ennemis à proximité.
- **Chaîne** : enchaînez les éliminations pour multiplier les points, jusqu’à ×5. Subir un impact remet la chaîne à zéro.
- **Améliorations** : neuf possibilités, dont projectiles supplémentaires, perforation, régénération et réduction de la recharge du dash. Trois choix différents entre chaque secteur, avec une réparation de 15 PV.
- **Gardien** : attaques annoncées visuellement, salves circulaires et tirs dirigés. Ses attaques accélèrent à mi-vie.

## Commandes

| Action                   | Clavier / souris                     | Écran tactile     |
| ------------------------ | ------------------------------------ | ----------------- |
| Déplacer                 | ZQSD, WASD ou flèches                | Joystick à gauche |
| Dash                     | Espace                               | Bouton Dash       |
| Impulsion                | E                                    | Bouton Impulsion  |
| Viser manuellement       | Maintenir le clic sur l’arène        | Visée automatique |
| Pause / reprise          | P, Échap ou bouton Pause             | Bouton Pause      |
| Choisir une amélioration | Clic, touches 1 / 2 / 3 ou & / é / " | Toucher la carte  |

La perte de focus ou le passage dans un autre onglet suspend automatiquement la partie. La pause propose reprise, redémarrage et retour au hangar. Le manuel `?` explique les commandes et propose un réglage pour réduire les particules et les secousses. Les appareils sont tous accessibles dès le départ.

## Données et compatibilité

Le jeu est entièrement statique : aucun backend, aucune clé API, aucune ressource distante au lancement. Les visuels utilisent Canvas et les sons sont synthétisés localement avec Web Audio après une interaction. Les polices sont celles du système.

Les records, sorties, victoires, éliminations cumulées et préférences restent dans le stockage du navigateur. Le meilleur score de la version précédente (`neon-rift-best`) est repris. Un stockage désactivé ou illisible n’empêche pas de jouer, mais les résultats ne sont alors pas conservés. Une partie en cours n’est pas sauvegardée après fermeture ou rechargement de la page.

L’arène adapte sa caméra aux écrans étroits et affiche des indicateurs pour les ennemis hors champ. Les boutons et menus sont utilisables au clavier ; les combats restent une expérience visuelle en temps réel.

## Développer

Prérequis : Node.js 22 et npm.

```bash
npm ci
npm run dev
```

Structure :

- `src/game.ts` : simulation, règles, appareils, ennemis, collisions et progression.
- `src/render.ts` : rendu Canvas et caméra responsive.
- `src/audio.ts` : synthèse sonore sans fichier audio distant.
- `src/main.ts` : interface française, commandes, dialogues et records locaux.
- `src/styles.css` : cockpit, hangar, menus et adaptation tactile.
- `web/index.html` : point d’entrée source.

## Vérifier et construire

```bash
npm run build
npx playwright install --with-deps chromium
npm test
```

Les tests du moteur peuvent s’exécuter sans navigateur installé :

```bash
npx playwright test tests/game.spec.ts
```

Les tests du build sous le chemin de GitHub Pages :

```bash
PLAYWRIGHT_TEST_BUILD=1 PLAYWRIGHT_BASE_PATH=/neon/ npm test
```

Les tests couvrent les commandes, les dialogues, le stockage indisponible, la sélection d’appareil, le joystick, la pause, le dash, les relais, l’impulsion, les collisions rapides, les améliorations et les états terminaux. Une simulation déterministe mène chaque appareil du premier secteur à la victoire pour détecter les blocages de progression.

`npm run build` vérifie TypeScript, construit `dist/`, puis prépare le bundle statique à la racine avec `scripts/package-pages.mjs`. Les fichiers générés `index.html` et `pages-assets/` permettent aussi une publication GitHub Pages depuis une branche. Éditez `web/index.html` et `src/`, puis reconstruisez ; ne modifiez pas le bundle généré à la main. Le workflow GitHub Actions construit et teste avant publication depuis `main`.
