import { AGES, DT, HOME, LEVELS, MAPS, RES, RIVAL, SIDE, STRUCTURES, STUDIES, TRANSITIONS, UNITS, apart, battlefield, canPay, eachNeighbor, keyOf, pointOf, tileDistance } from './strategy-rules.js?v=7.0.0';

const deny = message => ({ok:false,message});
const done = message => ({ok:true,message});
const same = (e,side) => e.side===side && e.hp>0;
export const unitCell = u => keyOf(u.x,u.y);
export const ready = (s,side,type) => s.buildings.filter(b=>same(b,side)&&b.ready&&(!type||b.type===type));
export const unitsOf = (s,side,type) => s.units.filter(u=>same(u,side)&&(!type||u.type===type));
export const atlas = s => battlefield(s.seed,s.region);
const navCache = new WeakMap(), sightCache = new WeakMap();
export function notify(s,text) { s.log.push({tick:s.tick,text}); if(s.log.length>12)s.log.shift(); }
function pay(s,side,cost,multiplier=1) { for(const [key,n] of Object.entries(cost)) s.teams[side].bank[key]-=Math.floor(n*multiplier); }
function gain(s,side,key,n) {s.teams[side].bank[key]=Math.min(9999,s.teams[side].bank[key]+n);}
function resetOrder(u,order) { u.order=order;u.path=[];u.goal='';u.work=0;u.foe=0; }
function makeUnit(s,side,type,cell) {
  const {x,y}=pointOf(cell), u={id:s.nextId++,side,type,x,y,hp:UNITS[type].hp,order:{kind:'idle'},path:[],goal:'',work:0,cool:0,foe:0,anchor:cell,cargo:null};
  s.units.push(u);return u;
}
function makeBuilding(s,side,type,cell,complete=false) {
  const def=STRUCTURES[type], b={id:s.nextId++,side,type,cell,ready:complete,work:0,hp:complete?def.hp:Math.ceil(def.hp*.18),queue:[],rally:null,cool:0,hold:0};
  s.buildings.push(b);s.rev++;return b;
}
export function createMatch(seed=1,region='delta',level='even') {
  if(!Object.hasOwn(MAPS,region))region='delta';if(!Object.hasOwn(LEVELS,level))level='even';
  const s={version:1,seed:seed>>>0,region,level,tick:0,nextId:1,rev:0,teams:[],buildings:[],units:[],nodes:[],relay:{owner:-1,contender:-1,progress:0},result:null,alarm:null,log:[],effects:[],ai:{lastRaid:0}};
  s.nodes=atlas(s).deposits.map(d=>({cell:d.cell,kind:d.kind,left:d.amount}));
  for(const [side,home] of [HOME,RIVAL].entries()) {
    s.teams.push({bank:{food:100,wood:105,ore:45,crystal:18},age:1,tech:[],explored:Array(SIDE*SIDE).fill(0),enemyForum:null,trained:0,lost:0});
    makeBuilding(s,side,'forum',home,true);
    const {x,y}=pointOf(home),flip=side?-1:1;
    for(const [dx,dy] of [[-1,0],[0,1],[1,0],[0,-1],[-1,1]]) makeUnit(s,side,'worker',keyOf(x+flip*dx,y+flip*dy));
    makeUnit(s,side,'skimmer',keyOf(x+flip,y-flip));
  }
  refreshVision(s);
  for(const side of [0,1]) for(const [i,kind] of ['food','wood','wood','ore'].entries()) {
    const u=unitsOf(s,side,'worker')[i];const site=nearestSource(s,side,unitCell(u),kind);
    if(site!==null) resetOrder(u,{kind:'gather',cell:site,resource:kind});
  }
  notify(s,'Votre forum est opérationnel. Un pionnier et un Voltigeur attendent vos ordres.');return s;
}
export function populationInfo(s,side) {
  const buildings=ready(s,side),used=unitsOf(s,side).length;
  const reserved=buildings.reduce((sum,b)=>sum+b.queue.filter(j=>j.kind==='unit').length,0);
  return {used,reserved,cap:Math.min(58,buildings.reduce((sum,b)=>sum+(STRUCTURES[b.type].cap||0),0))};
}
function nav(s) {
  let n=navCache.get(s);if(n&&n.rev===s.rev)return n;
  const blocked=Uint8Array.from(atlas(s).cells,c=>c.terrain==='water'||c.ridge?1:0);
  for(const b of s.buildings)if(b.hp>0)blocked[b.cell]=1;
  for(const d of s.nodes)if(d.left>0)blocked[d.cell]=1;
  n={blocked,rev:s.rev,fields:new Map()};navCache.set(s,n);return n;
}
export const walkable = (s,cell) => Number.isInteger(cell)&&cell>=0&&cell<SIDE*SIDE&&!nav(s).blocked[cell];
function field(s,to,reach) {
  const n=nav(s), tag=to+':'+reach;if(n.fields.has(tag))return n.fields.get(tag);
  const dist=new Int16Array(SIDE*SIDE).fill(-1),target=pointOf(to),queue=[];
  for(let y=Math.max(0,Math.ceil(target.y-reach));y<=Math.min(SIDE-1,Math.floor(target.y+reach));y++)for(let x=Math.max(0,Math.ceil(target.x-reach));x<=Math.min(SIDE-1,Math.floor(target.x+reach));x++) {
    const cell=keyOf(x,y);if(!n.blocked[cell]&&Math.hypot(x-target.x,y-target.y)<=reach+.001){dist[cell]=0;queue.push(cell);}
  }
  for(let i=0;i<queue.length;i++){const id=queue[i];for(const next of eachNeighbor[id])if(!n.blocked[next]&&dist[next]<0){dist[next]=dist[id]+1;queue.push(next);}}
  if(n.fields.size>=80)n.fields.delete(n.fields.keys().next().value);n.fields.set(tag,dist);return dist;
}
export function routeDistance(s,from,to,reach=1.45) {return field(s,to,reach)[from];}
function nearestFree(s,cell,excluded=new Set(),radius=4) {
  const p=pointOf(cell),candidates=[];
  for(let y=Math.max(0,p.y-radius);y<=Math.min(SIDE-1,p.y+radius);y++)for(let x=Math.max(0,p.x-radius);x<=Math.min(SIDE-1,p.x+radius);x++) {
    const id=keyOf(x,y);if(walkable(s,id)&&!excluded.has(id))candidates.push(id);
  }
  candidates.sort((a,b)=>tileDistance(a,cell)-tileDistance(b,cell)||a-b);return candidates;
}
function travel(s,u,to,reach=0) {
  const target=pointOf(to);if(apart(u,target)<=Math.max(.06,reach)){u.path=[];u.goal='';return true;}
  const tag=`${to}:${reach}:${s.rev}`,from=unitCell(u);
  if(u.goal!==tag || !u.path.length){
    u.goal=tag;u.path=[];const dist=field(s,to,reach);let cursor=from;
    if(dist[cursor]<0)return false;
    while(dist[cursor]>0){const options=eachNeighbor[cursor].filter(c=>dist[c]===dist[cursor]-1);cursor=options[u.id%options.length];u.path.push(cursor);}
    if(!u.path.length)u.path.push(cursor);
  }
  let budget=UNITS[u.type].speed*DT;
  while(budget>0 && u.path.length){const n=pointOf(u.path[0]),d=apart(u,n);
    if(d<=budget){u.x=n.x;u.y=n.y;budget-=d;u.path.shift();}else{u.x+=(n.x-u.x)*budget/d;u.y+=(n.y-u.y)*budget/d;budget=0;}}
  return apart(u,target)<=Math.max(.06,reach);
}
export function refreshVision(s) {
  const masks=[new Uint8Array(SIDE*SIDE),new Uint8Array(SIDE*SIDE)];
  function reveal(side,p,r) {const mask=masks[side],explored=s.teams[side].explored;
    for(let y=Math.max(0,Math.ceil(p.y-r));y<=Math.min(SIDE-1,Math.floor(p.y+r));y++)for(let x=Math.max(0,Math.ceil(p.x-r));x<=Math.min(SIDE-1,Math.floor(p.x+r));x++)if((x-p.x)**2+(y-p.y)**2<=r*r){const id=keyOf(x,y);mask[id]=1;explored[id]=1;}}
  for(const u of s.units)if(u.hp>0)reveal(u.side,u,UNITS[u.type].sight);
  for(const b of s.buildings)if(b.hp>0)reveal(b.side,pointOf(b.cell),b.ready?(STRUCTURES[b.type].sight||3):2);
  // A synchronising spire broadcasts its tile to both commanders.
  for(const b of s.buildings)if(b.hp>0&&b.ready&&b.type==='spire')reveal(1-b.side,pointOf(b.cell),0);
  if(s.relay.owner>=0)reveal(s.relay.owner,pointOf(atlas(s).relay),5);
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
  let best=null,min=Infinity;for(const c of choices){const n=routeDistance(s,from,c);if(n>=0&&n<min){min=n;best=c;}}return best;
}
function nearestDepot(s,side,from) {
  let closest=null,min=Infinity;for(const b of ready(s,side).filter(b=>b.type==='depot'||b.type==='forum')){const d=routeDistance(s,from,b.cell);if(d>=0&&d<min){min=d;closest=b;}}return closest;
}
export function orderUnits(s,side,ids,kind,cell,targetId) {
  if(s.result)return deny('La partie est terminée.');
  let group=unitsOf(s,side).filter(u=>ids.includes(u.id));
  if(!group.length)return deny('Sélectionnez au moins une unité.');
  const target=[...s.units,...s.buildings].find(e=>e.id===targetId&&e.hp>0);
  if(kind==='stop'){for(const u of group){resetOrder(u,{kind:'idle'});u.anchor=unitCell(u);}return done('Ordre de halte.');}
  if(kind==='attack'){
    if(!target||target.side===side||!vision(s,side)[target.cell??unitCell(target)])return deny('La cible doit être visible.');
    group=group.filter(u=>UNITS[u.type].damage);if(!group.length)return deny('Sélectionnez une unité militaire.');
    for(const u of group)resetOrder(u,{kind,target:target.id,cell:target.cell??unitCell(target)});return done('Cible désignée.');
  }
  if(!Number.isInteger(cell)||cell<0||cell>=SIDE*SIDE)return deny('Emplacement hors de la carte.');
  if(['gather','assist','repair'].includes(kind)){
    group=group.filter(u=>u.type==='worker');if(!group.length)return deny('Sélectionnez des pionniers.');
    const source=kind==='gather'?sourceAt(s,cell,side):null;
    if(kind==='gather'&&(!s.teams[side].explored[cell]||!source))return deny('Choisissez une ressource explorée ou une ferme en service.');
    if(kind!=='gather'&&(!target||target.cell!==cell||target.side!==side||target.ready!==(kind==='repair')))return deny('Choisissez un chantier ou un bâtiment allié.');
    const reachable=group.filter(u=>routeDistance(s,unitCell(u),cell)>=0);if(!reachable.length)return deny('Aucun passage vers cette case.');
    for(const u of reachable)resetOrder(u,{kind,cell,...(source?{resource:source.kind}:{target:target.id})});
    return done(kind==='gather'?`Collecte de ${RES[source.kind].name.toLowerCase()} engagée.`:kind==='assist'?'Pionniers affectés au chantier.':'Réparation engagée, 1 minerai pour 12 points.');
  }
  if(kind!=='move'&&kind!=='advance')return deny('Ordre inconnu.');
  const assigned=new Set(),sites=nearestFree(s,cell,new Set(),5);let placed=0;
  for(const u of group){const goal=sites.find(id=>!assigned.has(id)&&routeDistance(s,unitCell(u),id,0)>=0);if(goal===undefined)continue;
    assigned.add(goal);resetOrder(u,{kind:kind==='advance'&&UNITS[u.type].damage?'advance':'move',cell:goal});placed++;}
  return placed?done(kind==='advance'?'Progression ordonnée.':'Déplacement ordonné.'):deny('Aucun itinéraire praticable.');
}
export function buildReason(s,side,type,cell) {
  const def=STRUCTURES[type];if(!def?.cost)return 'Bâtiment indisponible.';
  if(s.teams[side].age<def.age)return `Nécessite l’âge ${def.age}.`;
  if(type==='spire'&&s.buildings.some(b=>same(b,side)&&b.type==='spire'))return 'Une Flèche existe déjà.';
  if(!canPay(s.teams[side].bank,def.cost))return 'Ressources insuffisantes.';
  if(cell!==undefined){if(!walkable(s,cell)||atlas(s).cells[cell].ford||atlas(s).relay===cell||!vision(s,side)[cell])return 'Choisissez une case visible et libre, hors des gués et du relais.';
    if(s.buildings.some(b=>b.hp>0&&tileDistance(cell,b.cell)<def.clearance+STRUCTURES[b.type].clearance))return 'Laissez de la place entre les bâtiments pour les accès.';
    if(s.units.some(u=>u.hp>0&&apart(u,pointOf(cell))<.78))return 'Cette case est occupée.';}
  return '';
}
export function construct(s,side,ids,type,cell) {
  if(s.result)return deny('La partie est terminée.');const reason=buildReason(s,side,type,cell);if(reason)return deny(reason);
  if(cell===undefined)return deny('Choisissez un emplacement.');
  const workers=unitsOf(s,side,'worker').filter(u=>ids.includes(u.id)&&routeDistance(s,unitCell(u),cell)>=0);
  if(!workers.length)return deny('Il faut un pionnier pouvant atteindre le chantier.');
  const b=makeBuilding(s,side,type,cell);const reachable=workers.filter(u=>routeDistance(s,unitCell(u),cell)>=0);
  if(!reachable.length){s.buildings.pop();s.rev++;return deny('Ce chantier fermerait son propre accès.');}
  pay(s,side,STRUCTURES[type].cost);for(const u of reachable)resetOrder(u,{kind:'assist',cell,target:b.id});
  return {...done(`Chantier ouvert · ${STRUCTURES[type].name}.`),id:b.id};
}
export function jobDef(kind,key){return kind==='unit'?UNITS[key]:kind==='tech'?STUDIES[key]:kind==='age'?TRANSITIONS[key]:null;}
export function jobReason(s,b,kind,key) {
  if(!b||!b.ready||b.hp<=0)return 'Bâtiment indisponible.';const def=jobDef(kind,key),team=s.teams[b.side];
  if(!def||def.at!==b.type)return 'Indisponible ici.';if(b.queue.length>=5)return 'File pleine.';
  if(def.age>team.age)return `Nécessite l’âge ${def.age}.`;
  if(kind==='unit'){const p=populationInfo(s,b.side);if(p.used+p.reserved>=p.cap)return 'Construisez un habitat.';}
  if(kind==='tech'&&team.tech.includes(key))return 'Recherche acquise.';
  if(kind!=='unit'&&ready(s,b.side).some(p=>p.queue.some(q=>q.kind===kind&&q.key===key)))return 'Déjà en préparation.';
  if(kind==='age'){
    if(Number(key)!==team.age+1)return 'Âge indisponible.';
    if(Number(key)===2&&new Set(ready(s,b.side).filter(p=>p.type!=='forum').map(p=>p.type)).size<2)return 'Achevez deux types de bâtiments en plus du forum.';
    if(Number(key)===3&&(!ready(s,b.side,'workshop').length||!team.tech.length))return 'Achevez un atelier et une recherche.';
  }
  return canPay(team.bank,def.cost)?'':'Ressources insuffisantes.';
}
export function enqueue(s,side,id,kind,value) {
  if(s.result)return deny('La partie est terminée.');const b=s.buildings.find(b=>b.id===id&&same(b,side));const key=String(value),reason=jobReason(s,b,kind,key);if(reason)return deny(reason);
  const def=jobDef(kind,key);pay(s,side,def.cost);b.queue.push({kind,key,left:def.time});return done(`${def.name} en préparation.`);
}
export function cancelJob(s,side,id,index) {
  const b=s.buildings.find(b=>b.id===id&&same(b,side)),job=b?.queue[index];if(s.result||!job||!Number.isInteger(index)||index<0)return deny('Aucun ordre à retirer.');
  for(const [key,n] of Object.entries(jobDef(job.kind,job.key).cost))gain(s,side,key,n);
  b.queue.splice(index,1);return done('Ordre retiré et ressources rendues.');
}
export function cancelSite(s,side,id) {
  const b=s.buildings.find(b=>b.id===id&&same(b,side)&&!b.ready);if(s.result||!b)return deny('Chantier indisponible.');
  const def=STRUCTURES[b.type];for(const [key,n] of Object.entries(def.cost))gain(s,side,key,Math.floor(n*(1-b.work/def.time)));
  s.buildings=s.buildings.filter(p=>p!==b);s.rev++;for(const u of s.units)if(u.order.target===id)resetOrder(u,{kind:'idle'});return done('Chantier annulé, matériaux inutilisés récupérés.');
}
export function setRally(s,side,id,cell) {
  const b=s.buildings.find(b=>b.id===id&&same(b,side)&&b.ready);
  if(s.result||!b||!['forum','barracks','workshop'].includes(b.type)||!walkable(s,cell))return deny('Choisissez un terrain accessible.');
  const exit=nearestFree(s,b.cell,new Set(),1)[0];if(exit===undefined||routeDistance(s,exit,cell,0)<0)return deny('Point de ralliement inaccessible.');
  b.rally=cell;return done('Point de ralliement défini.');
}
function economicStep(s,u,builders) {
  const order=u.order;
  if(order.kind==='gather'){
    const cap=s.teams[u.side].tech.includes('harness')?14:8;
    let source=sourceAt(s,order.cell,u.side);
    if(u.cargo&&(u.cargo.n>=cap||u.cargo.kind!==order.resource||!source||order.delivering)){
      order.delivering=true;const store=nearestDepot(s,u.side,unitCell(u));if(!store)return;
      if(travel(s,u,store.cell,1.45)){gain(s,u.side,u.cargo.kind,u.cargo.n);u.cargo=null;order.delivering=false;u.work=0;}return;
    }
    if(!source){const next=nearestSource(s,u.side,unitCell(u),order.resource);if(next===null){resetOrder(u,{kind:'idle'});return;}order.cell=next;source=sourceAt(s,next,u.side);}
    if(!travel(s,u,order.cell,1.45))return;
    if((u.work+=DT)<1)return;u.work=0;const amount=Math.min(2,cap-(u.cargo?.n||0),source.left);
    u.cargo={kind:source.kind,n:(u.cargo?.n||0)+amount};if(Number.isFinite(source.left)){source.left-=amount;if(!source.left)s.rev++;}return;
  }
  const b=s.buildings.find(b=>b.id===order.target&&same(b,u.side));
  if(!b || (order.kind==='assist'&&b.ready) || (order.kind==='repair'&&b.hp>=STRUCTURES[b.type].hp)){resetOrder(u,{kind:'idle'});return;}
  if(!travel(s,u,b.cell,1.45))return;
  if(order.kind==='assist'){builders.set(b.id,(builders.get(b.id)||0)+1);return;}
  if((u.work+=DT)>=1&&s.teams[u.side].bank.ore>0){u.work=0;s.teams[u.side].bank.ore--;b.hp=Math.min(STRUCTURES[b.type].hp,b.hp+12);}
}
function doProduction(s,b) {
  const job=b.queue[0];if(!job)return;job.left=Math.max(0,job.left-DT);if(job.left>0)return;
  const team=s.teams[b.side];
  if(job.kind==='unit'){
    const pop=populationInfo(s,b.side);if(pop.used>=pop.cap)return;
    const sites=nearestFree(s,b.cell,new Set(),1).filter(cell=>tileDistance(cell,b.cell)<=1.45);if(!sites.length)return;
    const spot=sites.find(id=>!s.units.some(u=>unitCell(u)===id))??sites[0];const u=makeUnit(s,b.side,job.key,spot);team.trained++;
    if(b.rally!==null)resetOrder(u,{kind:u.type==='worker'?'move':'advance',cell:b.rally});
  }else if(job.kind==='age'){team.age=Number(job.key);notify(s,`${b.side?'Cendre':'Aurore'} entre dans l’âge de ${AGES[team.age-1].toLowerCase()}.`);}
  else {team.tech.push(job.key);if(b.side===0)notify(s,`Recherche achevée · ${STUDIES[job.key].name}.`);}
  b.queue.shift();
}
const where=e=>e.cell===undefined?e:pointOf(e.cell);
function nearestEnemy(s,side,point,radius) {
  let best=null,rank=Infinity;const visible=vision(s,side);
  for(const e of [...s.units,...s.buildings]){if(e.side===side||e.hp<=0||!visible[e.cell??unitCell(e)])continue;
    const d=apart(point,where(e));if(d>radius)continue;
    const score=d+(e.cell!==undefined?1.8:0);if(score<rank){best=e;rank=score;}}
  return best;
}
function fire(s,attacker,enemy,def,hits) {
  if(attacker.cool>0)return;attacker.cool=def.interval||1.75;
  let dmg=def.damage;if(def.counter===enemy.type)dmg*=1.65;
  if(enemy.cell===undefined&&enemy.type!=='worker'&&s.teams[enemy.side].tech.includes('plating'))dmg*=.75;
  hits.set(enemy.id,(hits.get(enemy.id)||0)+dmg);
  if(vision(s,0)[enemy.cell??unitCell(enemy)] && vision(s,0)[attacker.cell??unitCell(attacker)])s.effects.push({a:{...pointXY(attacker)},b:{...pointXY(enemy)},side:attacker.side,t:s.tick});
}
function pointXY(e){const p=where(e);return {x:p.x,y:p.y};}
function militaryStep(s,u,hits) {
  const def=UNITS[u.type],order=u.order,visible=vision(s,u.side);
  let enemy=null;
  if(order.kind==='attack'){
    enemy=[...s.units,...s.buildings].find(e=>e.id===order.target&&e.hp>0&&visible[e.cell??unitCell(e)]);
    if(enemy)order.cell=enemy.cell??unitCell(enemy);else{resetOrder(u,{kind:'advance',cell:order.cell});}
  }
  if(!enemy){enemy=nearestEnemy(s,u.side,u,order.kind==='idle'?4.2:def.sight);}
  if(enemy && (u.order.kind!=='idle'||apart(where(enemy),pointOf(u.anchor))<=5.5)){
    const range=def.range+(u.type==='watcher'&&s.teams[u.side].tech.includes('optics')?1:0);
    if(apart(u,where(enemy))<=range+.07){fire(s,u,enemy,def,hits);return;}
    travel(s,u,enemy.cell??unitCell(enemy),Math.max(1,range-.45));return;
  }
  if(u.order.kind==='advance'){if(travel(s,u,u.order.cell)){u.anchor=unitCell(u);resetOrder(u,{kind:'idle'});}}
  else if(u.order.kind==='idle'&&tileDistance(unitCell(u),u.anchor)>1.5)travel(s,u,u.anchor,.25);
}
function capture(s) {
  const relay=s.relay,p=pointOf(atlas(s).relay),present=[false,false];
  for(const u of s.units)if(u.hp>0&&u.type!=='worker'&&apart(u,p)<=2.2)present[u.side]=true;
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
    if(kind==='move'){if(travel(s,u,u.order.cell)){u.anchor=unitCell(u);resetOrder(u,{kind:'idle'});}continue;}
    if(u.type==='worker'){if(['gather','assist','repair'].includes(kind))economicStep(s,u,builders);}
    else militaryStep(s,u,hits);
  }
  for(const b of s.buildings){const def=STRUCTURES[b.type];if(!b.ready){const count=builders.get(b.id)||0;if(!count)continue;
    const work=Math.min(def.time-b.work,DT*(1+.65*(Math.min(8,count)-1)));b.work+=work;b.hp=Math.min(def.hp,b.hp+def.hp*.82*work/def.time);
    if(b.work+.00001>=def.time){b.ready=true;if(b.side===0||b.type==='spire')notify(s,`${def.name} en service ${b.side?'chez Cendre':'chez Aurore'}.`);}continue;}
    doProduction(s,b);if(def.damage){b.cool=Math.max(0,b.cool-DT);const range=def.range+(b.type==='tower'&&s.teams[b.side].tech.includes('optics')?1:0);
      const enemy=nearestEnemy(s,b.side,pointOf(b.cell),range);if(enemy)fire(s,b,enemy,def,hits);}
    if(b.type==='spire')b.hold+=DT;
  }
  const attacked=[...s.buildings,...s.units].find(e=>!e.side&&hits.has(e.id));
  if(attacked && (!s.alarm||s.tick-s.alarm.tick>=100||attacked.type==='forum'&&attacked.cell!==s.alarm.cell)) {
    const cell=attacked.cell??unitCell(attacked);
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
  if(!forums[0]||!forums[1])s.result={winner:forums[0]===forums[1]?-1:forums[0]?0:1,reason:'forum'};
  else if(spires[0]||spires[1])s.result={winner:spires[0]===spires[1]?-1:spires[0]?0:1,reason:'spire'};
}
