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

## Test E2E (Playwright)

Test de non-regression: la touche `Espace` ne doit pas relancer une partie en cours.

```bash
cd /opt/neon
npm ci
npx playwright install chromium
npx playwright test tests/e2e/space-no-restart.spec.js
```

## Gameplay

- But: survivre `90s`
- Déplacement: `WASD` ou flèches
- `Espace`: dash défensif (cooldown)
- Mobile: glisser dans la zone de jeu
- `P`: pause/reprise
- `R`: relancer

Le leaderboard est stocké en local (`localStorage`) dans le navigateur.

## Jouer en bot (benchmark)

```bash
cd /opt/neon
RUNS=8 node scripts/bot_play.js
```
