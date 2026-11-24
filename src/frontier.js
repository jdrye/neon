// A sortie is saved as an itinerary. Replaying it restores exactly the same fog,
// battery and cargo without trusting counters imported from a save file.
export const RIGS = {
  scout: { name: 'Éclaireur', battery: 15, sight: 2, cost: { water: 4, energy: 3 }, detail: 'Repère le terrain à deux cases. Le meilleur choix pour une première sortie.' },
  crawler: { name: 'Chenilles', battery: 14, sight: 1, cost: { ore: 3, energy: 3 }, detail: 'Traverse les éboulis pour une seule charge. Pratique pour couper à travers le relief.' },
  hauler: { name: 'Cargo', battery: 13, sight: 1, cost: { bio: 5, energy: 3 }, detail: 'Double les matériaux prélevés dans les filons. Sa batterie laisse moins de marge au retour.' },
};

export const CHAPTERS = [
  { title: 'Une voix sous l’eau', story: 'Sous le bruit des vagues, une balise répète les coordonnées d’un abri. Le conseil peut adapter ses vieux accumulateurs ou employer les places de cet abri pour accueillir des volontaires.', options: {
    cells: { name: 'Récupérer les accumulateurs', effect: 'Le rover part avec 3 charges de plus à chaque nouvelle sortie.', cost: { ore: 14, crystal: 6 } },
    guild: { name: 'Ouvrir l’abri aux volontaires', effect: 'Une équipe de terrain supplémentaire peut travailler dans la colonie.', cost: { bio: 14, water: 10 } },
  } },
  { title: 'Les archives du rivage', story: 'Le deuxième fragment contient les carnets de celles et ceux qui vivaient ici. Il reste assez de pages lisibles pour transmettre une méthode aux prospecteurs ou aux équipes de la colonie.', options: {
    assay: { name: 'Former les prospecteurs', effect: 'Chaque filon visité rapporte 3 unités de plus, avant le multiplicateur du Cargo.', cost: { ore: 22, energy: 16 } },
    ecology: { name: 'Cartographier les gisements', effect: 'Les équipes installées près de leur terrain favorable y gagnent 2 unités supplémentaires par cycle.', cost: { bio: 22, crystal: 12 } },
  } },
  { title: 'À qui répond le phare ?', story: 'Le dernier message est une question. Le phare guidera-t-il les voyageurs qui traversent les brumes ou rythmera-t-il la vie des équipes qui choisissent de rester ?', options: {
    passage: { name: 'Guider les voyageurs', effect: 'Le premier balayage radar de chaque nouvelle sortie est gratuit.', cost: { crystal: 20, energy: 28 } },
    hearth: { name: 'Veiller sur la colonie', effect: 'Chaque équipe en activité produit 1 unité supplémentaire par cycle.', cost: { ore: 30, bio: 24 } },
  } },
];

export const REGIONS = [
  { name: 'Marais des lucioles', art: 'site-flora', plain: 'Vasière', color: '#75c5a4', rock: .20, rift: .15 },
  { name: 'Dents d’ocre', art: 'site-strata', plain: 'Piste ocre', color: '#e8aa75', rock: .36, rift: .12 },
  { name: 'Grève de verre', art: 'site-prism', plain: 'Grève', color: '#b89cde', rock: .24, rift: .23 },
];
export const ORDERS = [
  { name: 'Lever hydrographique', text: 'Cartographier 24 cases, puis rentrer au camp.', reward: { ore: 12, bio: 8 }, progress: drive => [Math.min(24,drive.seen.size),24,'cases'] },
  { name: 'Échantillons pour la fonderie', text: 'Ramener au moins 8 unités de minerai et de cristaux, tous filons confondus.', reward: { energy: 14, water: 8 }, progress: drive => [Math.min(8,drive.cargo.ore+drive.cargo.crystal),8,'unités'] },
  { name: 'Batterie de réserve', text: 'Ramener le signal avec au moins 5 charges pour la relève.', reward: { crystal: 7, bio: 10 }, progress: drive => [Number(drive.signal)+Number(drive.fuel>=5),2,'conditions'] },
  { name: 'Silence radio', text: 'Ramener le signal sans utiliser le radar.', reward: { ore: 14, energy: 8 }, progress: drive => [Number(drive.signal)+Number(drive.scans===0),2,'conditions'] },
];
export const COLS = 7, ROWS = 5;
export const HOME = 2 * COLS;
const cells = Array.from({ length: COLS * ROWS }, (_, id) => {
  const x = id % COLS, y = Math.floor(id / COLS);
  return { id, x, y, q: x - (y - (y & 1)) / 2 };
});
export function distance(a, b) {
  const dq = cells[a].q - cells[b].q, dr = cells[a].y - cells[b].y;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}
export const neighbors = cells.map(cell => cells.filter(other => distance(cell.id, other.id) === 1).map(other => other.id));
export const coordinate = id => 'ABCDEFG'[id % COLS] + (Math.floor(id / COLS) + 1);

function randomSequence(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
const sectors = new Map();
export function sector(world, number) {
  const biome = { emerald: 0, amber: 1, boreal: 2 }[world?.biome] || 0;
  const seed = ((world?.seed ?? 1937) ^ Math.imul(number, 0x9e3779b1) ^ Math.imul(biome, 0x85ebca6b)) >>> 0;
  const region = REGIONS[(number - 1 + biome) % REGIONS.length];
  const key = region.name + seed;
  if (sectors.has(key)) return sectors.get(key);
  const rand = randomSequence(seed), choose = items => items[Math.floor(rand() * items.length)];
  const tiles = cells.map(cell => {
    const roll = rand();
    return { ...cell, terrain: roll < region.rift ? 'rift' : roll < region.rift + region.rock ? 'rock' : roll < region.rift + region.rock + .20 ? 'flat' : 'plain', feature: null };
  });
  const target = choose(tiles.filter(t => t.x >= 5 && distance(HOME, t.id) <= 6)).id;
  // Leave at least one affordable round trip even for the smallest battery.
  let cursor = HOME;
  tiles[cursor].terrain = 'plain';
  while (cursor !== target) {
    cursor = choose(neighbors[cursor].filter(id => distance(id, target) < distance(cursor, target)));
    tiles[cursor].terrain = 'plain';
  }
  tiles[HOME].feature = 'base'; tiles[target].feature = 'signal';
  const reachable = new Set([HOME]);
  for (const id of reachable) for (const next of neighbors[id]) {
    if (tiles[next].terrain !== 'rift') reachable.add(next);
  }
  const free = [...reachable].filter(id => id !== HOME && id !== target);
  // Fisher–Yates keeps points of interest unique and reproducible.
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1)); [free[i], free[j]] = [free[j], free[i]];
  }
  // A short supply run must also be viable when a pilot elects to skip the signal.
  const nearby = free.filter(id => distance(id, HOME) <= 3 && tiles[id].terrain === 'plain');
  if (nearby.length) {
    const nearOre = choose(nearby); tiles[nearOre].feature = 'ore'; free.splice(free.indexOf(nearOre), 1);
  }
  for (const feature of ['cache', 'crystal', 'cache', 'ore', 'crystal']) {
    const id = free.pop();
    if (id !== undefined) tiles[id].feature = feature;
  }
  const board = { tiles, target, region, number, order: ORDERS[(number - 1 + biome) % ORDERS.length] };
  if (sectors.size >= 32) sectors.delete(sectors.keys().next().value);
  sectors.set(key, board);
  return board;
}

export function freshFrontier() {
  return { sorties: 0, signals: 0, orders: 0, decisions: [], active: null, last: null };
}
export const departurePerks = decisions => decisions.filter(key => ['cells', 'assay', 'passage'].includes(key));
function reveal(drive, radius) {
  for (const cell of cells) if (distance(drive.at, cell.id) <= radius) drive.seen.add(cell.id);
}
function initialDrive(active) {
  const rig = RIGS[active.rig];
  const max = rig.battery + (active.perks.includes('cells') ? 3 : 0);
  const drive = { rig: active.rig, perks: active.perks, at: HOME, max, fuel: max, turn: 0, scans: 0, signal: false, cargo: { ore: 0, crystal: 0 }, seen: new Set(), used: new Set(), trail: [HOME] };
  reveal(drive, rig.sight);
  return drive;
}
export const tideHigh = turn => turn % 5 >= 3;
export function travelCost(drive, tile, turn = drive.turn) {
  if (tile.terrain === 'flat') return tideHigh(turn) ? 3 : 1;
  return tile.terrain === 'rock' && drive.rig !== 'crawler' ? 2 : 1;
}
export const radarCost = drive => drive.scans === 0 && drive.perks.includes('passage') ? 0 : 1;
export function canScan(drive) {
  return drive.fuel >= radarCost(drive) && cells.some(tile => !drive.seen.has(tile.id) && distance(drive.at, tile.id) <= 3);
}
export function maneuver(board, drive, action) {
  if (action === 'wait') {
    if (drive.fuel < 1) return { ok: false, message: 'Il faut une charge pour maintenir le rover en veille.' };
    drive.fuel--; drive.turn++;
    return { ok: true, message: 'Un tour écoulé. La prévision de marée a été actualisée.' };
  }
  if (action === 'scan') {
    if (!canScan(drive)) return { ok: false, message: 'Le radar ne peut rien révéler de plus ici, ou la batterie est insuffisante.' };
    const before = drive.seen.size;
    drive.fuel -= radarCost(drive); drive.scans++; drive.turn++; reveal(drive, 3);
    return { ok: true, message: `Radar déployé. ${drive.seen.size - before} cases cartographiées.` };
  }
  if (!Number.isInteger(action)) return { ok: false, message: 'Manœuvre inconnue.' };
  const tile = board.tiles[action];
  if (!neighbors[drive.at].includes(action) || tile?.terrain === 'rift') return { ok: false, message: 'Choisissez une case voisine accessible.' };
  const cost = travelCost(drive, tile);
  if (drive.fuel < cost) return { ok: false, message: 'La batterie est insuffisante pour ce déplacement.' };
  drive.fuel -= cost; drive.turn++; drive.at = action; drive.trail.push(action); reveal(drive, RIGS[drive.rig].sight);
  let message = `Arrivée en ${coordinate(action)}.`;
  if (tile.feature === 'base') message = 'Rover au camp. Déchargez la soute ou repartez explorer avec la charge restante.';
  else if (tile.feature && !drive.used.has(action)) {
    drive.used.add(action);
    if (tile.feature === 'signal') { drive.signal = true; message = 'Fragment du signal enregistré. Ramenez-le au camp.'; }
    if (tile.feature === 'cache') {
      const recharge = Math.min(5, drive.max - drive.fuel); drive.fuel += recharge;
      message = `Borne de secours utilisée. +${recharge} charges.`;
    }
    if (tile.feature === 'ore' || tile.feature === 'crystal') {
      const amount = ((tile.feature === 'ore' ? 8 : 5) + (drive.perks.includes('assay') ? 3 : 0)) * (drive.rig === 'hauler' ? 2 : 1);
      drive.cargo[tile.feature] += amount;
      message = `Filon prélevé. ${amount} ${tile.feature === 'ore' ? 'minerais' : 'cristaux'} dans la soute.`;
    }
  }
  return { ok: true, message };
}
export function replay(board, active) {
  const drive = initialDrive(active);
  for (const action of active.steps) if (!maneuver(board, drive, action).ok) break;
  return drive;
}

const bounded = (n, max) => Number.isSafeInteger(n) ? Math.max(0, Math.min(max, n)) : 0;
export function restoreFrontier(raw, world) {
  const result = freshFrontier();
  if (!raw || typeof raw !== 'object') return result;
  result.sorties = bounded(raw.sorties, 1_000_000_000);
  result.signals = bounded(raw.signals, result.sorties);
  result.orders = bounded(raw.orders, result.sorties);
  if (Array.isArray(raw.decisions)) for (const [index, chapter] of CHAPTERS.entries()) {
    const choice = raw.decisions[index];
    if (index >= result.signals || typeof choice !== 'string' || !Object.hasOwn(chapter.options, choice)) break;
    result.decisions.push(choice);
  }
  const active = raw.active;
  if (result.sorties > result.signals && active && typeof active.rig === 'string' && Object.hasOwn(RIGS, active.rig) && Array.isArray(active.steps)) {
    const perks = departurePerks(result.decisions).filter(key => Array.isArray(active.perks) && active.perks.includes(key));
    result.active = { rig: active.rig, perks, steps: [] };
    const board = sector(world, result.sorties), drive = initialDrive(result.active);
    for (const action of active.steps.slice(0, 64)) {
      if (!maneuver(board, drive, action).ok) break;
      result.active.steps.push(action);
    }
  }
  if (raw.last && Number.isSafeInteger(raw.last.number) && raw.last.number >= 1 && raw.last.number <= result.sorties - Number(!!result.active)) {
    result.last = { number: raw.last.number, recalled: raw.last.recalled === true, order: raw.last.order === true, signal: raw.last.signal === true, ore: bounded(raw.last.ore, 100), crystal: bounded(raw.last.crystal, 100) };
  }
  return result;
}

// The same cell has five possible tide phases. The pilot can wait one turn,
// so the cheapest known route need not be the shortest in number of moves.
export function returnRoute(board, drive) {
  const start = drive.at * 5 + drive.turn % 5;
  const cost = new Map([[start, 0]]), pending = new Set([start]), previous = new Map();
  while (pending.size) {
    let best = null;
    for (const key of pending) if (best === null || cost.get(key) < cost.get(best)) best = key;
    pending.delete(best);
    const at = Math.floor(best / 5), phase = best % 5;
    if (at === HOME) {
      const path = [];
      for (let key = best; key !== start; key = previous.get(key)) path.push(Math.floor(key / 5));
      return { cost: cost.get(best), path: path.reverse() };
    }
    for (const next of [at, ...neighbors[at]]) {
      const tile = board.tiles[next];
      if (!drive.seen.has(next) || tile.terrain === 'rift') continue;
      const key = next * 5 + (phase + 1) % 5;
      const alternative = cost.get(best) + (at === next ? 1 : travelCost(drive, tile, phase));
      if (alternative < (cost.get(key) ?? Infinity)) {
        cost.set(key, alternative); previous.set(key, best); pending.add(key);
      }
    }
  }
  return { cost: Infinity, path: [] };
}
