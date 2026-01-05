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

## API (JSON)
Le front appelle l'API sur `http://<host>:<PORT>/api`. L'URL peut etre forcee via le parametre `?api=...` dans l'URL du jeu.
Par defaut, si le jeu est ouvert en `file://`, il tente `http://localhost:8000`.

- `POST /api/state` : heartbeat + etat du joueur courant.
  - Corps attendu : `sessionId` (obligatoire), `clientId`, `x`, `y`, `color`, `name`, `score`, `time`, `best`, `bestTime`, `since` (timestamp pour recuperer seulement les pairs recents).
  - Reponse : `{ ok, players: [...], board: [...], serverTime }`.
- `POST /api/score` : ajoute un score final et force la sauvegarde disque.
  - Corps : `name`, `score`, `time`, `color`.
  - Reponse : `{ ok, board: [...], serverTime }`.
- `POST /api/leave` : retire un joueur (fin de session).
  - Corps : `sessionId`.
  - Reponse : `{ ok, removed, serverTime }`.
- `GET /api/state` ou `GET /api/board` : consulte le leaderboard courant.
  - Reponse : `{ ok, board: [...], serverTime }`.

Notes backend :
- Les joueurs en ligne expirent apres `EXPIRATION` (300 s) d'inactivite.
- Les scores sont tries par `score`, puis `time`, puis `created`.
- `MAX_BOARD` limite la taille du leaderboard expose, `MAX_STORE` la taille conservee sur disque (`scores.json`).
- Les scores plus vieux que `BOARD_TTL` (30 jours) sont purges.

## Deploiement
- Serve le dossier tel quel (nginx/caddy peuvent servir les fichiers statiques, et proxy vers `server.py` pour `/api/*`).
- Le front detecte automatiquement s'il est heberge sous `/space-cleaner`; sinon il prend la racine. Un parametre `?api=` permet de cibler un autre hote pour l'API.
- Pensez a proteger ou vider `scores.json` si vous voulez repartir d'un leaderboard vierge.

## Developpement rapide
- Aucune dependance : modifiez `index.html` et rechargez.
- Pour simuler plusieurs joueurs, ouvrez plusieurs onglets (chaque client genere `sessionId` et `clientId` propres).
- Pour aller plus loin, voir `IMPROVEMENTS.md` pour une liste d'idees d'evolutions.
