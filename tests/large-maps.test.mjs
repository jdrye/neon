import assert from 'node:assert/strict';
import test from 'node:test';
import {createCampaign,tickCampaign} from '../src/campaign.js';
import {launchCell,launchRover,missionSite,MISSIONS} from '../src/campaign-rover.js';
import {readCampaign} from '../src/campaign-save.js';
import {atlas,distancesFrom,makeBuilding,makeUnit,orderUnits,populationInfo,routeDistance,unitCell,walkable} from '../src/strategy-engine.js';
import {battlefield,GATHERED,MAPS,MAP_SIZES,mapPoint} from '../src/strategy-rules.js';

test('576 grands bassins reproductibles, deux camps ravitaillés et des liaisons praticables',()=>{
  const seeds=[0,0xffffffff,...Array.from({length:62},(_,i)=>Math.imul(i+1,2654435761)>>>0)];
  for(const size of [45,65,85])for(const region of Object.keys(MAPS))for(const seed of seeds){
    const s=createCampaign(seed,region,'calm',size),board=atlas(s),label=`${size} · ${region} · ${seed}`;
    assert.equal(board.cells.length,size*size,label);
    assert.ok(board.deposits.length>=size*size/27,label);
    assert.equal(board.rival,board.count-1-board.home,label);
    const unique=new Set(board.deposits.map(d=>d.cell));
    assert.equal(unique.size,board.deposits.length,label);
    const deposits=new Map(board.deposits.map(d=>[d.cell,d]));
    for(const d of board.deposits){
      const mirror=deposits.get(board.count-1-d.cell);
      assert.deepEqual([mirror.kind,mirror.amount],[d.kind,d.amount],label);
    }
    for(const side of [0,1]){
      const start=unitCell(s.units.find(u=>u.side===side),size);
      const distance=distancesFrom(s,start);
      assert.ok(distance(board.relay)>=0&&distance(side?board.home:board.rival)>=0,label);
      assert.ok(board.deposits.every(d=>distance(d.cell)>=0),label);
      for(const kind of GATHERED){
        assert.ok(board.deposits.some(d=>d.kind===kind&&s.teams[side].explored[d.cell]&&distance(d.cell)<=8),label);
      }
    }
    const origin=launchCell(s,s.buildings[0]);
    for(const kind of Object.keys(MISSIONS)){
      const target=missionSite(s,kind,origin);
      assert.notEqual(target,null,label+` · ${kind}`);
      assert.ok(routeDistance(s,origin,target)>=0,label);
    }
  }
  const first=battlefield(93,'delta',85);
  for(let seed=20;seed<30;seed++)battlefield(seed,'delta',85);
  assert.deepEqual(battlefield(93,'delta',85),first);
  assert.notDeepEqual(battlefield(94,'delta',85).deposits,first.deposits);
});

test('sur 85 cases, un groupe de 200 unités reçoit des destinations distinctes et traverse la carte',()=>{
  const size=85,s=createCampaign(93,'delta','calm',size),board=atlas(s);
  const start=s.units[0]&&unitCell(s.units[0],size);
  const target=board.relay+10;
  const fighters=Array.from({length:200},()=>makeUnit(s,0,'skimmer',start));
  const ids=new Set(fighters.map(u=>u.id));
  s.units=s.units.filter(u=>u.side!==0||ids.has(u.id));
  s.buildings=s.buildings.filter(b=>b.side===0);
  s.units=fighters;
  s.rev++;
  s.campaign.peace={tick:0,reason:'forum'};
  assert.ok(orderUnits(s,0,[...ids],'move',target).ok);
  assert.equal(new Set(fighters.map(u=>u.order.cell)).size,200);
  const distances=fighters.map(u=>routeDistance(s,start,u.order.cell,0));
  tickCampaign(s);
  assert.ok(fighters.every((u,i)=>u.path.length===distances[i]&&u.path.every(cell=>walkable(s,cell))));
  const save=readCampaign(JSON.stringify(s));
  assert.ok(save&&save.units.length===200);
  for(let i=0;i<250&&save.units.some(u=>u.order.kind==='move');i++)tickCampaign(save);
  assert.ok(save.units.every(u=>u.order.kind==='idle'));
  assert.equal(new Set(save.units.map(u=>unitCell(u,size))).size,200);
});

test('les plafonds dépendent de la carte et le format classique sans taille garde ses coordonnées',()=>{
  for(const size of Object.keys(MAP_SIZES).map(Number)){
    const s=createCampaign(93,'delta','calm',size),board=atlas(s);
    const locations=board.cells.filter(t=>walkable(s,t.cell)).slice(0,50);
    for(const t of locations)makeBuilding(s,0,'house',t.cell,true);
    assert.equal(populationInfo(s,0).cap,MAP_SIZES[size].population);
    const restored=readCampaign(JSON.stringify(s));
    assert.equal(restored.size,size);
    assert.deepEqual(restored.nodes,s.nodes);
    assert.equal(restored.buildings[0].cell,board.home);
    assert.deepEqual(mapPoint(size,board.home),{x:s.units[2].x-1,y:s.units[2].y});
  }
  const legacy=createCampaign(93,'delta','calm',27);
  const classicTerrain=atlas(legacy);
  delete legacy.size;
  assert.equal(readCampaign(JSON.stringify(legacy)).size,27);
  assert.equal(atlas(legacy),classicTerrain);

  const s=createCampaign(93,'delta','calm',85),board=atlas(s);
  const spot=board.cells.find(t=>t.cell>1000&&walkable(s,t.cell)&&s.teams[0].explored[t.cell]);
  makeBuilding(s,0,'hangar',spot.cell,true);
  assert.ok(launchRover(s,'flora').ok);
  const node=s.nodes.find(n=>n.cell>=1000);
  s.command={center:{x:-2300,y:3600},zoom:.18,speed:1,selection:['n'+node.cell],groups:{}};
  tickCampaign(s);
  const loaded=readCampaign(JSON.stringify(s));
  assert.deepEqual(loaded.command,s.command);
  assert.deepEqual(loaded.campaign.rover,s.campaign.rover);
  assert.equal(readCampaign(JSON.stringify({...s,size:27})),null);
  assert.equal(readCampaign(JSON.stringify({...s,size:null})),null);
  s.campaign.rover.path.push(board.count);
  assert.equal(readCampaign(JSON.stringify(s)),null);
});

test('Cendre produit et mène un raid sur chaque taille de carte étendue',()=>{
  const trained=[];
  for(const size of [45,65,85]){
    const s=createCampaign(93,'passes','even',size);
    while(!s.result&&s.tick<1400)tickCampaign(s);
    assert.ok(s.teams[1].age>=2);
    assert.ok(s.ai.lastRaid>0);
    assert.ok(s.campaign.siege>0);
    trained.push(s.teams[1].trained);
  }
  assert.ok(trained[2]>trained[0]);
});
