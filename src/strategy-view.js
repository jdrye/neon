import { artUrl } from './art-url.js?v=6.0.0';
import { BIOMES } from './world.js?v=6.0.0';
import { groundArt, terrainOf } from './terrain.js?v=6.0.0';
import { HOME, MAPS, RES, SIDE, STRUCTURES, UNITS, eachNeighbor, keyOf, pointOf, tileDistance } from './strategy-rules.js?v=7.0.0';
import { atlas, buildReason, routeDistance, unitCell, vision } from './strategy-engine.js?v=7.0.0';

const NS='http://www.w3.org/2000/svg';
const TEAM=['#77f4cf','#ff926c'];
const size={forum:[125,130],house:[81,82],barracks:[110,98],depot:[86,77],farm:[88,73],tower:[73,122],workshop:[91,88],spire:[104,138],worker:[36,47],guard:[44,49],watcher:[40,50],skimmer:[64,39]};
const sprite=(key,w,h,foot=6)=>`<image href="${artUrl(key)}" x="${-w/2}" y="${foot-h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet"/>`;
const round=n=>Math.round(n*10)/10;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function element(name,attrs={}){const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;}
function contact(radius){return `<ellipse cy="3" rx="${radius}" ry="${radius*.32}" fill="#112621" opacity=".27"/>`;}
function pennant(side,x,y){return `<g pointer-events="none" transform="translate(${x} ${y})"><path d="M0 0v-25" stroke="#453b2e" stroke-width="2.8"/><path d="M1-25 15-22 11-17 1-18Z" fill="${TEAM[side]}" stroke="#203a3c" stroke-width="1.1"/></g>`;}
function glyph(item,selected,state) {
  const {kind,type,side}=item;
  if(kind==='node'){
    const c=state.chart.cells[item.cell],biome=MAPS[state.s.region].biome;
    const art=type==='wood'?(biome==='boreal'?'frost-pines':biome==='amber'?'amber-grove':c.variant%2?'bio':'fan-canopy'):type==='food'?'undergrowth':type==='ore'?(c.variant%2?'ore':'ore-slate'):'crystal-spire';
    const w=type==='wood'?88:67,h=type==='wood'?90:type==='food'?46:62;
    return `<ellipse rx="${w*.40}" ry="${w*.21}" class="target-ring"/>${contact(w*.36)}${type==='wood'?`<g transform="translate(-15 -4)">${sprite(art,w*.68,h*.72)}</g>`:''}${sprite(art,w,h)}${type==='food'?`<g transform="translate(-8 -4)">${sprite('flowers',36,34)}</g><g fill="#efae59" stroke="#935337" stroke-width=".8"><circle cx="-17" cy="-12" r="2.1"/><circle cx="-13" cy="-13" r="2"/><circle cx="5" cy="-14" r="2.6"/><circle cx="9" cy="-16" r="2"/><circle cx="14" cy="-9" r="2.1"/></g>`:''}`;
  }
  if(kind==='relay')return `<ellipse rx="37" ry="17" fill="#d4ba6540" stroke="${side>=0?TEAM[side]:'#ffdf99'}" stroke-dasharray="4 4" stroke-width="2"/>${sprite('beacon',50,73)}<path d="m0-87 6 6-6 6-6-6Z" fill="${side>=0?TEAM[side]:'#ffdf99'}" stroke="#35413b"/>`;
  const isUnit=kind==='unit',d=(isUnit?UNITS:STRUCTURES)[type],[w,h]=size[type];
  const under=kind==='building'&&!item.e.ready;
  const ring=Math.min(w*.45,isUnit?21:49);
  return `<ellipse class="team-ring" rx="${ring}" ry="${ring*.42}" fill="${TEAM[side]}19" stroke="${TEAM[side]}" stroke-width="${selected?2.8:1.25}" opacity="${selected?.98:.67}"/>${contact(w*.33)}
    <g class="rts-sprite ${isUnit?'mobile-piece':''} ${side?'rival-piece':''}" opacity="${under?.58:1}">${sprite(d.art,w,h)}</g>
    ${isUnit?`<path d="m0 6 3 2.7L0 11l-3-2.3Z" fill="${TEAM[side]}" stroke="#24332e" stroke-width=".8"/><path d="m-3 -1 3 3 3-3-3-3Z" transform="translate(0 ${5-h})" stroke="#183432" stroke-width="1" fill="${TEAM[side]}"/>`:pennant(side,w*.30,3)}
    ${under?'<path d="m-28 4 24-12 30 10m-44-9v-19m25 12v-14m9 29v-16" fill="none" stroke="#e9c187" stroke-width="3"/>':''}
    <g class="life-track" transform="translate(-16 ${9-h})"><rect width="32" height="3.6" rx="1.6" fill="#122326"/><rect class="life-fill" width="32" height="3.6" rx="1.6" fill="${under?'#ffcf7e':TEAM[side]}"/></g>
    ${isUnit&&item.e.cargo?`<g transform="translate(13 -17)"><circle r="6.5" fill="#233834" stroke="#edd7a2" stroke-width="1"/>${sprite(RES[item.e.cargo.kind].art,10,10,5)}</g>`:''}`;
}
// Two soft masks distinguish unexplored territory from previously seen ground.
// Covering the surrounding sea keeps fog continuous at cliff and map boundaries.
function fogLayer(bounds) {
  const area = `x="${bounds.left-2400}" y="${bounds.top-2400}" width="${bounds.right-bounds.left+4800}" height="${bounds.bottom-bounds.top+4800}"`;
  const mask = key => `<mask id="rts-mask-${key}" maskUnits="userSpaceOnUse" ${area} style="mask-type:luminance"><rect ${area} fill="white"/><path data-fog="${key}" fill="black" stroke="black" stroke-width="10" stroke-linejoin="round" filter="url(#rts-soft-fog)"/></mask>`;
  return `<defs><filter id="rts-soft-fog" x="-10%" y="-14%" width="120%" height="128%"><feGaussianBlur stdDeviation="13 10"/></filter>
    <linearGradient id="rts-fog-tone" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#193b43"/><stop offset="1" stop-color="#172c39"/></linearGradient>
    ${mask('known')}${mask('visible')}</defs>
    <rect ${area} fill="#213a40" opacity=".36" mask="url(#rts-mask-visible)"/><rect ${area} fill="url(#rts-fog-tone)" opacity=".84" mask="url(#rts-mask-known)"/>`;
}
function smoothRoad(points) {
  let d = `M${round(points[0].x)} ${round(points[0].y)}`;
  for(let i=1;i<points.length-1;i++) {
    const p=points[i], next=points[i+1];
    d+=`Q${round(p.x)} ${round(p.y)} ${round((p.x+next.x)/2)} ${round((p.y+next.y)/2)}`;
  }
  const last=points.at(-1);
  return d+`L${round(last.x)} ${round(last.y)}`;
}
export class BattleView {
  constructor(svg,mini,s){
    this.svg=svg;this.mini=mini;this.s=s;this.chart=atlas(s);this.mesh=terrainOf(this.chart.cells);
    this.points=this.chart.cells.map(t=>this.mesh.positions.get(t.id));
    this.polygons=this.points.map(p=>p.hit.split(' ').map(pair=>{const [x,y]=pair.split(',').map(Number);return [round(x+p.x),round(y+p.y)];}));
    this.paths=this.polygons.map(pts=>'M'+pts.map(p=>p.join(',')).join('L')+'Z');
    this.pieces=new Map();this.roadsKey='';this.lastFog='';this.placementKey='';this.lastMini='';this.zoom=svg.clientWidth<600?.77:.93;
    this.center={...this.points[HOME]};this.center.y-=24;
    const biome=MAPS[s.region].biome,theme=BIOMES[biome];
    const details=this.chart.cells.filter(t=>t.terrain!=='water'&&(t.ridge||t.ford||t.variant%7===0)).map(t=>{
      const p=this.points[t.cell];let art='';
      if(t.ridge)art=sprite('ore-slate',63+t.variant%27,42+t.variant%36);
      else if(t.ford)art='<path d="m-21 1 15-7 13 5 15-5" stroke="#f9e7a5" stroke-width="3" opacity=".58" fill="none"/>';
      else {const assets=biome==='amber'?['amber-fronds','rock-shelf','lichen']:biome==='boreal'?['frost-fern','lichen','rock-shelf']:['fern','flowers','undergrowth'];art=sprite(assets[t.variant%3],24+t.variant%24,15+t.variant%20);}
      return `<g transform="translate(${p.x} ${p.y})">${art}</g>`;
    }).join('');
    svg.innerHTML=`${groundArt(this.mesh,theme,'rts-field',biome)}<g data-layer="roads" pointer-events="none"></g><g pointer-events="none">${details}</g><g data-layer="fog" pointer-events="none">${fogLayer(this.mesh.bounds)}</g><path data-layer="sites" pointer-events="none" fill="#aaddbd28" stroke="#c8edbf96" stroke-width=".9"/><g data-layer="orders" pointer-events="none"></g><g data-layer="pieces"></g><g data-layer="fx" pointer-events="none"></g><g data-layer="cursor" pointer-events="none"></g>`;
    this.layers=Object.fromEntries([...svg.querySelectorAll('[data-layer]')].map(e=>[e.dataset.layer,e]));
    this.resize();
  }
  point(x,y){const a=Math.floor(x),b=Math.floor(y),i=keyOf(a,b),p=this.points[i],q=this.points[keyOf(Math.min(SIDE-1,a+1),b)],r=this.points[keyOf(a,Math.min(SIDE-1,b+1))],t=this.points[keyOf(Math.min(SIDE-1,a+1),Math.min(SIDE-1,b+1))],dx=x-a,dy=y-b;
    return {x:(p.x*(1-dx)+q.x*dx)*(1-dy)+(r.x*(1-dx)+t.x*dx)*dy,y:(p.y*(1-dx)+q.y*dx)*(1-dy)+(r.y*(1-dx)+t.y*dx)*dy};}
  resize(){this.width=Math.max(1,this.svg.clientWidth);this.height=Math.max(1,this.svg.clientHeight);this.camera();}
  camera(){const b=this.mesh.bounds;this.center.x=clamp(this.center.x,b.left,b.right);this.center.y=clamp(this.center.y,b.top,b.bottom);const w=this.width/this.zoom,h=this.height/this.zoom;
    this.box={x:this.center.x-w/2,y:this.center.y-h/2,w,h};this.svg.setAttribute('viewBox',`${this.box.x} ${this.box.y} ${w} ${h}`);this.drawMiniFrame();}
  focus(cell){const p=this.points[cell];if(p){this.center={x:p.x,y:p.y-22};this.camera();}}
  scale(f){this.zoom=clamp(this.zoom*f,.36,1.8);this.camera();}
  pan(dx,dy){this.center.x+=dx/this.zoom;this.center.y+=dy/this.zoom;this.camera();}
  worldPoint(cx,cy){const b=this.svg.getBoundingClientRect();return {x:this.box.x+(cx-b.left)/this.zoom,y:this.box.y+(cy-b.top)/this.zoom};}
  screenPoint(p){const b=this.svg.getBoundingClientRect();return {x:b.left+(p.x-this.box.x)*this.zoom,y:b.top+(p.y-this.box.y)*this.zoom};}
  cellAt(p){let best=null,d=Infinity;for(let i=0;i<this.points.length;i++){const q=this.points[i],dx=q.x-p.x,dy=q.y-p.y;const v=dx*dx+dy*dy*3.2;if(v<d){d=v;best=i;}}return best;}
  miniPos(p){const b=this.mesh.bounds;return {x:5+146*(p.x-b.left)/(b.right-b.left),y:5+82*(p.y-b.top)/(b.bottom-b.top)};}
  miniTravel(x,y){const r=this.mini.getBoundingClientRect(),b=this.mesh.bounds;this.center={x:b.left+((x-r.left)/r.width*156-5)/146*(b.right-b.left),y:b.top+((y-r.top)/r.height*92-5)/82*(b.bottom-b.top)};this.camera();}
  drawMiniFrame(){const rect=this.mini.querySelector('[data-frame]');if(!rect)return;const p=this.miniPos(this.box),q=this.miniPos({x:this.box.x+this.box.w,y:this.box.y+this.box.h});rect.setAttribute('x',p.x);rect.setAttribute('y',p.y);rect.setAttribute('width',q.x-p.x);rect.setAttribute('height',q.y-p.y);}
  miniMap(mask,fogKey){const terrain=this.chart.cells;
    if(this.lastMini!==fogKey){this.lastMini=fogKey;const colors=new Map();for(const t of terrain){const p=this.miniPos(this.points[t.cell]);const color=!this.s.teams[0].explored[t.cell]?'#23383f':t.ridge?'#777875':t.terrain==='water'?'#37646e':mask[t.cell]?'#779577':'#52665b';colors.set(color,(colors.get(color)||'')+`M${round(p.x)} ${round(p.y-1.7)}l3.3 1.7-3.3 1.7-3.3-1.7Z`);}
      this.mini.innerHTML=`${[...colors].map(([c,d])=>`<path d="${d}" fill="${c}"/>`).join('')}<g data-dots></g><rect data-frame fill="none" stroke="#fff1c6" stroke-width="1"/>`;}
    const dots=[];const push=(p,color,r)=>{const q=this.miniPos(p);dots.push(`<circle cx="${round(q.x)}" cy="${round(q.y)}" r="${r}" fill="${color}"/>`);};
    push(this.points[this.chart.relay],'#ffe6a0',2.3);
    for(const b of this.s.buildings)if(!b.side||mask[b.cell])push(this.points[b.cell],TEAM[b.side],b.type==='forum'?2.7:1.7);
    for(const u of this.s.units)if(!u.side||mask[unitCell(u)])push(this.point(u.x,u.y),TEAM[u.side],1.1);
    if(this.s.alarm&&this.s.tick-this.s.alarm.tick<88){
      const p=this.miniPos(this.points[this.s.alarm.cell]);
      dots.push(`<circle cx="${round(p.x)}" cy="${round(p.y)}" r="4.5" fill="none" stroke="#ffa677" stroke-width="1.3"/>`);
    }
    this.mini.querySelector('[data-dots]').innerHTML=dots.join('');this.drawMiniFrame();
  }
  roadBetween(from,to) {
    const distance = cell => routeDistance(this.s,cell,to);
    const exits = this.chart.cells.filter(t=>tileDistance(t.cell,from)<=1.45 && distance(t.cell)>=0);
    exits.sort((a,b)=>distance(a.cell)-distance(b.cell)||a.cell-b.cell);
    if(!exits.length || distance(exits[0].cell)>11)return '';
    let cell=exits[0].cell;
    const points=[this.points[from],this.points[cell]];
    while(distance(cell)>0) {
      const next=eachNeighbor[cell].find(n=>distance(n)===distance(cell)-1);
      if(next===undefined)return '';
      cell=next;points.push(this.points[cell]);
    }
    points.push(this.points[to]);
    return smoothRoad(points);
  }
  drawRoads(mask) {
    const seen=this.s.buildings.filter(b=>!b.side||mask[b.cell]);
    const key=this.s.rev+' / '+seen.map(b=>b.id).join(',');
    if(key===this.roadsKey)return;
    this.roadsKey=key;
    const paths=[];
    for(const b of seen) {
      const neighbors=seen.filter(n=>n.side===b.side && n.id<b.id && tileDistance(b.cell,n.cell)<=8);
      neighbors.sort((a,c)=>tileDistance(a.cell,b.cell)-tileDistance(c.cell,b.cell));
      for(const n of neighbors){const d=this.roadBetween(b.cell,n.cell);if(d){paths.push(d);break;}}
    }
    const d=paths.join('');
    this.layers.roads.innerHTML=d?`<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="#746348" stroke-width="19" opacity=".33"/><path d="${d}" stroke="#ccab78" stroke-width="15" opacity=".79"/><path d="${d}" stroke="#dec599" stroke-width="8" opacity=".55"/><path d="${d}" stroke="#9a815d" stroke-width="1.4" stroke-dasharray="2 11 4 9" opacity=".66"/></g>`:'';
  }
  cursor(cell,mode){if(cell===null){this.layers.cursor.innerHTML='';return;}
    const p=this.points[cell],building=mode?.startsWith('build:')?mode.slice(6):null;
    const ok=!building||!buildReason(this.s,0,building,cell),c=ok?'#ffe399':'#ff997e';
    this.layers.cursor.innerHTML=`<path d="${this.paths[cell]}" stroke="${c}" fill="${c}2b" stroke-width="2.4"/>${building?`<g opacity=".67" transform="translate(${p.x} ${p.y})">${sprite(STRUCTURES[building].art,...size[building])}</g>`:''}`;}
  draw(selection,mode,cursor,speed){const s=this.s,vis=vision(s,0),known=s.teams[0].explored;
    const fogKey=vis.join('')+known.join('');
    if(fogKey!==this.lastFog) {
      this.lastFog=fogKey;
      let seenPath='',litPath='';
      for(let i=0;i<vis.length;i++){if(known[i])seenPath+=this.paths[i];if(vis[i])litPath+=this.paths[i];}
      this.layers.fog.querySelector('[data-fog="known"]').setAttribute('d',seenPath);
      this.layers.fog.querySelector('[data-fog="visible"]').setAttribute('d',litPath);
    }
    this.drawRoads(vis);
    const siteKey=mode?.startsWith('build:')?mode+s.rev+fogKey+s.tick:'';
    if(this.placementKey!==siteKey){this.placementKey=siteKey;this.layers.sites.setAttribute('d',siteKey?this.chart.cells.filter(c=>!buildReason(s,0,mode.slice(6),c.cell)).map(c=>this.paths[c.cell]).join(''):'');}
    const items=[];
    for(const n of s.nodes)if(n.left>0&&known[n.cell])items.push({key:'n'+n.cell,kind:'node',type:n.kind,cell:n.cell,e:n,label:RES[n.kind].name});
    items.push({key:'relay',kind:'relay',side:s.relay.owner,cell:this.chart.relay,e:s.relay,label:'Relais du bassin'});
    for(const b of s.buildings)if(!b.side||vis[b.cell])items.push({key:'e'+b.id,kind:'building',type:b.type,side:b.side,cell:b.cell,e:b,label:STRUCTURES[b.type].name});
    for(const u of s.units)if(!u.side||vis[unitCell(u)])items.push({key:'e'+u.id,kind:'unit',type:u.type,side:u.side,cell:unitCell(u),e:u,label:UNITS[u.type].name});
    for(const it of items){it.p=it.kind==='unit'?this.point(it.e.x,it.e.y):this.points[it.cell];if(it.kind==='unit')it.p={x:it.p.x+((it.e.id*7)%9-4),y:it.p.y+((it.e.id*3)%5-2)};}
    items.sort((a,b)=>a.p.y-b.p.y||(a.kind==='unit'?1:-1));const alive=new Set();let previous=null;
    for(const it of items){alive.add(it.key);let g=this.pieces.get(it.key);if(!g){g=element('g',{role:'button',tabindex:'-1','data-rts-object':it.key});this.pieces.set(it.key,g);}
      const selected=selection.includes(it.key),sig=[it.kind,it.type,it.side,selected,it.e.ready,it.e.cargo?.kind].join('/');
      if(g.dataset.sig!==sig){g.dataset.sig=sig;g.innerHTML=glyph(it,selected,this);g.setAttribute('aria-label',it.label+(it.side===1?' · Cendre':''));}
      const isUnit=it.kind==='unit';g.setAttribute('class',`rts-piece ${it.kind} ${selected?'selected':''}${it.kind==='node'&&!vis[it.cell]?' remembered':''}`);
      if(isUnit&&g.dataset.px){const dx=it.p.x-Number(g.dataset.px);if(Math.abs(dx)>.4)g.querySelector('.mobile-piece')?.setAttribute('transform',`scale(${dx<0?-1:1} 1)`);}
      g.dataset.px=it.p.x;g.style.transform=`translate(${round(it.p.x)}px,${round(it.p.y)}px)`;
      if(isUnit)g.style.transitionDuration=`${DT_VIS/speed}s`;
      if(it.kind==='building'||isUnit){const def=(isUnit?UNITS:STRUCTURES)[it.type],fraction=it.e.ready===false?it.e.work/def.time:it.e.hp/def.hp;
        g.querySelector('.life-fill').setAttribute('width',Math.max(1,32*fraction));g.querySelector('.life-track').style.opacity=selected||it.e.hp<def.hp-.1||it.e.ready===false?'1':'0';}
      const next=previous?previous.nextElementSibling:this.layers.pieces.firstElementChild;if(next!==g)this.layers.pieces.insertBefore(g,next);previous=g;
    }
    for(const [k,g] of this.pieces)if(!alive.has(k)){g.remove();this.pieces.delete(k);}
    const orders=[];for(const u of s.units.filter(u=>!u.side&&selection.includes('e'+u.id)).slice(0,8)){const dest=u.order.cell;if(dest===undefined)continue;const a=this.point(u.x,u.y),b=this.points[dest];orders.push(`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#ffe5a1" fill="none" opacity=".62" stroke-width="1.7" stroke-dasharray="4 6"/><circle cx="${b.x}" cy="${b.y}" r="4" fill="#ffe5a1"/>`);}
    for(const b of s.buildings.filter(b=>!b.side&&selection.includes('e'+b.id)&&b.rally!==null)){const a=this.points[b.cell],p=this.points[b.rally];orders.push(`<path d="M${a.x} ${a.y}L${p.x} ${p.y}" stroke="#eac981" stroke-dasharray="7 5"/><g transform="translate(${p.x} ${p.y})">${pennant(0,0,0)}</g>`);}
    this.layers.orders.innerHTML=orders.join('');
    const effects=s.effects.map(e=>{
      const a=this.point(e.a.x,e.a.y),b=this.point(e.b.x,e.b.y),age=s.tick-e.t;
      return `<g opacity="${1-age*.27}"><path d="M${a.x} ${a.y-19}L${b.x} ${b.y-20}" stroke="${TEAM[e.side]}" stroke-width="3"/><circle cx="${b.x}" cy="${b.y-20}" r="${3+age*2}" fill="none" stroke="#fff0b2" stroke-width="1.6"/></g>`;
    });
    for(const u of s.units) {
      if(u.type!=='worker'||!vis[unitCell(u)]||(s.tick+u.id*2)%9>1||!['assist','repair','gather'].includes(u.order.kind)||u.order.delivering||tileDistance(unitCell(u),u.order.cell)>1.45)continue;
      const p=this.point(u.x,u.y);
      effects.push(`<path transform="translate(${p.x+9} ${p.y-11})" d="m-2 -3 2 2m2-4-1 3m5 0-3 1" stroke="#ffe1a2" fill="none" stroke-linecap="round" stroke-width="1.5"/>`);
    }
    this.layers.fx.innerHTML=effects.join('');this.cursor(cursor,mode);this.miniMap(vis,fogKey);
  }
}
const DT_VIS=.23;
