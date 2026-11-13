# NÉON — Les pionniers de l’aube

Jeu de colonie **2D isométrique**, en français, jouable directement sur GitHub Pages :

**https://jdrye.github.io/neon/**

## Collecter, construire, faire grandir

- Une carte isométrique SVG originale, avec déplacement par glissement, zoom et recentrage.
- Cinq ressources : minerai, biomasse, eau, cristaux et énergie.
- Cliquez sur les gisements, les arbres ou les sources pour collecter. Chaque gisement se renouvelle en 2,5 secondes ; aucun stock naturel ne s’épuise définitivement.
- Sélectionnez un bâtiment dans le catalogue, puis une case illuminée. Les ressources sont débitées seulement à la pose. Échap ou Annuler quitte ce mode sans rien dépenser.
- Cliquez sur un bâtiment pour consulter sa production et l’améliorer jusqu’au niveau III. Le module pionnier et le port stellaire ont un niveau unique.
- Déplacez gratuitement les bâtiments depuis leur fiche : le niveau et la production sont conservés. Annuler ne change rien ; le module pionnier reste fixe.
- Suivez les sous-objectifs cochés, le compte à rebours du cycle et la régénération des gisements (grisés pendant 2,5 secondes).
- Démontez les constructions après confirmation pour réorganiser le terrain. Vous récupérez 50 % des matériaux investis, améliorations comprises. Le module pionnier reste en place.

| Construction | Effet par niveau |
| --- | --- |
| Centrale solaire | +2 énergies / cycle |
| Habitat | +6 pionniers |
| Collecteur d’eau | +3 eaux / cycle |
| Serre vivante | +3 biomasses / cycle ; nécessite un habitat |
| Extracteur doux | +3 minerais et +1 cristal / cycle ; nécessite une centrale solaire |
| Port stellaire | Objectif final ; nécessite une serre |

La production suit un cycle global de 12 secondes, sans coût d’entretien. Les améliorations multiplient la production par le niveau. Les sept étapes de l’expédition accordent des récompenses une seule fois. Atteignez 16 habitants avec une serre et un port stellaire pour achever l’objectif principal ; la construction reste ensuite libre.

Pas de combat, de famine, de mort de colons ou de pénalité d’absence. Les réserves sont plafonnées à 9 999 par ressource.

## Sauvegarde et accessibilité

La sauvegarde automatique utilise `localStorage` (`neon-colony-v2`). Elle reste propre au navigateur, à l’appareil et à l’origine du site. La sauvegarde de l’ancien point & click est conservée séparément ; son inventaire n’est pas converti en matériaux.

Dans les options (⚙), exportez votre colonie en fichier JSON pour la conserver ou la transférer sur un autre appareil. L’import demande confirmation avant remplacement et refuse les fichiers incompatibles.

La production hors ligne est créditée au retour, dans la limite de 30 minutes. Si le stockage est bloqué, la session reste jouable. Recommencer demande confirmation.

Les ressources et bâtiments sont accessibles au clavier (Tab, Entrée ou Espace). Échap ferme les fenêtres ou annule un placement. Sur mobile, la caméra est rapprochée au départ ; le glissement déplace la carte. Une fiche permet aussi de collecter la ressource sélectionnée. Les animations suivent la préférence système de réduction des mouvements. Son d’ambiance synthétisé, facultatif, désactivé au chargement et suspendu lorsque l’onglet est masqué.

## Développement

Node.js 22 ou plus. Aucune dépendance npm, aucun CDN, serveur applicatif ou secret.

```sh
npm test
npm run build
npm run dev
# http://localhost:5173
```

- `src/engine.js` : économie, collecte, construction, niveaux, production et sauvegardes.
- `src/scenes.js` : projection isométrique et illustrations SVG.
- `src/app.js` : interface, caméra, interactions et audio.
- `src/style.css` : présentation et adaptation mobile.
- `scripts/build.mjs` : copie des fichiers statiques dans `dist/`.

## GitHub Pages

Le workflow `.github/workflows/pages.yml` teste puis publie `dist/` à chaque push sur `main`. Choisir **Settings → Pages → GitHub Actions** si nécessaire. La racine est également utilisable avec **Deploy from a branch → main → /(root)**. Tous les chemins sont relatifs et compatibles avec `/neon/`.

## Vérifications

`npm test` couvre un parcours complet jusqu’au port stellaire sans injection de ressources, les coûts et prérequis, le renouvellement des gisements, les récompenses uniques, les améliorations, le démontage, la production hors ligne plafonnée, les sauvegardes corrompues et l’absence de doubles crédits.

## Laboratoire et métropole

Trois recherches permanentes permettent d’investir les réserves dans la production : optique solaire (centrales ×2), écosystèmes fermés (serres et eau ×2), sondes profondes (extracteurs ×2). Le bâtiment correspondant doit être construit avant la recherche. Les bonus se cumulent avec les niveaux et s’appliquent aussi à la production hors ligne.

Après le port stellaire, débloquez les trois technologies et accueillez 28 pionniers, puis atteignez 52 pionniers avec quatre bâtiments de niveau III. Les sauvegardes antérieures reprennent avec aucune recherche acquise.

La carte comporte des chemins éclairés et des brumes animées ; les animations respectent la réduction des mouvements.
