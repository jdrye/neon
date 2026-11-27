import { artUrl } from './art-url.js?v=6.0.0';
// The mesh belongs to the renderer. The generator's tile coordinates remain the game board.
export const project = (x, y) => ({ x: 550 + (x - y) * 40, y: 170 + (x + y) * 22 });

const maps = new WeakMap();
const neighbors = [[0,-1],[1,0],[0,1],[-1,0]];
const corners = [[0,0],[1,0],[1,1],[0,1]];
const round = n => Math.round(n * 10) / 10;
const xy = point => `${round(point.x)},${round(point.y)}`;
const path = points => 'M' + points.map(xy).join('L') + 'Z';

function perimeter(tiles, byId, includes) {
  const edges = new Set(), outgoing = new Map();
  for (const tile of tiles.filter(includes)) {
    for (let side = 0; side < 4; side++) {
      const [dx,dy] = neighbors[side];
      const across = byId.get(`${tile.x + dx},${tile.y + dy}`);
      if (across && includes(across)) continue;
      const [sx,sy] = corners[side], [ex,ey] = corners[(side + 1) % 4];
      const start = `${tile.x + sx},${tile.y + sy}`, end = `${tile.x + ex},${tile.y + ey}`;
      const edge = { start, end, side, x: tile.x + sx, y: tile.y + sy };
      edges.add(edge);
      if (!outgoing.has(start)) outgoing.set(start, []);
      outgoing.get(start).push(edge);
    }
  }
  const loops = [];
  for (const first of edges) {
    const loop = [];
    let current = first;
    do {
      edges.delete(current);
      loop.push(current);
      if (current.end === first.start) break;
      // At a diagonal contact, follow the right-hand coast of the same patch.
      const options = outgoing.get(current.end).filter(e => edges.has(e));
      const rank = [1, 0, 3, 2];
      const rankOf = e => rank[(e.side - current.side + 4) % 4];
      current = options.sort((a,b) => rankOf(a) - rankOf(b))[0];
    } while (current);
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

// Round the coastline through shared grid corners. Both the rock face and the foam
// use these same samples, including around inland lakes.
function smoothLoop(points) {
  const result = [], n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[(i + n - 1) % n], b = points[i], c = points[(i + 1) % n];
    for (const t of [0, .25, .5, .75]) {
      const wa = (1-t)**2 / 2, wc = t*t / 2, wb = 1-wa-wc;
      result.push({ x: a.x*wa + b.x*wb + c.x*wc, y: a.y*wa + b.y*wb + c.y*wc,
        sea: a.sea*wa + b.sea*wb + c.sea*wc });
    }
  }
  return result;
}

export function terrainOf(tiles) {
  if (maps.has(tiles)) return maps.get(tiles);
  const byId = new Map(tiles.map(t => [t.id, t]));
  const water = tiles.filter(t => t.terrain === 'water');
  const coast = water.filter(t => neighbors.some(([dx,dy]) => !byId.has(`${t.x+dx},${t.y+dy}`)));
  const ocean = new Set(coast.map(t => t.id));
  for (let i=0; i<coast.length; i++) {
    const t=coast[i];
    for (const [dx,dy] of neighbors) {
      const n=byId.get(`${t.x+dx},${t.y+dy}`);
      if (n?.terrain !== 'water' || ocean.has(n.id)) continue;
      ocean.add(n.id); coast.push(n);
    }
  }
  const ponds = new Set(water.filter(t => !ocean.has(t.id)).map(t => t.id));
  const phase = (tiles[0].variant || 0) * .039;
  function vertex(i, j) {
    const x = i - .5, y = j - .5, base = project(x, y);
    const uneven = Math.sin(i * 17.3 + j * 3.7 + phase);
    const wetBank = corners.some(([dx,dy]) => ponds.has(`${i-dx},${j-dy}`));
    const relief = wetBank ? 3 + 2*uneven : 24 + 6*Math.sin(x*.48 + phase) + 6*Math.cos(y*.41 - phase) + 3*Math.sin((x+y)*.71);
    const sea = base.y + 7 + 4.5*Math.sin(j*8.53-i*4.31+phase);
    return { x: base.x + 7*uneven, y: sea - relief, sea };
  }
  const positions = new Map();
  for (const tile of tiles) {
    const top = corners.map(([dx,dy]) => vertex(tile.x + dx, tile.y + dy));
    if (tile.terrain === 'water') for (const p of top) p.y = p.sea;
    const x = round(top.reduce((n,p) => n+p.x, 0)/4), y = round(top.reduce((n,p) => n+p.y, 0)/4);
    positions.set(tile.id, { x, y, hit: top.map(p => xy({ x: p.x-x, y: p.y-y })).join(' ') });
  }
  const rings = predicate => perimeter(tiles, byId, predicate).map(loop => {
    let points = loop.map(p => vertex(p.x,p.y));
    const lake = loop.every(p => corners.some(([dx,dy]) => ponds.has(`${p.x-dx},${p.y-dy}`)));
    if (lake) {
      // Round the short, sheltered banks on a larger radius than the basalt coast.
      for (let pass=0; pass<2; pass++) {
        points = points.map((p,i) => {
          const a=points[(i+points.length-1)%points.length], b=points[(i+1)%points.length];
          return { x:(2*p.x+a.x+b.x)/4, y:(2*p.y+a.y+b.y)/4, sea:(2*p.sea+a.sea+b.sea)/4 };
        });
      }
    }
    return smoothLoop(points);
  });
  const shore = rings(t => t.terrain !== 'water');
  const grass = rings(t => t.terrain === 'grass').map(path).join('');
  const face = [[], []];
  for (const ring of shore) for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i+1) % ring.length];
    if (b.x >= a.x) continue;
    face[b.y > a.y ? 1 : 0].push(path([a,b,{ x:b.x, y:b.sea+1 },{ x:a.x, y:a.sea+1 }]));
  }
  const points = [...positions.values()];
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const map = {
    ordered: [...tiles].sort((a,b) => a.x+a.y-b.x-b.y || a.x-b.x), positions,
    banks: new Set(tiles.filter(t => t.terrain!=='water' && neighbors.some(([dx,dy]) => ponds.has(`${t.x+dx},${t.y+dy}`))).map(t => t.id)),
    land: shore.map(path).join(''), grass,
    waterline: shore.map(r => path(r.map(p => ({x:p.x, y:p.sea})))).join(''),
    faces: face.map(parts => parts.join('')),
    bounds: {left:Math.min(...xs)-44, right:Math.max(...xs)+44, top:Math.min(...ys)-62, bottom:Math.max(...ys)+35},
    artwork: new Map(),
  };
  maps.set(tiles, map);
  return map;
}

function pattern(id, material, width, height, base, strength) {
  return `<pattern id="${id}" width="${width}" height="${height}" patternUnits="userSpaceOnUse">
    <rect width="${width}" height="${height}" fill="${base}"/>
    <image href="${artUrl(material)}" width="${width}" height="${height}" preserveAspectRatio="none" opacity="${strength}"/>
  </pattern>`;
}

export function groundArt(map, theme, prefix, biome, wide=false) {
  const key = prefix + ':' + biome;
  if (map.artwork.has(key)) return map.artwork.get(key);
  const id = name => `${prefix}-${name}`, url = name => `url(#${id(name)})`;
  const profile = {
    emerald: { grass: .68, tint: '#598672', shallow: '#74d8c0', foam: '#e5f9e5' },
    amber: { grass: .40, tint: '#c58959', shallow: '#75b8ba', foam: '#fce4bd' },
    boreal: { grass: .34, tint: '#a4c4bd', shallow: '#8ecdd5', foam: '#f3f2ff' },
  }[biome];
  const defs = `
    <radialGradient id="${id('ocean-light')}" cx="47%" cy="42%" r="65%"><stop stop-color="${theme.water}"/><stop offset="1" stop-color="${theme.deep}"/></radialGradient>
    <radialGradient id="${id('mist')}"><stop stop-color="#fff2ba" stop-opacity=".11"/><stop offset="1" stop-color="#fff2ba" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id('sun')}" x2=".85" y2="1"><stop stop-color="#fce2a3" stop-opacity=".20"/><stop offset=".47" stop-color="#eef2a7" stop-opacity="0"/><stop offset="1" stop-color="#173f40" stop-opacity=".22"/></linearGradient>
    <filter id="${id('tidal-blur')}" x="-.2" y="-.2" width="1.4" height="1.4"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="${id('grass-blur')}" x="-.1" y="-.1" width="1.2" height="1.2"><feGaussianBlur stdDeviation="4.5"/></filter>
    ${pattern(id('grass'), 'meadow', 382, 214, profile.tint, profile.grass)}
    ${pattern(id('sand'), 'sand', 290, 156, theme.sand, .68)}
    ${pattern(id('reef'), 'sea', 440, 253, theme.water, .82)}
    ${pattern(id('rock'), 'cliff', 176, 84, '#575750', .88)}
    <path id="${id('shore')}" d="${map.waterline}"/><path id="${id('land')}" d="${map.land}" fill-rule="evenodd"/>
    <clipPath id="${id('land-clip')}"><use href="#${id('land')}" clip-rule="evenodd"/></clipPath>
    <path id="${id('meadow')}" d="${map.grass}" fill-rule="evenodd"/>
    <mask id="${id('grass-fringe')}" maskUnits="userSpaceOnUse" x="${map.bounds.left}" y="${map.bounds.top}" width="${map.bounds.right-map.bounds.left}" height="${map.bounds.bottom-map.bounds.top}">
      <use href="#${id('meadow')}" fill="white" filter="${url('grass-blur')}"/>
    </mask>`;
  const surf = (color, width, opacity) => `<use href="#${id('shore')}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linejoin="round"/>`;
  const b=map.bounds, ocean=wide?`x="${b.left-4500}" y="${b.top-4500}" width="${b.right-b.left+9000}" height="${b.bottom-b.top+9000}"`:'x="-4000" y="-4000" width="9000" height="9000"';
  const sea = `<rect ${ocean} fill="${theme.deep}"/>
    <rect x="-1500" y="-1050" width="4200" height="3000" fill="${url('ocean-light')}"/>
    <rect ${ocean} fill="${url('reef')}" opacity=".42"/>
    <g${wide?'':` filter="${url('tidal-blur')}"`}>${surf(profile.shallow,64,.33)}${surf(profile.foam,17,.52)}</g>
    <use href="#${id('shore')}" fill="none" stroke="${profile.foam}" stroke-width="2.4" stroke-opacity=".8" stroke-dasharray="19 5 8 3 3 12" class="surf-crests"/>`;
  const material = `<path d="${map.faces.join('')}" fill="${url('rock')}"/><path d="${map.faces[1]}" fill="#132f40" opacity=".38"/>
    <use href="#${id('land')}" fill="${url('sand')}"/>
    ${wide?`<use href="#${id('meadow')}" fill="${url('grass')}"/>`:`<g mask="${url('grass-fringe')}"><use href="#${id('land')}" fill="${theme.grass[0]}"/><use href="#${id('land')}" fill="${url('grass')}"/></g>`}
    <use href="#${id('land')}" fill="${url('sun')}" stroke="${theme.sand}" stroke-width="1.5" stroke-opacity=".45"/>
    <ellipse cx="345" cy="155" rx="450" ry="145" fill="${url('mist')}"/>`;
  const result = `<defs>${defs}</defs><g pointer-events="none">${sea}${material}</g>`;
  map.artwork.set(key, result);
  return result;
}
