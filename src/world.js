// Generator v1 is part of the save format: do not change its output in-place.
export const BIOMES = {
  emerald: { name: 'Archipel d’émeraude', subtitle: 'Forêts lumineuses · lagons turquoise', grass: ['#50997d','#61a889','#45866f'], sand: '#d6c995', water: '#246b80', deep: '#143b60', leaf: '#78d6ac', sky: '#102a43' },
  amber: { name: 'Rivages d’ambre', subtitle: 'Terres ocre · végétation corallienne', grass: ['#ba896a','#c59b75','#ab775f'], sand: '#efce9c', water: '#486d97', deep: '#263e66', leaf: '#f3ad8d', sky: '#342a43' },
  boreal: { name: 'Aurore boréale', subtitle: 'Prairies givrées · eaux indigo', grass: ['#8cb5b5','#a0c8c4','#79a1ad'], sand: '#dce4dc', water: '#4667a0', deep: '#252e5b', leaf: '#a5d9ed', sky: '#1c2547' },
};
export function randomSeed() {
  if (globalThis.crypto?.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 4294967296);
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function generateWorld(seed, biome = 'emerald') {
  const random = rng(seed), phase = random() * Math.PI * 2, stretch = .85 + random() * .3;
  const tiles = [];
  for (let y = -2; y <= 12; y++) for (let x = -2; x <= 12; x++) {
    const dx = x - 5, dy = y - 5, angle = Math.atan2(dy, dx);
    const coast = 6 + Math.sin(angle * 3 + phase) * .65 + Math.cos(angle * 5 - phase) * .4;
    const distance = Math.hypot(dx * stretch, dy / stretch);
    const land = distance < coast;
    tiles.push({ id: `${x},${y}`, x, y, terrain: land ? (distance > coast - .9 ? 'sand' : 'grass') : 'water', node: null, variant: Math.floor(random() * 1000) });
  }
  // Keep a continuous, usable landing area and vary inland ponds.
  const pondX = random() < .5 ? 1 : 9, pondY = 2 + Math.floor(random() * 7);
  for (const t of tiles) {
    if (Math.hypot(t.x - pondX, t.y - pondY) < 1.5 && t.terrain === 'grass') t.terrain = 'water';
    if (Math.max(Math.abs(t.x - 5), Math.abs(t.y - 5)) <= 1) t.terrain = 'grass';
  }
  const map = Object.fromEntries(tiles.map(t => [t.id,t]));
  const visited = new Set(['5,5']), queue = [map['5,5']];
  for (let i = 0; i < queue.length; i++) for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const t = map[`${queue[i].x+dx},${queue[i].y+dy}`];
    if (t && t.terrain !== 'water' && !visited.has(t.id)) { visited.add(t.id); queue.push(t); }
  }
  for (const t of tiles) if (!visited.has(t.id)) t.terrain = 'water';
  const land = tiles.filter(t => t.terrain !== 'water' && Math.max(Math.abs(t.x-5),Math.abs(t.y-5)) > 1);
  for (let i=land.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [land[i],land[j]]=[land[j],land[i]]; }
  for (const resource of ['ore','crystal','bio']) for (let n=0;n<5;n++) land.pop().node = resource;
  const shores = tiles.filter(t => t.terrain === 'water' && [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => map[`${t.x+dx},${t.y+dy}`]?.terrain === 'sand' || map[`${t.x+dx},${t.y+dy}`]?.terrain === 'grass'));
  for (let i=shores.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [shores[i],shores[j]]=[shores[j],shores[i]]; }
  for (const t of shores.slice(0,5)) t.node = 'water';
  return tiles;
}
