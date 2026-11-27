import {CHAPTERS,RIGS} from './frontier.js?v=6.0.0';
import {SURVEYS} from './survey.js?v=6.0.0';
import {sharedCost} from './colony-rules.js?v=8.2.0';
import {DT,SIDE,isMilitary,apart,canPay,grid,mapPoint,mapDistance} from './strategy-rules.js?v=8.2.0';
import {atlas,distancesFrom,gain,notify,pay,ready,refreshVision,routeDistance,travel,unitCell,unitsOf,walkable} from './strategy-engine.js?v=8.2.0';

export const MISSIONS = {
  flora:{name:'Forêt des brumes',art:'site-flora',kind:'wood',distance:6},
  strata:{name:'Falaises ocre',art:'site-strata',kind:'ore',distance:8},
  prism:{name:'Champ de prismes',art:'site-prism',kind:'crystal',distance:10},
  signal:{name:'Signal des marées',art:'beacon',distance:9},
};
export const councilEffects = {
  cells:'Le radar couvre deux cases supplémentaires.', guild:'Chaque installation productive accueille un second pionnier.',
  assay:'Le rover rapporte trois minerais de plus par mission.', ecology:'Le bonus des équipes sur terrain favorable est doublé.',
  passage:'Le premier balayage de chaque sortie est gratuit.', hearth:'Chaque pionnier en poste fournit une unité supplémentaire par cycle.',
};
const fail = message => ({ok:false,message});
const success = message => ({ok:true,message});

export function departureCost(kind,rig) {
  const provisions=sharedCost(SURVEYS[kind]?.cost);
  for(const [key,n] of Object.entries(sharedCost(RIGS[rig].cost)))provisions[key]=(provisions[key]||0)+n;
  return provisions;
}
export function roverBerth(s) {
  return ready(s,0,'hangar')[0] || ready(s,0,'forum')[0];
}
export function launchCell(s,building) {
  if(!building)return null;
  return atlas(s).cells.find(t=>walkable(s,t.cell)&&mapDistance(s.size,t.cell,building.cell)<=1.45)?.cell??null;
}
export function missionSite(s,kind,from) {
  if(!Object.hasOwn(MISSIONS,kind)||from===null)return null;
  const board=grid(s.size), {home,relay,size}=board;
  const m=MISSIONS[kind], targetDistance=m.distance+(s.seed%3)+Math.floor((size-SIDE)/8);
  // The signal moves between the river approaches as fragments are recovered.
  const offset=Math.round(size*.148)*size+1;
  const approaches=[relay,relay-offset,relay+offset], focus=approaches[s.campaign.signals%approaches.length];
  const candidates=kind==='signal'?atlas(s).cells.filter(t=>walkable(s,t.cell)&&mapDistance(s.size,t.cell,focus)<=3).map(t=>t.cell)
    :s.nodes.filter(n=>n.kind===m.kind).map(n=>n.cell);
  const distance=distancesFrom(s,from);
  let best=null,score=Infinity;
  for(const cell of candidates) {
    const d=distance(cell);
    if(d<0)continue;
    const rank=kind==='signal'?mapDistance(s.size,cell,focus)+.01*d:Math.abs(d-targetDistance)+.03*mapDistance(s.size,home,cell);
    if(rank<score){score=rank;best=cell;}
  }
  return best;
}
export function newRover(s,kind,rig,origin,target,surge=false) {
  const p=mapPoint(s.size,origin);
  return {id:0,x:p.x,y:p.y,goal:'',path:[],kind,rig,target,stage:'out',work:0,loaded:false,
    scanUntil:0,scans:0,surge,cargo:{},departed:s.tick};
}
export function launchRover(s,kind,rig='scout',surge=false) {
  const c=s.campaign, hangar=ready(s,0,'hangar')[0];
  if(s.result||c.rover)return fail('Le rover est déjà mobilisé ou la partie est terminée.');
  if(!Object.hasOwn(MISSIONS,kind)||!Object.hasOwn(RIGS,rig))return fail('Mission inconnue.');
  if(!hangar)return fail('Construisez le hangar à rover dans votre cité.');
  if(kind!=='signal'&&c.specimens.includes(kind))return fail('Ce spécimen figure déjà dans le carnet.');
  if(surge&&(kind!=='signal'||!c.signals))return fail('Les vives-eaux s’ouvrent après le premier signal.');
  const from=launchCell(s,hangar), target=missionSite(s,kind,from);
  if(target===null)return fail('Aucun itinéraire depuis le hangar.');
  const cost=departureCost(kind,rig);
  if(!canPay(s.teams[0].bank,cost))return fail('Provisions insuffisantes dans les réserves de la cité.');
  pay(s,0,cost);
  c.rover=newRover(s,kind,rig,from,target,surge);c.sorties++;
  refreshVision(s);
  notify(s,`Rover en route · ${MISSIONS[kind].name}.`);
  return success('Le rover a quitté le hangar.');
}
export function recallRover(s) {
  const r=s.campaign.rover;
  if(!r||s.result||r.stage==='home')return fail('Aucun rover à rappeler.');
  r.stage='home';r.path=[];r.goal='';return success('Retour ordonné. La cargaison sera livrée à l’arrivée.');
}
export function scanRover(s) {
  const r=s.campaign.rover;
  if(!r||s.result)return fail('Envoyez le rover sur le terrain.');
  if(r.scanUntil>s.tick)return fail('Radar en activité.');
  const cost={energy:s.campaign.decisions.includes('passage')&&!r.scans?0:2};
  if(!canPay(s.teams[0].bank,cost))return fail('Le balayage nécessite deux énergies.');
  pay(s,0,cost);r.scans++;r.scanUntil=s.tick+24;refreshVision(s);
  return success('Balayage transmis à la carte de commandement.');
}
export function vote(s,key) {
  const c=s.campaign,chapter=CHAPTERS[c.decisions.length];
  if(s.result||!chapter||c.decisions.length>=c.signals||!Object.hasOwn(chapter.options,key))return fail('Le conseil attend le prochain fragment.');
  const option=chapter.options[key],cost=sharedCost(option.cost);
  if(!canPay(s.teams[0].bank,cost))return fail('Réserves insuffisantes pour ce projet.');
  pay(s,0,cost);c.decisions.push(key);notify(s,option.name+' · décision du conseil.');
  return success(councilEffects[key]);
}
export function contested(s,r) {
  return unitsOf(s,1).some(u=>isMilitary(u.type)&&apart(u,r)<2.4)&&!unitsOf(s,0).some(u=>isMilitary(u.type)&&apart(u,r)<3.5);
}
function unload(s,r) {
  const c=s.campaign;
  if(r.loaded){
    if(r.kind==='signal'){c.signals++;if(!r.scans)c.orders++;if(r.surge)c.surgeWins++;}
    else if(!c.specimens.includes(r.kind))c.specimens.push(r.kind);
  }
  for(const [k,n] of Object.entries(r.cargo))gain(s,0,k,n);
  c.rover=null;
  notify(s,r.loaded?(r.kind==='signal'?'Fragment livré au conseil.':SURVEYS[r.kind].specimen+' rapporté au hangar.'):'Rover de retour à la cité.');
}
export function advanceRover(s) {
  const r=s.campaign.rover;if(!r)return;
  const speed={scout:2.55,crawler:2.1,hauler:1.75}[r.rig];
  if(r.stage==='home'){
    const near=unitCell(r,s.size), options=[...ready(s,0,'hangar'),...ready(s,0,'forum')];
    const base=options.find(b=>routeDistance(s,near,b.cell)>=0);
    if(base&&travel(s,r,base.cell,1.45,speed))unload(s,r);
    return;
  }
  if(r.stage==='out'){
    const ford=atlas(s).cells[unitCell(r,s.size)].ford, highTide=Math.floor(s.tick*DT/6)%2===1;
    const multiplier=ford&&highTide&&r.rig!=='crawler'?(r.surge?.35:.60):1;
    if(travel(s,r,r.target,1.45,speed*multiplier))r.stage='field';
    return;
  }
  if(contested(s,r))return;
  r.work+=DT;
  if(r.work<(r.kind==='signal'?6:4))return;
  r.loaded=true;r.stage='home';r.goal='';r.path=[];
  const payload=r.kind==='signal'?{crystal:r.surge?12:6,ore:4,energy:r.surge?8:0}:sharedCost(SURVEYS[r.kind].reward);
  if(s.campaign.decisions.includes('assay'))payload.ore=(payload.ore||0)+3;
  if(r.rig==='hauler')for(const k of ['ore','crystal'])if(payload[k])payload[k]*=2;
  for(const [key,n] of Object.entries(payload))r.cargo[key]=(r.cargo[key]||0)+n;
  notify(s,'Prélèvement à bord. Le rover rentre à la cité.');
}
