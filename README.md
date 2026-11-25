# NÉON — Les pionniers de l’aube

Jeu de stratégie **2D isométrique** en français. Commandez une cité face à une rivale ou explorez Kepler en colonie libre.

**https://jdrye.github.io/neon/**

## Version 7.0 — Les Deux Rives

Sur l’accueil, choisissez **Jouer en stratégie**, ou ouvrez [l’escarmouche](https://jdrye.github.io/neon/#strategie). Choisissez un champ de bataille, un numéro de carte et la difficulté de Cendre. Les deux cités commencent avec un forum, cinq pionniers, un Voltigeur de reconnaissance et des réserves identiques. Le numéro reproduit la même carte et les mêmes gisements.

**Entrer directement en bataille.** Le scénario **Le siège d’Aurore** vous confie une cité à l’âge III. Quatorze pionniers travaillent déjà, trois Sentinelles et trois Veilleurs défendent les abords, et une colonne de Cendre arrive par le delta. Le commandement commence en pause. Vous pouvez rappeler la défense, investir le minerai dans des renforts ou reconstruire la Flèche. Les effectifs et les stocks proviennent d’une ouverture jouée avec les règles normales.

**Votre première minute en escarmouche.** Sélectionnez le pionnier libre et affectez-le aux cristaux. Au forum, lancez la formation d’un pionnier. Avec deux pionniers, posez un dépôt près du bois ou du minerai. La livraison s’effectue au dépôt le plus proche. Envoyez le Voltigeur reconnaître le gué pendant que les autres récoltent. Une caserne permet de défendre les récolteurs. Un habitat ajoute six places et une ferme fournit des vivres quand les gisements s’épuisent.

**Changer d’âge.** Achevez deux types de bâtiments en plus du forum pour ouvrir l’âge II. Prévoyez 112 vivres, 38 minerais et 12 cristaux. Pendant la transition, le forum suspend la formation de nouveaux pionniers placés après elle. L’âge II ouvre les Veilleurs, l’atelier et la vigie. Un atelier et une recherche achevée ouvrent l’âge III, pour 190 vivres, 85 minerais et 50 cristaux. Les recherches augmentent la charge des pionniers, la portée des Veilleurs et des Vigies, ou la résistance des troupes.

**Contrôler le terrain.** Les Sentinelles ont l’avantage contre les Voltigeurs, les Voltigeurs contre les Veilleurs et les Veilleurs contre les Sentinelles. Gardez une unité militaire au relais central pendant douze secondes pour en prendre le contrôle. Il rapporte ensuite deux cristaux toutes les huit secondes et révèle ses abords. Pour gagner, faites tomber le forum adverse ou protégez une Flèche orbitale en service pendant 90 secondes. Son signal révèle sa position aux deux camps.

| Commande | Action |
| --- | --- |
| Clic, toucher ou clic droit | Sélectionner puis désigner un gisement, une destination ou une cible. Le clic droit donne directement l’ordre à la sélection. |
| Glisser, Maj + clic, double-clic | Cadrer un groupe sur ordinateur, modifier sa composition ou sélectionner les unités du même type à l’écran. |
| Ctrl + 1 à 5, puis 1 à 5 | Mémoriser et rappeler des groupes de commandement. |
| H, V, M, Q | Sélectionner le forum, les pionniers, l’armée ou le prochain pionnier libre. |
| B, A, P | Bâtir, avancer en combattant, activer ou quitter la pause tactique. |
| Téléphone | Glisser pour déplacer la carte, toucher le bouton **Caméra** pour passer à la sélection au cadre. La minicarte sert à rejoindre un autre secteur. |

La pause tactique permet de préparer des ordres. La partie se sauvegarde sur l’appareil et reprend en pause, avec les files, les cargaisons et les groupes en cours. La colonie libre possède sa propre sauvegarde. Pour créer le jeu autonome à ouvrir hors ligne, lancez `npm run build:preview -- dist/NEON-Deux-Rives.html --strategy`.

## Version 6.0 — Le Signal des marées

Ouvrez **Le Signal des marées** au-dessus de la carte. Une nouvelle colonie peut bâtir son hangar après une collecte de minerai et une de cristaux. Une colonie déjà installée peut partir aussitôt avec son hangar et les provisions affichées. Le jeu enregistre chaque manœuvre. Quitter le navigateur suspend la reconnaissance à la case actuelle.

**Piloter.** Le rover part du camp A3. Rejoignez la coordonnée du signal puis revenez en A3 et choisissez **Décharger au camp**. Chaque nouvelle sortie propose un secteur de 35 hexagones, avec des filons, des bornes à usage unique et un mandat facultatif. L’Éclaireur voit plus loin, les Chenilles franchissent les éboulis à moindre coût et le Cargo double les prélèvements. Le même rover assure aussi les expéditions de spécimens du carnet.

| Élément de terrain | Effet sur le trajet |
| --- | --- |
| Piste | 1 charge |
| Éboulis | 2 charges, ou 1 avec les Chenilles |
| Estran | 1 charge à marée basse, 3 à marée haute |
| Faille | Passage impossible |
| Borne | Recharge de 5, dans la limite de la batterie |
| Radar | Révèle trois cases de rayon, pour 1 charge |

La marée reste basse trois tours et haute deux tours. Déplacer le rover, balayer ou attendre fait avancer la marée d’un tour. **Tracer le retour** calcule une route sur le terrain connu avec les marées prévues. Son estimation ignore les bornes encore disponibles. Un **rappel à vide** récupère le véhicule et abandonne sa cargaison. Un premier fragment ouvre le défi facultatif **Vives-eaux**. La visibilité tombe à une case, le rover perd une charge au départ et la pleine mer dure trois tours. Un estran submergé coûte alors 4 charges. Rapporter le signal crédite 6 cristaux et 8 énergies de prime. Un mandat rempli crédite aussi une prime à la décharge. Certaines missions de ravitaillement peuvent se faire avant de chercher le signal.

**Organiser la colonie.** Les quatre pionniers de départ forment une équipe. Six habitants supplémentaires débloquent chaque poste suivant, jusqu’à six équipes. Affectez-les dans l’onglet **Équipes** ou directement sur un atelier. Le supplément de base est de 1 unité par cycle. Un terrain propice apporte 2 unités et un atelier partenaire en apporte 2 autres. Les quatre cases voisines comptent. Pendant le placement ou le déplacement, les cases dorées affichent le supplément total avec une équipe. Déplacer un atelier conserve son équipe et recalcule ses avantages sur place.

**Décider.** Chacun des trois premiers fragments permet au conseil de financer un projet parmi deux. Les effets sont permanents. Une batterie renforcée ou une équipe supplémentaire changent les priorités dès le premier vote. Le port stellaire et les trois décisions donnent accès au **phare des marées**, à construire sur la carte. L’épilogue dépend du dernier vote. Les reconnaissances et leurs mandats restent disponibles après l’allumage du phare.

Les sauvegardes des versions précédentes ouvrent directement cette campagne sur leur carte actuelle. `npm run build:preview` produit toujours le jeu autonome `dist/NEON-Kepler.html` avec une colonie de démonstration et son propre espace de sauvegarde. GitHub Actions joint le jeu et les captures du pilotage sur ordinateur et téléphone à la pull request.

## Version 5.0 — Kepler illustrée

Les quinze bâtiments, les pionniers, le rover et les gisements sont illustrés en vue isométrique. Les installations de niveau II et III reçoivent des équipements visibles tels que des batteries, des réservoirs ou des modules d’habitation. Des chemins relient les bâtiments voisins.

Les falaises plongent dans la mer et les étangs ont des berges basses. Les frondaisons émeraude, les bosquets cuivrés d’Ambre et les conifères de Boréale donnent à chaque monde sa végétation. La caméra adapte son échelle à la taille de l’écran. La vue d’ensemble cadre la carte entière, y compris sur téléphone. Les colonies sauvegardées profitent de ces changements dès leur ouverture.

Pour essayer une colonie déjà développée, l’aperçu **NEON-Kepler.html** s’ouvre directement dans un navigateur. Il embarque les illustrations et utilise une sauvegarde dédiée. Les pull requests proposent cet aperçu et deux captures du jeu dans l’archive **kepler-en-jeu** de GitHub Actions. Pour le générer localement, lancez `npm run build:preview`, puis ouvrez `dist/NEON-Kepler.html`.

## Version 4.2 — Les expéditions du rover

Depuis la carte, ouvrez **Expéditions** pour localiser trois sites et consulter le carnet. Le **hangar à rover** coûte 10 minerais et 3 cristaux. Au début d’une partie, une collecte de minerai et une de cristaux suffisent pour le construire. Choisissez ensuite un site et envoyez le rover avec ses provisions.

| Site | Spécimen | Aller-retour | Provisions | Matériaux rapportés |
| --- | --- | --- | --- | --- |
| Forêt des brumes | Fougère de verre | 24 s | 4 eaux, 2 énergies | 16 biomasses, 6 eaux |
| Falaises ocre | Basalte rubané | 36 s | 6 biomasses, 3 énergies | 22 minerais, 4 cristaux |
| Champ de prismes | Prisme irisé | 48 s | 6 eaux, 4 énergies | 14 cristaux, 8 minerais |

Le rover suit un itinéraire terrestre depuis son hangar. Vous pouvez continuer à bâtir ou quitter le jeu pendant le trajet. À son retour, **Récupérer le spécimen** ajoute la cargaison aux réserves et le rapport au carnet. Une seule sortie peut être engagée à la fois. Un hangar déplacé pendant une sortie sert de base à la suivante.

Rapporter les trois spécimens débloque **l’observatoire des aurores**, qui produit **4 cristaux et 4 énergies par cycle**. Le hangar et l’observatoire sont chacun limités à un exemplaire par colonie. Les sites utilisent des gisements déjà présents sur les cartes historiques, 15 × 15 et 31 × 31. La collecte habituelle reste possible sur ces gisements.

## Version 4.1 — Grandes cartes et nouveaux bâtiments

Les nouvelles parties utilisent un continent de **31 × 31 cases (961 cases)**, contre 225 auparavant, soit 4,27 fois la surface de la grille. Elles proposent 56 gisements renouvelables (14 de chaque ressource naturelle). Les sauvegardes historiques et les cartes 15 × 15 gardent leur géographie ; pour profiter d’un grand continent, créez une nouvelle planète après avoir exporté votre colonie si vous souhaitez la conserver.

La caméra peut parcourir l’ensemble du terrain. Le bouton **▦ Vue d’ensemble** montre la carte entière ; le bouton de recentrage revient à la colonie. Le catalogue propose des filtres Production, Logements et Science et exploration.

| Nouveau bâtiment | Prérequis | Effet par niveau |
| --- | --- | --- |
| Éolienne orbitale | Centrale solaire | +6 énergies / cycle |
| Résidence collective | Habitat | +12 pionniers |
| Ferme hydroponique | Serre vivante | +8 biomasses et +2 eaux / cycle |
| Carrière automatisée | Extracteur doux | +8 minerais / cycle |
| Synthétiseur cristallin | Extracteur doux | +3 cristaux / cycle |
| Institut scientifique | Habitat | −25 % sur le coût des recherches non acquises, arrondi au supérieur |

Les cinq premiers bâtiments s’améliorent jusqu’au niveau III. L’institut a un niveau unique et son bonus ne se cumule pas. Le démonter retire la réduction des recherches futures ; les recherches déjà acquises restent actives. Les technologies existantes conservent leurs cibles : la recherche solaire double la centrale solaire, pas l’éolienne.

Le générateur v2 est indépendant du v1. Les sauvegardes enregistrent la version nécessaire pour reconstruire le bon terrain, même si les deux cartes ont le même numéro et le même biome.

## Version 4 — Mondes procéduraux et nouvelle direction graphique

La version 4 utilisait sept modèles de bâtiments dessinés en SVG, des colons animés et des cartes de construction illustrées.

- Les parties créées en version 4.0 utilisent une carte de 15 × 15 cases avec un littoral, un étang et des ressources placées aléatoirement.
- **Nouvelle planète** ouvre un aperçu : choisissez Émeraude, Ambre ou Boréale, tirez une autre carte ou saisissez un numéro entre 0 et 4 294 967 295.
- La terre est connectée, la zone centrale est dégagée et cinq gisements de chaque ressource naturelle sont disponibles. Les biomes modifient l’ambiance visuelle, pas les règles économiques.
- Le numéro, le biome et la version du générateur sont enregistrés. Recharger ou importer une sauvegarde restitue exactement la carte. Les anciennes sauvegardes conservent le terrain historique et leurs constructions.
- Examiner d’autres planètes ne modifie pas la partie. **Fonder cette colonie** remplace la progression après l’avertissement affiché ; exportez votre sauvegarde si vous souhaitez la conserver.

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

En colonie libre, la progression est pacifique et les réserves sont plafonnées à 9 999 par ressource.

## Sauvegarde et accessibilité

La sauvegarde automatique utilise `localStorage` (`neon-colony-v2`). Elle reste propre au navigateur, à l’appareil et à l’origine du site. La sauvegarde de l’ancien point & click est conservée séparément ; son inventaire n’est pas converti en matériaux.

Dans les options (⚙), exportez votre colonie en fichier JSON pour la conserver ou la transférer sur un autre appareil. L’import demande confirmation avant remplacement et refuse les fichiers incompatibles.

La production hors ligne est créditée au retour, dans la limite de 30 minutes. Si le stockage est bloqué, la session reste jouable. Recommencer demande confirmation.

Les ressources et bâtiments sont accessibles au clavier (Tab, Entrée ou Espace). Échap ferme les fenêtres ou annule un placement. Sur mobile, la caméra montre le terrain au départ ; le glissement déplace la carte. Une fiche permet aussi de collecter la ressource sélectionnée. Les animations suivent la préférence système de réduction des mouvements. Son d’ambiance synthétisé, facultatif, désactivé au chargement et suspendu lorsque l’onglet est masqué.

## Développement

Node.js 22 ou plus. Aucune dépendance npm, aucun CDN, serveur applicatif ou secret.

```sh
npm test
npm run build
npm run dev
# http://localhost:5173
```

- `src/engine.js` : économie, collecte, construction, niveaux, production et sauvegardes.
- `src/world.js` : génération déterministe v1, biomes et numéros de mondes.
- `src/survey.js`, `src/survey-panel.js`, `src/survey-art.js` : itinéraires du rover, carnet et illustrations des spécimens.
- `src/terrain.js`, `src/scenes.js` et `src/art/` gèrent les reliefs, la caméra et les illustrations WebP du jeu.
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

La carte comporte des rivages, des brumes et des colons animés ; les animations respectent la réduction des mouvements.

Les tests procéduraux contrôlent 300 graines (connectivité, ressources, zone centrale, capacité), la reproductibilité, la migration des sauvegardes et trois parcours complets jusqu’à la métropole. Le générateur v1 doit rester immuable : toute évolution modifiant ses sorties nécessite une nouvelle version et le maintien de la lecture v1.

Les tests du rover vérifient les itinéraires terrestres, le paiement au départ, la reprise hors ligne, la récupération unique des cargaisons et un parcours complet jusqu’à l’observatoire. GitHub Actions joue également la première expédition dans Chrome aux formats ordinateur et mobile.
