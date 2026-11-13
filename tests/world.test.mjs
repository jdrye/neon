import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, BIOMES } from '../src/world.js';
import { fresh, worldOf, tileOf, restore, importSave, harvest, build, upgrade, upgradeCost, advance, canPlace, research, RESEARCH, BUILDINGS, WORLD, CYCLE } from '../src/engine.js';
import { renderMap } from '../src/scenes.js';

test('300 graines : terrains connectés, ressources disponibles et espace pour la métropole', () => {
  for(let seed=0;seed<300;seed++) {
    const world=generateWorld(seed);
    assert.deepEqual(world,generateWorld(seed));
    assert.equal(new Set(world.map(t=>t.id)).size,world.length);
    const land=world.filter(t=>t.terrain!=='water');
    const seen=new Set(['5,5']), queue=['5,5'];
    for(let i=0;i<queue.length;i++) {
      const t=land.find(t=>t.id===queue[i]); assert.ok(t);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const next=land.find(v=>v.x===t.x+dx&&v.y===t.y+dy);
        if(next&&!seen.has(next.id)){seen.add(next.id);queue.push(next.id);}
      }
    }
    assert.equal(seen.size,land.length);
    for(const resource of ['ore','crystal','bio','water']) assert.equal(world.filter(t=>t.node===resource).length,5);
    assert.ok(land.filter(t=>!t.node).length>=50);
    for(const t of world.filter(t=>Math.max(Math.abs(t.x-5),Math.abs(t.y-5))<=1)) {
      assert.notEqual(t.terrain,'water');assert.equal(t.node,null);
    }
  }
  assert.notDeepEqual(generateWorld(42),generateWorld(43));
});

test('Carte et constructions identiques après sauvegarde/import ; anciennes cartes préservées', () => {
  for(const biome of Object.keys(BIOMES)) {
    const s=fresh(100,4294967295,biome);
    s.resources.ore=50;s.resources.crystal=50;
    const target=worldOf(s).find(t=>canPlace(s,t.id)).id;
    assert.ok(build(s,'solar',target).ok);
    const raw=JSON.stringify(s), copy=importSave(raw,100);
    assert.deepEqual(worldOf(copy),worldOf(s));
    assert.deepEqual(copy.buildings,s.buildings);
    assert.equal(tileOf(copy,target).terrain,tileOf(s,target).terrain);
    assert.equal(harvest(copy,worldOf(copy).find(t=>t.node==='ore').id,200).ok,true);
  }
  const old=fresh(100,null);delete old.world;
  old.buildings.push({id:'4,5',type:'solar',level:3});
  const restored=restore(JSON.stringify(old),100);
  assert.deepEqual(worldOf(restored),WORLD);assert.deepEqual(restored.buildings,old.buildings);
  for(const world of [{seed:1,generator:2,biome:'emerald'},{seed:-1,generator:1,biome:'emerald'},{seed:1,generator:1,biome:'__proto__'}]) {
    assert.throws(()=>importSave(JSON.stringify({...old,world})));
  }
});

test('Trois mondes jouables jusqu’à la métropole sans injection de ressources', () => {
  for(const [index,biome] of Object.keys(BIOMES).entries()) {
    let now=100;
    const s=fresh(now,8100+index,biome);
    const fund=cost=>{
      for(const [key,n] of Object.entries(cost)) {
        let guard=0;
        while(s.resources[key]<n) {
          assert.ok(++guard<1000);
          now+=CYCLE;advance(s,now);
          if(key!=='energy')assert.ok(harvest(s,worldOf(s).find(t=>t.node===key).id,now).ok);
        }
      }
    };
    const place=type=>{fund(BUILDINGS[type].cost);assert.ok(build(s,type,worldOf(s).find(t=>canPlace(s,t.id)).id).ok);};
    for(const type of ['solar','habitat','pump','greenhouse','mine','beacon'])place(type);
    for(const [key,def] of Object.entries(RESEARCH)){fund(def.cost);assert.ok(research(s,key).ok);}
    for(let i=0;i<7;i++)place('habitat');
    for(const b of s.buildings.filter(b=>BUILDINGS[b.type].max===3).slice(0,4))while(b.level<3){fund(upgradeCost(b));assert.ok(upgrade(s,b.id).ok);}
    assert.deepEqual([...s.claimed].sort(),[0,1,2,3,4,5,6]);
  }
});

test('Le rendu utilise la carte sauvegardée et les emplacements constructibles', () => {
  const s=fresh(0,17,'amber');
  const normal=renderMap(s);
  for(const t of worldOf(s).filter(t=>t.node))assert.ok(normal.includes(`data-node="${t.id}"`));
  const placement=renderMap(s,{placing:'solar'});
  for(const t of worldOf(s))assert.equal(placement.includes(`data-tile="${t.id}"`),canPlace(s,t.id));
  assert.ok(normal.includes(BIOMES.amber.grass[0]));
  assert.notEqual(normal,renderMap(fresh(0,18,'boreal')));
});

test('Le générateur v1 reste stable pour les sauvegardes existantes', async () => {
  const { createHash } = await import('node:crypto');
  assert.equal(createHash('sha256').update(JSON.stringify(generateWorld(98137))).digest('hex'), 'c3031594f8a9248209167cab5cc3b1ce4865bac83310439ae5eafcaeef1cdf98');
  const s = fresh(0, 17);
  const preview = renderMap(s, { idPrefix: 'preview' });
  assert.ok(preview.includes('id="preview-ocean-light"'));
  assert.ok(preview.includes('url(#preview-mist)'));
  assert.ok(!preview.includes('id="world-ocean-light"'));
});
