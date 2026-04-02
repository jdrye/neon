# Pocket Patience

Pocket Patience is an original browser card game between creature collecting and solitaire. You build four biome foundations, evolve pocket companions at habitat milestones, and only need to crown three of them to win the run.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## Rules

- Build descending tableau runs and ascending habitat foundations by biome.
- Every habitat evolves one companion at ranks `1`, `7`, and `13`.
- Ember relaxes empty-column rules, Tide extends redeals, Volt opens tableau stacking.
- Spend charms to reveal hidden cards or recall the waste back into stock.
- Win by fully evolving any `3` companions.
