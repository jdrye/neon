import { BUILDINGS, RESOURCES, canPlace, population, worldOf } from './engine.js?v=4.1.0';
import { BIOMES } from './world.js?v=4.1.0';
export const project = (x, y) => ({ x: 550 + (x - y) * 40, y: 170 + (x + y) * 22 });
const diamond = '0,-22 40,0 0,22 -40,0';
const poly = (points, fill, attrs='') => `<polygon points="${points}" fill="${fill}" ${attrs}/>`;
function block(x,y,w,d,h,color='#dae5ee',roof='#f3f5ee',side='#819eae') {
  return `<g transform="translate(${x} ${y})">${poly(`-${w},0 0,${d} 0,${d-h} -${w},-${h}`,color)}${poly(`0,${d} ${w},0 ${w},-${h} 0,${d-h}`,side)}${poly(`-${w},-${h} 0,-${d+h} ${w},-${h} 0,${d-h}`,roof)}<path d="M-${w} -${h}L0 ${d-h}L${w} -${h}" fill="none" stroke="#fff" stroke-opacity=".45"/></g>`;
}
function windows(x,y,n=3) {
  return Array.from({length:n},(_,i)=>`<path d="M${x+i*6} ${y+i*3}v7l4 2v-7Z" fill="#132b45"/><path d="M${x+i*6+.8} ${y+i*3+1}l2.4 1.2v3l-2.4 -1.2Z" fill="#8de8ed"/>`).join('');
}
const pad = () => `<ellipse cy="10" rx="40" ry="21" fill="#061e34" opacity=".3"/>${block(0,0,34,18,5,'#516778','#a1b8bc','#304c63')}<path d="M-29 -4L0 11L29 -4" fill="none" stroke="#8ff4df" stroke-width="1.5"/>`;
function dish(x,y) { return `<g transform="translate(${x} ${y})"><path d="M0 0V-15" stroke="#a8c3d4" stroke-width="2"/><path d="M-9 -20Q0 -7 9 -20Z" fill="#eef6f1"/><path d="M0 -15L3 -24" stroke="#e6bd72" stroke-width="1.5"/></g>`; }
function tree(x,y,scale=1,leaf='#70c9a0') {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="4" rx="15" ry="7" fill="#102c42" opacity=".24"/><path d="M0 2V-35M0 -16L-9 -26M0 -12L9 -22" stroke="#596a70" stroke-width="3"/>${poly('-19,-22 0,-60 20,-22 0,-10',leaf)}${poly('0,-60 20,-22 0,-10','#346b75','opacity=".45"')}${poly('-13,-36 0,-60 5,-38','#d2ffde','opacity=".4"')}<circle cx="-8" cy="-27" r="1.5" fill="#e2ffc6"/></g>`;
}
function crystal(x,y,scale=1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="2" rx="14" ry="6" fill="#be7aff" opacity=".18"/>${poly('-10,0 -12,-25 0,-48 12,-25 9,0 0,6','#9d70df')}${poly('0,-48 12,-25 9,0 0,6','#d6b3ff')}${poly('0,-48 -12,-25 0,-17','#f3d9ff')}<path d="M0 -17V6" stroke="#f3d9ff" stroke-width="1.5"/></g>`;
}
export function buildingSymbol(type,level=1) {
  let art = pad();
  if (type === 'pod') {
    art += block(0,-3,27,14,28,'#d8e2e5','#f1e9cc','#7695ac') + windows(-23,-24,3);
    art += `<path d="M4 -12l17 -9v12L4 0Z" fill="#183954"/><path d="M9 -11l8 -4v8l-8 4Z" fill="#65d6e3"/>`;
    art += block(-3,-33,16,8,5,'#c28e57','#ffd08a','#a1754c') + dish(18,-31);
    art += `<path d="M-25 -18l-6 3v15l6 -3Z" fill="#7aa9ab"/><path d="M-31 -13v8" stroke="#80f5d5" stroke-width="2"/>`;
  }
  if(type === 'habitat') {
    art += block(0,-3,26,14,26+level*10,'#b7d8df','#ecf4ed','#6d9aad');
    for(let i=0;i<level;i++) art += windows(-23,-24-i*10,4);
    art += `<path d="M5 -10l16 -8v12L5 2Z" fill="#16384a"/>`;
    art += block(0,-32-level*10,19,10,5,'#50a3a6','#8be1cb','#307f92');
    art += `<path d="M7 -${29+level*10}l12 -6v8l-12 6Z" fill="#c2fff1" opacity=".6"/>`;
    art += tree(27,5,.27,'#b1de8a');
  }
  if(type === 'solar') {
    art += block(0,3,14,7,9,'#a8b7b6','#e6e9cd','#637e98');
    for(let i=0;i<(level>1?2:1);i++) {
      const y=-15-i*22,x=i?12:-6;
      art += `<g transform="translate(${x} ${y})"><path d="M0 15V-5" stroke="#adc3cc" stroke-width="4"/>${poly('-28,-7 7,-25 31,-13 -4,5','#183a67','stroke="#98d7ec" stroke-width="2"')}<path d="M-19 -12L5 0M-10 -17L14 -5M-1 -21L23 -9M-16 -1L19 -19" stroke="#56b8e8" stroke-width="1"/>${poly('-28,-7 7,-25 18,-20 -17,-2','#8cecff','opacity=".16"')}</g>`;
    }
    if(level===3) art+=block(-23,3,8,4,18,'#ddc98a','#fff0ad','#9d9772');
  }
  if(type === 'pump') {
    art += `<path d="M-25 -8V-42h31v34" fill="#a8dbe3"/><ellipse cx="-9.5" cy="-42" rx="15.5" ry="8" fill="#ecf9ee"/><ellipse cx="-9.5" cy="-8" rx="15.5" ry="8" fill="#519bb1"/><path d="M-20 -35v20M-14 -32v20" stroke="#e4fffa" stroke-width="3"/><path d="M6 -30h17v28" fill="none" stroke="#557a92" stroke-width="8"/><path d="M6 -32h17v28" fill="none" stroke="#b3d5d9" stroke-width="4"/>`;
    art += `<path d="M-20 -18Q-10 -12 1 -18v8q-11 7 -21 0Z" fill="#45dfe7" opacity=".8"/>`;
    if(level>1)art += block(22,6,9,5,22,'#a5c9d4','#e3eee6','#6b9fb7');
    if(level>2)art += dish(-9,-46);
  }
  if(type === 'greenhouse') {
    art += `<path d="M-30 0Q-33 -46 0 -50Q33 -46 30 0Q0 25 -30 0" fill="#55beae" fill-opacity=".65" stroke="#c4f7d6" stroke-width="2"/>`;
    art += tree(-13,-1,.45,'#def2a1')+tree(10,3,.55,'#9cecbd');
    art += `<path d="M0 -50V15M0 -50Q-22 -23 -18 9M0 -50Q22 -23 18 9M-29 -18Q0 -1 29 -18" fill="none" stroke="#ddffe5" stroke-opacity=".65" stroke-width="1.5"/><path d="M-23 -28Q-19 -39 -7 -43" stroke="white" stroke-width="4" stroke-linecap="round" opacity=".4"/>`;
    if(level>1)art+=block(26,6,8,4,12,'#b9d7b4','#edf1bd','#7ca69c');
    if(level>2)art+=tree(-29,7,.35,'#ebd3a5');
  }
  if(type === 'mine') {
    art += block(-10,-2,18,10,24,'#b5b9c8','#e2d4ba','#757f9a')+windows(-25,-22,2);
    art += `<path d="M5 3L17 -57L29 -51L19 10Z" fill="#dcaf64"/><path d="M17 -57L29 -51L23 -43L11 -49Z" fill="#ffe6a4"/><path d="M12 -35l12 6M9 -22l12 6" stroke="#786d67" stroke-width="5"/><path d="M26 -49v35l-5 7" stroke="#a5b9c9" stroke-width="3"/>`;
    art += crystal(-23,9,.35);if(level>1)art+=crystal(27,12,.45);if(level>2)art+=dish(-10,-28);
  }
  if(type === 'beacon') {
    art += block(0,-1,25,13,12,'#c6d1dd','#e5edf2','#7e8ba6');
    art += `<path d="M-10 -10L-5 -89h10l5 79Z" fill="#8e9ab9"/><path d="M-5 -89H0v84l-10 -5Z" fill="#e0e6ed"/><path d="M0 -83v65" stroke="#8ffff0" stroke-width="3"/><ellipse cy="-66" rx="24" ry="10" fill="none" stroke="#e5cc91" stroke-width="4"/><ellipse cy="-85" rx="16" ry="7" fill="none" stroke="#b4ebec" stroke-width="3"/><circle cy="-100" r="6" fill="#dcfff4"/><g class="beacon-waves" fill="none" stroke="#8fffe7"><ellipse cy="-100" rx="25" ry="11"/><ellipse cy="-100" rx="37" ry="17" opacity=".4"/></g>`;
  }
  if(type === 'wind') {
    art += block(0,0,17,9,10,'#aabcca','#e3eee7','#6f849e');
    art += `<path d="M-5 0L-2 -69h4L5 0Z" fill="#cfdee4"/><g class="turbine" transform="translate(0 -67)"><path d="M0 0L-5 -28Q2 -36 4 -27L3 -4Z" fill="#e7faf1"/><path d="M0 0L27 6Q33 13 23 12L2 3Z" fill="#9acbd6"/><path d="M0 0L-18 22Q-27 23 -21 15L-3 0Z" fill="#bddfeb"/><circle r="5" fill="#7ae6d2"/></g>`;
    if(level>1)art += block(-23,6,7,4,17,'#bac8d1','#eff6dc','#7292ab');
    if(level>2)art += block(23,6,7,4,17,'#bac8d1','#eff6dc','#7292ab');
  }
  if(type === 'residence') {
    art += block(-10,-2,18,10,38+level*12,'#d8c6c3','#f6ebdb','#8b8caa');
    art += block(16,5,14,8,26+level*9,'#a8ccd4','#d8f5ec','#6a8caa');
    for(let i=0;i<level+2;i++) art += windows(-25,-20-i*10,3);
    for(let i=0;i<level+1;i++) art += windows(4,-13-i*9,2);
    art += tree(23,14,.3,'#b6e7a3');
  }
  if(type === 'hydroponics') {
    for(let i=0;i<3;i++) {
      art += block(-18+i*17,3,8,5,10+level*3,'#67a99f','#b1eec7','#386f86');
      art += `<path d="M${-24+i*17} -${10+level*3}q6 -20 12 0" fill="#79dba9" stroke="#cef7cc" stroke-width="1.5"/>`;
    }
    art += `<path d="M-29 9L0 22L29 9" fill="none" stroke="#7be5ed" stroke-width="3"/>`;
    if(level>1)art += dish(26,-15);
  }
  if(type === 'quarry') {
    art += poly('-28,0 0,-16 28,0 0,16','#293d56')+poly('-18,0 0,-10 18,0 0,10','#52647c');
    art += block(-22,2,9,5,20,'#d8af70','#ffe0a4','#987a64');
    art += `<path d="M-22 -22V-48H21" fill="none" stroke="#ddbc7d" stroke-width="5"/><path d="M-22 -48L4 -22" stroke="#8c8e99" stroke-width="2"/><path d="M18 -48v27l-6 8h12l-6 -8" fill="none" stroke="#d0dee1" stroke-width="2"/>`;
    for(let i=0;i<level;i++) art += block(15-i*10,11,5,3,6,'#9fa8b7','#cfd2d9','#647b93');
  }
  if(type === 'synthesizer') {
    art += block(0,0,24,13,17,'#a9b4d5','#d9d9f2','#6f799f');
    art += `<path d="M-17 -17V-54Q0 -66 17 -54V-17Q0 -6 -17 -17Z" fill="#ba9de6" fill-opacity=".3" stroke="#cfbaf1" stroke-width="2"/>`;
    art += crystal(0,-20,.6+level*.12);
    art += `<ellipse cy="-53" rx="17" ry="8" fill="none" stroke="#c9c8f1" stroke-width="3"/><ellipse cy="-18" rx="17" ry="8" fill="none" stroke="#9ef4ef" stroke-width="3"/>`;
  }
  if(type === 'laboratory') {
    art += block(0,0,28,15,25,'#d1daed','#f1f4f2','#7f92b7')+windows(-24,-20,4);
    art += `<path d="M-17 -33a17 17 0 0 1 34 0Z" fill="#aeccea" stroke="#dfeef6" stroke-width="2"/><ellipse cy="-41" rx="24" ry="8" fill="none" stroke="#bba3ed" stroke-width="2" transform="rotate(-30 0 -41)"/><circle cy="-41" r="4" fill="#c4f9f5"/>`;
    art += dish(24,-28);
  }
  return `<g class="structure">${art}</g>`;
}
function nature(t,palette) {
  if(t.node==='bio') return tree(-14,2,.85,palette.leaf)+tree(16,7,.65,palette.leaf)+tree(1,12,.42,palette.leaf);
  if(t.node==='crystal') return crystal(-12,0,.8)+crystal(14,8,.6)+crystal(-2,12,.4);
  if(t.node==='ore') return poly('-29,1 -23,-17 -8,-28 8,-17 11,5 -9,14','#788caa')+poly('-23,-17 -8,-28 8,-17 -9,-7','#c8d5e0')+poly('5,6 12,-12 25,-20 35,-3 25,13','#9aabbb')+`<path d="M-18 -9l10 -5M14 -6l8 -5" stroke="#ffdb9b" stroke-width="3"/>`;
  if(t.node==='water') return `<g class="water-source"><ellipse cy="1" rx="24" ry="10" fill="#8bf7ed" opacity=".15"/><ellipse cy="1" rx="18" ry="7" fill="none" stroke="#9af8ee" opacity=".6"/><path d="M0 -28Q-17 -10 0 -7Q17 -10 0 -28" fill="#bcfff6"/><path d="M-3 -18q-4 5 0 6" stroke="#fff" fill="none" stroke-width="2"/></g>`;
  return '';
}
export function renderMap(state,{selection=null,placing=null,zoom=1,center={x:550,y:390},idPrefix='world'}={}) {
  const theme=BIOMES[state.world?.biome]||BIOMES.emerald;
  const tiles=[...worldOf(state)].sort((a,b)=>a.x+a.y-b.x-b.y||a.x-b.x);
  const buildings=Object.fromEntries(state.buildings.map(b=>[b.id,b]));
  const tileMap=Object.fromEntries(tiles.map(t=>[t.id,t]));
  let ground='',objects='';
  for(const t of tiles) {
    const p=project(t.x,t.y),b=buildings[t.id],variant=t.variant??((t.x*7+t.y*13)%1000);
    const water=t.terrain==='water';
    const color=water?'transparent':t.terrain==='sand'?theme.sand:theme.grass[Math.abs(variant)%3];
    const available=placing&&canPlace(state,t.id);
    const label=b?`${BUILDINGS[b.type].name}, niveau ${b.level}`:t.node?`${RESOURCES[t.node].name} · collecter`:'Terrain disponible';
    const coast=!water&&[[1,0],[0,1],[-1,0],[0,-1]].some(([dx,dy])=>tileMap[`${t.x+dx},${t.y+dy}`]?.terrain==='water');
    ground+=`<g transform="translate(${p.x} ${p.y})">${!water?poly('-40,0 0,22 0,32 -40,10','#3b5968')+poly('0,22 40,0 40,10 0,32','#293e58'):''}${poly(diamond,color)}${coast?`<path d="M-38 1L0 22L38 1" fill="none" stroke="${theme.sand}" stroke-width="3"/>`:''}${water?`<path class="water-line" d="M-20 1l12 6m13 -11 12 6" stroke="#b1f4ed" opacity="${variant%3===0?.22:.06}" fill="none"/>`:poly('-40,0 0,-22 0,0', '#fff','opacity=".035"')}</g>`;
    let detail='';
    if(!water&&!b&&!t.node) {
      if(variant%4===0) detail=`<path d="M-18 3l-2 -6m2 6 4 -4M17 6l3 -5" stroke="${theme.leaf}" stroke-width="2" opacity=".8"/>`;
      if(variant%7===0)detail+=`<circle cx="-10" cy="-4" r="2" fill="#f8d7b0"/><circle cx="-5" cy="-1" r="1.5" fill="#f0bcd8"/>`;
    }
    objects+=`<g class="tile ${selection===t.id?'selected':''} ${available?'buildable':''}" transform="translate(${p.x} ${p.y})" ${placing?'pointer-events="none" aria-hidden="true"':`data-tile="${t.id}" ${t.node?`data-node="${t.id}"`:''} role="button" tabindex="${b||t.node?0:-1}" aria-label="${label}"`}><polygon class="hit" points="${diamond}" fill="transparent"/>${detail}${nature(t,theme)}${b?buildingSymbol(b.type,b.level):''}<polygon class="outline" points="${diamond}" fill="none" stroke="#c7ffdb" stroke-width="2"/>${b?`<g class="level"><rect x="-14" y="20" width="28" height="14" rx="7" fill="#102435" stroke="#73d9c5" stroke-opacity=".4"/><text y="30" text-anchor="middle" fill="#d6ffed" font-size="9" font-family="Arial">${'I'.repeat(b.level)}</text></g>`:''}</g>`;
  }
  const overlay=placing?tiles.filter(t=>canPlace(state,t.id)).map(t=>{const p=project(t.x,t.y);return `<g class="tile buildable" data-tile="${t.id}" transform="translate(${p.x} ${p.y})" role="button" tabindex="0" aria-label="Choisir cet emplacement"><polygon class="hit" points="${diamond}"/><path d="M-6 0H6M0 -4V4" stroke="#c7ffe0" stroke-width="2"/><polygon class="outline" points="${diamond}" fill="none" stroke="#e9ffc8" stroke-width="2"/></g>`;}).join(''):'';
  const people=tiles.filter(t=>t.terrain!=='water'&&!t.node&&!buildings[t.id]&&Math.abs(t.x-5)+Math.abs(t.y-5)<5).slice(0,Math.min(12,Math.ceil(population(state)/3))).map((t,i)=>{const p=project(t.x,t.y);return `<g transform="translate(${p.x} ${p.y})" pointer-events="none"><g class="colonist" style="animation-delay:-${i}s"><ellipse cy="4" rx="4" ry="2" fill="#11263e" opacity=".4"/><path d="M-2 2v-5m4 5v-5" stroke="#273950" stroke-width="2"/><rect x="-3" y="-10" width="6" height="7" rx="2" fill="${i%2?'#ffd5a1':'#e5f5eb'}"/><circle cy="-13" r="3.5" fill="#eff9f6"/><path d="M-2 -13h4" stroke="#329db5" stroke-width="2"/></g></g>`;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${center.x-550/zoom} ${center.y-390/zoom} ${1100/zoom} ${780/zoom}" role="group" aria-label="Carte de la colonie"><defs><radialGradient id="ocean-light"><stop stop-color="${theme.water}"/><stop offset="1" stop-color="${theme.deep}"/></radialGradient><filter id="mist"><feGaussianBlur stdDeviation="8"/></filter></defs><rect x="-2000" y="-2000" width="5000" height="5000" fill="${theme.deep}"/><ellipse cx="550" cy="390" rx="900" ry="600" fill="url(#ocean-light)"/><g class="ocean-rings" fill="none" stroke="#77dce3" opacity=".08"><ellipse cx="550" cy="430" rx="540" ry="290"/><ellipse cx="550" cy="430" rx="590" ry="320"/></g>${ground}${objects}${people}<g class="atmosphere" pointer-events="none" fill="#d7f6f7" filter="url(#mist)" opacity=".1"><ellipse cx="250" cy="270" rx="110" ry="22"/><ellipse cx="800" cy="580" rx="170" ry="20"/></g>${overlay}</svg>`.replaceAll('ocean-light', `${idPrefix}-ocean-light`).replaceAll('id="mist"', `id="${idPrefix}-mist"`).replaceAll('url(#mist)', `url(#${idPrefix}-mist)`);
}
export function buildingPreview(type) { return `<svg viewBox="-55 -122 110 158" aria-hidden="true">${buildingSymbol(type,type==='habitat'?2:1)}</svg>`; }
