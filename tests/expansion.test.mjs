import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLargeWorld, generateWorld } from '../src/world.js';
import { fresh, worldOf, canPlace, build, harvest, advance, upgrade, upgradeCost, dismantle, salvage, population, rates, research, researchCost, RESEARCH, BUILDINGS, restore, CYCLE } from '../src/engine.js';
import { buildingSymbol } from '../src/scenes.js';

test('100 grands mondes : 961 cases, terre connectée, 56 gisements et surface constructible', () => {
  for(let seed=0;seed<100;seed++) {
    const tiles=generateLargeWorld(seed), map=new Map(tiles.map(t=>[t.id,t]));
    assert.equal(tiles.length,961);assert.deepEqual(tiles,generateLargeWorld(seed));
    assert.ok(tiles.filter(t=>t.terrain!=='water'&&!t.node).length>300);
    for(const node of ['ore','bio','crystal','water'])assert.equal(tiles.filter(t=>t.node===node).length,14);
    const seen=new Set(['5,5']),queue=[map.get('5,5')];
    for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const t=map.get(`${queue[i].x+dx},${queue[i].y+dy}`);
      if(t&&t.terrain!=='water'&&!seen.has(t.id)){seen.add(t.id);queue.push(t);}
    }
    assert.equal(seen.size,tiles.filter(t=>t.terrain!=='water').length);
  }
});

test('Les générateurs v1 et v2 coexistent sans modifier les anciennes constructions', () => {
  const legacy=fresh(10,77);legacy.world.generator=1;
  const t=worldOf(legacy).find(t=>canPlace(legacy,t.id));
  legacy.buildings.push({id:t.id,type:'mine',level:2});
  const loaded=restore(JSON.stringify(legacy),10);
  assert.equal(loaded.world.generator,1);assert.deepEqual(worldOf(loaded),generateWorld(77));
  assert.deepEqual(loaded.buildings,legacy.buildings);
  const large=fresh(10,77);assert.equal(worldOf(large).length,961);
  assert.deepEqual(worldOf(restore(JSON.stringify(large),10)),worldOf(large));
});

test('Nouveaux bâtiments : parcours normal, prérequis, niveaux, logements, remise et démontage', () => {
  let now=100;const s=fresh(now,991);
  const fund=cost=>{
    for(const [key,n] of Object.entries(cost)) {
      let guard=0;
      while(s.resources[key]<n){assert.ok(++guard<1000);now+=CYCLE;advance(s,now);if(key!=='energy')assert.ok(harvest(s,worldOf(s).find(t=>t.node===key).id,now).ok);}
    }
  };
  for(const type of ['wind','residence','hydroponics','quarry','synthesizer','laboratory']) {
    const snapshot=structuredClone(s);assert.equal(build(s,type,worldOf(s).find(t=>canPlace(s,t.id)).id).ok,false);assert.deepEqual(s,snapshot);
  }
  for(const type of ['solar','habitat','pump','greenhouse','mine','wind','residence','hydroponics','quarry','synthesizer','laboratory']) {
    fund(BUILDINGS[type].cost);assert.ok(build(s,type,worldOf(s).find(t=>canPlace(s,t.id)).id).ok);
    assert.ok(buildingSymbol(type).includes('structure'));
  }
  assert.equal(population(s),22);
  assert.deepEqual(rates(s),{ore:11,bio:11,water:5,crystal:4,energy:8});
  const residence=s.buildings.find(b=>b.type==='residence');
  fund(upgradeCost(residence));assert.ok(upgrade(s,residence.id).ok);assert.equal(population(s),34);
  assert.deepEqual(researchCost(s,'optics'),{crystal:27,ore:34,energy:30});
  fund(researchCost(s,'optics'));const before={...s.resources};assert.ok(research(s,'optics').ok);
  assert.equal(s.resources.crystal,before.crystal-27);
  assert.equal(rates(s).energy,10,'optics doubles only the original solar plant');
  const lab=s.buildings.find(b=>b.type==='laboratory');
  assert.ok(dismantle(s,lab.id).ok);assert.deepEqual(researchCost(s,'geology'),RESEARCH.geology.cost);
  assert.equal(rates(s).energy,10,'acquired technologies remain active');
  const restored=restore(JSON.stringify(s),now);assert.deepEqual(restored.buildings,s.buildings);assert.equal(population(restored),34);
  const refund=salvage(residence),saved={...s.resources};assert.ok(dismantle(s,residence.id).ok);assert.equal(population(s),10);
  for(const [key,n] of Object.entries(refund))assert.equal(s.resources[key],Math.min(9999,saved[key]+n));
});
