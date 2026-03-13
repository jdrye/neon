# Neon Rift (DOM Edition)

Ce dépôt contient un **seul jeu web** refait complètement : **Neon Rift**.

- Type : jeu web **DOM/CSS/JS** (sans canvas)
- Port : `8000`
- Service : `systemd` (`neon-game.service`)
- Runtime serveur : **Node.js** (sans Python)

## Structure

- `server.js` : serveur HTTP Node.js minimal (`/health` + fichiers statiques)
- `web/index.html` : UI du jeu
- `web/styles.css` : styles et effets visuels
- `web/game.js` : moteur et logique du jeu
- `tests/e2e/game-smoke.spec.js` : tests e2e Playwright
- `scripts/bot_play.js` : bot Playwright pour simulation
- `systemd/neon-game.service` : unité systemd

## Lancer manuellement

```bash
npm install
npm run start
```

Puis ouvrir :

- `http://127.0.0.1:8000`

## Installer en service systemd

```bash
cd /opt/neon
./scripts/install_systemd_service.sh
```

## Tests

```bash
npm run test:e2e
RUNS=8 npm run bot:play
npm run test:all
```

> Si Chromium Playwright n'est pas installé localement : `npx playwright install chromium`.

## Gameplay

- Déplacement : `WASD` ou flèches
- `Espace` : dash
- `P` : pause/reprise
- `R` : relancer
- `M` : son on/off
- Collecte de reliques pour monter le score/combo
- Orbes bonus : soin, chrono (ralentissement), surge (reset dash)
- Victoire à `60s`, défaite à `0 PV`

Le leaderboard est stocké en local (`localStorage`).
