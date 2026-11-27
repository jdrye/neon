import {knownPost,planCommerce,scoutPost} from './trade.js?v=8.2.0';
import { DT, LEVELS, SIDE, UNITS, isMilitary, apart, grid, populationLimit, mapKey, mapPoint, mapDistance } from './strategy-rules.js?v=8.2.0';
import { atlas, buildReason, construct, enqueue, nearestSource, orderUnits, populationInfo, ready, routeDistance, tickSimulation, unitCell, unitsOf, vision } from './strategy-engine.js?v=8.2.0';

// The rival pays through the same public orders as the player. Difficulty changes
// how often it plans, which investments it prioritises and when it sends a group.
function commission(s,side,type,workers,home) {
  if(buildReason(s,side,type)||!workers.length)return false;
  const focus=mapPoint(s.size,home), sign=side?-1:1;
  const offset={barracks:[2,-1],farm:[-2,2],house:[-2,-1],workshop:[2,1],market:[-2,-3],depot:[0,-3],tower:[3,-2],spire:[-2,1],solar:[-3,-2],pump:[-2,3],mine:[2,-3],greenhouse:[0,3]}[type];
  const wanted=mapKey(s.size,focus.x+offset[0]*sign,focus.y+offset[1]*sign);
  const board=atlas(s),candidates=[];
  const radius=board.size===SIDE?7.4:9.5;
  for(let y=Math.max(0,focus.y-Math.floor(radius));y<=Math.min(board.size-1,focus.y+radius);y++){
    for(let x=Math.max(0,focus.x-Math.floor(radius));x<=Math.min(board.size-1,focus.x+radius);x++){
      const cell=mapKey(s.size,x,y);
      if(mapDistance(s.size,cell,home)<=radius&&!buildReason(s,side,type,cell))candidates.push(board.cells[cell]);
    }
  }
  candidates.sort((a,b)=>mapDistance(s.size,a.cell,wanted)-mapDistance(s.size,b.cell,wanted)||a.cell-b.cell);
  for(const c of candidates.slice(0,12)){
    const builders=workers.filter(u=>u.order.kind!=='assist'&&routeDistance(s,unitCell(u,s.size),c.cell)>=0).sort((a,b)=>Number(!!a.cargo)-Number(!!b.cargo)||apart(a,c)-apart(b,c));
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
    for(const k of keys){const cell=nearestSource(s,side,unitCell(u,s.size),k);if(cell===null)continue;
      if(current===k)break;
      if(orderUnits(s,side,[u.id],'gather',cell).ok){if(current)have[current]--;have[k]++;break;}}
  }
}
export function planSide(s,side,difficulty,brain) {
  if(s.result)return;
  const board=grid(s.size),scale=(board.size-SIDE)/(85-SIDE),level=LEVELS[difficulty],team=s.teams[side];
  const home=side?board.rival:board.home, enemyHome=side?board.home:board.rival;
  const settlers=level.settlers+Math.round(scale*level.settlers), raidSize=level.army+Math.round(scale*4);
  const forum=ready(s,side,'forum')[0];if(!forum)return;
  const workers=unitsOf(s,side,'worker'),army=unitsOf(s,side).filter(u=>isMilitary(u.type));
  const sites=s.buildings.filter(b=>b.side===side&&!b.ready), time=s.tick*DT, has=type=>ready(s,side,type).length>0;
  if(sites.length){for(const b of sites)if(!workers.some(u=>u.order.target===b.id&&u.order.kind==='assist')){
    const nearest=workers.filter(u=>u.order.kind!=='assist').sort((a,c)=>mapDistance(s.size,unitCell(a,s.size),b.cell)-mapDistance(s.size,unitCell(c,s.size),b.cell))[0];
    if(nearest)orderUnits(s,side,[nearest.id],'assist',b.cell,b.id);
  }}else{
    const p=populationInfo(s,side),buildList=[];
    if(!has('barracks'))buildList.push('barracks');
    if(p.used+p.reserved>=p.cap-2 && p.cap<populationLimit(s.size))buildList.push('house');
    if(!has('depot')||scale>=.5&&team.age>=2&&ready(s,side,'depot').length<2)buildList.push('depot');
    if(s.campaign?.trade&&team.age>=2&&knownPost(s,side,side)&&!has('market')&&army.length>=2&&team.bank.wood>=60&&team.bank.ore>=24)buildList.push('market');
    if(!has('farm')&&(!s.nodes.some(n=>n.kind==='food'&&n.left>0&&mapDistance(s.size,n.cell,home)<5)||team.age>=2))buildList.push('farm');
    if(team.age>=2&&!has('workshop'))buildList.push('workshop');
    if(team.age>=2&&!has('tower')&&army.length>=3)buildList.push('tower');
    if(team.age===3&&!has('spire')&&army.length>=6)buildList.push('spire');
    if(team.age>=2&&ready(s,side,'barracks').length<2+Math.round(scale*2)&&army.length>5)buildList.push('barracks');
    if(s.campaign&&workers.length>=7){
      if(!has('solar'))buildList.push('solar');
      if(has('solar')&&!has('mine'))buildList.push('mine');
      if(team.age>=2&&!has('pump'))buildList.push('pump');
      if(has('pump')&&!has('greenhouse'))buildList.push('greenhouse');
    }
    for(const type of buildList)if(commission(s,side,type,workers,home))break;
  }
  assignGatherers(s,side,workers);
  const canGrow=time>=level.grow && (team.age===1||army.length>=4);
  const ageSoon=canGrow && team.age<3 && (team.age===1?has('depot')&&has('barracks'):has('workshop')&&team.tech.length>0);
  if(!forum.queue.length && ageSoon)enqueue(s,side,forum.id,'age',team.age+1);
  if(!forum.queue.length&&workers.length<settlers&&(!ageSoon||workers.length<7||team.bank.food>245))enqueue(s,side,forum.id,'unit','worker');
  const depot=ready(s,side,'depot')[0];
  if(depot&&!depot.queue.length&&workers.length>=7&&!team.tech.includes('harness')&&(!ageSoon||team.age>=2))enqueue(s,side,depot.id,'tech','harness');
  const seen=vision(s,side),opponents=unitsOf(s,1-side).filter(u=>seen[unitCell(u,s.size)]&&isMilitary(u.type));
  const enemyTypes=Object.keys(UNITS).sort((a,b)=>opponents.filter(u=>u.type===b).length-opponents.filter(u=>u.type===a).length);
  for(const base of ready(s,side).filter(b=>b.type==='barracks'||b.type==='workshop')){
    if(base.queue.length)continue;
    if(base.type==='workshop'&&army.length>=5){const key=team.tech.includes('optics')?'plating':'optics';if(enqueue(s,side,base.id,'tech',key).ok)continue;}
    const choices=Object.keys(UNITS).filter(k=>UNITS[k].at===base.type&&UNITS[k].age<=team.age);
    const score=k=>army.filter(u=>u.type===k).length -(opponents.length&&UNITS[k].counter===enemyTypes[0]?2:0);
    choices.sort((a,b)=>score(a)-score(b));
    for(const key of choices){if(key==='guard'&&ageSoon&&army.length>=raidSize&&team.bank.food<218)continue;if(enqueue(s,side,base.id,'unit',key).ok)break;}
  }
  if(s.campaign?.trade)planCommerce(s,side);
  const threat=opponents.filter(u=>mapDistance(s.size,unitCell(u,s.size),home)<=6).sort((a,b)=>mapDistance(s.size,unitCell(a,s.size),home)-mapDistance(s.size,unitCell(b,s.size),home))[0];
  if(threat){const reservists=army.filter(u=>mapDistance(s.size,unitCell(u,s.size),home)<=8&&u.order.target!==threat.id);if(reservists.length)orderUnits(s,side,reservists.map(u=>u.id),'attack',null,threat.id);return;}
  const enemySpire=s.buildings.find(b=>b.side!==side&&b.ready&&b.type==='spire');
  if(army.length>=raidSize && time>=level.raid+scale*20 && time-brain.lastRaid>=level.repeat+scale*25 || enemySpire&&army.length>=3&&time-brain.lastRaid>=30){
    const target=enemySpire?.cell??team.enemyForum??enemyHome;
    const fieldArmy=army.filter(u=>u.order.kind!=='escort');
    const group=fieldArmy.length>7?fieldArmy.slice(1+Math.round(scale*3)):fieldArmy;
    if(orderUnits(s,side,group.map(u=>u.id),'advance',target).ok)brain.lastRaid=time;
  }else if(s.campaign?.trade&&time>21&&!knownPost(s,side,side)&&army.some(u=>u.type==='skimmer'&&u.order.kind==='idle')){
    scoutPost(s,side,side);
  }else if(time>35&&s.relay.owner!==side){
    const scout=army.find(u=>u.type==='skimmer'&&u.order.kind==='idle'&&mapDistance(s.size,unitCell(u,s.size),home)<8);
    if(scout)orderUnits(s,side,[scout.id],'advance',atlas(s).relay);
  }
}
export function tickMatch(state) {
  if(state.result)return;
  if(state.tick%Math.round(LEVELS[state.level].interval/DT)===0)planSide(state,1,state.level,state.ai);
  tickSimulation(state);
}
