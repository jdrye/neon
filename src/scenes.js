import { artUrl } from './art-url.js?v=5.0.0';
import { BUILDINGS, RESOURCES, population, worldOf } from './engine.js?v=5.0.0';
import { BIOMES } from './world.js?v=5.0.0';
import { SURVEYS, surveyProgress, surveyRoute, surveySites } from './survey.js?v=5.0.0';
import { roverSymbol, specimenMark } from './survey-art.js?v=5.0.0';
import { groundArt, project, terrainOf } from './terrain.js?v=5.0.0';

export { project };
export const cameraBounds = tiles => terrainOf(tiles).bounds;
export const tilePosition = (tiles, tile) => terrainOf(tiles).positions.get(tile.id);

export function cameraViewBox(center, zoom, frame = { width: 1100, height: 780 }) {
  const width = frame.width / zoom, height = frame.height / zoom;
  return `${center.x-width/2} ${center.y-height/2} ${width} ${height}`;
}

export function overviewCamera(bounds, frame) {
  return {
    zoom: Math.min(frame.width/(bounds.right-bounds.left+100), frame.height/(bounds.bottom-bounds.top+90), 1),
    center: { x:(bounds.left+bounds.right)/2, y:(bounds.top+bounds.bottom)/2 },
  };
}

// Sizes are in game-world units. All pictures rest on the same isometric foot point.
function sprite(name, width, height, x=0, foot=12) {
  return `<image href="${artUrl(name)}" x="${x-width/2}" y="${foot-height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMax meet"/>`;
}
const structures = {
  pod: [91,89], solar: [82,71,'battery'], habitat: [79,85,'annex'], pump: [73,80,'tank'],
  greenhouse: [82,73,'planter'], mine: [76,88,'cart'], beacon: [75,118], wind: [78,112,'battery'],
  residence: [78,102,'annex'], hydroponics: [86,72,'planter'], quarry: [85,78,'cart'],
  synthesizer: [73,88,'vial'], laboratory: [83,82], hangar: [88,76], observatory: [83,92],
};
export function buildingSymbol(type, level=1) {
  const [width, height, equipment] = structures[type];
  const rear = equipment && level >= 3 ? sprite(equipment,28,28,-26,1) : '';
  const front = equipment && level >= 2 ? sprite(equipment,27,26,25,18) : '';
  return `<g class="structure">${rear}${sprite(type,width,height)}${front}</g>`;
}
export function buildingPreview(type, level=1) {
  const [width,height] = structures[type];
  return `<svg viewBox="${-width/2-4} ${8-height} ${width+8} ${height+15}" aria-hidden="true">${buildingSymbol(type,level)}</svg>`;
}

const resourceSizes = { bio:[94,88], ore:[74,60], crystal:[66,74], water:[68,63] };
const variation = tile => tile.variant ?? ((Math.imul(tile.x+19,193) ^ Math.imul(tile.y+29,97)) >>> 0);
export function depositArt(tile, biome) {
  const variant = variation(tile);
  if (tile.node === 'bio') {
    if (biome === 'amber') return 'amber-grove';
    if (biome === 'boreal') return 'frost-pines';
    return variant%3 === 0 ? 'fan-canopy' : 'bio';
  }
  const alternate = { ore:'ore-slate', crystal:'crystal-spire', water:'tidal-pools' };
  return variant%2 ? alternate[tile.node] : tile.node;
}
function landscapeObject(tile, biome) {
  const variant = variation(tile);
  if (tile.node) {
    const [w,h] = resourceSizes[tile.node], scale = .88+(variant%25)/100;
    return `<g class="deposit deposit-${tile.node}">${sprite(depositArt(tile,biome),w*scale,h*scale)}</g>`;
  }
  if (tile.terrain === 'water' || variant%5 > 1) return '';
  const fern = {emerald:'fern', amber:'amber-fronds', boreal:'frost-fern'}[biome];
  const name = tile.terrain === 'sand' ? (variant%3 ? 'reeds' : 'lichen') : [fern,'lichen','flowers'][variant%3];
  const size = 14+variant%17;
  return `<g pointer-events="none">${sprite(name,size,size,variant%19-9,3+variant%8)}</g>`;
}

function groundAccents(map, buildings, prefix) {
  let accents = '';
  for (const tile of map.ordered) {
    if (tile.terrain === 'water' || buildings.has(tile.id)) continue;
    const v = variation(tile);
    const patch = tile.node === 'bio' ? 'undergrowth' : tile.node === 'ore' ? 'rock-shelf' : map.banks.has(tile.id) ? 'shore-gravel' :
      tile.terrain === 'sand' ? (v%5 === 0 ? 'shore-gravel' : '') :
      v%9 === 0 ? (v%2 ? 'prairie' : 'undergrowth') : '';
    if (!patch) continue;
    const p = map.positions.get(tile.id), w = (tile.node ? 83 : 60) + v%48;
    accents += `<g transform="translate(${p.x} ${p.y})" opacity="${tile.node ? .83 : .58}">${sprite(patch,w,w*.62,0,w*.24)}</g>`;
  }
  return `<g class="ground-accents" pointer-events="none" clip-path="url(#${prefix}-land-clip)">${accents}</g>`;
}

export function roverPosition(path, progress, tiles) {
  const distance = (1 - Math.abs(2 * progress - 1)) * (path.length - 1);
  const index = Math.floor(distance), part = distance - index;
  const at = tile => tiles ? tilePosition(tiles,tile) : project(tile.x,tile.y);
  const a = at(path[index]), b = at(path[Math.min(index + 1,path.length - 1)]);
  return { x:a.x+(b.x-a.x)*part, y:a.y+(b.y-a.y)*part };
}

function surveyOverlay(state, tiles) {
  const {active,completed} = state.survey;
  let trail = '';
  if (active) {
    const path = surveyRoute(tiles,active.origin,active.site);
    const points = path.map(t => { const p = tilePosition(tiles,t); return `${p.x},${p.y}`; }).join(' ');
    const pos = roverPosition(path,surveyProgress(active),tiles);
    trail = `<g pointer-events="none" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="${points}" stroke="#254845" stroke-width="5"/><polyline points="${points}" stroke="#ffd68a" stroke-width="2" stroke-dasharray="5 7"/>
      </g><g data-rover="" transform="translate(${pos.x} ${pos.y})" pointer-events="none">${roverSymbol()}</g>`;
  }
  const pins = Object.entries(surveySites(tiles)).map(([key,tile]) => {
    const p = tilePosition(tiles,tile), color = SURVEYS[key].color, done = completed.includes(key);
    return `<g class="survey-pin" data-survey-site="${key}" tabindex="0" role="button" aria-label="Explorer le site ${SURVEYS[key].name}${done ? ', spécimen rapporté' : ''}" transform="translate(${p.x+27} ${p.y-58})" style="color:${color}">
      <path d="M-3 16-15 38" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"/>
      <circle class="pin-ring" r="16" fill="#112f35" stroke="currentColor" stroke-width="2"/>${specimenMark(key)}
      ${done ? '<circle cx="13" cy="-12" r="6" fill="#abedb8"/><path d="m10-12 2 2 4-5" fill="none" stroke="#184238" stroke-width="1.6"/>' : ''}
    </g>`;
  }).join('');
  return trail+pins;
}

function servicePaths(buildings, map) {
  let d = '';
  for (const tile of map.ordered) {
    if (!buildings.has(tile.id)) continue;
    for (const id of [`${tile.x+1},${tile.y}`, `${tile.x},${tile.y+1}`]) {
      if (!buildings.has(id)) continue;
      const a=map.positions.get(tile.id), b=map.positions.get(id);
      d+=`M${a.x} ${a.y+5}L${b.x} ${b.y+5}`;
    }
  }
  return d ? `<g fill="none" stroke-linecap="round" pointer-events="none"><path d="${d}" stroke="#6f6856" stroke-width="11"/><path d="${d}" stroke="#d0b992" stroke-width="7"/></g>` : '';
}

export function renderMap(state,{selection=null,placing=null,zoom=1,center={x:550,y:390},idPrefix='world'}={}) {
  const tiles = worldOf(state), map = terrainOf(tiles);
  const biome = state.world?.biome || 'emerald', theme = BIOMES[biome];
  const buildings = new Map(state.buildings.map(b=>[b.id,b]));
  const preview = idPrefix !== 'world';
  const colonists = new Map(map.ordered.filter(t => t.terrain!=='water' && !t.node && !buildings.has(t.id) && Math.abs(t.x-5)+Math.abs(t.y-5)<4)
    .slice(0,Math.min(12,Math.ceil(population(state)/3))).map((t,i) => [t.id,i]));
  let objects = '', overlay = '';
  for (const tile of map.ordered) {
    const p = map.positions.get(tile.id), b = buildings.get(tile.id), interactive = !placing && !preview;
    const label = b ? `${BUILDINGS[b.type].name}, niveau ${b.level}` : tile.node ? `${RESOURCES[tile.node].name} · collecter` : tile.terrain==='water' ? 'Eau libre' : 'Terrain disponible';
    const location = `transform="translate(${p.x} ${p.y})"`;
    const attrs = interactive ? `data-tile="${tile.id}" ${tile.node ? `data-node="${tile.id}"` : ''} role="button" tabindex="${b||tile.node ? 0 : -1}" aria-label="${label}"` : 'pointer-events="none" aria-hidden="true"';
    const outline = `<polygon class="outline" points="${p.hit}" fill="none" stroke="#fff1a9" stroke-width="2"/>`;
    const hit = interactive ? `<polygon class="hit" points="${p.hit}" fill="transparent"/>` : '';
    const shadow = b || (tile.node && tile.node!=='water') ? `<ellipse cx="5" cy="5" rx="${b ? 39 : 26}" ry="${b ? 13 : 9}" fill="url(#${idPrefix}-contact)"/>` : '';
    const i = colonists.get(tile.id);
    const person = i===undefined ? '' : `<g pointer-events="none" class="colonist" style="animation-delay:-${i}s">${sprite(i%2 ? 'scout' : 'pioneer',11,19,5,4)}</g>`;
    const badge = b && !preview ? `<g class="level level-${b.level}" pointer-events="none"><rect x="-11" y="14" width="22" height="12" rx="4" fill="#153238"/><text y="23" text-anchor="middle" fill="#ffe4ae" font-size="9" font-family="sans-serif">${'I'.repeat(b.level)}</text></g>` : '';
    objects+=`<g class="tile${selection===tile.id?' selected':''}" ${location} ${attrs}>${hit}${shadow}${b ? buildingSymbol(b.type,b.level) : landscapeObject(tile,biome)}${person}${interactive ? outline : ''}${badge}</g>`;
    if (placing && !preview && tile.terrain!=='water' && !tile.node && !b) {
      overlay+=`<g class="tile buildable" data-tile="${tile.id}" ${location} role="button" tabindex="0" aria-label="Choisir cet emplacement"><polygon class="hit" points="${p.hit}"/><path d="M-5 0H5M0 -3V3" fill="none" stroke="#f1ffd8" stroke-width="1.5"/>${outline}</g>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="surface-${biome}" viewBox="${cameraViewBox(center,zoom)}" role="group" aria-label="Carte de la colonie">
    <defs><radialGradient id="${idPrefix}-contact"><stop stop-color="#192e28" stop-opacity=".55"/><stop offset=".62" stop-color="#25362d" stop-opacity=".23"/><stop offset="1" stop-color="#29392d" stop-opacity="0"/></radialGradient></defs>
    ${groundArt(map,theme,idPrefix,biome)}${groundAccents(map,buildings,idPrefix)}${servicePaths(buildings,map)}${objects}${!placing&&!preview ? surveyOverlay(state,tiles) : ''}${overlay}</svg>`;
}
