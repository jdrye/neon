# Pistes d'amélioration

Idées à explorer pour améliorer l'expérience de jeu et la maintenance du projet. Toutes les suggestions restent compatibles avec l'architecture actuelle (backend HTTP simple + front statique).

## Expérience de jeu
- Ajouter un mode tutoriel rapide (texte ou overlay interactif) pour présenter les contrôles et les bonus.
- Proposer un mode "vibration" visuelle optionnel (effet écran/secousses) avec un curseur d'intensité pour éviter l'inconfort.
- Introduire un preset "accessibilité" (contraste fort activé par défaut, tailles de police et HUD majorées).
- Prévoir une option mobile: zone de contrôle tactile et auto-fire pour jouer sur petits écrans.

## Mécaniques et équilibrage
- Implémenter des vagues thématiques (ex: chasseurs rapides, tanks lents) avec annonce à l'écran et bonus ciblés en récompense.
- Ajouter une montée en difficulté progressive basée sur la durée de la session plutôt que le score brut.
- Varier les power-ups en ajoutant des malus temporaires (ralentissement, visibilité réduite) pour dynamiser le rythme.

## Leaderboard et sessions
- Afficher le leaderboard "live" dans un panneau rabattable pendant la partie (sans quitter le canvas).
- Ajouter un filtre/commande pour réinitialiser le leaderboard côté serveur (protégé par variable d'environnement ou jeton admin simple).
- Enregistrer le score max d'une session directement dans `scores.json` pour faciliter les analyses (CSV/exports rapides).

## Backend et stabilité
- Loguer chaque requête API (succès/erreur) avec taille et durée pour diagnostiquer les déconnexions.
- Plafonner le nombre de sessions simultanées par IP et bannir les payloads trop fréquents (rate-limit minimal côté serveur).
- Servir le front avec des en-têtes de cache appropriés et compresser les réponses statiques (gzip/brotli via reverse-proxy ou middleware).

## Observabilité et tests
- Ajouter des tests unitaires simples sur la normalisation des données (`_normalize_*`) et sur le tri du leaderboard.
- Intégrer un mode "dry-run" pour le serveur afin d'analyser des payloads sans écrire sur disque.
- Ajouter un script de vérification (lint léger) pour le JSON (`scores.json`) et la cohérence des clés envoyées par le front.

## Déploiement
- Fournir un `Dockerfile` minimal et un `docker-compose.yml` (exposition du port, montage du volume `scores.json`).
- Documenter un déploiement en reverse-proxy (Nginx/Caddy) avec TLS et header `X-Forwarded-For` pour mieux identifier les clients.
