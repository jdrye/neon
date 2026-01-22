# Ether Relay

Jeu d action spatial jouable dans le navigateur. Tu pilotes un drone chargeur qui traverse une tempete de debris pour realimenter des relais. Le front est un fichier statique unique, le backend Python (stdlib) expose une API JSON pour la presence live et le leaderboard.

## Apercu
- Boucle de jeu: collecter des noyaux, remplir le cargo, livrer aux relais, declencher un surge.
- Flux d energie (multiplicateur) qui monte avec les livraisons rapides et chute apres collision.
- Integrite remplace les vies; le drone est repare via modules.
- Leaderboard 100% serveur et classement live en surcouche.

## Controles
- Deplacement: ZQSD ou fleches.
- Onde de choc: Espace.
- Pause: P ou Entrer.
- Briefing: T.
- Mobile: pad directionnel + bouton Onde.

## Gameplay rapide
1. Collecte des noyaux lumineux pour charger le cargo.
2. Approche un relais pour livrer et recharger sa jauge.
3. Un relais a 100% declenche un surge (nettoyage local + gros bonus).
4. La tempete s intensifie par fronts; adapte tes modules (stase, phase, aimant, turbo, reparation).

## Structure du depot
- `index.html` : jeu + interface + logique front.
- `server.py` : serveur HTTP + API JSON.
- `scripts/` : utilitaires (lint scores).
- `tests/` : tests unitaires backend.

## Demarrage rapide
```bash
cd /opt/neon
python3 server.py
# http://localhost:8000
```

Si le front est ouvert en `file://`, il tentera `http://localhost:8000` par defaut.

## Variables d environnement
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

## Scores et retention
- `scores.json` est cree et mis a jour par le serveur (non versionne).
- Le leaderboard expose le top 10 (`MAX_BOARD`) et conserve jusqu a 100 scores (`MAX_STORE`).
- Tri: `score` desc, puis `time` desc, puis `created`.
- Purge automatique des scores vieux de 30 jours (`BOARD_TTL`).

## Tests
```bash
python3 scripts/lint_scores_json.py
python3 -m unittest tests/test_server.py
```

## Deploiement
- Un reverse proxy (nginx/caddy) peut servir les assets statiques et proxyfier `/api`.
- Propager `X-Forwarded-For` et activer `TRUST_PROXY=1` si besoin.
