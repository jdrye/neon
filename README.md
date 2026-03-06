# Ruins Dash (Jeu Unique)

Ce dépôt a été nettoyé pour ne conserver **qu'un seul jeu**: `Ruins Dash`.

- Type: jeu web (canvas 2D)
- Port: `8000`
- Service: `systemd` (`neon-game.service`)

## Structure

- `server.py`: serveur HTTP simple et commenté
- `web/index.html`: interface du jeu
- `web/styles.css`: styles responsive
- `web/game.js`: logique du jeu, commentée
- `systemd/neon-game.service`: unité systemd
- `scripts/install_systemd_service.sh`: script d'installation systemd
- `scripts/bot_play.js`: bot de jeu automatique pour benchmark gameplay

## Lancer manuellement

```bash
cd /opt/neon
python3 server.py
```

Puis ouvrir:

- `http://127.0.0.1:8000`

## Installer en service systemd

```bash
cd /opt/neon
./scripts/install_systemd_service.sh
```

Commandes utiles:

```bash
systemctl status neon-game.service
journalctl -u neon-game.service -f
curl http://127.0.0.1:8000/health
```

## Tests automatiques

Le projet utilise:
- des tests e2e Playwright (smoke + debug API)
- un bot Playwright pour rejouer des parties et suivre l'equilibrage

```bash
cd /opt/neon
npm ci
npx playwright install chromium
npm run test:e2e
RUNS=8 npm run bot:play
npm run test:all
```

## Gameplay

- But: survivre `60s` dans l'arene
- Déplacement: `WASD` ou fleches
- `Espace`: rush defensif (invulnerabilite courte + onde de repoussement)
- `M`: activer / couper les effets sonores
- `V`: basculer en mode effets visuels reduits
- Mobile: glisser dans la zone de jeu + bouton `RUSH`
- `P`: pause/reprise
- `R`: relancer

Boucle de jeu:
- Ramasser les reliques augmente fortement le score
- Un orbe de soin apparait regulierement
- Toutes les `15s`, un checkpoint declenche une onde de securite et regenere 1 PV
- Nouveau pattern ennemi `lancer` (windup + charge, ajusté pour etre lisible)
- Nouveau pattern ennemi `wisp` (orbite + burst telegraphie)
- Mini-boss a `30s`, en 3 phases (phase 3: onde de choc)
- Patterns de projectiles boss telegraphies et alternes (eventail / balayage)
- Fenetre `BOSS-OPEN` apres salve pour contre-attaque au dash
- Feedback de degats renforce (hit-stop court + vignette d'alerte)
- Mouvements joueur lisses mais reactifs (inertie controlee)
- Combo dynamique: enchainer les reliques augmente le multiplicateur de score
- Near-miss reward: frôler les projectiles sans se faire toucher rapporte des points bonus
- Orbes Aegis: bouclier temporaire qui absorbe les impacts critiques
- Orbe Chrono: ralentit temporairement ennemis, boss et projectiles
- Difficulté adaptative légère (respiration quand PV bas)
- Dash sur le boss pour casser son armure et gagner des bonus
- Effets sonores reactifs (`M` pour mute/unmute)
- Defaite si PV a zero, victoire si `60s` atteintes

Le leaderboard est stocké en local (`localStorage`) dans le navigateur.

## Bot (benchmark)

```bash
cd /opt/neon
RUNS=8 npm run bot:play
```
