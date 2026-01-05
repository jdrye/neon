# Space Cleaner

Arcade 2D jouable dans le navigateur avec un mini backend Python pour suivre les parties en direct et conserver un top scores simple.

## Contenu du depot
- `index.html` : jeu et interface (canvas, leaderboard local + reseau).
- `server.py` : serveur HTTP (Python stdlib) pour servir les fichiers et exposer l'API JSON.
- `scores.json` : stockage persistant des meilleurs scores (mis a jour par l'API).
- `.gitignore` : ignore caches Python, logs, fichiers de PID, environnements virtuels, etc.

## Prerequis
- Python 3.9+ recommande (stdlib uniquement, pas de dependances externes).

## Demarrage rapide
```bash
cd /opt/neon
python3 server.py
# Ouvrir http://localhost:8000 dans le navigateur
```

Variables d'environnement utiles :
- `PORT` (defaut `8000`) : port du serveur.
- `IDLE_TIMEOUT` (defaut `15`) : timeout sockets HTTP (secondes).
- `ADMIN_TOKEN` : active `POST /api/reset` pour vider le leaderboard (token simple).
- `DRY_RUN` (ex: `1`) : analyse les payloads sans ecrire `scores.json`.
- `TRUST_PROXY` (ex: `1`) : utilise `X-Forwarded-For` / `X-Real-IP` pour identifier le client.
- `MAX_SESSIONS_PER_IP` (defaut `6`) : limite le nombre de sessions simultanees par IP.
- `RATE_LIMIT_RPS` (defaut `20`) : limite les requetes par seconde et par IP.
- `RATE_LIMIT_BURST` (defaut `40`) : rafale max pour le rate-limit.
- `CACHE_MAX_AGE` (defaut `300`) : cache des assets statiques (secondes).

## API (JSON)
Le front appelle l'API sur `http://<host>:<PORT>/api`. L'URL peut etre forcee via le parametre `?api=...` dans l'URL du jeu.
Par defaut, si le jeu est ouvert en `file://`, il tente `http://localhost:8000`.

- `POST /api/state` : heartbeat + etat du joueur courant.
  - Corps attendu : `sessionId` (obligatoire), `clientId`, `x`, `y`, `color`, `name`, `score`, `time`, `best`, `bestTime`, `since` (timestamp pour recuperer seulement les pairs recents).
  - Reponse : `{ ok, players: [...], board: [...], serverTime }`.
- `POST /api/score` : ajoute un score final et force la sauvegarde disque.
  - Corps : `name`, `score`, `time`, `color`, `sessionId` (optionnel, pour lier la session).
  - Reponse : `{ ok, board: [...], serverTime }`.
- `POST /api/leave` : retire un joueur (fin de session).
  - Corps : `sessionId`.
  - Reponse : `{ ok, removed, serverTime }`.
- `POST /api/reset` : vide le leaderboard (necessite `ADMIN_TOKEN`).
  - Corps : `token` ou header `X-Admin-Token`.
  - Reponse : `{ ok, cleared, serverTime }`.
- `GET /api/state` ou `GET /api/board` : consulte le leaderboard courant.
  - Reponse : `{ ok, board: [...], serverTime }`.

Notes backend :
- Les joueurs en ligne expirent apres `EXPIRATION` (300 s) d'inactivite.
- Les scores sont tries par `score`, puis `time`, puis `created`.
- `MAX_BOARD` limite la taille du leaderboard expose, `MAX_STORE` la taille conservee sur disque (`scores.json`).
- Les scores plus vieux que `BOARD_TTL` (30 jours) sont purges.
- Une session qui se termine sans `POST /api/score` est quand meme enregistree au depart ou a l'expiration.

## Deploiement
- Serve le dossier tel quel (nginx/caddy peuvent servir les fichiers statiques, et proxy vers `server.py` pour `/api/*`).
- Le front detecte automatiquement s'il est heberge sous `/space-cleaner`; sinon il prend la racine. Un parametre `?api=` permet de cibler un autre hote pour l'API.
- Pensez a proteger ou vider `scores.json` si vous voulez repartir d'un leaderboard vierge.

Reverse-proxy (Nginx/Caddy):
- Propager `X-Forwarded-For` pour identifier les clients et activer `TRUST_PROXY=1`.

## Docker
```bash
docker compose up --build
```
Le volume `./scores.json` est monte dans le conteneur pour persister le leaderboard.

## Outils
- `python3 scripts/lint_scores_json.py` : verifie la structure de `scores.json`.
- `python3 -m unittest tests/test_server.py` : tests unitaires basiques.

## Developpement rapide
- Aucune dependance : modifiez `index.html` et rechargez.
- Pour simuler plusieurs joueurs, ouvrez plusieurs onglets (chaque client genere `sessionId` et `clientId` propres).
- Pour aller plus loin, voir `IMPROVEMENTS.md` pour une liste d'idees d'evolutions.
