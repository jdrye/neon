import {GOALS} from './engine.js?v=6.0.0';
import {WORKSHOPS} from './crews.js?v=6.0.0';
import {IMPROVEMENTS,scienceIds,sharedCost} from './colony-rules.js?v=8.1.0';
import {DT,RES,STRUCTURES,apart,mapPoint,mapDistance} from './strategy-rules.js?v=8.1.0';
import {atlas,createMatch,gain,notify,placementReason,ready,refreshVision,tickSimulation,unitCell,unitsOf} from './strategy-engine.js?v=8.1.0';
import {tickMatch} from './strategy-ai.js?v=8.1.0';
import {advanceRover} from './campaign-rover.js?v=8.1.0';

export const TICKS_PER_CYCLE = Math.round(12/DT);
export const goalTexts=['Faire livrer cinq cargaisons par les pionniers.','Mettre une centrale solaire en service.','Achever un habitat.','Exploiter une serre et un collecteur d’eau.','Réunir 16 habitants, une serre et un port stellaire.','Acquérir les trois sciences civiles et réunir 28 habitants.','Réunir 52 habitants et quatre installations de niveau III.'];
export function newSettlement() {
  return {version:1,sound:false,deliveries:0,claimed:[],specimens:[],sorties:0,signals:0,orders:0,surgeWins:0,decisions:[],rover:null,peace:null,siege:null,charters:[]};
}
export function createCampaign(seed,region='delta',level='even',size) {
  const s=createMatch(seed,region,level,size);s.campaign=newSettlement();return s;
}
export function installationYield(s,b) {
  const d=STRUCTURES[b.type],income={};
  if(!b.ready||!d.output)return income;
  const science={solar:'solarOptics',pump:'closedCycle',greenhouse:'closedCycle',mine:'deepSurvey'}[b.type];
  const factor=(b.level||1)*(s.teams[b.side].tech.includes(science)?2:1);
  for(const [key,n] of Object.entries(d.output))income[key]=n*factor;
  const workshop=WORKSHOPS[b.type];if(!workshop)return income;
  const staff=unitsOf(s,b.side,'worker').filter(u=>u.order.kind==='staff'&&u.order.target===b.id&&apart(u,mapPoint(s.size,b.cell))<=1.45);
  if(!staff.length)return income;
  const decisions=b.side?[]:s.campaign.decisions,around=(cell)=>mapDistance(s.size,cell,b.cell)<=2.5;
  const wet=workshop.terrain==='shore'||workshop.terrain==='water';
  const land=wet?atlas(s).cells.some(t=>t.terrain==='water'&&around(t.cell)):s.nodes.some(n=>n.kind===workshop.terrain&&n.left>0&&around(n.cell));
  const partner=ready(s,b.side).some(p=>p.id!==b.id&&workshop.partners.some(type=>(type==='habitat'?'house':type)===p.type)&&mapDistance(s.size,p.cell,b.cell)<=3);
  const bonus=1+Number(decisions.includes('hearth'))+Number(land)*(decisions.includes('ecology')?4:2)+Number(partner)*2;
  const key=workshop.resource==='bio'?'food':workshop.resource;
  income[key]=(income[key]||0)+bonus*staff.length;
  return income;
}
export function districtRates(s,side=0) {
  const total=Object.fromEntries(Object.keys(RES).map(k=>[k,0]));
  for(const b of ready(s,side))for(const [key,n] of Object.entries(installationYield(s,b)))total[key]+=n;
  return total;
}
function civicMilestones(s) {
  const c=s.campaign,buildings=ready(s,0),has=key=>buildings.some(b=>b.type===key),people=unitsOf(s,0).length;
  const reached=[c.deliveries>=5,has('solar'),has('house'),has('greenhouse')&&has('pump'),
    people>=16&&has('beacon')&&has('greenhouse'),people>=28&&Object.values(scienceIds).every(k=>s.teams[0].tech.includes(k)),
    people>=52&&buildings.filter(b=>b.level===3).length>=4];
  for(const [i,goal] of GOALS.entries())if(reached[i]&&!c.claimed.includes(i)){
    c.claimed.push(i);for(const [key,n] of Object.entries(sharedCost(goal.reward)))gain(s,0,key,n);
    notify(s,'Objectif de la colonie atteint · '+goal.name+'.');
  }
}
export function pacify(s) {
  if(s.result?.winner!==0||s.campaign.peace)return;
  s.campaign.peace={reason:s.result.reason,tick:s.tick};s.result=null;
  s.buildings=s.buildings.filter(b=>!b.side);s.units=s.units.filter(u=>!u.side);
  if(s.relay.owner===1)s.relay={owner:-1,contender:-1,progress:0};
  s.rev++;s.alarm=null;refreshVision(s);
  notify(s,'Victoire d’Aurore. Cendre se retire. Votre cité poursuit son développement sur ce bassin.');
}
export function tickCampaign(s) {
  if(s.result)return;
  if(s.campaign.peace)tickSimulation(s);else tickMatch(s);
  if(s.result){pacify(s);if(s.result)return;}
  advanceRover(s);
  if(s.tick%TICKS_PER_CYCLE===0){
    for(const side of [0,1])for(const [key,n] of Object.entries(districtRates(s,side)))if(n)gain(s,side,key,n);
    civicMilestones(s);
  }
  if(!s.campaign.siege&&s.tick%8===0&&unitsOf(s,1).filter(u=>u.type!=='worker'&&mapDistance(s.size,unitCell(u,s.size),atlas(s).home)<7.5).length>=3) {
    s.campaign.siege=s.tick;notify(s,'Le siège d’Aurore commence. Une colonne de Cendre approche de votre forum.');
  }
}
export function reviseDistrict(s,id,cell=null) {
  const b=ready(s,0).find(p=>p.id===id),d=b&&STRUCTURES[b.type];
  if(s.result||!b||(!d.civil&&b.type!=='house')||b.chartered||b.queue.length||b.hp<d.hp-.01||b.type==='hangar'&&s.campaign.rover)
    return {ok:false,message:'Cette installation doit être en service, intacte et disponible.'};
  if(cell!==null){
    const reason=placementReason(s,0,b.type,cell,id);
    if(reason)return {ok:false,message:reason};
    b.cell=cell;
  }else{
    const paid={...d.cost};
    for(let l=2;l<=(b.level||1);l++)for(const [k,n] of Object.entries(IMPROVEMENTS[b.type+'-'+l].cost))paid[k]=(paid[k]||0)+n;
    for(const [k,n] of Object.entries(paid))gain(s,0,k,Math.floor(n/2));
    s.buildings=s.buildings.filter(p=>p!==b);
  }
  for(const u of s.units)if(u.order.target===id){u.order=cell===null?{kind:'idle'}:{...u.order,cell};u.goal='';u.path=[];}
  s.rev++;refreshVision(s);
  return {ok:true,message:cell===null?'Installation démontée. La moitié des matériaux a rejoint le stock.':'Installation déplacée.'};
}
