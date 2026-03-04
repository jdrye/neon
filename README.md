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

## Gameplay

- But: survivre `90s`
- Déplacement: `WASD` ou flèches
- Mobile: glisser dans la zone de jeu
- `P`: pause/reprise
- `R`: relancer

Le leaderboard est stocké en local (`localStorage`) dans le navigateur.
