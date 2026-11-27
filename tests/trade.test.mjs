import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,tickCampaign} from '../src/campaign.js?v=8.3.0';
import {readCampaign} from '../src/campaign-save.js?v=8.3.0';
import {planSide} from '../src/strategy-ai.js?v=8.3.0';
import {atlas,buildReason,construct,enqueue,makeUnit,orderUnits,unitCell,unitsOf,walkable} from '../src/strategy-engine.js?v=8.3.0';
import {mapDistance} from '../src/strategy-rules.js?v=8.3.0';
import {charter,knownPost,proceeds,recallCaravan,scoutPost} from '../src/trade.js?v=8.3.0';

function until(s,check,limit=600){
  for(let i=0;i<limit&&!check()&&!s.result;i++)tickCampaign(s);
  assert.ok(check(),'L’objectif doit être atteint avant la fin du délai');
}
function establish() {
  const s=createCampaign(93,'delta','calm',45);
  s.teams[0].age=2;
  const target=atlas(s).cells.filter(t=>!buildReason(s,0,'market',t.cell))
    .sort((a,b)=>mapDistance(s.size,a.cell,atlas(s).home)-mapDistance(s.size,b.cell,atlas(s).home))[0].cell;
  const site=construct(s,0,unitsOf(s,0,'worker').map(u=>u.id),'market',target);
  assert.ok(site.ok);const hall=s.buildings.find(b=>b.id===site.id);
  assert.ok(scoutPost(s,0,0).ok);
  until(s,()=>hall.ready&&knownPost(s,0,0));
  assert.ok(enqueue(s,0,hall.id,'unit','caravan').ok);
  until(s,()=>unitsOf(s,0,'caravan').length===1);
  const u=unitsOf(s,0,'caravan')[0];return {s,hall,u,bank:s.teams[0].bank};
}

test('deux comptoirs reconnaissables et réservés dans chacun des douze bassins',()=>{
  for(const size of [27,45,65,85])for(const region of ['delta','mesas','passes']){
    const s=createCampaign(93,region,'calm',size),posts=s.campaign.trade.posts;
    assert.equal(new Set(posts).size,2);
    assert.deepEqual(createCampaign(93,region,'calm',size).campaign.trade.posts,posts);
    const u=makeUnit(s,0,'caravan',unitCell(s.units[0],size));
    assert.ok(!knownPost(s,0,0));assert.equal(charter(s,0,u.id,0,'ore').ok,false);
    for(const i of [0,1]){
      assert.ok(scoutPost(s,0,i).ok);
      until(s,()=>knownPost(s,0,i));
      assert.match(buildReason(s,0,'house',posts[i]),/comptoir/);
    }
  }
});

test('la halle forme un convoi qui paie au départ et livre au retour, y compris après rechargement',()=>{
  const {s,u,hall,bank}=establish(),before={...bank};
  assert.ok(charter(s,0,u.id,0,'ore').ok);assert.equal(bank.food,before.food);
  until(s,()=>u.order.phase==='out');assert.equal(bank.food,before.food-12);
  assert.equal(orderUnits(s,0,[u.id],'stop').ok,false);
  until(s,()=>u.order.phase==='back');assert.equal(bank.ore,before.ore);
  const resume=readCampaign(JSON.stringify(s)),v=unitsOf(resume,0,'caravan')[0];
  const credit=proceeds(resume,hall.cell,0,'ore');assert.ok(recallCaravan(resume,0,v.id).ok);
  until(resume,()=>v.order.kind==='idle');
  assert.equal(resume.teams[0].bank.ore,before.ore+credit);
  for(let i=0;i<30;i++)tickCampaign(resume);
  assert.equal(resume.campaign.trade.deliveries[0],1);assert.equal(resume.teams[0].bank.food,before.food-12);
  assert.equal(recallCaravan(resume,0,v.id).ok,false);
});

test('le manque de provisions suspend les départs et un rappel restitue le chargement une seule fois',()=>{
  const {s,u,bank}=establish();bank.wood=3;
  assert.ok(charter(s,0,u.id,0,'crystal').ok);
  for(let i=0;i<70;i++)tickCampaign(s);assert.equal(u.order.phase,'load');assert.equal(bank.wood,3);
  bank.wood=10;until(s,()=>u.order.phase==='out');assert.equal(bank.wood,0);
  for(let i=0;i<5;i++)tickCampaign(s);
  assert.ok(recallCaravan(s,0,u.id).ok);assert.equal(recallCaravan(s,0,u.id).ok,false);
  until(s,()=>u.order.kind==='idle');assert.equal(bank.wood,10);assert.equal(s.campaign.trade.deliveries[0],0);
  assert.ok(charter(s,0,u.id,0,'crystal').ok);until(s,()=>s.campaign.trade.deliveries[0]===1);
  for(let i=0;i<30;i++)tickCampaign(s);assert.equal(bank.wood,0);assert.equal(u.order.phase,'load');
});

test('la perte de la halle déroute le retour vers le forum, la perte du convoi coûte la cargaison',()=>{
  const {s,u,hall,bank}=establish(),ore=bank.ore;
  assert.ok(charter(s,0,u.id,0,'ore').ok);until(s,()=>u.order.phase==='back');
  const lost=readCampaign(JSON.stringify(s)),v=unitsOf(lost,0,'caravan')[0];
  v.hp=0;tickCampaign(lost);for(let i=0;i<50;i++)tickCampaign(lost);
  assert.equal(lost.teams[0].bank.ore,ore);assert.equal(lost.campaign.trade.deliveries[0],0);
  hall.hp=0;until(s,()=>u.order.kind==='idle');
  assert.ok(mapDistance(s.size,unitCell(u,s.size),atlas(s).home)<2);
  assert.equal(bank.ore,ore+proceeds(s,hall.cell,0,'ore'));assert.equal(s.campaign.trade.deliveries[0],1);
});

test('une escorte défend le convoi et une patrouille reprend sa ronde après sauvegarde',()=>{
  const {s,u}=establish();const base=unitCell(u,s.size),g=makeUnit(s,0,'guard',base);
  assert.ok(orderUnits(s,0,[g.id],'escort',null,u.id).ok);
  assert.equal(orderUnits(s,0,[u.id],'escort',null,g.id).ok,false);
  assert.ok(charter(s,0,u.id,0,'ore').ok);until(s,()=>u.order.phase==='back');
  assert.ok(mapDistance(s.size,unitCell(g,s.size),unitCell(u,s.size))<5);
  const rival=makeUnit(s,1,'skimmer',unitCell(u,s.size));const hp=rival.hp;
  until(s,()=>rival.hp<hp);assert.equal(g.order.kind,'escort');
  rival.hp=0;u.hp=0;tickCampaign(s);tickCampaign(s);
  assert.equal(g.order.kind,'idle');
  const origin=unitCell(g,s.size),goal=atlas(s).cells.find(t=>walkable(s,t.cell)&&mapDistance(s.size,t.cell,origin)>3&&mapDistance(s.size,t.cell,origin)<5).cell;
  assert.ok(orderUnits(s,0,[g.id],'patrol',goal).ok);
  const end=g.order.cell;until(s,()=>g.order.other===end);
  const loaded=readCampaign(JSON.stringify(s)),guard=unitsOf(loaded,0,'guard')[0];
  until(loaded,()=>guard.order.other===origin);assert.equal(guard.order.cell,end);
  const bad=structuredClone(loaded);bad.units.find(e=>e.id===guard.id).order.other=s.size*s.size;
  assert.equal(readCampaign(JSON.stringify(bad)),null);
});

test('les archives 8.1 reprennent leurs chantiers et les contrats invalides sont refusés',()=>{
  const {s,u}=establish();
  const old=createCampaign(18,'passes','even',65),tile=atlas(old).cells.find(t=>!buildReason(old,0,'house',t.cell));
  const house=construct(old,0,unitsOf(old,0,'worker').map(w=>w.id),'house',tile.cell);
  tickCampaign(old);delete old.campaign.trade;
  const loaded=readCampaign(JSON.stringify(old));
  assert.equal(loaded.tick,old.tick);assert.equal(loaded.size,65);
  assert.deepEqual(loaded.buildings.find(b=>b.id===house.id),old.buildings.find(b=>b.id===house.id));
  assert.equal(loaded.campaign.trade.posts.length,2);
  assert.ok(charter(s,0,u.id,0,'ore').ok);
  for(const update of [
    d=>{d.units.find(v=>v.id===u.id).order.good='energy';},
    d=>{d.campaign.trade.posts[0]=atlas(s).relay;},
    d=>{d.campaign.trade.deliveries[0]=-1;},
    d=>{delete d.campaign.trade;},
  ]){const d=structuredClone(s);update(d);assert.equal(readCampaign(JSON.stringify(d)),null);}
});

test('Cendre et Aurore financent les deux routes et engagent des escortes dans une partie ordinaire',()=>{
  const s=createCampaign(94,'delta','calm',45),brain={lastRaid:0};
  const escorts=[false,false];
  for(let i=0;i<2500&&!s.result&&!s.campaign.peace&&!s.campaign.trade.deliveries.every(n=>n>0);i++){
    if(s.tick%12===0)planSide(s,0,'even',brain);
    tickCampaign(s);
    for(const u of s.units)if(u.order.kind==='escort')escorts[u.side]=true;
  }
  assert.ok(s.campaign.trade.deliveries.every(n=>n>0),JSON.stringify(s.campaign.trade.deliveries));
  assert.ok(escorts.some(Boolean));assert.ok(readCampaign(JSON.stringify(s)));
});
