# NÉON — Les Deux Rives

Un jeu de stratégie et de colonisation en français. Sur Kepler, Aurore et Cendre occupent deux rives du même bassin. Les pionniers construisent la cité, les troupes en défendent les accès et le rover explore le terrain qu’elles se disputent. [Jouer sur GitHub Pages](https://jdrye.github.io/neon/)

## Fonder Aurore

Choisissez le delta, les plateaux d’ambre ou les cols de givre, un numéro de carte et la difficulté. **Fonder la colonie** vous donne un forum, cinq pionniers et un Voltigeur. Quatre pionniers travaillent déjà. Le cinquième peut construire un hangar ou une caserne, rejoindre une équipe de récolte ou assurer la production d’une installation.

| Dans la partie | Ce que vous commandez |
| --- | --- |
| **Ordres** | Sélection, récolte, chantiers civils et militaires, formation, recherches et groupes de troupes. |
| **Cité** | Objectifs, primes, installations, production par cycle de douze secondes et décisions du conseil. Cliquer sur une installation la sélectionne sur la carte. |
| **Rover** | Équipement, départ, surveillance du trajet, radar et rappel du véhicule. Les pionniers et Cendre continuent d’agir pendant ce temps. |

## Construire et explorer

Les vivres, le bois, le minerai, les cristaux, l’eau et l’énergie forment le stock de la cité. Un pionnier rapporte ses récoltes au forum ou au dépôt le plus proche. Un habitat ouvre six places par niveau. Former des pionniers et changer d’âge mobilisent la même file du forum.

Une centrale produit de l’énergie, un collecteur de l’eau, une serre des vivres et un extracteur du minerai et des cristaux. Affecter un pionnier à une installation lui fait quitter son activité précédente et rejoindre physiquement son poste. Le voisinage des gisements, du rivage et des bâtiments partenaires améliore le rendement. Les niveaux II et III et les recherches civiles augmentent la production. L’institut réduit de 25 % le coût des nouvelles recherches civiles.

Les pionniers bâtissent le hangar sur le terrain. Chaque sortie consomme des provisions communes. L’Éclaireur découvre davantage de terrain, les Chenilles traversent les gués à pleine vitesse à marée haute et le Cargo double le minerai et les cristaux rapportés. La cargaison est créditée au retour. Une patrouille ennemie peut interrompre le prélèvement jusqu’à l’arrivée d’une escorte. Si le hangar tombe, le rover peut décharger au forum.

Trois spécimens ouvrent l’observatoire. Les fragments du Signal des marées ouvrent trois décisions permanentes. Le conseil peut renforcer le radar, ouvrir un poste supplémentaire dans les installations ou améliorer le rendement des équipes et des sorties. Le port stellaire et les trois votes permettent de construire le phare des marées.

## Commander sur le terrain

Les Sentinelles contrent les Voltigeurs, les Voltigeurs contrent les Veilleurs et les Veilleurs contrent les Sentinelles. Le relais central accorde de la visibilité et deux cristaux toutes les huit secondes après douze secondes de contrôle militaire. Le siège se déclenche quand une colonne de Cendre s’approche d’Aurore.

Un forum adverse détruit ou une Flèche orbitale défendue pendant 90 secondes pacifie le bassin. La cité, ses installations, son âge et son carnet restent sur place. La colonisation et les expéditions se poursuivent. La chute de votre forum ou la synchronisation de la Flèche de Cendre termine la partie.

| Commande | Action |
| --- | --- |
| Clic ou toucher | Sélectionner une unité, puis désigner une destination ou une ressource. |
| Clic droit | Donner un ordre contextuel ou fixer un ralliement depuis un bâtiment de formation. |
| Glisser, Maj + clic, double-clic | Sélectionner un groupe, modifier sa composition ou prendre toutes les unités du même type à l’écran. |
| Ctrl + 1 à 5, puis 1 à 5 | Mémoriser et rappeler un groupe, y compris sur un clavier AZERTY. |
| H, V, M, Q | Sélectionner le forum, les pionniers, l’armée ou le prochain pionnier libre. |
| B, A, P | Construire, avancer en combattant, mettre en pause ou reprendre. |
| Téléphone | Glisser pour déplacer la carte. Le bouton Caméra permet de passer à la sélection au cadre. |

## Retrouver une partie

La campagne s’enregistre sur cet appareil et reprend en pause. La simulation utilise le temps de jeu pour la ville, le rover et le front. Le menu permet d’exporter ou d’importer un fichier JSON.

À la première ouverture, les sauvegardes locales de la colonie et de l’escarmouche sont lues ensemble. Une escarmouche en cours fournit le terrain, les troupes et les files de production. Les anciennes réserves de minerai et de cristaux s’ajoutent aux réserves du front dans la limite de stockage. La biomasse rejoint les vivres. Les bâtiments civils sont replacés à proximité du forum avec leur niveau. Un bâtiment qui manque de place devient un kit à réinstaller gratuitement. Les recherches, les spécimens, les votes et la cargaison d’une sortie déjà payée suivent la cité.

Une ancienne victoire permet de poursuivre sur un bassin pacifié. Si l’escarmouche archivée était perdue et qu’une colonie civile existe, la reprise se fait depuis cette colonie. Les fichiers d’origine restent disponibles. Sur un autre appareil, l’import accepte une campagne complète ou les deux anciens fichiers JSON sélectionnés ensemble.

## Lancer et vérifier

```sh
npm test
npm run build
npm run dev
npm run build:preview -- dist/NEON-Aurore.html
```

Le fichier HTML autonome embarque le même jeu et les illustrations. Le contrôle GitHub Actions joue la campagne à la souris et au toucher, teste la migration des deux archives et joint l’HTML ainsi que les captures dans l’artefact **kepler-en-jeu**. Le workflow publie le jeu sur GitHub Pages lors d’un push sur `main`.
