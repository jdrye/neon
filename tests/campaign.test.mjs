import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCampaign,districtRates,installationYield,reviseDistrict,tickCampaign} from '../src/campaign.js';
import {launchRover,recallRover,scanRover,vote} from '../src/campaign-rover.js';
import {campaignKey,importProgress,loadProgress,mergeLegacy,readCampaign} from '../src/campaign-save.js';
import {atlas,buildReason,cancelJob,cancelSite,construct,createMatch,enqueue,jobCost,orderUnits,ready,unitsOf} from '../src/strategy-engine.js';
import {HOME,STRUCTURES,UNITS,tileDistance} from '../src/strategy-rules.js';
import {planSide} from '../src/strategy-ai.js';
import {siegeOfAurore} from './fixtures/siege-v7.mjs';

const legacy=await readFile(new URL('../examples/colonie-kepler.json',import.meta.url),'utf8');
const workers=s=>unitsOf(s,0,'worker').map(w=>w.id);
function until(s,predicate,limit=500) {
  for(let i=0;i<limit&&!predicate();i++)tickCampaign(s);
  assert.ok(predicate(),'Condition manquante au tour '+s.tick);
}
function build(s,type) {
  const plot=atlas(s).cells.filter(c=>!buildReason(s,0,type,c.cell))
    .sort((a,b)=>tileDistance(a.cell,HOME)-tileDistance(b.cell,HOME))[0];
  assert.ok(plot,'Aucun terrain disponible pour '+type);
  const result=construct(s,0,workers(s),type,plot.cell);
  assert.ok(result.ok,result.message);
  const b=s.buildings.find(b=>b.id===result.id);
  until(s,()=>b.ready);return b;
}
function oldEncounter() {
  const s=siegeOfAurore();
  for(const t of s.teams){delete t.bank.water;delete t.bank.energy;}
  for(const b of s.buildings)delete b.level;
  return JSON.stringify(s);
}

test('les mêmes pionniers construisent la base et le hangar ; le minerai du rover paie une Sentinelle',()=>{
  const s=createCampaign(93,'delta','calm'),bank=s.teams[0].bank;
  const military=build(s,'barracks');build(s,'hangar');build(s,'solar');
  assert.equal(bank.ore,3);
  assert.equal(enqueue(s,0,military.id,'unit','guard').ok,false);
  assert.ok(launchRover(s,'strata').ok);
  assert.equal(launchRover(s,'flora').ok,false);
  assert.ok(scanRover(s).ok);assert.equal(scanRover(s).ok,false);
  const r=s.campaign.rover,from=[r.x,r.y],enemies=s.teams[1].trained;
  until(s,()=>r.x!==from[0]||r.y!==from[1]);
  const restored=readCampaign(JSON.stringify(s));assert.ok(restored);
  until(s,()=>!s.campaign.rover);
  until(restored,()=>!restored.campaign.rover);
  assert.deepEqual(restored.teams[0].bank,bank);
  assert.deepEqual(s.campaign.specimens,['strata']);
  assert.equal(bank.ore,25);
  assert.ok(enqueue(s,0,military.id,'unit','guard').ok);
  assert.equal(bank.ore,25-UNITS.guard.cost.ore);
  until(s,()=>unitsOf(s,0,'guard').length===1);
  assert.equal(launchRover(s,'strata').ok,false);
  assert.ok(s.teams[1].trained>=enemies);
  assert.equal(s.buildings.filter(b=>b.side===0&&b.type==='forum').length,1);
});

test('le travail en installation mobilise une unité réelle, les niveaux et les sciences modifient la même production',()=>{
  const s=mergeLegacy(legacy,null),pump=ready(s,0,'pump')[0],worker=unitsOf(s,0,'worker')[0];
  assert.ok(orderUnits(s,0,[worker.id],'staff',pump.cell,pump.id).ok);
  assert.equal(orderUnits(s,0,[unitsOf(s,0,'worker')[1].id],'staff',pump.cell,pump.id).ok,false);
  until(s,()=>installationYield(s,pump).water>3);
  assert.equal(worker.order.kind,'staff');
  assert.ok(orderUnits(s,0,[worker.id],'stop').ok);assert.equal(installationYield(s,pump).water,3);
  const greenhouse=ready(s,0,'greenhouse')[0],cost=jobCost(s,greenhouse,'tech','closedCycle');
  assert.equal(cost.food,49);
  const food=s.teams[0].bank.food;
  assert.ok(enqueue(s,0,greenhouse.id,'tech','closedCycle').ok);
  assert.equal(s.teams[0].bank.food,food-cost.food);
  assert.ok(cancelJob(s,0,greenhouse.id,0).ok);assert.equal(s.teams[0].bank.food,food);
  assert.ok(enqueue(s,0,greenhouse.id,'tech','closedCycle').ok);
  until(s,()=>s.teams[0].tech.includes('closedCycle'));
  assert.equal(installationYield(s,pump).water,6);
  until(s,()=>s.teams[0].bank.ore>=17);
  assert.ok(enqueue(s,0,pump.id,'level','pump-2').ok);
  assert.equal(enqueue(s,0,pump.id,'level','pump-2').ok,false);
  until(s,()=>pump.level===2);
  assert.equal(installationYield(s,pump).water,12);
  assert.ok(districtRates(s).ore>0);
  assert.ok(readCampaign(JSON.stringify(s)));
});

test('le retour physique du rover ouvre le conseil une fois, un rappel précoce ne crédite aucun fragment',()=>{
  const s=mergeLegacy(legacy,null);const initial=s.campaign.signals;
  assert.ok(launchRover(s,'signal').ok);assert.equal(vote(s,'guild').ok,false);
  assert.ok(recallRover(s).ok);until(s,()=>!s.campaign.rover);
  assert.equal(s.campaign.signals,initial);
  assert.ok(launchRover(s,'signal','crawler').ok);until(s,()=>s.campaign.rover?.loaded);
  assert.equal(vote(s,'guild').ok,false);
  until(s,()=>!s.campaign.rover);const food=s.teams[0].bank.food;
  assert.ok(vote(s,'guild').ok);assert.equal(s.teams[0].bank.food,food-14);assert.equal(vote(s,'guild').ok,false);
  assert.deepEqual(s.campaign.decisions,['guild']);
  const pump=ready(s,0,'pump')[0];assert.ok(orderUnits(s,0,workers(s).slice(0,2),'staff',pump.cell,pump.id).ok);
  assert.equal(s.units.filter(u=>u.order.kind==='staff'&&u.order.target===pump.id).length,2);
});

test('les deux archives convergent une seule fois et les anciennes clés restent intactes',()=>{
  const encounter=oldEncounter(),values=new Map([['old',legacy],['old-strategie-v1',encounter]]);
  const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const s=loadProgress(storage,'old'),former=JSON.parse(encounter),town=JSON.parse(legacy);
  assert.equal(s.seed,former.seed);assert.equal(s.tick,former.tick);assert.equal(s.teams[0].age,3);
  for(const key of ['ore','crystal'])assert.equal(s.teams[0].bank[key],former.teams[0].bank[key]+town.resources[key]);
  assert.equal(s.teams[0].bank.food,former.teams[0].bank.food+town.resources.bio);
  assert.equal(s.teams[0].bank.water,town.resources.water);
  assert.equal(ready(s,0,'forum').length,1);
  assert.ok(ready(s,0,'hangar').length&&ready(s,0,'beacon').length&&ready(s,0,'house').some(b=>b.level===2));
  assert.deepEqual(s.units.map(u=>u.id),former.units.map(u=>u.id));
  assert.equal(s.campaign.deliveries,town.harvests);assert.ok(values.has(campaignKey('old')));
  assert.equal(values.get('old'),legacy);assert.equal(values.get('old-strategie-v1'),encounter);
  assert.deepEqual(loadProgress(storage,'old').teams[0].bank,s.teams[0].bank);
  const manual=importProgress([encounter,legacy]);
  assert.deepEqual(readCampaign(JSON.stringify(manual)).teams,s.teams);
  assert.equal(mergeLegacy(null,null),null);
  assert.equal(mergeLegacy(null,encounter).seed,former.seed);
  assert.throws(()=>importProgress([legacy,legacy]));
  assert.ok(!s.scenario);
});

test('les missions déjà payées et les kits d’installation sont repris sans deuxième dépense',()=>{
  const old=JSON.parse(legacy),now=150000;
  old.survey={completed:[],active:{site:'flora',origin:old.buildings.find(b=>b.type==='hangar').id,startedAt:now-24000}};
  const s=mergeLegacy(JSON.stringify(old),null,now),bank=s.teams[0].bank;
  assert.ok(s.campaign.rover.loaded);assert.equal(bank.water,old.resources.water);
  until(s,()=>!s.campaign.rover);assert.deepEqual(s.campaign.specimens,['flora']);
  s.campaign.charters.push({type:'wind',level:3});const budget={...bank};
  const cell=atlas(s).cells.find(t=>!buildReason(s,0,'wind',t.cell)).cell;
  const kit=construct(s,0,workers(s),'wind',cell);assert.ok(kit.ok);assert.deepEqual(bank,budget);
  assert.ok(cancelSite(s,0,kit.id).ok);assert.equal(cancelSite(s,0,kit.id).ok,false);
  assert.deepEqual(s.campaign.charters,[{type:'wind',level:3}]);assert.deepEqual(bank,budget);
});

for(const [seed,map,level,reason] of [[93,'delta','calm','forum'],[511,'mesas','fierce','spire']]){
  test('la victoire par '+reason+' pacifie le même monde et ses installations continuent à produire',()=>{
    const s=createCampaign(seed,map,level),brain={lastRaid:0};
    for(let i=0;i<3200&&!s.result&&!s.campaign.peace;i++){if(s.tick%12===0)planSide(s,0,'fierce',brain);tickCampaign(s);}
    assert.equal(s.result,null);assert.equal(s.campaign.peace?.reason,reason);
    assert.equal(unitsOf(s,1).length,0);assert.equal(ready(s,0,'forum').length,1);
    const saved=readCampaign(JSON.stringify(s));assert.ok(saved);
    const before=saved.teams[0].bank.energy, rates=districtRates(saved);
    for(let i=0;i<48;i++)tickCampaign(saved);
    assert.ok(rates.energy>0);assert.ok(saved.teams[0].bank.energy>before);
    assert.equal(saved.seed,seed);assert.equal(saved.tick,s.tick+48);assert.deepEqual(saved.campaign.peace,s.campaign.peace);
  });
}
test('les données de mission et les remboursements importés sont validés avant la reprise',()=>{
  const s=createCampaign(42);build(s,'hangar');launchRover(s,'flora');
  const altered=structuredClone(s);altered.campaign.rover.cargo={fake:80};
  assert.equal(readCampaign(JSON.stringify(altered)),null);
  const hall=ready(s,0,'forum')[0];enqueue(s,0,hall.id,'unit','worker');
  hall.queue[0].paid.food=9999;
  assert.equal(readCampaign(JSON.stringify(s)),null);
  assert.equal(reviseDistrict(s,hall.id).ok,false);
});
