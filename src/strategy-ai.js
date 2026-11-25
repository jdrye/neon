import { DT, HOME, LEVELS, RIVAL, UNITS, apart, keyOf, pointOf, tileDistance } from './strategy-rules.js?v=7.0.0';
import { atlas, buildReason, construct, enqueue, nearestSource, orderUnits, populationInfo, ready, routeDistance, tickSimulation, unitCell, unitsOf, vision } from './strategy-engine.js?v=7.0.0';

// The rival pays through the same public orders as the player. Difficulty changes
// how often it plans, which investments it prioritises and when it sends a group.
function commission(s,side,type,workers,home) {
  if(buildReason(s,side,type)||!workers.length)return false;
  const focus=pointOf(home), sign=side?-1:1;
  const offset={barracks:[2,-1],farm:[-2,2],house:[-2,-1],workshop:[2,1],depot:[0,-3],tower:[3,-2],spire:[-2,1]}[type];
  const wanted=keyOf(focus.x+offset[0]*sign,focus.y+offset[1]*sign);
  const candidates=atlas(s).cells.filter(c=>tileDistance(c.cell,home)<=7.4&&!buildReason(s,side,type,c.cell)).sort((a,b)=>tileDistance(a.cell,wanted)-tileDistance(b.cell,wanted)||a.cell-b.cell);
  for(const c of candidates.slice(0,12)){
    const builders=workers.filter(u=>u.order.kind!=='assist'&&routeDistance(s,unitCell(u),c.cell)>=0).sort((a,b)=>Number(!!a.cargo)-Number(!!b.cargo)||apart(a,c)-apart(b,c));
    if(construct(s,side,builders.slice(0,workers.length>=7?2:1).map(u=>u.id),type,c.cell).ok)return true;
  }return false;
}
function assignGatherers(s,side,workers) {
  const team=s.teams[side],bank=team.bank,free=workers.filter(u=>u.order.kind!=='assist'&&u.order.kind!=='repair');
  const weights={food:bank.food>215?.65:2.2,wood:bank.wood>190?.6:1.65,ore:bank.ore>125?.5:1.35,crystal:bank.crystal>100?.45:team.age>=2?1.45:.8};
  const sum=Object.values(weights).reduce((a,b)=>a+b,0), have={food:0,wood:0,ore:0,crystal:0};
  for(const u of free)if(u.order.kind==='gather')have[u.order.resource]++;
  for(const u of free){const current=u.order.kind==='gather'?u.order.resource:null;
    const need=k=>free.length*weights[k]/sum-have[k];
    const keys=Object.keys(weights).sort((a,b)=>need(b)-need(a));
    if(current&&(u.cargo||need(current)>-1||need(keys[0])<1))continue;
    for(const k of keys){const cell=nearestSource(s,side,unitCell(u),k);if(cell===null)continue;
      if(current===k)break;
      if(orderUnits(s,side,[u.id],'gather',cell).ok){if(current)have[current]--;have[k]++;break;}}
  }
}
export function planSide(s,side,difficulty,brain) {
  if(s.result)return;const level=LEVELS[difficulty],team=s.teams[side],home=side?RIVAL:HOME;
  const forum=ready(s,side,'forum')[0];if(!forum)return;
  const workers=unitsOf(s,side,'worker'),army=unitsOf(s,side).filter(u=>u.type!=='worker');
  const sites=s.buildings.filter(b=>b.side===side&&!b.ready), time=s.tick*DT, has=type=>ready(s,side,type).length>0;
  if(sites.length){for(const b of sites)if(!workers.some(u=>u.order.target===b.id&&u.order.kind==='assist')){
    const nearest=workers.filter(u=>u.order.kind!=='assist').sort((a,c)=>tileDistance(unitCell(a),b.cell)-tileDistance(unitCell(c),b.cell))[0];
    if(nearest)orderUnits(s,side,[nearest.id],'assist',b.cell,b.id);
  }}else{
    const p=populationInfo(s,side),buildList=[];
    if(!has('barracks'))buildList.push('barracks');
    if(p.used+p.reserved>=p.cap-2 && p.cap<58)buildList.push('house');
    if(!has('depot'))buildList.push('depot');
    if(!has('farm')&&(!s.nodes.some(n=>n.kind==='food'&&n.left>0&&tileDistance(n.cell,home)<5)||team.age>=2))buildList.push('farm');
    if(team.age>=2&&!has('workshop'))buildList.push('workshop');
    if(team.age>=2&&!has('tower')&&army.length>=3)buildList.push('tower');
    if(team.age===3&&!has('spire')&&army.length>=6)buildList.push('spire');
    if(team.age>=2&&ready(s,side,'barracks').length<2&&army.length>5)buildList.push('barracks');
    for(const type of buildList)if(commission(s,side,type,workers,home))break;
  }
  assignGatherers(s,side,workers);
  const canGrow=time>=level.grow && (team.age===1||army.length>=4);
  const ageSoon=canGrow && team.age<3 && (team.age===1?has('depot')&&has('barracks'):has('workshop')&&team.tech.length>0);
  if(!forum.queue.length && ageSoon)enqueue(s,side,forum.id,'age',team.age+1);
  if(!forum.queue.length&&workers.length<level.settlers&&(!ageSoon||workers.length<7||team.bank.food>245))enqueue(s,side,forum.id,'unit','worker');
  const depot=ready(s,side,'depot')[0];
  if(depot&&!depot.queue.length&&workers.length>=7&&!team.tech.includes('harness')&&(!ageSoon||team.age>=2))enqueue(s,side,depot.id,'tech','harness');
  const seen=vision(s,side),opponents=unitsOf(s,1-side).filter(u=>seen[unitCell(u)]&&u.type!=='worker');
  const enemyTypes=Object.keys(UNITS).sort((a,b)=>opponents.filter(u=>u.type===b).length-opponents.filter(u=>u.type===a).length);
  for(const base of ready(s,side).filter(b=>b.type==='barracks'||b.type==='workshop')){
    if(base.queue.length)continue;
    if(base.type==='workshop'&&army.length>=5){const key=team.tech.includes('optics')?'plating':'optics';if(enqueue(s,side,base.id,'tech',key).ok)continue;}
    const choices=Object.keys(UNITS).filter(k=>UNITS[k].at===base.type&&UNITS[k].age<=team.age);
    const score=k=>army.filter(u=>u.type===k).length -(opponents.length&&UNITS[k].counter===enemyTypes[0]?2:0);
    choices.sort((a,b)=>score(a)-score(b));
    for(const key of choices){if(key==='guard'&&ageSoon&&army.length>=level.army&&team.bank.food<218)continue;if(enqueue(s,side,base.id,'unit',key).ok)break;}
  }
  const threat=opponents.filter(u=>tileDistance(unitCell(u),home)<=6).sort((a,b)=>tileDistance(unitCell(a),home)-tileDistance(unitCell(b),home))[0];
  if(threat){const reservists=army.filter(u=>tileDistance(unitCell(u),home)<=8&&u.order.target!==threat.id);if(reservists.length)orderUnits(s,side,reservists.map(u=>u.id),'attack',null,threat.id);return;}
  const enemySpire=s.buildings.find(b=>b.side!==side&&b.ready&&b.type==='spire');
  if(army.length>=level.army && time>=level.raid && time-brain.lastRaid>=level.repeat || enemySpire&&army.length>=3&&time-brain.lastRaid>=30){
    const target=enemySpire?.cell??team.enemyForum??(side?HOME:RIVAL);
    const group=army.length>7?army.slice(1):army;orderUnits(s,side,group.map(u=>u.id),'advance',target);brain.lastRaid=time;
  }else if(time>35&&s.relay.owner!==side){
    const scout=army.find(u=>u.type==='skimmer'&&u.order.kind==='idle'&&tileDistance(unitCell(u),home)<8);
    if(scout)orderUnits(s,side,[scout.id],'advance',atlas(s).relay);
  }
}
export function tickMatch(state) {
  if(state.result)return;
  if(state.tick%Math.round(LEVELS[state.level].interval/DT)===0)planSide(state,1,state.level,state.ai);
  tickSimulation(state);
}
