import {RES, STRUCTURES, canPay, mapDistance, mapKey} from './strategy-rules.js?v=8.2.0';
import {atlas, distancesFrom, enqueue, gain, notify, orderUnits, pay, ready, routeDistance, travel, unitCell, unitsOf, walkable} from './strategy-engine.js?v=8.2.0';

export const POST_NAMES = ['Comptoir du Ponant', 'Comptoir du Levant'];
export const CONTRACTS = {
  ore: {input:'food', fee:12, base:12, rate:.85},
  crystal: {input:'wood', fee:10, base:8, rate:.55},
};
const ok = message => ({ok:true,message});
const no = message => ({ok:false,message});
const validPost = index => Number.isInteger(index) && index>=0 && index<POST_NAMES.length;
const inside = (s,n) => Number.isInteger(n) && n>=0 && n<s.size*s.size;
const safeCount = n => Number.isSafeInteger(n) && n>=0;
export function surveySector(s,index) {
  const west=mapKey(s.size,Math.round((s.size-1)*.31),Math.round((s.size-1)*.34));
  return index===0 ? west : s.size*s.size-1-west;
}

// A pre-existing settlement can cover the usual site. Settle on the nearest
// open plaza once, and keep that position for the lifetime of this campaign.
export function openTrade(s) {
  if(s.campaign.trade)return;
  const board=atlas(s),posts=[];
  const exits=[board.home,board.rival].map(home=>board.neighbors[home].find(i=>walkable(s,i)));
  const reach=exits.filter(i=>i!==undefined).map(i=>distancesFrom(s,i));
  const deposits=new Set(s.nodes.map(n=>n.cell));
  for(const index of [0,1]) {
    const sector=surveySector(s,index);
    const candidates=board.cells.filter(t=>walkable(s,t.cell)&&!t.ford&&!deposits.has(t.cell)&&t.cell!==board.relay
      &&!posts.includes(t.cell)&&s.buildings.every(b=>mapDistance(s.size,b.cell,t.cell)>=STRUCTURES[b.type].clearance+.65));
    candidates.sort((a,b)=>mapDistance(s.size,a.cell,sector)-mapDistance(s.size,b.cell,sector)||a.cell-b.cell);
    const site=candidates.find(t=>reach.every(distance=>distance(t.cell)>=0));
    // On densely built imported maps, preserve access for the surviving camp.
    const available=site||candidates.find(t=>!reach.length||reach[0](t.cell)>=0);
    if(available)posts.push(available.cell);
  }
  s.campaign.trade={posts,deliveries:[0,0]};
}
export function validTrade(s) {
  const t=s.campaign.trade;
  if(!t)return t===undefined&&!s.units.some(u=>u.order.kind==='trade');
  if(!Array.isArray(t.posts)||t.posts.length>2||new Set(t.posts).size!==t.posts.length||
    !Array.isArray(t.deliveries)||t.deliveries.length!==2||!t.deliveries.every(safeCount))return false;
  const board=atlas(s);
  if(!t.posts.every(i=>inside(s,i)&&board.cells[i].terrain!=='water'&&!board.cells[i].ridge&&!board.cells[i].ford&&i!==board.relay
    &&!s.nodes.some(n=>n.cell===i)&&!s.buildings.some(b=>b.cell===i)))return false;
  return s.units.every(u=>{
    const o=u.order;
    if(o.kind!=='trade')return true;
    return u.type==='caravan'&&validPost(o.post)&&o.post<t.posts.length&&s.teams[u.side].explored[t.posts[o.post]]===1&&
      Object.hasOwn(CONTRACTS,o.good)&&inside(s,o.origin)&&Number.isSafeInteger(o.market)&&o.market>0&&
      ['load','out','back','refund'].includes(o.phase)&&typeof o.repeat==='boolean'&&
      (o.phase!=='refund'||!o.repeat);
  });
}
export function knownPost(s,side,index) {
  const cell=s.campaign.trade.posts[index];
  return cell!==undefined&&s.teams[side].explored[cell]===1;
}
export function proceeds(s,origin,post,good) {
  const contract=CONTRACTS[good],distance=mapDistance(s.size,origin,s.campaign.trade.posts[post]);
  return contract.base+Math.floor(Math.min(60,distance)*contract.rate);
}
function reachableBase(s,u,types) {
  const from=unitCell(u,s.size);
  return ready(s,u.side).filter(b=>types.includes(b.type))
    .map(b=>({b,d:routeDistance(s,from,b.cell)})).filter(v=>v.d>=0)
    .sort((a,b)=>a.d-b.d||a.b.id-b.b.id)[0]?.b;
}
function stop(u,s) {u.order={kind:'idle'};u.anchor=unitCell(u,s.size);u.path=[];u.goal='';}
export function tradingHall(s,u) {return reachableBase(s,u,['market']);}
export function charter(s,side,id,post,good) {
  const u=unitsOf(s,side,'caravan').find(unit=>unit.id===id);
  if(s.result||!u||u.order.kind==='trade')return no('Choisissez un convoi disponible.');
  if(!Object.hasOwn(CONTRACTS,good)||!validPost(post)||!knownPost(s,side,post))return no('Reconnaissez ce comptoir avant de commercer.');
  const base=tradingHall(s,u),dest=s.campaign.trade.posts[post];
  if(!base||routeDistance(s,unitCell(u,s.size),dest)<0)return no('Il faut une halle et un accès au comptoir.');
  u.path=[];u.goal='';
  u.order={kind:'trade',cell:base.cell,market:base.id,origin:base.cell,post,good,phase:'load',repeat:true};
  return ok('Route ouverte vers le '+POST_NAMES[post].toLowerCase()+'.');
}
export function recallCaravan(s,side,id) {
  const u=unitsOf(s,side,'caravan').find(c=>c.id===id),o=u?.order;
  if(s.result||o?.kind!=='trade'||!o.repeat)return no('Aucune navette à rappeler.');
  if(o.phase==='load'){stop(u,s);return ok('Contrat suspendu. Le convoi est disponible.');}
  o.repeat=false;
  if(o.phase==='out'){o.phase='refund';o.cell=o.origin;u.path=[];u.goal='';}
  return ok('Rappel ordonné. La cargaison sera déchargée au retour.');
}
export function manifest(s,u) {
  const o=u.order;
  if(o.kind!=='trade')return '';
  const c=CONTRACTS[o.good];
  if(o.phase==='load')return 'Chargement · '+c.fee+' '+RES[c.input].name.toLowerCase()+' requis à la halle';
  if(o.phase==='back')return 'Retour · '+proceeds(s,o.origin,o.post,o.good)+' '+RES[o.good].name.toLowerCase()+' à bord';
  return (o.phase==='refund'?'Rappel':'À livrer')+' · '+c.fee+' '+RES[c.input].name.toLowerCase();
}
function step(s,u) {
  const o=u.order,post=s.campaign.trade.posts[o.post],c=CONTRACTS[o.good];
  if(o.phase==='out'){
    o.cell=post;
    if(travel(s,u,post,1.05)){o.phase='back';o.cell=o.origin;}
    return;
  }
  const base=ready(s,u.side,'market').find(b=>b.id===o.market);
  const returning=o.phase!=='load';
  // Prefer the contracted hall. If it falls or becomes cut off, a paid
  // shipment can still be landed at another hall or the forum.
  let dock=base;
  if(!dock||routeDistance(s,unitCell(u,s.size),dock.cell)<0)
    dock=reachableBase(s,u,returning?['market','forum']:['market']);
  if(!dock){if(!returning)stop(u,s);return;}
  o.cell=dock.cell;
  if(!travel(s,u,dock.cell,1.45))return;
  if(!returning){
    const cost={[c.input]:c.fee};
    if(!canPay(s.teams[u.side].bank,cost)||routeDistance(s,unitCell(u,s.size),post,1.05)<0)return;
    pay(s,u.side,cost);o.origin=dock.cell;o.market=dock.id;o.phase='out';o.cell=post;
    return;
  }
  if(o.phase==='back'){
    const n=proceeds(s,o.origin,o.post,o.good);
    gain(s,u.side,o.good,n);s.campaign.trade.deliveries[u.side]++;
    if(!u.side)notify(s,POST_NAMES[o.post]+' · livraison de '+n+' '+RES[o.good].name.toLowerCase()+'.');
  }else gain(s,u.side,c.input,c.fee);
  if(o.repeat&&dock.type==='market'){
    o.market=dock.id;o.origin=dock.cell;o.phase='load';
  }else stop(u,s);
}
export function advanceTrade(s) {
  for(const u of s.units)if(u.type==='caravan'&&u.order.kind==='trade')step(s,u);
}
export function scoutPost(s,side,index) {
  if(!validPost(index)||s.campaign.trade.posts[index]===undefined)return no('Comptoir inconnu.');
  const sector=surveySector(s,index),army=unitsOf(s,side).filter(u=>u.type==='skimmer'&&u.order.kind!=='escort');
  army.sort((a,b)=>Number(a.order.kind!=='idle')-Number(b.order.kind!=='idle')||mapDistance(s.size,unitCell(a,s.size),sector)-mapDistance(s.size,unitCell(b,s.size),sector));
  if(!army.length)return no('Un Voltigeur disponible est nécessaire pour la reconnaissance.');
  const r=orderUnits(s,side,[army[0].id],'move',sector);
  return r.ok?{...r,id:army[0].id,message:'Voltigeur envoyé reconnaître les abords du comptoir.'}:r;
}

export function planCommerce(s,side) {
  const hall=ready(s,side,'market')[0];
  if(!hall)return;
  const posts=s.campaign.trade.posts,scouted=posts.map((_,i)=>i).filter(i=>knownPost(s,side,i));
  const convoys=unitsOf(s,side,'caravan');
  if(!scouted.length) {
    const scouts=unitsOf(s,side,'skimmer');
    if(scouts.some(u=>u.order.kind==='idle'))scoutPost(s,side,side);
    else if(!scouts.length){
      const unit=unitsOf(s,side,'guard').find(u=>u.order.kind==='idle');
      if(unit)orderUnits(s,side,[unit.id],'move',surveySector(s,side));
    }
    return;
  }
  if(!hall.queue.length&&convoys.length<(s.size>=65?2:1))enqueue(s,side,hall.id,'unit','caravan');
  const near=scouted.sort((a,b)=>mapDistance(s.size,hall.cell,posts[a])-mapDistance(s.size,hall.cell,posts[b]))[0];
  for(const u of convoys){
    if(u.order.kind==='idle'){
      const bank=s.teams[side].bank;
      charter(s,side,u.id,near,bank.crystal<bank.ore*.7&&bank.wood>=10?'crystal':'ore');
    }
    if(u.order.kind!=='trade')continue;
    const army=unitsOf(s,side,'guard');
    if(army.length>2&&!army.some(g=>g.order.kind==='escort'&&g.order.target===u.id)){
      const guard=army.find(g=>g.order.kind==='idle');
      if(guard)orderUnits(s,side,[guard.id],'escort',null,u.id);
    }
  }
}
