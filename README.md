# Ether Relay

Jeu d action spatial jouable dans le navigateur. Tu pilotes un drone pour recharger des relais en pleine tempete de debris. Le front est un fichier statique et le backend Python (stdlib) expose une API JSON pour les sessions live et le leaderboard.

## Points cles
- Boucle de jeu: collecter des noyaux, livrer aux relais, declencher des surges.
- Flux d energie (multiplicateur) qui monte avec les livraisons rapides et decroit en cas de choc.
- Modules temporaires: stase, phase, aimant, turbo, reparation.
- Leaderboard 100% serveur et presence live.

## Structure du depot
- `index.html` : jeu + interface.
- `server.py` : serveur HTTP + API JSON.
- `Dockerfile` / `docker-compose.yml` : containerisation simple.
- `scripts/` : utilitaires (lint scores).
- `tests/` : tests unitaires backend.
- `scores.json` : genere au runtime, ignore par git.

## Demarrage rapide
```bash
cd /opt/neon
python3 server.py
# http://localhost:8000
```

Si le front est ouvert en `file://`, il tentera `http://localhost:8000` par defaut.

## Commandes
- Deplacement: ZQSD ou fleches.
- Onde de choc: Espace.
- Pause: P ou Entrer.
- Briefing: T.

### Configuration (variables d environnement)
- `PORT` (defaut `8000`)
- `IDLE_TIMEOUT` (defaut `15`)
- `ADMIN_TOKEN` : active `POST /api/reset` (alias `RESET_TOKEN` accepte)
- `DRY_RUN` (`1`/`true`) : analyse sans ecriture disque
- `TRUST_PROXY` (`1`/`true`) : utilise `X-Forwarded-For` / `X-Real-IP`
- `MAX_SESSIONS_PER_IP` (defaut `6`)
- `RATE_LIMIT_RPS` (defaut `20`)
- `RATE_LIMIT_BURST` (defaut `40`, calcule si absent)
- `CACHE_MAX_AGE` (defaut `300`)

## API
Base: `http://<host>:<port>/api`. Le client peut forcer l API avec `?api=https://...`.
Si le front est heberge sous `/ether-relay`, ce prefixe est ajoute automatiquement (compatibilite `/space-cleaner` conservee).

- `POST /api/state`
  - body: `sessionId` (obligatoire), `clientId`, `instanceId`, `x`, `y`, `color`, `name`, `score`, `time`, `best`, `bestTime`, `since`
  - reply: `{ ok, players, board, serverTime }`
- `POST /api/score`
  - body: `name`, `score`, `time`, `color`, `sessionId` (optionnel)
  - reply: `{ ok, board, serverTime }`
- `POST /api/leave`
  - body: `sessionId` ou `clientId` (+ `instanceId` optionnel)
  - reply: `{ ok, removed, removedIds, serverTime }`
- `POST /api/reset`
  - body: `token` (ou header `X-Admin-Token`), requiert `ADMIN_TOKEN`
  - reply: `{ ok, cleared, serverTime }`
- `GET /api/state` ou `GET /api/board`
  - reply: `{ ok, board, serverTime }`

## Stockage et tri des scores
- `scores.json` est cree et mis a jour par le serveur (non versionne).
- Le leaderboard expose le top 10 (`MAX_BOARD`) et conserve jusqu a 100 scores (`MAX_STORE`).
- Tri: `score` desc, puis `time` desc, puis `created`.
- Purge automatique des scores vieux de 30 jours (`BOARD_TTL`).

## Docker
```bash
docker compose up --build
```
Le volume `./scores.json` est monte dans le conteneur pour persister les scores.

## Outils et tests
```bash
python3 scripts/lint_scores_json.py
python3 -m unittest tests/test_server.py
```

## Deploiement
- Un reverse proxy (nginx/caddy) peut servir les assets statiques et proxyfier `/api`.
- Propager `X-Forwarded-For` et activer `TRUST_PROXY=1` si besoin.
