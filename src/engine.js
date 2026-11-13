export const VERSION = 2;
export const LIMIT = 9999;
export const RESOURCES = {
  ore: { name: 'Minerai', icon: '⬡', color: '#dbbc9a' },
  bio: { name: 'Biomasse', icon: '❧', color: '#b9d69d' },
  water: { name: 'Eau', icon: '◒', color: '#89ccdc' },
  crystal: { name: 'Cristaux', icon: '◇', color: '#c4a8e5' },
  energy: { name: 'Énergie', icon: 'ϟ', color: '#eed28a' },
};
export const BUILDINGS = {
  pod: { name: 'Module pionnier', icon: '⌂', description: 'Le cœur de votre colonie. Quatre pionniers, un refuge et beaucoup de possibles.', cost: {}, max: 1 },
  solar: { name: 'Centrale solaire', icon: '☀', description: 'Capte la lumière des deux soleils. Produit 2 énergies par cycle et par niveau.', cost: { ore: 12, crystal: 3 }, output: { energy: 2 }, max: 3 },
  habitat: { name: 'Habitat', icon: '⌂', description: 'Un foyer pour 6 nouveaux colons par niveau. Sans entretien ni risque de famine.', cost: { ore: 16, bio: 10, water: 6, energy: 4 }, max: 3 },
  pump: { name: 'Collecteur d’eau', icon: '◒', description: 'Condense l’humidité de l’air. Produit 3 eaux par cycle et par niveau.', cost: { ore: 10, crystal: 4, energy: 4 }, output: { water: 3 }, max: 3 },
  greenhouse: { name: 'Serre vivante', icon: '❧', description: 'Cultive la flore locale. Produit 3 biomasses par cycle et par niveau.', cost: { ore: 14, bio: 12, water: 10, energy: 6 }, output: { bio: 3 }, max: 3, requires: 'habitat' },
  mine: { name: 'Extracteur doux', icon: '⬡', description: 'Valorise les fragments du sous-sol. Produit 3 minerais et 1 cristal par cycle et par niveau.', cost: { ore: 20, crystal: 8, energy: 10 }, output: { ore: 3, crystal: 1 }, max: 3, requires: 'solar' },
  beacon: { name: 'Port stellaire', icon: '✧', description: 'Relie votre colonie aux étoiles. Dernier objectif : 16 habitants, une serre et un port.', cost: { ore: 40, bio: 20, crystal: 24, energy: 30 }, max: 1, requires: 'greenhouse' },
};
export const GOALS = [
  { name: 'Premiers prélèvements', text: 'Collecter 5 fois dans le paysage.', reward: { ore: 10, energy: 5 }, check: s => s.harvests >= 5 },
  { name: 'Un rayon d’autonomie', text: 'Construire une centrale solaire.', reward: { bio: 12, water: 8 }, check: s => has(s, 'solar') },
  { name: 'Un foyer sur Kepler', text: 'Construire un habitat.', reward: { ore: 15, crystal: 6 }, check: s => has(s, 'habitat') },
  { name: 'La vie s’installe', text: 'Construire une serre et un collecteur d’eau.', reward: { ore: 20, energy: 15 }, check: s => has(s, 'greenhouse') && has(s, 'pump') },
  { name: 'Première Aube', text: 'Accueillir 16 habitants et construire le port stellaire.', reward: { crystal: 20, energy: 30 }, check: s => population(s) >= 16 && has(s, 'beacon') && has(s, 'greenhouse') },
];
export const CYCLE = 12000;
export const NODE_DELAY = 2500;
const nodes = {
  '2,2': 'crystal', '1,6': 'crystal', '7,8': 'crystal',
  '2,7': 'bio', '4,1': 'bio', '8,6': 'bio', '7,3': 'bio',
  '1,3': 'ore', '8,4': 'ore', '5,9': 'ore',
  '8,1': 'water', '9,2': 'water', '3,9': 'water',
};
export const WORLD = [];
for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
  if (x + y < 3 || x + y > 17 || x - y > 8 || y - x > 8) continue;
  const id = `${x},${y}`;
  const water = ['8,1', '9,1', '8,2', '9,2', '3,9', '2,9', '3,10'];
  WORLD.push({ id, x, y, node: nodes[id] || null, terrain: water.includes(id) ? 'water' : (x * 7 + y * 13) % 7 < 2 ? 'sand' : 'grass' });
}
export const TILE_MAP = Object.fromEntries(WORLD.map(t => [t.id, t]));
export function fresh(now = Date.now()) {
  return { version: VERSION, resources: { ore: 8, bio: 6, water: 4, crystal: 0, energy: 8 }, buildings: [{ id: '5,5', type: 'pod', level: 1 }], harvests: 0, claimed: [], lastTick: now, cooldowns: {}, sound: false };
}
export function has(s, type) { return s.buildings.some(b => b.type === type); }
export function population(s) { return 4 + s.buildings.filter(b => b.type === 'habitat').reduce((n, b) => n + 6 * b.level, 0); }
export function rates(s) {
  const r = Object.fromEntries(Object.keys(RESOURCES).map(k => [k, 0]));
  for (const b of s.buildings) for (const [key, n] of Object.entries(BUILDINGS[b.type].output || {})) r[key] += n * b.level;
  return r;
}
export function grant(s, resources) { for (const [k, v] of Object.entries(resources)) s.resources[k] = Math.min(LIMIT, s.resources[k] + v); }
export function affordable(s, cost) { return Object.entries(cost).every(([k, n]) => s.resources[k] >= n); }
export function pay(s, cost) { for (const [k, n] of Object.entries(cost)) s.resources[k] -= n; }
export function collectRewards(s) {
  const won = [];
  GOALS.forEach((g, i) => { if (!s.claimed.includes(i) && g.check(s)) { s.claimed.push(i); grant(s, g.reward); won.push(g.name); } });
  return won;
}
export function harvest(s, id, now = Date.now()) {
  const tile = TILE_MAP[id];
  if (!tile?.node) return { ok: false, message: 'Choisissez un gisement, une plante ou une source.' };
  if (now < (s.cooldowns[id] || 0)) return { ok: false, message: 'Ce lieu se régénère quelques instants. Un autre gisement vous attend.' };
  const amount = tile.node === 'crystal' ? 3 : 5;
  if (s.resources[tile.node] >= LIMIT) return { ok: false, message: 'Votre réserve est pleine. Construisez ou améliorez un bâtiment.' };
  grant(s, { [tile.node]: amount }); s.harvests++; s.cooldowns[id] = now + NODE_DELAY;
  const rewards = collectRewards(s);
  return { ok: true, resource: tile.node, amount, rewards, message: `+${amount} ${RESOURCES[tile.node].name.toLowerCase()} · La nature se renouvelle, à son rythme.` };
}
export function unlocked(s, type) { const def = BUILDINGS[type]; return !!def && (!def.requires || has(s, def.requires)); }
export function canPlace(s, id) {
  const t = TILE_MAP[id];
  return !!t && t.terrain !== 'water' && !t.node && !s.buildings.some(b => b.id === id);
}
export function build(s, type, id) {
  if (!BUILDINGS[type] || type === 'pod' || !unlocked(s, type)) return { ok: false, message: 'Construisez d’abord le bâtiment requis.' };
  if (!canPlace(s, id)) return { ok: false, message: 'Choisissez une case de terrain libre, hors de l’eau et des ressources.' };
  const def = BUILDINGS[type];
  if (!affordable(s, def.cost)) return { ok: false, message: 'Il manque des ressources. La fiche du bâtiment indique les quantités nécessaires.' };
  pay(s, def.cost); s.buildings.push({ id, type, level: 1 });
  return { ok: true, rewards: collectRewards(s), message: `${def.name} : construction terminée. Votre colonie prend vie !` };
}
export function upgradeCost(b) {
  return Object.fromEntries(Object.entries(BUILDINGS[b.type].cost).map(([k, v]) => [k, Math.ceil(v * (1 + b.level * .65))]));
}
export function upgrade(s, id) {
  const b = s.buildings.find(b => b.id === id);
  if (!b || b.level >= BUILDINGS[b.type].max) return { ok: false, message: 'Ce bâtiment a atteint son niveau maximal.' };
  const cost = upgradeCost(b);
  if (!affordable(s, cost)) return { ok: false, message: 'Rassemblez encore les ressources affichées pour cette amélioration.' };
  pay(s, cost); b.level++;
  return { ok: true, rewards: collectRewards(s), message: `${BUILDINGS[b.type].name} atteint le niveau ${b.level}.` };
}
// Credit only complete cycles; at most 30 minutes offline. Rates have no upkeep.
export function advance(s, now = Date.now()) {
  if (now < s.lastTick) { s.lastTick = now; return 0; }
  const elapsed = now - s.lastTick;
  const cycles = Math.floor(Math.min(elapsed, 1800000) / CYCLE);
  if (cycles > 0) {
    const production = rates(s);
    for (const k of Object.keys(production)) production[k] *= cycles;
    grant(s, production);
    s.lastTick = elapsed > 1800000 ? now : s.lastTick + cycles * CYCLE;
  }
  return cycles;
}
export function restore(raw, now = Date.now()) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== VERSION || !parsed.resources || !Array.isArray(parsed.buildings)) return fresh(now);
    const s = fresh(now);
    for (const k of Object.keys(RESOURCES)) s.resources[k] = Number.isFinite(parsed.resources[k]) ? Math.max(0, Math.min(LIMIT, Math.floor(parsed.resources[k]))) : 0;
    const seen = new Set(['5,5']);
    for (const b of parsed.buildings) {
      if (!b || b.type === 'pod' || !Object.hasOwn(BUILDINGS, b.type) || !TILE_MAP[b.id] || seen.has(b.id)) continue;
      if (TILE_MAP[b.id].terrain === 'water' || TILE_MAP[b.id].node) continue;
      s.buildings.push({ id: b.id, type: b.type, level: Math.max(1, Math.min(BUILDINGS[b.type].max, Math.floor(Number(b.level)) || 1)) }); seen.add(b.id);
    }
    s.harvests = Math.max(0, Math.floor(Number(parsed.harvests)) || 0);
    s.claimed = Array.isArray(parsed.claimed) ? [...new Set(parsed.claimed.filter(i => Number.isInteger(i) && i >= 0 && i < GOALS.length))] : [];
    s.lastTick = Number.isFinite(parsed.lastTick) ? Math.min(now, Math.max(0, parsed.lastTick)) : now;
    s.sound = parsed.sound === true;
    return s;
  } catch { return fresh(now); }
}
export function salvage(b) {
  const total = { ...BUILDINGS[b.type].cost };
  for (let level = 1; level < b.level; level++) {
    for (const [k, n] of Object.entries(upgradeCost({ type: b.type, level }))) total[k] = (total[k] || 0) + n;
  }
  return Object.fromEntries(Object.entries(total).map(([k, n]) => [k, Math.floor(n / 2)]));
}
export function dismantle(s, id) {
  const b = s.buildings.find(b => b.id === id);
  if (!b || b.type === 'pod') return { ok: false, message: 'Le module pionnier doit rester en place.' };
  grant(s, salvage(b));
  s.buildings = s.buildings.filter(b => b.id !== id);
  return { ok: true, message: 'Terrain libéré. La moitié des matériaux investis a été récupérée.' };
}

// Relocation preserves all investments and never charges the player.
export function relocate(s, from, to) {
  const building = s.buildings.find(b => b.id === from);
  if (!building || building.type === 'pod') return { ok: false, message: 'Le module pionnier doit rester en place.' };
  if (!canPlace(s, to)) return { ok: false, message: 'Choisissez une case de terrain libre.' };
  building.id = to;
  return { ok: true, message: `${BUILDINGS[building.type].name} déplacé. Niveau et production conservés.` };
}
export function goalSteps(s, index) {
  const built = type => ({ text: BUILDINGS[type].name, done: has(s, type) });
  return [
    [{ text: `${Math.min(s.harvests, 5)} / 5 collectes`, done: s.harvests >= 5 }],
    [built('solar')], [built('habitat')], [built('greenhouse'), built('pump')],
    [{ text: `${population(s)} / 16 pionniers`, done: population(s) >= 16 }, built('greenhouse'), built('beacon')],
  ][index] || [];
}
export function importSave(raw, now = Date.now()) {
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.version !== VERSION || !parsed.resources || !Array.isArray(parsed.buildings)
    || !Object.keys(RESOURCES).every(k => Number.isFinite(parsed.resources[k]) && parsed.resources[k] >= 0)) {
    throw new Error('Sauvegarde NÉON incompatible ou incomplète.');
  }
  return restore(raw, now);
}
