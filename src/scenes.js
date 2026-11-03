import { WORLD, BUILDINGS, RESOURCES, canPlace, population } from './engine.js';
export const project = (x, y) => ({ x: 550 + (x - y) * 44, y: 180 + (x + y) * 23 });
const diamond = '0,-23 44,0 0,23 -44,0';
const polygon = (points, fill, extra = '') => `<polygon points="${points}" fill="${fill}" ${extra}/>`;
function base() {
  return `<ellipse cy="12" rx="43" ry="22" fill="#122e3540"/>${polygon('-35,-4 0,-22 35,-4 0,14','#adc2b5')}${polygon('-35,-4 0,14 0,22 -35,4','#6d9290')}${polygon('0,14 35,-4 35,4 0,22','#527b7d')}`;
}
function box(x, y, w, h, color = '#dedfc5') {
  return `<g transform="translate(${x} ${y})">${polygon(`-${w},0 0,${w/2} 0,${w/2-h} -${w},-${h}`,color)}${polygon(`0,${w/2} ${w},0 ${w},-${h} 0,${w/2-h}`,'#8ea8a1')}${polygon(`-${w},-${h} 0,-${w/2+h} ${w},-${h} 0,${w/2-h}`,'#e9e9d3')}</g>`;
}
function tree(x=0, y=0, k=1, tint='#83bfa2') {
  return `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cy="4" rx="20" ry="10" fill="#193d4640"/><path d="M0 4V-40M0 -15L-13 -29M0 -25L13 -38" fill="none" stroke="#476b66" stroke-width="5"/><path d="M-24 -37Q-31 -58 -10 -62Q5 -84 21 -63Q43 -43 20 -34Q-3 -26 -24 -37" fill="${tint}"/><path d="M-24 -37Q-10 -47 16 -43L23 -34Q-5 -25 -24 -37" fill="#4e9188"/><path d="M-12 -59Q0 -68 10 -60" stroke="#c2e1b4" stroke-width="3" fill="none" opacity=".6"/></g>`;
}
function crystal(x=0,y=0,k=1) {
  return `<g transform="translate(${x} ${y}) scale(${k})">${polygon('-10,-4 -14,-35 0,-60 12,-38 10,-6 0,0','#9a87c5')}${polygon('0,-60 12,-38 10,-6 0,0','#b5a4e1')}${polygon('0,-60 -14,-35 -10,-4 0,0','#786ca8')}${polygon('0,-60 12,-38 0,-30 -14,-35','#e0ccf2')}</g>`;
}
export function buildingSymbol(type, level=1) {
  let art=base();
  if(type==='pod'||type==='habitat') {
    art+=box(0,0,28,29+level*4);
    art+=`<path d="M-25 -26L-4 -15V-5L-25 -16Z" fill="#467c8c"/><path d="M5 -15L24 -25V-16L5 -6Z" fill="#285a6b"/><path d="M-21 -23L-7 -16" stroke="#a9e6dc" stroke-width="2"/><path d="M8 -15L20 -21" stroke="#a9e6dc" stroke-width="2"/>`;
    art+=polygon('-19,-36 0,-46 19,-36 0,-26',type==='pod'?'#d4ac7d':'#83aaa6');
    art+=`<path d="M-6 -33L6 -39" stroke="#faf2d5" stroke-width="3"/>`;
    if(level>1)art+=box(19,-9,10,39);
    if(level>2)art+=`<path d="M-18 -39V-66" stroke="#b3c8b7" stroke-width="2"/><circle cx="-18" cy="-67" r="3" fill="#f6dc9b"/>`;
  }
  if(type==='solar') {
    art+=`<path d="M-16 3V-27M18 3V-44" stroke="#adc7bb" stroke-width="4"/>`;
    art+=polygon('-38,-27 11,-52 39,-38 -10,-13','#284c63','stroke="#a3c6bd" stroke-width="2"');
    art+=`<path d="M-26 -33L2 -19M-14 -39L14 -25M-2 -45L26 -31M-24 -20L25 -45" stroke="#82bfc9" stroke-width="1.3"/><path d="M-34 -28L10 -50" stroke="#caede0" stroke-width="2"/>`;
    if(level>1)art+=box(22,9,9,17);
    if(level>2)art+=`<path d="M-27 7V-10L-12 -18" stroke="#dcdfbc" stroke-width="3"/><circle cx="-12" cy="-18" r="4" fill="#f7d784"/>`;
  }
  if(type==='pump') {
    art+=`<path d="M-24 -10V-39Q-24 -52 -8 -52Q8 -52 8 -39V-10Z" fill="#7db3b8"/><ellipse cx="-8" cy="-39" rx="16" ry="9" fill="#cbe2d1"/><ellipse cx="-8" cy="-10" rx="16" ry="9" fill="#578f9b"/><path d="M-19 -34V-15M-13 -32V-13" stroke="#b7e6de" stroke-width="2"/><path d="M8 -28H22V2" stroke="#a9c6b8" stroke-width="6" fill="none"/>`;
    if(level>1)art+=`<path d="M15 -5V-29" stroke="#9ac7c7" stroke-width="12"/><ellipse cx="15" cy="-29" rx="6" ry="4" fill="#dae7d0"/>`;
    if(level>2)art+=`<path d="M-8 -46V-67M-23 -62H7" stroke="#d3debc" stroke-width="3"/>`;
  }
  if(type==='greenhouse') {
    art+=`<path d="M-31 0V-12A31 37 0 0 1 62 0V0Z" transform="translate(-15 0) scale(.67 1)" fill="#75bca7"/>`;
    art+=`<path d="M-31 0A31 39 0 0 1 31 0Q0 22 -31 0Z" fill="#8ac9b2" fill-opacity=".65" stroke="#d0e6c4" stroke-width="2"/>`;
    art+=tree(-8,-2,.42,'#c6d99c');
    art+=`<path d="M0 -39V11M0 -39Q-22 -18 -17 7M0 -39Q22 -18 17 7M-29 -13Q0 2 29 -13" fill="none" stroke="#daebc7" stroke-width="1.5" opacity=".7"/>`;
    if(level>1)art+=tree(18,7,.35,'#d2de9f');
    if(level>2)art+=tree(-26,6,.3,'#debdb5');
  }
  if(type==='mine') {
    art+=box(-8,0,19,24);
    art+=`<path d="M10 -4L23 -49L39 -41L25 10Z" fill="#799b96"/><path d="M23 -49L39 -41L28 -34L13 -42Z" fill="#d9d9ba"/><path d="M19 -33L30 -27M16 -22L27 -16" stroke="#dfbd87" stroke-width="4"/><path d="M-21 -13L-7 -6" stroke="#9be4cf" stroke-width="4"/>`;
    if(level>1)art+=crystal(-28,8,.3);
    if(level>2)art+=crystal(-13,17,.25);
  }
  if(type==='beacon') {
    art+=box(0,0,22,17);
    art+=`<path d="M-7 -16L-4 -85H4L7 -16Z" fill="#cad8c5"/><ellipse cy="-72" rx="26" ry="15" fill="none" stroke="#a6d7c5" stroke-width="5" transform="rotate(-28 0 -72)"/><path d="M0 -90L8 -73L0 -57L-8 -73Z" fill="#edda9f"/><circle cy="-108" r="4" fill="#f6e4b2"/><g class="beacon-waves" stroke="#cae7c3" fill="none" opacity=".4"><ellipse cy="-108" rx="15" ry="7"/><ellipse cy="-108" rx="25" ry="12"/></g>`;
  }
  return art;
}
function nodeArt(tile) {
  if(tile.node==='bio')return tree(-10,3,.8)+tree(17,7,.56,'#b9c995');
  if(tile.node==='crystal')return crystal(-10,3,.7)+crystal(15,7,.48)+`<ellipse cy="7" rx="27" ry="10" fill="#c4a6ed" opacity=".1"/>`;
  if(tile.node==='ore')return polygon('-31,2 -25,-15 -7,-25 9,-11 10,8 -10,15','#a6aaa0')+polygon('-25,-15 -7,-25 9,-11 -9,-5','#d5c8ac')+polygon('8,7 12,-16 25,-22 34,-6 27,13','#818f8b')+polygon('12,-16 25,-22 34,-6 22,-1','#c6bfa8');
  if(tile.node==='water')return `<g stroke="#b2e6d7" fill="none"><ellipse cy="-2" rx="26" ry="10" opacity=".45"/><ellipse cy="-2" rx="13" ry="5" opacity=".7"/></g><path d="M0 -25Q-14 -11 0 -9Q14 -11 0 -25" fill="#c0f0e0" opacity=".7"/>`;
  return '';
}
export function renderMap(state, { selection=null, placing=null, zoom=1, center={x:550,y:410} }={}) {
  const buildings=Object.fromEntries(state.buildings.map(b=>[b.id,b]));
  const width=1100/zoom,height=800/zoom;
  const view=`${center.x-width/2} ${center.y-height/2} ${width} ${height}`;
  let ground='',objects='';
  const tiles=[...WORLD].sort((a,b)=>a.x+a.y-b.x-b.y||a.x-b.x);
  for(const t of tiles) {
    const p=project(t.x,t.y),b=buildings[t.id];
    const palette=t.terrain==='water'?['#639e9e','#629695']:t.terrain==='sand'?['#9da991','#a6b298']:['#799b87','#83a48e','#8bab94'];
    let color=palette[(t.x*3+t.y*7)%palette.length];
    if((t.x===5||t.y===5)&&!t.node&&!b)color='#a8b39c';
    const side=polygon('-44,0 0,23 0,42 -44,19','#4b736d')+polygon('0,23 44,0 44,19 0,42','#365e60');
    const placeable=placing&&canPlace(state,t.id);
    const label=b?`${BUILDINGS[b.type].name}, niveau ${b.level}`:t.node?`Collecter : ${RESOURCES[t.node].name}`:'Terrain libre';
    const interactive=b||t.node||placeable;
    ground+=`<g transform="translate(${p.x} ${p.y})">${side}${polygon(diamond,color)}<path d="M-44 0L0 -23L44 0" fill="none" stroke="#d0dec029" stroke-width="1"/></g>`;
    let detail='';
    if(!b&&!t.node&&t.terrain==='grass'&&(t.x*5+t.y)%4===0)detail=`<path d="M-15 1l-3 -7m3 7l4 -5M17 8l2 -6" stroke="#cee0b270" stroke-width="1.5"/>`;
    objects+=`<g class="tile ${selection===t.id?'selected':''} ${placeable?'buildable':''} ${placing&&!placeable?'unavailable':''}" data-tile="${t.id}" transform="translate(${p.x} ${p.y})" role="button" tabindex="${interactive?0:-1}" aria-label="${label}" ${placing&&!placeable?'aria-disabled="true"':''}><polygon class="hit" points="${diamond}" fill="transparent"/>${detail}${t.node?nodeArt(t):''}${b?buildingSymbol(b.type,b.level):''}${placeable?'<path class="place-mark" d="M-7 0H7M0 -5V5" stroke="#e4f3c3" stroke-width="2"/>':''}<polygon class="outline" points="${diamond}" fill="none" stroke="#e6edbc" stroke-width="2"/>${b&&b.type!=='pod'?`<g class="level"><rect x="-10" y="21" width="20" height="12" rx="5" fill="#244748"/><text x="0" y="30" text-anchor="middle" fill="#d5e7be" font-size="8" font-family="Arial">${'I'.repeat(b.level)}</text></g>`:''}<title>${label}${t.node?' · '+(t.node==='crystal'?3:5)+' par collecte':''}</title></g>`;
  }
  const walkers = tiles.filter(t => (t.x === 5 || t.y === 5) && !t.node && !buildings[t.id]).slice(0, Math.min(8, Math.ceil(population(state) / 3))).map((t, i) => {
    const p = project(t.x, t.y);
    return `<g transform="translate(${p.x + 12} ${p.y + 3})" pointer-events="none"><ellipse cy="3" rx="5" ry="2.5" fill="#244e4b44"/><path d="M-2 1V-5M2 1V-5" stroke="#365b61" stroke-width="2"/><rect x="-3" y="-12" width="6" height="8" rx="2" fill="${i % 2 ? '#d8b58b' : '#d8e2c8'}"/><circle cy="-15" r="4" fill="#e5e8d0"/><path d="M-2 -15H2" stroke="#5c9ea8" stroke-width="2"/></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" aria-label="Carte de Première Aube" role="group"><defs><radialGradient id="island-glow"><stop stop-color="#acc6a5" stop-opacity=".12"/><stop offset="1" stop-color="#acc6a5" stop-opacity="0"/></radialGradient></defs><ellipse cx="550" cy="480" rx="500" ry="300" fill="url(#island-glow)"/><ellipse cx="550" cy="507" rx="370" ry="178" fill="#061d2440"/>${ground}${objects}${walkers}<g class="drone" transform="translate(558 300)" pointer-events="none"><ellipse cy="70" rx="12" ry="5" fill="#193b3b30"/><g class="drone-float"><ellipse rx="12" ry="6" fill="#e6e8ce"/><path d="M-7 0H7" stroke="#86c9c3" stroke-width="3"/><path d="M-18 -3H-11M11 -3H18" stroke="#c5d6c0" stroke-width="2"/></g></g></svg>`;
}
export function buildingPreview(type) {
  return `<svg viewBox="-58 -122 116 160" aria-hidden="true">${buildingSymbol(type,type==='habitat'?2:1)}</svg>`;
}
