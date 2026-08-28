# Neon Relay

Neon Relay est un jeu d'arcade original et autonome pour navigateur. Le joueur change de voie pour collecter les fragments du réseau, évite les anomalies et utilise une impulsion de proximité pour restaurer trois relais.

## Commandes

- `←` / `→` ou `A` / `D` : changer de voie
- `Espace` : impulsion défensive
- `P` ou `Échap` : pause
- Commandes tactiles disponibles sur mobile

## Développement

```bash
npm install
npm run dev
```

## Vérification

```bash
npm run build
npm test
```

## GitHub Pages

Le workflow `.github/workflows/pages.yml` construit automatiquement le projet Vite puis publie `dist/` sur GitHub Pages à chaque push sur `main`.
