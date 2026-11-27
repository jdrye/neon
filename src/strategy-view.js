import {CONTRACTS,POST_NAMES} from './trade.js?v=8.3.0';
import { artUrl } from './art-url.js?v=6.0.0';
import { BIOMES } from './world.js?v=6.0.0';
import { groundArt, terrainOf } from './terrain.js?v=8.3.0';
import { MAPS, RES, SIDE, STRUCTURES, UNITS, mapDistance, mapKey } from './strategy-rules.js?v=8.3.0';
import { atlas, buildReason, routeDistance, unitCell, vision } from './strategy-engine.js?v=8.3.0';

const NS='http://www.w3.org/2000/svg';
const TEAM=['#77f4cf','#ff926c'];
const size={forum:[125,130],house:[81,82],barracks:[110,98],depot:[86,77],farm:[88,73],tower:[73,122],workshop:[91,88],spire:[104,138],worker:[36,47],guard:[44,49],watcher:[40,50],skimmer:[64,39],
  market:[105,95],caravan:[68,51],solar:[85,73],pump:[79,80],greenhouse:[87,77],mine:[83,81],hangar:[91,80],wind:[86,112],residence:[89,100],
  hydroponics:[91,80],quarry:[97,82],synthesizer:[88,91],laboratory:[89,88],beacon:[91,113],lighthouse:[76,128],observatory:[90,99]};
const sprite=(key,w,h,foot=6)=>`<image href="${artUrl(key)}" x="${-w/2}" y="${foot-h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet"/>`;
const round=n=>Math.round(n*10)/10;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function element(name,attrs={}){const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;}
function contact(radius){return `<ellipse cy="3" rx="${radius}" ry="${radius*.32}" fill="#112621" opacity=".27"/>`;}
function pennant(side,x,y){return `<g pointer-events="none" transform="translate(${x} ${y})"><path d="M0 0v-25" stroke="#453b2e" stroke-width="2.8"/><path d="M1-25 15-22 11-17 1-18Z" fill="${TEAM[side]}" stroke="#203a3c" stroke-width="1.1"/></g>`;}
function glyph(item,selected,state) {
  const {kind,type,side}=item;
  if(kind==='post')return '<ellipse rx="31" ry="13" fill="#a7752d2e" stroke="#e4bf79" stroke-width="1.8" stroke-dasharray="7 4"/>'+contact(31)+sprite('trade-post',72,97)+'<path d="m0 -111 5 5-5 5-5-5Z" fill="#f1c574" stroke="#584326"/>';
  if(kind==='rover')return `<ellipse rx="22" ry="8" fill="#d9ab4a30" stroke="#ffe69d" stroke-width="1.5"/>${contact(23)}<g class="mobile-piece">${sprite('rover',62,43)}</g><circle cy="-43" r="3" fill="#ffe09a"/>`;
  if(kind==='node'){
    const c=state.chart.cells[item.cell],biome=MAPS[state.s.region].biome;
    const art=type==='wood'?(biome==='boreal'?'frost-pines':biome==='amber'?'amber-grove':c.variant%2?'bio':'fan-canopy'):type==='food'?'undergrowth':type==='ore'?(c.variant%2?'ore':'ore-slate'):'crystal-spire';
    const w=type==='wood'?88:67,h=type==='wood'?90:type==='food'?46:62;
    return `<ellipse rx="${w*.40}" ry="${w*.21}" class="target-ring"/>${contact(w*.36)}${type==='wood'?`<g transform="translate(-15 -4)">${sprite(art,w*.68,h*.72)}</g>`:''}${sprite(art,w,h)}${type==='food'?`<g transform="translate(-8 -4)">${sprite('flowers',36,34)}</g><g fill="#efae59" stroke="#935337" stroke-width=".8"><circle cx="-17" cy="-12" r="2.1"/><circle cx="-13" cy="-13" r="2"/><circle cx="5" cy="-14" r="2.6"/><circle cx="9" cy="-16" r="2"/><circle cx="14" cy="-9" r="2.1"/></g>`:''}`;
  }
  if(kind==='relay')return `<ellipse rx="37" ry="17" fill="#d4ba6540" stroke="${side>=0?TEAM[side]:'#ffdf99'}" stroke-dasharray="4 4" stroke-width="2"/>${sprite('beacon',50,73)}<path d="m0-87 6 6-6 6-6-6Z" fill="${side>=0?TEAM[side]:'#ffdf99'}" stroke="#35413b"/>`;
  const isUnit=kind==='unit',d=(isUnit?UNITS:STRUCTURES)[type],[w,h]=size[type];
  const route=isUnit&&item.e.order.kind==='trade'?item.e.order:null;
  const freight=route&&route.phase!=='load'?(route.phase==='back'?route.good:CONTRACTS[route.good].input):null;
  const under=kind==='building'&&!item.e.ready;
  const ring=Math.min(w*.45,isUnit?21:49);
  return `<ellipse class="team-ring" rx="${ring}" ry="${ring*.42}" fill="${TEAM[side]}19" stroke="${TEAM[side]}" stroke-width="${selected?2.8:1.25}" opacity="${selected?.98:.67}"/>${contact(w*.33)}
    <g class="rts-sprite ${isUnit?'mobile-piece':''} ${side?'rival-piece':''}" opacity="${under?.58:1}">${sprite(d.art,w,h)}</g>
    ${isUnit?`<path d="m0 6 3 2.7L0 11l-3-2.3Z" fill="${TEAM[side]}" stroke="#24332e" stroke-width=".8"/><path d="m-3 -1 3 3 3-3-3-3Z" transform="translate(0 ${5-h})" stroke="#183432" stroke-width="1" fill="${TEAM[side]}"/>`:pennant(side,w*.30,3)}
    ${kind==='building'&&item.e.level>1?`<g transform="translate(${-w*.28} 1)">${sprite('annex',32,28)}${item.e.level===3?`<g transform="translate(35 -7)">${sprite('battery',22,23)}</g>`:''}</g>`:''}
    ${under?'<path d="m-28 4 24-12 30 10m-44-9v-19m25 12v-14m9 29v-16" fill="none" stroke="#e9c187" stroke-width="3"/>':''}
    <g class="life-track" transform="translate(-16 ${9-h})"><rect width="32" height="3.6" rx="1.6" fill="#122326"/><rect class="life-fill" width="32" height="3.6" rx="1.6" fill="${under?'#ffcf7e':TEAM[side]}"/></g>
    ${freight?'<g transform="translate(19 -31)"><circle r="9" fill="#28332b" stroke="#efcb7b"/>'+sprite(RES[freight].art,15,15,7)+'</g>':''}
    ${isUnit&&item.e.cargo?`<g transform="translate(13 -17)"><circle r="6.5" fill="#233834" stroke="#edd7a2" stroke-width="1"/>${sprite(RES[item.e.cargo.kind].art,10,10,5)}</g>`:''}`;
}
// Two soft masks distinguish unexplored territory from previously seen ground.
// Covering the surrounding sea keeps fog continuous at cliff and map boundaries.
function fogLayer(bounds,wide) {
  const viewport=wide?' data-fog-area':'';
  const blur=wide?'':' filter="url(#rts-soft-fog)"';
  const area = `x="${bounds.left-2400}" y="${bounds.top-2400}" width="${bounds.right-bounds.left+4800}" height="${bounds.bottom-bounds.top+4800}"`;
  const mask = key => `<mask id="rts-mask-${key}" maskUnits="userSpaceOnUse" ${area}${viewport} style="mask-type:luminance"><rect ${area}${viewport} fill="white"/><path data-fog="${key}" fill="black" stroke="black" stroke-width="10" stroke-linejoin="round"${blur}/></mask>`;
  return `<defs><filter id="rts-soft-fog" x="-10%" y="-14%" width="120%" height="128%"><feGaussianBlur stdDeviation="13 10"/></filter>
    <linearGradient id="rts-fog-tone" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#193b43"/><stop offset="1" stop-color="#172c39"/></linearGradient>
    ${mask('known')}${mask('visible')}</defs>
    <rect ${area}${viewport} fill="#213a40" opacity=".36" mask="url(#rts-mask-visible)"/><rect ${area}${viewport} fill="url(#rts-fog-tone)" opacity=".84" mask="url(#rts-mask-known)"/>`;
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
    this.wide=this.chart.size>SIDE;
    this.points=this.chart.cells.map(t=>this.mesh.positions.get(t.id));
    this.polygons=this.points.map(p=>p.hit.split(' ').map(pair=>{const [x,y]=pair.split(',').map(Number);return [round(x+p.x),round(y+p.y)];}));
    this.paths=this.polygons.map(pts=>'M'+pts.map(p=>p.join(',')).join('L')+'Z');
    this.pieces=new Map();this.roadsKey='';this.lastFog='';this.placementKey='';this.lastMini='';this.zoom=svg.clientWidth<600?.77:.93;
    this.center={...this.points[this.chart.home]};this.center.y-=24;
    const biome=MAPS[s.region].biome,theme=BIOMES[biome];
    this.details=this.chart.cells.map(t=>{
      if(t.terrain==='water'||!t.ridge&&!t.ford&&t.variant%7!==0)return '';
      const p=this.points[t.cell];let art='';
      if(t.ridge)art=sprite('ore-slate',63+t.variant%27,42+t.variant%36);
      else if(t.ford)art='<path d="m-21 1 15-7 13 5 15-5" stroke="#f9e7a5" stroke-width="3" opacity=".58" fill="none"/>';
      else {const assets=biome==='amber'?['amber-fronds','rock-shelf','lichen']:biome==='boreal'?['frost-fern','lichen','rock-shelf']:['fern','flowers','undergrowth'];art=sprite(assets[t.variant%3],24+t.variant%24,15+t.variant%20);}
      return `<g transform="translate(${p.x} ${p.y})">${art}</g>`;
    });
    svg.innerHTML=`${groundArt(this.mesh,theme,'rts-field',biome,this.wide)}<g data-layer="roads" pointer-events="none"></g><g data-layer="details" pointer-events="none">${this.wide?'':this.details.join('')}</g><g data-layer="fog" pointer-events="none">${fogLayer(this.mesh.bounds,this.wide)}</g><path data-layer="sites" pointer-events="none" fill="#aaddbd28" stroke="#c8edbf96" stroke-width=".9"/><g data-layer="orders" pointer-events="none"></g><g data-layer="pieces"></g><g data-layer="fx" pointer-events="none"></g><g data-layer="cursor" pointer-events="none"></g>`;
    this.layers=Object.fromEntries([...svg.querySelectorAll('[data-layer]')].map(e=>[e.dataset.layer,e]));
    this.fogAreas=[...this.layers.fog.querySelectorAll('[data-fog-area]')];
    this.miniTerrain=mini.parentElement.querySelector('canvas').getContext('2d');
    mini.innerHTML='<g data-dots></g><rect data-frame fill="none" stroke="#fff1c6" stroke-width="1"/>';
    this.miniDots=mini.querySelector('[data-dots]');
    this.miniFrame=mini.querySelector('[data-frame]');
    this.resize();
  }
  point(x,y){
    const size=this.chart.size,a=Math.floor(x),b=Math.floor(y),dx=x-a,dy=y-b;
    const at=(i,j)=>this.points[mapKey(size,Math.min(size-1,i),Math.min(size-1,j))];
    const p=at(a,b),q=at(a+1,b),r=at(a,b+1),t=at(a+1,b+1);
    return {x:(p.x*(1-dx)+q.x*dx)*(1-dy)+(r.x*(1-dx)+t.x*dx)*dy,y:(p.y*(1-dx)+q.y*dx)*(1-dy)+(r.y*(1-dx)+t.y*dx)*dy};
  }
  minZoom(){
    if(!this.wide)return .36;
    const b=this.mesh.bounds;
    return clamp(.91*Math.min(this.width/(b.right-b.left),this.height/(b.bottom-b.top)),.08,.36);
  }
  resize(){this.width=Math.max(1,this.svg.clientWidth);this.height=Math.max(1,this.svg.clientHeight);this.camera();}
  camera(){
    const b=this.mesh.bounds;
    this.zoom=clamp(this.zoom,this.minZoom(),1.8);
    const w=this.width/this.zoom,h=this.height/this.zoom;
    const center=(p,lo,hi,span)=>span>=hi-lo?(lo+hi)/2:clamp(p,lo+span/2,hi-span/2);
    this.center.x=this.wide?center(this.center.x,b.left,b.right,w):clamp(this.center.x,b.left,b.right);
    this.center.y=this.wide?center(this.center.y,b.top,b.bottom,h):clamp(this.center.y,b.top,b.bottom);
    this.box={x:this.center.x-w/2,y:this.center.y-h/2,w,h};
    this.svg.setAttribute('viewBox',`${this.box.x} ${this.box.y} ${w} ${h}`);
    this.drawMiniFrame();this.onCamera?.();
  }
  focus(cell){const p=this.points[cell];if(p){this.center={x:p.x,y:p.y-22};this.camera();}}
  overview(){
    const b=this.mesh.bounds;
    this.center={x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};
    this.zoom=clamp(.91*Math.min(this.width/(b.right-b.left),this.height/(b.bottom-b.top)),this.minZoom(),1.8);
    this.camera();
  }
  scale(f,cx,cy){
    const old=this.zoom,anchor=cx===undefined?this.center:this.worldPoint(cx,cy);
    this.zoom=clamp(old*f,this.minZoom(),1.8);
    this.center={x:anchor.x+(this.center.x-anchor.x)*old/this.zoom,y:anchor.y+(this.center.y-anchor.y)*old/this.zoom};
    this.camera();
  }
  pan(dx,dy){this.center.x+=dx/this.zoom;this.center.y+=dy/this.zoom;this.camera();}
  worldPoint(cx,cy){const b=this.svg.getBoundingClientRect();return {x:this.box.x+(cx-b.left)/this.zoom,y:this.box.y+(cy-b.top)/this.zoom};}
  screenPoint(p){const b=this.svg.getBoundingClientRect();return {x:b.left+(p.x-this.box.x)*this.zoom,y:b.top+(p.y-this.box.y)*this.zoom};}
  cellAt(p){
    const a=(p.x-550)/40,b=(p.y-157)/22,size=this.chart.size;
    const x=clamp(Math.round((a+b)/2),0,size-1),y=clamp(Math.round((b-a)/2),0,size-1);
    let best=null,d=Infinity;
    for(let j=Math.max(0,y-3);j<=Math.min(size-1,y+3);j++)for(let i=Math.max(0,x-3);i<=Math.min(size-1,x+3);i++){
      const id=mapKey(size,i,j),q=this.points[id],dx=q.x-p.x,dy=q.y-p.y,v=dx*dx+dy*dy*3.2;
      if(v<d){d=v;best=id;}
    }
    return best;
  }
  updateWindow(){
    if(!this.wide)return false;
    const {x,y,w,h}=this.box,step=160;
    const left=Math.floor((x-140)/step)*step,top=Math.floor((y-170)/step)*step;
    const right=Math.ceil((x+w+140)/step)*step,bottom=Math.ceil((y+h+170)/step)*step;
    const key=[left,top,right,bottom,this.zoom>=.34].join('/');
    if(this.windowKey===key)return false;
    this.windowKey=key;
    this.windowBounds={left,top,right,bottom};
    this.windowCells=[];
    for(let id=0;id<this.points.length;id++){
      const p=this.points[id];
      if(p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom)this.windowCells.push(id);
    }
    this.layers.details.innerHTML=this.zoom<.34?'':this.windowCells.map(id=>this.details[id]).join('');
    for(const node of this.fogAreas){
      node.setAttribute('x',left-64);node.setAttribute('y',top-64);
      node.setAttribute('width',right-left+128);node.setAttribute('height',bottom-top+128);
    }
    return true;
  }
  miniPos(p){const b=this.mesh.bounds;return {x:5+146*(p.x-b.left)/(b.right-b.left),y:5+82*(p.y-b.top)/(b.bottom-b.top)};}
  miniTravel(x,y){const r=this.mini.getBoundingClientRect(),b=this.mesh.bounds;this.center={x:b.left+((x-r.left)/r.width*156-5)/146*(b.right-b.left),y:b.top+((y-r.top)/r.height*92-5)/82*(b.bottom-b.top)};this.camera();}
  drawMiniFrame(){
    const p=this.miniPos(this.box),q=this.miniPos({x:this.box.x+this.box.w,y:this.box.y+this.box.h});
    const x=clamp(p.x,5,151),y=clamp(p.y,5,87);
    this.miniFrame.setAttribute('x',x);this.miniFrame.setAttribute('y',y);
    this.miniFrame.setAttribute('width',clamp(q.x,5,151)-x);this.miniFrame.setAttribute('height',clamp(q.y,5,87)-y);
  }
  miniMap(mask,fogKey){
    if(this.lastMini!==fogKey){
      this.lastMini=fogKey;
      const ctx=this.miniTerrain,known=this.s.teams[0].explored,b=this.mesh.bounds;
      ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,156,92);
      const dx=40*146/(b.right-b.left)+.16,dy=22*82/(b.bottom-b.top)+.12;
      const diamond=(x,y,rx,ry)=>{ctx.beginPath();ctx.moveTo(x,y-ry);ctx.lineTo(x+rx,y);ctx.lineTo(x,y+ry);ctx.lineTo(x-rx,y);ctx.fill();};
      ctx.fillStyle='#23383f';diamond(78,46,73,41);
      for(const t of this.mesh.ordered){
        if(!known[t.cell])continue;
        const p=this.miniPos(this.points[t.cell]);
        ctx.fillStyle=t.ridge?'#777875':t.terrain==='water'?'#37646e':mask[t.cell]?'#779577':'#52665b';
        diamond(p.x,p.y,dx,dy);
      }
    }
    const dots=[];const push=(p,color,r)=>{const q=this.miniPos(p);dots.push(`<circle cx="${round(q.x)}" cy="${round(q.y)}" r="${r}" fill="${color}"/>`);};
    const trip=this.s.campaign?.rover;if(trip){push(this.point(trip.x,trip.y),'#ffe093',2.1);push(this.points[trip.target],'#efd184',1.5);}
    for(const cell of this.s.campaign?.trade?.posts||[]){
      if(!this.s.teams[0].explored[cell])continue;
      const q=this.miniPos(this.points[cell]);
      dots.push('<path transform="translate('+round(q.x)+' '+round(q.y)+')" d="M0 -3 3 0 0 3 -3 0Z" fill="#f6c777" stroke="#403826" stroke-width=".7"/>');
    }
    push(this.points[this.chart.relay],'#ffe6a0',2.3);
    for(const b of this.s.buildings)if(!b.side||mask[b.cell])push(this.points[b.cell],TEAM[b.side],b.type==='forum'?2.7:1.7);
    for(const u of this.s.units)if(!u.side||mask[unitCell(u,this.s.size)])push(this.point(u.x,u.y),u.type==='caravan'?'#ffd288':TEAM[u.side],u.type==='caravan'?1.9:1.1);
    if(this.s.alarm&&this.s.tick-this.s.alarm.tick<88){
      const p=this.miniPos(this.points[this.s.alarm.cell]);
      dots.push(`<circle cx="${round(p.x)}" cy="${round(p.y)}" r="4.5" fill="none" stroke="#ffa677" stroke-width="1.3"/>`);
    }
    const markup=dots.join('');
    if(this.dotsMarkup!==markup){this.dotsMarkup=markup;this.miniDots.innerHTML=markup;}
  }
  roadBetween(from,to) {
    const distance = cell => routeDistance(this.s,cell,to);
    const {x,y}=this.chart.cells[from],size=this.chart.size,exits=[];
    for(let j=Math.max(0,y-1);j<=Math.min(size-1,y+1);j++)for(let i=Math.max(0,x-1);i<=Math.min(size-1,x+1);i++){
      const cell=mapKey(size,i,j);
      if(distance(cell)>=0)exits.push(cell);
    }
    exits.sort((a,b)=>distance(a)-distance(b)||a-b);
    if(!exits.length||distance(exits[0])>11)return '';
    let cell=exits[0];
    const points=[this.points[from],this.points[cell]];
    while(distance(cell)>0) {
      const next=this.chart.neighbors[cell].find(n=>distance(n)===distance(cell)-1);
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
      const neighbors=seen.filter(n=>n.side===b.side && n.id<b.id && mapDistance(this.chart.size,b.cell,n.cell)<=8);
      neighbors.sort((a,c)=>mapDistance(this.chart.size,a.cell,b.cell)-mapDistance(this.chart.size,c.cell,b.cell));
      for(const n of neighbors){const d=this.roadBetween(b.cell,n.cell);if(d){paths.push(d);break;}}
    }
    const d=paths.join('');
    this.layers.roads.innerHTML=d?`<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="#746348" stroke-width="19" opacity=".33"/><path d="${d}" stroke="#ccab78" stroke-width="15" opacity=".79"/><path d="${d}" stroke="#dec599" stroke-width="8" opacity=".55"/><path d="${d}" stroke="#9a815d" stroke-width="1.4" stroke-dasharray="2 11 4 9" opacity=".66"/></g>`:'';
  }
  cursor(cell,mode){if(cell===null){this.layers.cursor.innerHTML='';return;}
    const p=this.points[cell],building=mode?.startsWith('build:')?mode.slice(6):null;
    const ok=!building||!buildReason(this.s,0,building,cell),c=ok?'#ffe399':'#ff997e';
    this.layers.cursor.innerHTML=`<path d="${this.paths[cell]}" stroke="${c}" fill="${c}2b" stroke-width="2.4"/>${building?`<g opacity=".67" transform="translate(${p.x} ${p.y})">${sprite(STRUCTURES[building].art,...size[building])}</g>`:''}`;}
  draw(selection,mode,cursor,speed,cameraOnly=false){
    const windowChanged=this.updateWindow();
    if(cameraOnly&&!windowChanged)return;
    const s=this.s,vis=vision(s,0),known=s.teams[0].explored;
    const fogKey=vis.join('')+known.join('');
    if(windowChanged||fogKey!==this.lastFog) {
      this.lastFog=fogKey;
      let seenPath='',litPath='';
      for(const id of this.windowCells||this.chart.cells.map(c=>c.cell)){if(known[id])seenPath+=this.paths[id];if(vis[id])litPath+=this.paths[id];}
      this.layers.fog.querySelector('[data-fog="known"]').setAttribute('d',seenPath);
      this.layers.fog.querySelector('[data-fog="visible"]').setAttribute('d',litPath);
    }
    this.drawRoads(vis);
    const siteKey=mode?.startsWith('build:')?mode+s.rev+fogKey+s.tick+(this.windowKey||''):'';
    if(this.placementKey!==siteKey){this.placementKey=siteKey;this.layers.sites.setAttribute('d',siteKey?(this.windowCells||this.chart.cells.map(c=>c.cell)).filter(id=>vis[id]&&!buildReason(s,0,mode.slice(6),id)).map(id=>this.paths[id]).join(''):'');}
    const items=[];
    for(const n of s.nodes)if(n.left>0&&known[n.cell])items.push({key:'n'+n.cell,kind:'node',type:n.kind,cell:n.cell,e:n,label:RES[n.kind].name});
    for(const [index,cell] of (s.campaign?.trade?.posts||[]).entries()){
      if(known[cell])items.push({key:'post'+index,kind:'post',cell,e:{index},label:POST_NAMES[index]});
    }
    const trip=s.campaign?.rover;
    if(trip)items.push({key:'rover',kind:'rover',type:'rover',side:0,cell:unitCell(trip,s.size),e:trip,label:'Rover de la cité'});
    items.push({key:'relay',kind:'relay',side:s.relay.owner,cell:this.chart.relay,e:s.relay,label:'Relais du bassin'});
    for(const b of s.buildings)if(!b.side||vis[b.cell])items.push({key:'e'+b.id,kind:'building',type:b.type,side:b.side,cell:b.cell,e:b,label:STRUCTURES[b.type].name});
    for(const u of s.units)if(!u.side||vis[unitCell(u,s.size)])items.push({key:'e'+u.id,kind:'unit',type:u.type,side:u.side,cell:unitCell(u,s.size),e:u,label:UNITS[u.type].name});
    for(const it of items){it.p=it.kind==='unit'||it.kind==='rover'?this.point(it.e.x,it.e.y):this.points[it.cell];if(it.kind==='unit')it.p={x:it.p.x+((it.e.id*7)%9-4),y:it.p.y+((it.e.id*3)%5-2)};}
    if(this.wide){
      const {left,top,right,bottom}=this.windowBounds;
      for(let i=items.length-1;i>=0;i--){
        const p=items[i].p;
        if(p.x<left||p.x>right||p.y<top||p.y>bottom)items.splice(i,1);
      }
    }
    const selectedKeys=new Set(selection);
    items.sort((a,b)=>a.p.y-b.p.y||(a.kind==='unit'?1:-1));const alive=new Set();let previous=null;
    for(const it of items){alive.add(it.key);let g=this.pieces.get(it.key);if(!g){g=element('g',{role:'button',tabindex:'-1','data-rts-object':it.key});this.pieces.set(it.key,g);}
      const selected=selectedKeys.has(it.key),sig=[it.kind,it.type,it.side,selected,it.e.ready,it.e.level,it.e.cargo?.kind,it.e.order?.phase,it.e.order?.good].join('/');
      if(g.dataset.sig!==sig){g.dataset.sig=sig;g.innerHTML=glyph(it,selected,this);g.setAttribute('aria-label',it.label+(it.side===1?' · Cendre':''));}
      const isUnit=it.kind==='unit';g.setAttribute('class',`rts-piece ${it.kind} ${selected?'selected':''}${(it.kind==='node'||it.kind==='post')&&!vis[it.cell]?' remembered':''}`);
      if(isUnit&&g.dataset.px){const dx=it.p.x-Number(g.dataset.px);if(Math.abs(dx)>.4)g.querySelector('.mobile-piece')?.setAttribute('transform',`scale(${dx<0?-1:1} 1)`);}
      g.dataset.px=it.p.x;g.style.transform=`translate(${round(it.p.x)}px,${round(it.p.y)}px)`;
      if(isUnit)g.style.transitionDuration=`${DT_VIS/speed}s`;
      if(it.kind==='building'||isUnit){const def=(isUnit?UNITS:STRUCTURES)[it.type],fraction=it.e.ready===false?it.e.work/def.time:it.e.hp/def.hp;
        g.querySelector('.life-fill').setAttribute('width',Math.max(1,32*fraction));g.querySelector('.life-track').style.opacity=selected||it.e.hp<def.hp-.1||it.e.ready===false?'1':'0';}
      const next=previous?previous.nextElementSibling:this.layers.pieces.firstElementChild;if(next!==g)this.layers.pieces.insertBefore(g,next);previous=g;
    }
    for(const [k,g] of this.pieces)if(!alive.has(k)){g.remove();this.pieces.delete(k);}
    const orders=[];
    for(const u of s.units.filter(u=>!u.side&&selectedKeys.has('e'+u.id)).slice(0,8)){
      const dest=u.order.cell;if(dest===undefined)continue;
      const a=this.point(u.x,u.y),b=this.points[dest],kind=u.order.kind;
      const color=kind==='trade'?'#ffd682':kind==='escort'?'#9ef2dc':kind==='patrol'?'#a8cafa':'#ffe5a1';
      let path='M'+a.x+' '+a.y+'L'+b.x+' '+b.y;
      if(kind==='trade'){
        path='M'+a.x+' '+a.y;
        let pen=true;
        for(const cell of u.path){
          if(!known[cell]){pen=false;continue;}
          const n=this.points[cell];path+=(pen?'L':'M')+n.x+' '+n.y;pen=true;
        }
      }
      if(kind==='patrol'){
        const end=this.points[u.order.other];
        orders.push('<circle cx="'+end.x+'" cy="'+end.y+'" r="6" fill="none" stroke="'+color+'" stroke-width="2"/>');
      }
      orders.push('<path d="'+path+'" stroke="'+color+'" fill="none" opacity=".82" stroke-width="2" stroke-dasharray="4 6"/><circle cx="'+b.x+'" cy="'+b.y+'" r="4" fill="'+color+'"/>');
    }
    for(const b of s.buildings.filter(b=>!b.side&&selectedKeys.has('e'+b.id)&&b.rally!==null)){const a=this.points[b.cell],p=this.points[b.rally];orders.push(`<path d="M${a.x} ${a.y}L${p.x} ${p.y}" stroke="#eac981" stroke-dasharray="7 5"/><g transform="translate(${p.x} ${p.y})">${pennant(0,0,0)}</g>`);}
    if(trip){
      const p=this.points[trip.target];
      if(trip.stage!=='home')orders.push(`<path transform="translate(${p.x} ${p.y-5})" d="M0-18 12-11 0-4-12-11Z M0-4v10" fill="#655934a1" stroke="#ffe39b" stroke-width="2"/>`);
      if(trip.path.length){const points=[this.point(trip.x,trip.y),...trip.path.map(i=>this.points[i])];orders.push(`<path d="${smoothRoad(points)}" fill="none" stroke="#ffe09a" stroke-width="2" stroke-dasharray="3 7" opacity=".78"/>`);}
    }
    this.layers.orders.innerHTML=orders.join('');
    const effects=s.effects.map(e=>{
      const a=this.point(e.a.x,e.a.y),b=this.point(e.b.x,e.b.y),age=s.tick-e.t;
      return `<g opacity="${1-age*.27}"><path d="M${a.x} ${a.y-19}L${b.x} ${b.y-20}" stroke="${TEAM[e.side]}" stroke-width="3"/><circle cx="${b.x}" cy="${b.y-20}" r="${3+age*2}" fill="none" stroke="#fff0b2" stroke-width="1.6"/></g>`;
    });
    for(const u of s.units) {
      if(u.type!=='worker'||!vis[unitCell(u,s.size)]||(s.tick+u.id*2)%9>1||!['assist','repair','gather'].includes(u.order.kind)||u.order.delivering||mapDistance(this.chart.size,unitCell(u,s.size),u.order.cell)>1.45)continue;
      const p=this.point(u.x,u.y);
      effects.push(`<path transform="translate(${p.x+9} ${p.y-11})" d="m-2 -3 2 2m2-4-1 3m5 0-3 1" stroke="#ffe1a2" fill="none" stroke-linecap="round" stroke-width="1.5"/>`);
    }
    this.layers.fx.innerHTML=effects.join('');this.cursor(cursor,mode);this.miniMap(vis,fogKey);
  }
}
const DT_VIS=.23;
