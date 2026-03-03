# Aventurier des Ruines - Web Platformer 2D

Jeu médiéval-fantasy **jouable dans le navigateur** (moteur SVG/DOM), sans assets externes.

## Lancer le jeu (web)
```bash
cd /opt/neon
python3 server.py
```
Puis ouvre:
- `http://127.0.0.1:8000`

Si le port `8000` est déjà utilisé:
```bash
PORT=8080 python3 server.py
```
Puis ouvre `http://127.0.0.1:8080`.

## Contrôles
- Déplacement: `A` / `D` ou flèches gauche/droite
- Saut: `Espace`
- Attaque mêlée: `J` ou clic gauche
- Dash: `K` ou `Shift`
- Interagir (checkpoint/porte): `E`
- Pause: `P` ou `Échap`

## Gameplay
- Side-scrolling avec caméra dynamique
- Collisions solides + plateformes one-way
- Ennemis (gobelin, squelette, chauve-souris)
- Dégâts, mort, respawn sur checkpoint activé
- Collectibles, sortie de niveau, écran de victoire
- HUD (PV, score, timer, cooldown dash)
- Sauvegarde locale + leaderboard local (via `localStorage`)

## Données de niveau
Niveau principal: `game/assets/levels/level1.json`

Champs:
- `tile_size`
- `grid`
- `spawn_player`
- `checkpoints`
- `enemies`
- `collectibles`
- `exit`

Le jeu web charge ce fichier JSON au démarrage.

## Dépendances et outils
Install (sans venv):
```bash
make deps
# ou
python3 -m pip install --user -r requirements.txt
```

Validation:
```bash
make test
make lint
make format
```

## Structure utile
- `index.html`: jeu web complet (UI, boucle, gameplay, rendu)
- `server.py`: serveur HTTP local pour lancer le jeu
- `game/assets/levels/level1.json`: niveau
- `tests/`: tests Python de logique existants
- `Makefile`: commandes standard (`deps`, `run`, `test`, `lint`, `format`)
