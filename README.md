# Neon Rift: Last Beacon

Neon Rift est un roguelite d'arène original pour navigateur. Le joueur pilote le Spectre, défend le dernier phare de la cité pendant cinq vagues, compose son arsenal entre les secteurs et affronte un boss final.

## Systèmes de jeu

- Déplacement libre dans une arène en temps réel
- Visée automatique avec guidage manuel optionnel à la souris
- Dash phasé procurant une brève invulnérabilité
- Éclaireurs, artilleurs, colosses et boss aux comportements distincts
- Projectiles ennemis, collisions, pickups, multiplicateur et score local
- Trois améliorations aléatoires proposées entre chaque vague
- Neuf mutations : dégâts, cadence, projectiles, perforation, vitesse, dash, coque, bouclier et vélocité
- Commandes tactiles sur mobile

## Commandes

- `WASD`, `ZQSD` ou flèches : déplacement
- `Espace` : dash phasé
- Souris : guidage manuel du canon, sinon visée automatique
- `P` ou `Échap` : pause

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

Le workflow `.github/workflows/pages.yml` construit automatiquement le projet Vite et publie `dist/` sur GitHub Pages après chaque push sur `main`.
