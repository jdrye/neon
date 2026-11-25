import {HOME, RIVAL, SIDE, tileDistance} from './strategy-rules.js?v=7.0.0';
import {cancelSite, createMatch, notify, orderUnits, unitsOf} from './strategy-engine.js?v=7.0.0';
import {planSide, tickMatch} from './strategy-ai.js?v=7.0.0';

// Replay the opening through the same economy, construction, visibility and
// combat rules as a fresh skirmish. Aurore's opening commander holds the town.
export function siegeOfAurore() {
  const s = createMatch(126, 'delta', 'fierce');
  const commander = {lastRaid:0};
  while (s.tick < 936 && !s.result) {
    if (s.tick % 12 === 0) {
      planSide(s, 0, 'fierce', commander);
      const raiders = unitsOf(s, 0).filter(u =>
        u.order.kind === 'advance' && tileDistance(u.order.cell, RIVAL) < 7);
      if (raiders.length) orderUnits(s, 0, raiders.map(u => u.id), 'move', HOME + 2 - SIDE);
    }
    tickMatch(s);
  }
  // The orbital works have been evacuated. The new commander can invest the
  // remaining materials in the spire, reinforcements or the town's defences.
  const works = s.buildings.find(b => !b.side && b.type === 'spire' && !b.ready);
  if (works) cancelSite(s, 0, works.id);
  s.scenario = 'siege';
  notify(s, 'Les chantiers orbitaux ont été évacués. Cendre approche de la vigie. À vous de prendre le commandement.');
  return s;
}
