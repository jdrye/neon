export const SURVEYS = {
  flora: {
    name: 'Forêt des brumes', node: 'bio', duration: 24_000, color: '#a9efb7',
    specimen: 'Fougère de verre', brief: 'Sous les brumes, les frondes translucides se replient au lever du second soleil.',
    report: 'Les nervures creuses de la fougère piègent la rosée. Les serres de Kepler disposent de leurs premières boutures.',
    cost: { water: 4, energy: 2 }, reward: { bio: 16, water: 6 },
  },
  strata: {
    name: 'Falaises ocre', node: 'ore', duration: 36_000, color: '#ffca94',
    specimen: 'Basalte rubané', brief: 'Des couches de roche claire traversent l’escarpement. Le rover peut en prélever une carotte.',
    report: 'Les bandes du basalte gardent la trace de trois coulées de lave. Leurs inclusions sont assez riches pour alimenter le chantier.',
    cost: { bio: 6, energy: 3 }, reward: { ore: 22, crystal: 4 },
  },
  prism: {
    name: 'Champ de prismes', node: 'crystal', duration: 48_000, color: '#d6bcff',
    specimen: 'Prisme irisé', brief: 'À flanc de colline, un réseau de cristaux décompose la lumière des deux soleils.',
    report: 'Le prisme sépare deux raies de lumière invisibles à l’œil nu. Les pionniers en ont tiré une lentille pour leurs instruments.',
    cost: { water: 6, energy: 4 }, reward: { crystal: 14, ore: 8 },
  },
};

const charts = new WeakMap();
const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];

// Landmarks use existing deposits, so even fully built historical colonies keep their layout.
function chart(tiles) {
  if (charts.has(tiles)) return charts.get(tiles);
  const byId = new Map(tiles.map(tile => [tile.id, tile]));
  const anchors = [byId.get('5,5')];
  const sites = {};
  for (const [key, survey] of Object.entries(SURVEYS)) {
    let bestDistance = -1;
    for (const tile of tiles) {
      if (tile.node !== survey.node || tile.terrain === 'water') continue;
      const distance = Math.min(...anchors.map(a => Math.abs(tile.x - a.x) + Math.abs(tile.y - a.y)));
      if (distance > bestDistance) {
        bestDistance = distance;
        sites[key] = tile;
      }
    }
    if (sites[key]) anchors.push(sites[key]);
  }
  const result = { byId, sites, routes: new Map() };
  charts.set(tiles, result);
  return result;
}

export function surveySites(tiles) {
  return chart(tiles).sites;
}

// Cache just the last departure point per site. Moving the hangar changes the next route.
export function surveyRoute(tiles, origin, key) {
  const { byId, sites, routes } = chart(tiles);
  const target = sites[key], start = byId.get(origin);
  if (!target || !start || start.terrain === 'water') return [];
  const cached = routes.get(key);
  if (cached?.origin === origin) return cached.path;
  const previous = new Map([[origin, null]]);
  const queue = [start];
  for (let i = 0; i < queue.length && !previous.has(target.id); i++) {
    const tile = queue[i];
    for (const [dx, dy] of directions) {
      const next = byId.get(`${tile.x + dx},${tile.y + dy}`);
      if (!next || next.terrain === 'water' || previous.has(next.id)) continue;
      previous.set(next.id, tile);
      queue.push(next);
    }
  }
  if (!previous.has(target.id)) return [];
  const path = [];
  for (let tile = target; tile; tile = previous.get(tile.id)) path.push(tile);
  path.reverse();
  routes.set(key, { origin, path });
  return path;
}

export function surveyProgress(trip, now = Date.now()) {
  return Math.max(0, Math.min(1, (now - trip.startedAt) / SURVEYS[trip.site].duration));
}

export function restoreSurvey(raw, tiles, now) {
  const completed = Array.isArray(raw?.completed)
    ? [...new Set(raw.completed.filter(key => typeof key === 'string' && Object.hasOwn(SURVEYS, key)))] : [];
  const trip = raw?.active;
  let active = null;
  if (trip && typeof trip.site === 'string' && Object.hasOwn(SURVEYS, trip.site) && !completed.includes(trip.site)
      && Number.isSafeInteger(trip.startedAt) && trip.startedAt >= 0
      && typeof trip.origin === 'string' && surveyRoute(tiles, trip.origin, trip.site).length) {
    active = { site: trip.site, origin: trip.origin, startedAt: Math.min(now, trip.startedAt) };
  }
  return { completed, active };
}
