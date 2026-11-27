import {IMPROVEMENTS} from './colony-rules.js?v=8.3.0';
import { AGES, DT, LEVELS, MAPS, RES, SIDE, STRUCTURES, STUDIES, TRANSITIONS, UNITS, apart, battlefield, isMilitary, canPay, grid, populationLimit, validSize, mapKey, mapPoint, mapDistance } from './strategy-rules.js?v=8.3.0';

const deny = message => ({ok:false,message});
const done = message => ({ok:true,message});
const same = (e,side) => e.side===side && e.hp>0;
export const unitCell = (u,size) => mapKey(size,u.x,u.y);
export const ready = (s,side,type) => s.buildings.filter(b=>same(b,side)&&b.ready&&(!type||b.type===type));
export const unitsOf = (s,side,type) => s.units.filter(u=>same(u,side)&&(!type||u.type===type));
export const atlas = s => battlefield(s.seed,s.region,s.size);
const navCache = new WeakMap(), sightCache = new WeakMap();
export function notify(s,text) { s.log.push({tick:s.tick,text}); if(s.log.length>12)s.log.shift(); }
export function pay(s,side,cost,multiplier=1) { for(const [key,n] of Object.entries(cost)) s.teams[side].bank[key]-=Math.floor(n*multiplier); }
export function gain(s,side,key,n) {s.teams[side].bank[key]=Math.min(9999,s.teams[side].bank[key]+n);}
function resetOrder(u,order) { u.order=order;u.path=[];u.goal='';u.work=0;u.foe=0; }
export function makeUnit(s,side,type,cell) {
  const {x,y}=mapPoint(s.size,cell), u={id:s.nextId++,side,type,x,y,hp:UNITS[type].hp,order:{kind:'idle'},path:[],goal:'',work:0,cool:0,foe:0,anchor:cell,cargo:null};
  s.units.push(u);return u;
}
export function makeBuilding(s,side,type,cell,complete=false) {
  const def=STRUCTURES[type], b={id:s.nextId++,side,type,level:1,cell,ready:complete,work:0,hp:complete?def.hp:Math.ceil(def.hp*.18),queue:[],rally:null,cool:0,hold:0};
  s.buildings.push(b);s.rev++;return b;
}
export function createMatch(seed=1,region='delta',level='even',size=SIDE) {
  if(!Object.hasOwn(MAPS,region))region='delta';if(!Object.hasOwn(LEVELS,level))level='even';
  if(!validSize(size))size=SIDE;
  const s={version:1,size,seed:seed>>>0,region,level,tick:0,nextId:1,rev:0,teams:[],buildings:[],units:[],nodes:[],relay:{owner:-1,contender:-1,progress:0},result:null,alarm:null,log:[],effects:[],ai:{lastRaid:0}};
  s.nodes=atlas(s).deposits.map(d=>({cell:d.cell,kind:d.kind,left:d.amount}));
  for(const [side,home] of [atlas(s).home,atlas(s).rival].entries()) {
    s.teams.push({bank:{food:100,wood:105,ore:45,crystal:18,water:14,energy:16},age:1,tech:[],explored:Array(size*size).fill(0),enemyForum:null,trained:0,lost:0});
    if(level==='solo'){
      if(side===1)continue;
      const bank=s.teams[0].bank;
      for(const resource of Object.keys(bank))bank[resource]*=2;
    }
    makeBuilding(s,side,'forum',home,true);
    const {x,y}=mapPoint(s.size,home),flip=side?-1:1;
    for(const [dx,dy] of [[-1,0],[0,1],[1,0],[0,-1],[-1,1]]) makeUnit(s,side,'worker',mapKey(s.size,x+flip*dx,y+flip*dy));
    makeUnit(s,side,'skimmer',mapKey(s.size,x+flip,y-flip));
  }
  refreshVision(s);
  for(const side of (level==='solo'?[0]:[0,1])) for(const [i,kind] of ['food','wood','wood','ore'].entries()) {
    const u=unitsOf(s,side,'worker')[i];const site=nearestSource(s,side,unitCell(u,s.size),kind);
    if(site!==null) resetOrder(u,{kind:'gather',cell:site,resource:kind});
  }
  notify(s,'Votre forum est opérationnel. Un pionnier et un Voltigeur attendent vos ordres.');return s;
}
export function populationInfo(s,side) {
  const buildings=ready(s,side),used=unitsOf(s,side).length;
  const reserved=buildings.reduce((sum,b)=>sum+b.queue.filter(j=>j.kind==='unit').length,0);
  return {used,reserved,cap:Math.min(populationLimit(s.size),buildings.reduce((sum,b)=>sum+(STRUCTURES[b.type].cap||0)*(b.level||1),0))};
}
function nav(s) {
  let n=navCache.get(s);if(n&&n.rev===s.rev)return n;
  const blocked=Uint8Array.from(atlas(s).cells,c=>c.terrain==='water'||c.ridge?1:0);
  for(const b of s.buildings)if(b.hp>0)blocked[b.cell]=1;
  for(const d of s.nodes)if(d.left>0)blocked[d.cell]=1;
  n={blocked,rev:s.rev,fields:new Map()};navCache.set(s,n);return n;
}
export const walkable = (s,cell) => Number.isInteger(cell)&&cell>=0&&cell<grid(s.size).count&&!nav(s).blocked[cell];
function field(s,to,reach) {
  const n=nav(s), tag=to+':'+reach;if(n.fields.has(tag))return n.fields.get(tag);
  const {size,count,neighbors}=grid(s.size);
  const dist=new Int16Array(count).fill(-1),target=mapPoint(size,to),queue=new Uint16Array(count);
  let end=0;
  for(let y=Math.max(0,Math.ceil(target.y-reach));y<=Math.min(size-1,Math.floor(target.y+reach));y++)for(let x=Math.max(0,Math.ceil(target.x-reach));x<=Math.min(size-1,Math.floor(target.x+reach));x++) {
    const cell=mapKey(s.size,x,y);if(!n.blocked[cell]&&Math.hypot(x-target.x,y-target.y)<=reach+.001){dist[cell]=0;queue[end++]=cell;}
  }
  for(let i=0;i<end;i++){const id=queue[i];for(const next of neighbors[id])if(!n.blocked[next]&&dist[next]<0){dist[next]=dist[id]+1;queue[end++]=next;}}
  if(n.fields.size>=80)n.fields.delete(n.fields.keys().next().value);n.fields.set(tag,dist);return dist;
}
export function routeDistance(s,from,to,reach=1.45) {return field(s,to,reach)[from];}
// One flood from the origin serves every resource candidate on a large map.
export function distancesFrom(s,from) {
  const {size}=grid(s.size);
  if(size===SIDE||!walkable(s,from))return to=>routeDistance(s,from,to);
  const distances=field(s,from,0);
  return to=>{
    const {x,y}=mapPoint(size,to);
    let best=Infinity;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(x+dx<0||x+dx>=size||y+dy<0||y+dy>=size)continue;
      const d=distances[to+dx+dy*size];
      if(d>=0&&d<best)best=d;
    }
    return best===Infinity?-1:best;
  };
}
function components(s) {
  const n=nav(s);
  if(n.components)return n.components;
  const {count,neighbors}=grid(s.size),labels=new Uint16Array(count),queue=new Uint16Array(count);
  let label=0;
  for(let cell=0;cell<count;cell++){
    if(n.blocked[cell]||labels[cell])continue;
    labels[cell]=++label;queue[0]=cell;
    for(let i=0,end=1;i<end;i++)for(const next of neighbors[queue[i]]){
      if(n.blocked[next]||labels[next])continue;
      labels[next]=label;queue[end++]=next;
    }
  }
  n.components=labels;
  return labels;
}
function directPath(s,from,to) {
  const labels=components(s);
  if(!labels[from]||labels[from]!==labels[to])return [];
  const {size,count,neighbors}=grid(s.size),blocked=nav(s).blocked;
  const target=mapPoint(size,to);
  const heuristic=id=>Math.abs(id%size-target.x)+Math.abs(Math.floor(id/size)-target.y);
  const distances=new Uint16Array(count).fill(65535),previous=new Uint16Array(count),buckets=[];
  let priority=heuristic(from);
  distances[from]=0;buckets[priority]=[from];
  // Manhattan distance is consistent for the four-direction grid.
  for(;priority<buckets.length;priority++){
    const bucket=buckets[priority];
    while(bucket?.length){
      const cell=bucket.pop(),cost=distances[cell];
      if(cost+heuristic(cell)!==priority)continue;
      if(cell===to){
        const path=[];
        for(let id=to;id!==from;id=previous[id])path.push(id);
        return path.length?path.reverse():[from];
      }
      for(const next of neighbors[cell]){
        if(blocked[next]||distances[next]<=cost+1)continue;
        distances[next]=cost+1;previous[next]=cell;
        const rank=cost+1+heuristic(next);
        (buckets[rank]??=[]).push(next);
      }
    }
  }
  return [];
}
function nearestFree(s,cell,excluded=new Set(),radius=4) {
  const {size}=grid(s.size),p=mapPoint(size,cell),candidates=[];
  for(let y=Math.max(0,p.y-radius);y<=Math.min(size-1,p.y+radius);y++)for(let x=Math.max(0,p.x-radius);x<=Math.min(size-1,p.x+radius);x++) {
    const id=mapKey(s.size,x,y);if(walkable(s,id)&&!excluded.has(id))candidates.push(id);
  }
  candidates.sort((a,b)=>mapDistance(s.size,a,cell)-mapDistance(s.size,b,cell)||a-b);return candidates;
}
export function travel(s,u,to,reach=0,speed=UNITS[u.type].speed) {
  const {neighbors}=grid(s.size);
  const target=mapPoint(s.size,to);if(apart(u,target)<=Math.max(.06,reach)){u.path=[];u.goal='';return true;}
  const tag=`${to}:${reach}:${s.rev}`,from=unitCell(u,s.size);
  if(u.goal!==tag || !u.path.length){
    u.goal=tag;
    if(s.size>SIDE&&reach===0){
      u.path=directPath(s,from,to);
      if(!u.path.length)return false;
    }else{
      u.path=[];const dist=field(s,to,reach);let cursor=from;
      if(dist[cursor]<0)return false;
      while(dist[cursor]>0){const options=neighbors[cursor].filter(c=>dist[c]===dist[cursor]-1);cursor=options[u.id%options.length];u.path.push(cursor);}
      if(!u.path.length)u.path.push(cursor);
    }
  }
  let budget=speed*DT;
  while(budget>0 && u.path.length){const n=mapPoint(s.size,u.path[0]),d=apart(u,n);
    if(d<=budget){u.x=n.x;u.y=n.y;budget-=d;u.path.shift();}else{u.x+=(n.x-u.x)*budget/d;u.y+=(n.y-u.y)*budget/d;budget=0;}}
  return apart(u,target)<=Math.max(.06,reach);
}
export function refreshVision(s) {
  const {size,count}=grid(s.size),masks=[new Uint8Array(count),new Uint8Array(count)];
  function reveal(side,p,r) {const mask=masks[side],explored=s.teams[side].explored;
    for(let y=Math.max(0,Math.ceil(p.y-r));y<=Math.min(size-1,Math.floor(p.y+r));y++)for(let x=Math.max(0,Math.ceil(p.x-r));x<=Math.min(size-1,Math.floor(p.x+r));x++)if((x-p.x)**2+(y-p.y)**2<=r*r){const id=mapKey(s.size,x,y);mask[id]=1;explored[id]=1;}}
  for(const u of s.units)if(u.hp>0)reveal(u.side,u,UNITS[u.type].sight);
  for(const b of s.buildings)if(b.hp>0)reveal(b.side,mapPoint(s.size,b.cell),b.ready?(STRUCTURES[b.type].sight||3):2);
  // A synchronising spire broadcasts its tile to both commanders.
  for(const b of s.buildings)if(b.hp>0&&b.ready&&b.type==='spire')reveal(1-b.side,mapPoint(s.size,b.cell),0);
  const trip=s.campaign?.rover;
  if(trip)reveal(0,trip,trip.scanUntil>s.tick?(s.campaign.decisions.includes('cells')?9:7):trip.rig==='scout'?4:2);
  if(s.relay.owner>=0)reveal(s.relay.owner,mapPoint(s.size,atlas(s).relay),5);
  for(const b of s.buildings)if(b.type==='forum'&&masks[1-b.side][b.cell])s.teams[1-b.side].enemyForum=b.cell;
  sightCache.set(s,masks);return masks;
}
export const vision = (s,side) => (sightCache.get(s)||refreshVision(s))[side];
function sourceAt(s,cell,side) {
  const d=s.nodes.find(n=>n.cell===cell&&n.left>0);if(d)return d;
  return s.buildings.some(b=>same(b,side)&&b.cell===cell&&b.type==='farm'&&b.ready)?{cell,kind:'food',left:Infinity}:null;
}
export function nearestSource(s,side,from,kind) {
  const choices=s.nodes.filter(n=>n.left>0&&n.kind===kind&&s.teams[side].explored[n.cell]).map(n=>n.cell);
  if(kind==='food')choices.push(...ready(s,side,'farm').map(b=>b.cell));
  const distance=distancesFrom(s,from);
  let best=null,min=Infinity;for(const c of choices){const n=distance(c);if(n>=0&&n<min){min=n;best=c;}}return best;
}
function nearestDepot(s,side,from) {
  let closest=null,min=Infinity;for(const b of ready(s,side).filter(b=>b.type==='depot'||b.type==='forum')){const d=routeDistance(s,from,b.cell);if(d>=0&&d<min){min=d;closest=b;}}return closest;
}
export function orderUnits(s,side,ids,kind,cell,targetId) {
  if(s.result)return deny('La partie est terminée.');
  const wanted=new Set(ids);
  let group=unitsOf(s,side).filter(u=>wanted.has(u.id)&&u.order.kind!=='trade');
  if(!group.length&&unitsOf(s,side,'caravan').some(u=>wanted.has(u.id)))return deny('Rappelez le convoi pour ramener sa cargaison.');
  if(!group.length)return deny('Sélectionnez au moins une unité.');
  const target=[...s.units,...s.buildings].find(e=>e.id===targetId&&e.hp>0);
  if(kind==='stop'){for(const u of group){resetOrder(u,{kind:'idle'});u.anchor=unitCell(u,s.size);}return done('Ordre de halte.');}
  if(kind==='escort'){
    const protectedUnit=escortTarget(s,side,targetId);
    if(!protectedUnit)return deny('Désignez un convoi, un pionnier ou le rover de votre camp.');
    group=group.filter(u=>isMilitary(u.type)&&routeDistance(s,unitCell(u,s.size),unitCell(protectedUnit,s.size),2)>=0);
    if(!group.length)return deny('Aucune unité militaire ne peut rejoindre cette escorte.');
    for(const u of group)resetOrder(u,{kind,target:targetId,cell:unitCell(protectedUnit,s.size)});
    return done('Escorte en place.');
  }
  if(kind==='attack'){
    if(!target||target.side===side||!vision(s,side)[target.cell??unitCell(target,s.size)])return deny('La cible doit être visible.');
    group=group.filter(u=>UNITS[u.type].damage);if(!group.length)return deny('Sélectionnez une unité militaire.');
    for(const u of group)resetOrder(u,{kind,target:target.id,cell:target.cell??unitCell(target,s.size)});return done('Cible désignée.');
  }
  if(!Number.isInteger(cell)||cell<0||cell>=grid(s.size).count)return deny('Emplacement hors de la carte.');
  if(['gather','assist','repair','staff'].includes(kind)){
    group=group.filter(u=>u.type==='worker');if(!group.length)return deny('Sélectionnez des pionniers.');
    const source=kind==='gather'?sourceAt(s,cell,side):null;
    if(kind==='gather'&&(!s.teams[side].explored[cell]||!source))return deny('Choisissez une ressource explorée ou une ferme en service.');
    if(kind!=='gather'&&(!target||target.cell!==cell||target.side!==side||target.ready!==(kind!=='assist')))return deny('Choisissez un chantier ou un bâtiment allié.');
    if(kind==='staff'){
      if(!Object.keys(STRUCTURES[target.type].output||{}).length)return deny('Cette installation ne produit pas de ressources.');
      const places=side===0&&s.campaign?.decisions.includes('guild')?2:1;
      const occupied=unitsOf(s,side).filter(u=>u.order.kind==='staff'&&u.order.target===target.id&&!group.includes(u)).length;
      group=group.slice(0,Math.max(0,places-occupied));
      if(!group.length)return deny('Tous les postes de cette installation sont occupés.');
    }
    const reachable=group.filter(u=>routeDistance(s,unitCell(u,s.size),cell)>=0);if(!reachable.length)return deny('Aucun passage vers cette case.');
    for(const u of reachable)resetOrder(u,{kind,cell,...(source?{resource:source.kind}:{target:target.id})});
    return done(kind==='gather'?`Collecte de ${RES[source.kind].name.toLowerCase()} engagée.`:kind==='staff'?'Pionnier affecté à la production.':kind==='assist'?'Pionniers affectés au chantier.':'Réparation engagée, 1 minerai pour 12 points.');
  }
  if(kind==='patrol')group=group.filter(u=>isMilitary(u.type));
  if(kind!=='move'&&kind!=='advance'&&kind!=='patrol')return deny('Ordre inconnu.');
  const wide=s.size>SIDE,radius=wide?Math.max(5,Math.ceil(Math.sqrt(group.length)/1.4)+4):5;
  const assigned=new Set(),sites=nearestFree(s,cell,new Set(),radius),labels=wide?components(s):null;
  let placed=0;
  for(const u of group){
    const from=unitCell(u,s.size);
    const goal=sites.find(id=>!assigned.has(id)&&(labels?labels[from]===labels[id]:routeDistance(s,from,id,0)>=0));
    if(goal===undefined)continue;
    if(kind==='patrol'&&goal===from)continue;
    assigned.add(goal);
    resetOrder(u,kind==='patrol'?{kind,cell:goal,other:from}:{kind:kind==='advance'&&isMilitary(u.type)?'advance':'move',cell:goal});
    placed++;}
  return placed?done(kind==='patrol'?'Patrouille établie entre les deux positions.':kind==='advance'?'Progression ordonnée.':'Déplacement ordonné.'):deny('Aucun itinéraire praticable.');
}
export function placementReason(s,side,type,cell,ignore=0) {
  const def=STRUCTURES[type];
  if(!Number.isInteger(cell)||!walkable(s,cell)||atlas(s).cells[cell].ford||atlas(s).relay===cell||!vision(s,side)[cell])return 'Choisissez un terrain visible et libre, hors des gués et du relais.';
  if(s.campaign?.trade?.posts.some(post=>mapDistance(s.size,cell,post)<def.clearance+.65))return 'Laissez libre la place du comptoir marchand.';
  if(s.buildings.some(b=>b.id!==ignore&&b.hp>0&&mapDistance(s.size,cell,b.cell)<def.clearance+STRUCTURES[b.type].clearance))return 'Prévoyez de la place pour les accès.';
  if(s.units.some(u=>u.hp>0&&apart(u,mapPoint(s.size,cell))<.78))return 'Cette case est occupée.';
  return '';
}
export function buildReason(s,side,type,cell) {
  const def=STRUCTURES[type];if(!def?.cost)return 'Bâtiment indisponible.';
  const charter=side===0&&s.campaign?.charters.some(c=>c.type===type);
  if((type==='spire'||def.unique)&&s.buildings.some(b=>same(b,side)&&b.type===type))return 'Cette installation existe déjà.';
  if(!charter){
    if(s.teams[side].age<def.age)return `Nécessite l’âge ${def.age}.`;
    if(def.requires&&!ready(s,side,def.requires).length)return `Achevez d’abord le bâtiment « ${STRUCTURES[def.requires].name} ».`;
    if(type==='observatory'&&(s.campaign?.specimens.length||0)<3)return 'Rapportez les trois spécimens du bassin.';
    if(type==='lighthouse'&&(s.campaign?.decisions.length||0)<3)return 'Prenez les trois décisions du conseil.';
    if(!canPay(s.teams[side].bank,def.cost))return 'Ressources insuffisantes.';
  }
  return cell===undefined?'':placementReason(s,side,type,cell);
}
export function construct(s,side,ids,type,cell) {
  if(s.result)return deny('La partie est terminée.');const reason=buildReason(s,side,type,cell);if(reason)return deny(reason);
  if(cell===undefined)return deny('Choisissez un emplacement.');
  const workers=unitsOf(s,side,'worker').filter(u=>ids.includes(u.id)&&routeDistance(s,unitCell(u,s.size),cell)>=0);
  if(!workers.length)return deny('Il faut un pionnier pouvant atteindre le chantier.');
  const b=makeBuilding(s,side,type,cell);const reachable=workers.filter(u=>routeDistance(s,unitCell(u,s.size),cell)>=0);
  if(!reachable.length){s.buildings.pop();s.rev++;return deny('Ce chantier fermerait son propre accès.');}
  const charter=side===0?s.campaign?.charters.find(c=>c.type===type):null;
  if(charter){b.level=charter.level;b.chartered=true;s.campaign.charters.splice(s.campaign.charters.indexOf(charter),1);}
  else pay(s,side,STRUCTURES[type].cost);
  for(const u of reachable)resetOrder(u,{kind:'assist',cell,target:b.id});
  return {...done(`Chantier ouvert · ${STRUCTURES[type].name}.`),id:b.id};
}
export function jobDef(kind,key){return kind==='unit'?UNITS[key]:kind==='tech'?STUDIES[key]:kind==='age'?TRANSITIONS[key]:kind==='level'?IMPROVEMENTS[key]:null;}
export function jobCost(s,b,kind,key){
  const d=jobDef(kind,key);
  if(kind==='tech'&&d?.civil&&ready(s,b.side,'laboratory').length)return Object.fromEntries(Object.entries(d.cost).map(([k,n])=>[k,Math.ceil(n*.75)]));
  return d?.cost||{};
}
export function jobReason(s,b,kind,key) {
  if(!b||!b.ready||b.hp<=0)return 'Bâtiment indisponible.';const def=jobDef(kind,key),team=s.teams[b.side];
  if(!def||def.at!==b.type)return 'Indisponible ici.';if(b.queue.length>=5)return 'File pleine.';
  if(def.age>team.age)return `Nécessite l’âge ${def.age}.`;
  if(kind==='unit'){const p=populationInfo(s,b.side);if(p.used+p.reserved>=p.cap)return 'Construisez un habitat.';}
  if(kind==='level'&&(def.level!==(b.level||1)+1||b.queue.some(q=>q.kind==='level')))return 'Ce niveau est indisponible.';
  if(kind==='tech'&&team.tech.includes(key))return 'Recherche acquise.';
  if(kind!=='unit'&&kind!=='level'&&ready(s,b.side).some(p=>p.queue.some(q=>q.kind===kind&&q.key===key)))return 'Déjà en préparation.';
  if(kind==='age'){
    if(Number(key)!==team.age+1)return 'Âge indisponible.';
    if(Number(key)===2&&new Set(ready(s,b.side).filter(p=>p.type!=='forum').map(p=>p.type)).size<2)return 'Achevez deux types de bâtiments en plus du forum.';
    if(Number(key)===3&&(!ready(s,b.side,'workshop').length||!team.tech.length))return 'Achevez un atelier et une recherche.';
  }
  return canPay(team.bank,jobCost(s,b,kind,key))?'':'Ressources insuffisantes.';
}
export function enqueue(s,side,id,kind,value) {
  if(s.result)return deny('La partie est terminée.');const b=s.buildings.find(b=>b.id===id&&same(b,side));const key=String(value),reason=jobReason(s,b,kind,key);if(reason)return deny(reason);
  const def=jobDef(kind,key);const paid={...jobCost(s,b,kind,key)};pay(s,side,paid);b.queue.push({kind,key,left:def.time,paid});return done(`${def.name} en préparation.`);
}
export function cancelJob(s,side,id,index) {
  const b=s.buildings.find(b=>b.id===id&&same(b,side)),job=b?.queue[index];if(s.result||!job||!Number.isInteger(index)||index<0)return deny('Aucun ordre à retirer.');
  for(const [key,n] of Object.entries(job.paid||jobDef(job.kind,job.key).cost))gain(s,side,key,n);
  b.queue.splice(index,1);return done('Ordre retiré et ressources rendues.');
}
export function cancelSite(s,side,id) {
  const b=s.buildings.find(b=>b.id===id&&same(b,side)&&!b.ready);if(s.result||!b)return deny('Chantier indisponible.');
  const def=STRUCTURES[b.type];if(b.chartered)s.campaign.charters.push({type:b.type,level:b.level});
  else for(const [key,n] of Object.entries(def.cost))gain(s,side,key,Math.floor(n*(1-b.work/def.time)));
  s.buildings=s.buildings.filter(p=>p!==b);s.rev++;for(const u of s.units)if(u.order.target===id)resetOrder(u,{kind:'idle'});return done('Chantier annulé, matériaux inutilisés récupérés.');
}
export function setRally(s,side,id,cell) {
  const b=s.buildings.find(b=>b.id===id&&same(b,side)&&b.ready);
  if(s.result||!b||!['forum','barracks','workshop','market'].includes(b.type)||!walkable(s,cell))return deny('Choisissez un terrain accessible.');
  const exit=nearestFree(s,b.cell,new Set(),1)[0];if(exit===undefined||routeDistance(s,exit,cell,0)<0)return deny('Point de ralliement inaccessible.');
  b.rally=cell;return done('Point de ralliement défini.');
}
function economicStep(s,u,builders) {
  const order=u.order;
  if(order.kind==='gather'){
    const cap=s.teams[u.side].tech.includes('harness')?14:8;
    let source=sourceAt(s,order.cell,u.side);
    if(u.cargo&&(u.cargo.n>=cap||u.cargo.kind!==order.resource||!source||order.delivering)){
      order.delivering=true;const store=nearestDepot(s,u.side,unitCell(u,s.size));if(!store)return;
      if(travel(s,u,store.cell,1.45)){gain(s,u.side,u.cargo.kind,u.cargo.n);if(!u.side&&s.campaign)s.campaign.deliveries++;u.cargo=null;order.delivering=false;u.work=0;}return;
    }
    if(!source){const next=nearestSource(s,u.side,unitCell(u,s.size),order.resource);if(next===null){resetOrder(u,{kind:'idle'});return;}order.cell=next;source=sourceAt(s,next,u.side);}
    if(!travel(s,u,order.cell,1.45))return;
    if((u.work+=DT)<1)return;u.work=0;const amount=Math.min(2,cap-(u.cargo?.n||0),source.left);
    u.cargo={kind:source.kind,n:(u.cargo?.n||0)+amount};if(Number.isFinite(source.left)){source.left-=amount;if(!source.left)s.rev++;}return;
  }
  const b=s.buildings.find(b=>b.id===order.target&&same(b,u.side));
  if(!b || (order.kind==='assist'&&b.ready) || (order.kind==='repair'&&b.hp>=STRUCTURES[b.type].hp)){resetOrder(u,{kind:'idle'});return;}
  if(!travel(s,u,b.cell,1.45))return;
  if(order.kind==='staff')return;
  if(order.kind==='assist'){builders.set(b.id,(builders.get(b.id)||0)+1);return;}
  if((u.work+=DT)>=1&&s.teams[u.side].bank.ore>0){u.work=0;s.teams[u.side].bank.ore--;b.hp=Math.min(STRUCTURES[b.type].hp,b.hp+12);}
}
function doProduction(s,b) {
  const job=b.queue[0];if(!job)return;job.left=Math.max(0,job.left-DT);if(job.left>0)return;
  const team=s.teams[b.side];
  if(job.kind==='unit'){
    const pop=populationInfo(s,b.side);if(pop.used>=pop.cap)return;
    const sites=nearestFree(s,b.cell,new Set(),1).filter(cell=>mapDistance(s.size,cell,b.cell)<=1.45);if(!sites.length)return;
    const spot=sites.find(id=>!s.units.some(u=>unitCell(u,s.size)===id))??sites[0];const u=makeUnit(s,b.side,job.key,spot);team.trained++;
    if(b.rally!==null)resetOrder(u,{kind:isMilitary(u.type)?'advance':'move',cell:b.rally});
  }else if(job.kind==='level'){b.level=jobDef('level',job.key).level;notify(s,`${STRUCTURES[b.type].name} · niveau ${b.level} achevé.`);}
  else if(job.kind==='age'){team.age=Number(job.key);notify(s,`${b.side?'Cendre':'Aurore'} entre dans l’âge de ${AGES[team.age-1].toLowerCase()}.`);}
  else {team.tech.push(job.key);if(b.side===0)notify(s,`Recherche achevée · ${STUDIES[job.key].name}.`);}
  b.queue.shift();
}
const where=(s,e)=>e.cell===undefined?e:mapPoint(s.size,e.cell);
function nearestEnemy(s,side,point,radius) {
  let best=null,rank=Infinity;const visible=vision(s,side);
  for(const e of [...s.units,...s.buildings]){if(e.side===side||e.hp<=0||!visible[e.cell??unitCell(e,s.size)])continue;
    const d=apart(point,where(s,e));if(d>radius)continue;
    const score=d+(e.cell!==undefined?1.8:0);if(score<rank){best=e;rank=score;}}
  return best;
}
function fire(s,attacker,enemy,def,hits) {
  if(attacker.cool>0)return;attacker.cool=def.interval||1.75;
  let dmg=def.damage;if(def.counter===enemy.type)dmg*=1.65;
  if(enemy.cell===undefined&&isMilitary(enemy.type)&&s.teams[enemy.side].tech.includes('plating'))dmg*=.75;
  hits.set(enemy.id,(hits.get(enemy.id)||0)+dmg);
  if(vision(s,0)[enemy.cell??unitCell(enemy,s.size)] && vision(s,0)[attacker.cell??unitCell(attacker,s.size)])s.effects.push({a:{...pointXY(s,attacker)},b:{...pointXY(s,enemy)},side:attacker.side,t:s.tick});
}
function pointXY(s,e){const p=where(s,e);return {x:p.x,y:p.y};}
function escortTarget(s,side,id) {
  return id===0&&side===0?s.campaign?.rover:s.units.find(e=>e.id===id&&same(e,side)&&!isMilitary(e.type));
}
function militaryStep(s,u,hits) {
  const def=UNITS[u.type],order=u.order,visible=vision(s,u.side);
  let enemy=null;
  if(order.kind==='escort'){
    const ward=escortTarget(s,u.side,order.target);
    if(!ward){u.anchor=unitCell(u,s.size);resetOrder(u,{kind:'idle'});return;}
    order.cell=unitCell(ward,s.size);
    if(apart(u,ward)<=4.5)enemy=nearestEnemy(s,u.side,ward,3.8);
    if(!enemy){if(apart(u,ward)>1.7)travel(s,u,order.cell,1.45);return;}
  }
  if(order.kind==='attack'){
    enemy=[...s.units,...s.buildings].find(e=>e.id===order.target&&e.hp>0&&visible[e.cell??unitCell(e,s.size)]);
    if(enemy)order.cell=enemy.cell??unitCell(enemy,s.size);else{resetOrder(u,{kind:'advance',cell:order.cell});}
  }
  if(!enemy){enemy=nearestEnemy(s,u.side,u,order.kind==='idle'?4.2:def.sight);}
  if(enemy && (u.order.kind!=='idle'||apart(where(s,enemy),mapPoint(s.size,u.anchor))<=5.5)){
    const range=def.range+(u.type==='watcher'&&s.teams[u.side].tech.includes('optics')?1:0);
    if(apart(u,where(s,enemy))<=range+.07){fire(s,u,enemy,def,hits);return;}
    travel(s,u,enemy.cell??unitCell(enemy,s.size),Math.max(1,range-.45));return;
  }
  if(u.order.kind==='patrol'){
    if(travel(s,u,order.cell)){const next=order.other;order.other=order.cell;order.cell=next;u.anchor=unitCell(u,s.size);}
  }else if(u.order.kind==='advance'){if(travel(s,u,u.order.cell)){u.anchor=unitCell(u,s.size);resetOrder(u,{kind:'idle'});}}
  else if(u.order.kind==='idle'&&mapDistance(s.size,unitCell(u,s.size),u.anchor)>1.5)travel(s,u,u.anchor,.25);
}
function capture(s) {
  const relay=s.relay,p=mapPoint(s.size,atlas(s).relay),present=[false,false];
  for(const u of s.units)if(u.hp>0&&isMilitary(u.type)&&apart(u,p)<=2.2)present[u.side]=true;
  const side=present[0]===present[1]?-1:present[0]?0:1;
  if(side<0||side===relay.owner){if(!present[0]&&!present[1]||side===relay.owner){relay.progress=Math.max(0,relay.progress-DT);if(!relay.progress)relay.contender=-1;}}
  else{if(relay.contender!==side){relay.contender=side;relay.progress=0;}relay.progress+=DT;
    if(relay.progress>=12){relay.owner=side;relay.contender=-1;relay.progress=0;notify(s,`Le relais est sous contrôle ${side?'de Cendre':'d’Aurore'}.`);}}
  if(relay.owner>=0&&s.tick%32===0)gain(s,relay.owner,'crystal',2);
}
export function tickSimulation(s) {
  if(s.result)return;s.tick++;s.effects=s.effects.filter(e=>s.tick-e.t<=2);if(s.tick%2===1)refreshVision(s);
  const hits=new Map(),builders=new Map();
  for(const u of s.units){u.cool=Math.max(0,u.cool-DT);const kind=u.order.kind;
    if(kind==='move'){if(travel(s,u,u.order.cell)){u.anchor=unitCell(u,s.size);resetOrder(u,{kind:'idle'});}continue;}
    if(u.type==='worker'){if(['gather','assist','repair','staff'].includes(kind))economicStep(s,u,builders);}
    else if(isMilitary(u.type))militaryStep(s,u,hits);
  }
  for(const b of s.buildings){const def=STRUCTURES[b.type];if(!b.ready){const count=builders.get(b.id)||0;if(!count)continue;
    const work=Math.min(def.time-b.work,DT*(1+.65*(Math.min(8,count)-1)));b.work+=work;b.hp=Math.min(def.hp,b.hp+def.hp*.82*work/def.time);
    if(b.work+.00001>=def.time){b.ready=true;delete b.chartered;if(b.side===0||b.type==='spire')notify(s,`${def.name} en service ${b.side?'chez Cendre':'chez Aurore'}.`);}continue;}
    doProduction(s,b);if(def.damage){b.cool=Math.max(0,b.cool-DT);const range=def.range+(b.type==='tower'&&s.teams[b.side].tech.includes('optics')?1:0);
      const enemy=nearestEnemy(s,b.side,mapPoint(s.size,b.cell),range);if(enemy)fire(s,b,enemy,def,hits);}
    if(b.type==='spire'&&s.level!=='solo')b.hold+=DT;
  }
  const attacked=[...s.buildings,...s.units].find(e=>!e.side&&hits.has(e.id));
  if(attacked && (!s.alarm||s.tick-s.alarm.tick>=100||attacked.type==='forum'&&attacked.cell!==s.alarm.cell)) {
    const cell=attacked.cell??unitCell(attacked,s.size);
    s.alarm={cell,tick:s.tick};
    const name=attacked.cell===undefined?UNITS[attacked.type].name:STRUCTURES[attacked.type].name;
    notify(s,`Contact ennemi · ${name} sous le feu.`);
  }
  for(const e of [...s.units,...s.buildings])if(hits.has(e.id))e.hp-=hits.get(e.id);
  for(const u of s.units)if(u.hp<=0)s.teams[u.side].lost++;
  if(s.buildings.some(b=>b.hp<=0)){s.rev++;for(const b of s.buildings.filter(b=>b.hp<=0))if(!b.side||b.type==='spire')notify(s,`${STRUCTURES[b.type].name} hors service.`);}
  s.units=s.units.filter(u=>u.hp>0);s.buildings=s.buildings.filter(b=>b.hp>0);capture(s);
  const forums=[0,1].map(side=>ready(s,side,'forum').length>0);
  const spires=[0,1].map(side=>ready(s,side,'spire').some(b=>b.hold>=90));
  if(s.level==='solo'||s.campaign?.peace)return;
  if(!forums[0]||!forums[1])s.result={winner:forums[0]===forums[1]?-1:forums[0]?0:1,reason:'forum'};
  else if(spires[0]||spires[1])s.result={winner:spires[0]===spires[1]?-1:spires[0]?0:1,reason:'spire'};
}
