# Ether Relay

Ether Relay est un jeu d action spatial one‑page jouable dans le navigateur. Tu pilotes un drone de ravitaillement dans une tempete de debris pour recharger des relais, maintenir un flux d energie eleve et survivre aux fronts successifs. Le front est un unique `index.html` (HTML/CSS/JS), tandis que le backend Python (stdlib) fournit la presence live et le leaderboard.

## Ce qui rend le jeu unique
- **Boucle nerveuse** : collecte → livraison → surge, avec un multiplicateur de flux a proteger.
- **Boost tactique** : un burst court qui permet d eviter un pic de danger ou de franchir la tempete.
- **Anomalies de flux** : zones temporaires qui recompensent la prise de risque (points + recharge d onde).
- **Fronts climatiques** : vagues distinctes qui modifient la vitesse, la taille et la densite des debris.
- **HUD clair** : objectif contextuel, etats d onde/boost, integrite et relais cible.

## Controles
- Deplacement : ZQSD ou fleches.
- Onde de choc : Espace.
- Boost : Shift ou B.
- Pause : P ou Entrer.
- Briefing : T.
- Mobile : pad directionnel + boutons Onde et Boost.

## Gameplay rapide
1. Ramasse des noyaux pour remplir le cargo.
2. Livrer un cargo charge un relais et augmente le flux (multiplicateur).
3. Un relais sature declenche un surge (nettoyage local + gros bonus).
4. Utilise le boost quand la densite de debris devient critique.
5. Reste dans une anomalie de flux pour engranger des points et recharger l onde.

## Structure du depot
- `index.html` : interface, rendu, moteur de jeu et logique gameplay.
- `server.py` : serveur HTTP + API JSON (presence live + leaderboard).
- `scripts/` : utilitaires de maintenance (ex: lint des scores).
- `tests/` : tests unitaires backend.

## Demarrage rapide
```bash
cd /workspace/neon
python3 server.py
# http://localhost:8000
```

> Si le front est ouvert en `file://`, il utilise `http://localhost:8000` par defaut.

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
Base: `http://<host>:<port>/api`. Le client peut forcer l API via `?api=https://...`.
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
