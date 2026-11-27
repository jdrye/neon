import {openTrade,validTrade} from './trade.js?v=8.3.0';
import {fieldState,importSave} from './engine.js?v=6.0.0';
import {CHAPTERS,RIGS} from './frontier.js?v=6.0.0';
import {SURVEYS,surveyProgress} from './survey.js?v=6.0.0';
import {colonyType,scienceIds,sharedCost} from './colony-rules.js?v=8.3.0';
import {RES,SIDE,STRUCTURES,mapPoint,mapDistance,populationLimit,validSize} from './strategy-rules.js?v=8.3.0';
import {atlas,gain,makeBuilding,makeUnit,notify,orderUnits,ready,refreshVision,routeDistance,unitCell,unitsOf,walkable} from './strategy-engine.js?v=8.3.0';
import {MAX_SAVE_LENGTH,readMatch} from './strategy-save.js?v=8.3.0';
import {createCampaign,newSettlement,pacify} from './campaign.js?v=8.3.0';
import {launchCell,missionSite,MISSIONS,newRover,roverBerth} from './campaign-rover.js?v=8.3.0';

const whole=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const owns=(dict,key)=>typeof key==='string'&&Object.hasOwn(dict,key);
const distinct=(arr,max,predicate)=>Array.isArray(arr)&&arr.length<=max&&new Set(arr).size===arr.length&&arr.every(predicate);
function validRover(r,tick,size) {
  const cell=n=>whole(n,size*size-1);
  if(r===null)return true;
  return r&&r.id===0&&owns(MISSIONS,r.kind)&&owns(RIGS,r.rig)&&cell(r.target)&&['out','field','home'].includes(r.stage)
    &&Number.isFinite(r.x)&&r.x>=0&&r.x<=size-1&&Number.isFinite(r.y)&&r.y>=0&&r.y<=size-1
    &&whole(r.departed,tick)&&whole(r.scanUntil,tick+24)&&whole(r.scans)&&Number.isFinite(r.work)&&r.work>=0&&r.work<=7
    &&typeof r.goal==='string'&&r.goal.length<=75&&Array.isArray(r.path)&&r.path.length<=size*size&&r.path.every(cell)
    &&typeof r.loaded==='boolean'&&typeof r.surge==='boolean'&&r.cargo&&typeof r.cargo==='object'&&!Array.isArray(r.cargo)
    &&Object.entries(r.cargo).every(([k,n])=>owns(RES,k)&&whole(n,9999));
}
export function readCampaign(raw) {
  try {
    if(typeof raw!=='string'||raw.length>MAX_SAVE_LENGTH)return null;
    const data=JSON.parse(raw), c=data.campaign;
    if(c?.version!==1||(c.sound!==undefined&&typeof c.sound!=='boolean')||!['deliveries','sorties','signals','orders','surgeWins'].every(k=>whole(c[k])))return null;
    if(!distinct(c.specimens,3,k=>owns(SURVEYS,k))||!distinct(c.claimed,7,i=>whole(i,6))
      ||!distinct(c.decisions,3,(k,i)=>owns(CHAPTERS[i].options,k))||c.decisions.length>c.signals)return null;
    if(!Array.isArray(c.charters)||c.charters.length>1000||!c.charters.every(i=>owns(STRUCTURES,i.type)&&(STRUCTURES[i.type].civil||i.type==='house')&&whole(i.level,STRUCTURES[i.type].max||1)&&i.level>=1))return null;
    if(!(c.siege===null||whole(c.siege,data.tick))||!(c.peace===null||whole(c.peace.tick,data.tick)&&['forum','spire'].includes(c.peace.reason)))return null;
    if(c.peace&&(data.result||[...data.units,...data.buildings].some(e=>e.side===1)))return null;
    const size=Object.hasOwn(data,'size')?data.size:SIDE;
    if(!validSize(size)||!validRover(c.rover,data.tick,size))return null;
    const s=readMatch(raw);
    if(!s||!validTrade(s))return null;
    openTrade(s);return s;
  } catch {return null;}
}
function legacyColony(raw,now) {
  if(!raw)return null;
  try{return importSave(raw,now);}catch{return null;}
}
function legacyBattle(raw) {
  if(!raw)return null;
  try{if(JSON.parse(raw).campaign)return null;return readMatch(raw);}catch{return null;}
}
function transplant(s,old) {
  const board=atlas(s),locations=new Map(),home=mapPoint(s.size,board.home),anchor=unitsOf(s,0,'worker')[0];
  const start=anchor?unitCell(anchor,s.size):launchCell(s,ready(s,0,'forum')[0]);
  for(const item of old.buildings) {
    if(item.type==='pod')continue;
    const type=colonyType(item.type),d=STRUCTURES[type];
    const existing=d.unique?s.buildings.find(b=>b.side===0&&b.type===type):null;
    if(existing){locations.set(item.id,existing);continue;}
    const [x,y]=item.id.split(',').map(Number);
    const target={x:home.x+(x-5)*1.65,y:home.y+(y-5)*1.65};
    const candidates=atlas(s).cells.filter(t=>start!==null&&walkable(s,t.cell)&&!t.ford&&t.cell!==board.relay
      &&mapDistance(s.size,t.cell,board.home)+2<mapDistance(s.size,t.cell,board.rival)
      &&s.buildings.every(b=>mapDistance(s.size,t.cell,b.cell)>=d.clearance+STRUCTURES[b.type].clearance)
      &&s.units.every(u=>unitCell(u,s.size)!==t.cell));
    candidates.sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y));
    const spot=candidates.find(t=>routeDistance(s,start,t.cell,0)>=0);
    if(!spot){s.campaign.charters.push({type,level:item.level});continue;}
    const b=makeBuilding(s,0,type,spot.cell,true);b.level=item.level;locations.set(item.id,b);
  }
  refreshVision(s);
  const workers=unitsOf(s,0,'worker');
  for(const id of old.crews) {
    const b=locations.get(id);if(!b||!Object.keys(STRUCTURES[b.type].output||{}).length)continue;
    let u=workers.find(u=>!['assist','staff'].includes(u.order.kind));
    if(!u&&start!==null&&unitsOf(s,0).length<populationLimit(s.size)){u=makeUnit(s,0,'worker',start);workers.push(u);}
    if(u)orderUnits(s,0,[u.id],'staff',b.cell,b.id);
  }
}
function transferTrip(s,old,now) {
  const c=s.campaign,trip=old.survey.active,drive=fieldState(old)?.drive;
  if(!trip&&!drive)return;
  const origin=launchCell(s,roverBerth(s));if(origin===null)return;
  const kind=trip?.site||'signal',rig=drive?.rig||'scout',target=missionSite(s,kind,origin)??origin;
  const r=newRover(s,kind,rig,origin,target,!!drive?.surge);
  if(trip&&surveyProgress(trip,now)>=.5||drive?.signal){
    r.loaded=true;r.stage='home';r.cargo=trip?sharedCost(SURVEYS[kind].reward):{...drive.cargo,crystal:drive.cargo.crystal+4+(drive.surge?6:0),energy:drive.surge?8:0};
    const near=atlas(s).cells.find(t=>walkable(s,t.cell)&&mapDistance(s.size,t.cell,target)<=1.45&&routeDistance(s,origin,t.cell,0)>=0);
    if(near&&(!trip||surveyProgress(trip,now)<1))Object.assign(r,mapPoint(s.size,near.cell));
  }else if(drive)r.cargo={...drive.cargo};
  r.scans=drive?.scans||0;c.rover=r;
}
// Read the two historical saves only during the first migration. The original
// keys are retained and all subsequent loads use the single campaign snapshot.
export function mergeLegacy(colonyRaw,battleRaw,now=Date.now()) {
  const old=legacyColony(colonyRaw,now),battle=legacyBattle(battleRaw);
  if(!old&&!battle)return null;
  const useBattle=battle&&(!old||!battle.result||battle.result.winner===0);
  const region={emerald:'delta',amber:'mesas',boreal:'passes'}[old?.world?.biome]||'delta';
  const s=useBattle?battle:createCampaign(old?.world?.seed??1,region,'even');
  s.campaign=newSettlement();delete s.scenario;
  if(old){
    const bank=s.teams[0].bank;
    for(const [key,n] of Object.entries(sharedCost(old.resources))) {
      if(useBattle&&['food','ore','crystal'].includes(key))gain(s,0,key,n);
      else bank[key]=Math.min(9999,n);
    }
    const c=s.campaign;c.sound=old.sound;c.deliveries=old.harvests;c.claimed=[...old.claimed];c.specimens=[...old.survey.completed];
    for(const key of ['signals','sorties','orders','surgeWins'])c[key]=old.frontier[key];
    c.decisions=[...old.frontier.decisions];
    for(const k of old.research){const tech=scienceIds[k];if(!s.teams[0].tech.includes(tech))s.teams[0].tech.push(tech);}
    transplant(s,old);transferTrip(s,old,now);
  }
  openTrade(s);
  if(s.result?.winner===0)pacify(s);
  notify(s,'Les archives de Kepler ont rejoint cette colonie.');refreshVision(s);
  return s;
}
export const campaignKey=base=>base+'-campagne-v8';
export function loadProgress(storage,base) {
  const current=readCampaign(storage.getItem(campaignKey(base)));
  if(current)return current;
  const migrated=mergeLegacy(storage.getItem(base),storage.getItem(base+'-strategie-v1'));
  if(migrated){try{storage.setItem(campaignKey(base),JSON.stringify(migrated));}catch{/* The session can still use the recovered state. */}}
  return migrated;
}
export function importProgress(texts) {
  if(texts.length===1){const current=readCampaign(texts[0]);if(current)return current;}
  if(!texts.length||texts.length>2)throw Error('Choisissez une campagne ou les deux anciennes sauvegardes.');
  let colony=null,battle=null;
  for(const raw of texts){
    if(legacyColony(raw,Date.now())&&!colony)colony=raw;
    else if(legacyBattle(raw)&&!battle)battle=raw;
    else throw Error('Fichiers incompatibles ou deux sauvegardes du même type.');
  }
  return mergeLegacy(colony,battle);
}
