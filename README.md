# NÉON — Première Aube

Un jeu point & click contemplatif en français. Explorez Kepler, apprenez à connaître son écosystème et préparez un refuge pour les premiers pionniers.

**Jouer : https://jdrye.github.io/neon/**

## L’aventure

Quatre paysages vectoriels originaux : la vallée de l’aube, les lagons de verre, la forêt des murmures et la crête des deux lunes. Observez, recueillez des objets, utilisez-les dans le décor, déchiffrez une séquence de symboles et faites naître une colonie. Aucun combat, score ou chronomètre. Une fin complète, puis l’exploration reste libre.

- Cliquez ou touchez les repères du paysage.
- Sélectionnez un objet dans la sacoche, puis sa cible dans le paysage.
- Changez de lieu avec les quatre onglets sous le décor.
- Le carnet garde les découvertes et l’indice de l’énigme. Un bouton donne une aide contextuelle.
- Tab / Entrée : navigation et actions. Échap : fermeture des fenêtres.
- Son d’ambiance synthétisé, facultatif et désactivé par défaut.
- Sauvegarde locale automatique, propre à ce navigateur et à cette origine. Elle ne se synchronise pas entre appareils. Le bouton Recommencer demande confirmation. Si le stockage est bloqué, le jeu reste jouable pour la session.
- Animations réduites selon la préférence système.

## Développement

Node.js 22+ pour les tests, la construction et le serveur local fourni. **Aucune dépendance npm à installer**, aucun service externe, aucune clé d’API.

```sh
npm test
npm run build
npm run dev
# Ouvrir http://localhost:5173
```

`index.html` et `src/` sont directement exécutables par un serveur statique. `npm run build` les copie dans `dist/`. Le moteur de progression est séparé dans `src/engine.js`; les illustrations SVG sont dans `src/scenes.js`.

## GitHub Pages

Le workflow `.github/workflows/pages.yml` teste puis publie `dist/` à chaque push sur `main`. Dans **Settings → Pages**, sélectionner **GitHub Actions** comme source si nécessaire. La racine du dépôt est également directement compatible avec le mode **Deploy from a branch → main → /(root)**. Tous les chemins sont relatifs et fonctionnent sous `/neon/`.

L’ancienne implémentation Neon Rift, ses ressources compilées et ses dépendances ont été supprimées du code courant. L’historique Git reste conservé.

## Vérifications automatisées

Les tests couvrent la progression jusqu’à la fin, la consommation et la non-duplication des objets, les prérequis du relais, les mauvaises réponses à l’énigme, un ordre alternatif (jardin avant relais), et le chargement des sauvegardes.
