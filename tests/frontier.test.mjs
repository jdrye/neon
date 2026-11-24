import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, CYCLE, advance, assignCrew, build, canPlace, colonySites, crewCapacity, decideCouncil, dismantle, dockRover, driveRover, fieldState, finishSurvey, fresh, harvest, importSave, openTraverse, rates, relocate, restore, startSurvey, worldOf } from '../src/engine.js';
import { CHAPTERS, HOME, RIGS, canScan, distance, maneuver, neighbors, radarCost, replay, returnRoute, sector, travelCost } from '../src/frontier.js';

function landRoute(board, start, target, accept = t => t.terrain === 'plain') {
  const queue = [start], via = new Map([[start,null]]);
  for (const cell of queue) {
    if (cell === target) break;
    for (const id of neighbors[cell]) if (!via.has(id) && accept(board.tiles[id])) { via.set(id,cell); queue.push(id); }
  }
  if (!via.has(target)) return null;
  const path = [];
  for (let at=target; at!==start; at=via.get(at)) path.push(at);
  return path.reverse();
}
function expedition(seed = 22, biome = 'emerald') {
  const s = fresh(30_000,seed,biome);
  let now = s.lastTick;
  function fund(cost) {
    for (const [key,n] of Object.entries(cost)) {
      for (let attempts=0; s.resources[key]<n; attempts++) {
        assert.ok(attempts<200,`Économie bloquée pour ${key}`); now+=CYCLE; advance(s,now);
        if (key!=='energy') assert.ok(harvest(s,worldOf(s).find(t=>t.node===key).id,now).ok);
      }
    }
  }
  function place(type) {
    fund(BUILDINGS[type].cost);
    const id=worldOf(s).find(t=>canPlace(s,t.id)).id;
    assert.ok(build(s,type,id).ok); return id;
  }
  function signal(rig) {
    fund(RIGS[rig].cost); assert.ok(openTraverse(s,rig).ok);
    const field=fieldState(s), path=landRoute(field.board,HOME,field.board.target);
    for (const id of path) assert.ok(driveRover(s,id).ok);
    assert.ok(fieldState(s).drive.signal); assert.equal(dockRover(s).ok,false);
    for (const id of [...path.slice(0,-1).reverse(),HOME]) assert.ok(driveRover(s,id).ok);
    assert.ok(dockRover(s).ok); assert.equal(dockRover(s).ok,false);
  }
  return {s,place,fund,signal};
}

test('300 secteurs reproductibles avec un aller-retour abordable pour les trois châssis, un objectif et des bornes accessibles', () => {
  const layouts=new Set();
  for (let n=1;n<=300;n++) {
    const world={seed:Math.imul(n,0x423d)>>>0,biome:['amber','boreal','emerald'][n%3]};
    const board=sector(world,n), route=landRoute(board,HOME,board.target);
    assert.ok(route && route.length>=5 && route.length<=6);
    assert.equal(board.tiles.filter(t=>t.feature==='cache').length,2);
    for (const t of board.tiles.filter(t=>t.feature)) assert.ok(landRoute(board,HOME,t.id,x=>x.terrain!=='rift'));
    assert.deepEqual(board.tiles,sector({...world},n).tiles);
    for (const rig of Object.keys(RIGS)) for (const surge of [false,true]) {
      const active={rig,perks:[],surge,steps:[]}, drive=replay(board,active);
      for (const id of [...route,...route.slice(0,-1).reverse(),HOME]) { assert.ok(maneuver(board,drive,id).ok); active.steps.push(id); }
      assert.ok(drive.signal); assert.equal(drive.at,HOME); assert.ok(drive.fuel>=0); assert.deepEqual(drive,replay(board,active));
    }
    layouts.add(board.tiles.map(t=>`${t.terrain}/${t.feature}`).join());
  }
  assert.equal(layouts.size,300);
});

test('La marée, le radar et le retour tracé utilisent les mêmes règles que le pilotage', () => {
  const board=sector({seed:145,biome:'emerald'},1), flat=board.tiles.find(t=>t.terrain==='flat');
  assert.ok(flat); const drive=replay(board,{rig:'scout',perks:['passage'],steps:[]});
  assert.equal(travelCost(drive,flat,2),1); assert.equal(travelCost(drive,flat,3),3);
  assert.ok(canScan(drive)); assert.equal(radarCost(drive),0); assert.ok(maneuver(board,drive,'scan').ok);
  assert.equal(drive.fuel,15); assert.equal(drive.turn,1); assert.equal(radarCost(drive),1);
  assert.equal(canScan(drive),false); const snapshot=structuredClone(drive);
  for (const bad of [board.target,-2,99,'foo',{},'scan']) assert.equal(maneuver(board,drive,bad).ok,false);
  assert.deepEqual(drive,snapshot);
  for (const id of landRoute(board,HOME,board.target)) assert.ok(maneuver(board,drive,id).ok);
  const route=returnRoute(board,drive); assert.ok(route.cost<=drive.fuel);
  const before=drive.fuel;
  for (const id of route.path) assert.ok(maneuver(board,drive,id===drive.at?'wait':id).ok);
  assert.equal(drive.at,HOME); assert.ok(before-drive.fuel<=route.cost);
  const empty=structuredClone(drive); empty.fuel=0; assert.equal(maneuver(board,empty,'wait').ok,false);
});

test('Châssis, filons et recharges : chaque prélèvement et chaque borne sont utilisables une fois par sortie', () => {
  const board=sector({seed:44,biome:'amber'},1);
  const ore=board.tiles.find(t=>t.feature==='ore' && distance(t.id,HOME)<=3);
  const path=landRoute(board,HOME,ore.id,t=>t.terrain!=='rift');
  for (const [rig,expected] of [['hauler',22],['crawler',11],['scout',11]]) {
    const drive=replay(board,{rig,perks:['assay','cells'],steps:[]});
    assert.equal(drive.max,RIGS[rig].battery+3);
    assert.equal(travelCost(drive,{terrain:'rock'}),rig==='crawler'?1:2);
    for (const id of path) assert.ok(maneuver(board,drive,id).ok);
    const collected=drive.cargo.ore; assert.ok(collected>=expected);
    for (const id of [path.at(-2)??HOME,ore.id]) assert.ok(maneuver(board,drive,id).ok);
    assert.equal(drive.cargo.ore,collected);
  }
  const base=replay(board,{rig:'scout',perks:[],steps:[]});
  const cache=board.tiles.filter(t=>t.feature==='cache').sort((a,b)=>distance(HOME,a.id)-distance(HOME,b.id))[0];
  const toCache=landRoute(board,HOME,cache.id,t=>t.terrain!=='rift');
  for (const id of toCache) assert.ok(maneuver(board,base,id).ok);
  const charge=base.fuel;
  for (const id of [toCache.at(-2)??HOME,cache.id]) assert.ok(maneuver(board,base,id).ok);
  assert.ok(base.fuel<charge);
});

test('Conseils opposés et deux épilogues atteignables depuis le premier prélèvement, sans créditer de ressources de test', () => {
  for (const [world,choices] of [[null,['cells','assay','passage']],[927,['guild','ecology','hearth']]]) {
    const {s,place,fund,signal}=expedition(world);
    assert.equal(openTraverse(s,'scout').ok,false);
    place('solar'); place('hangar'); place('habitat'); place('greenhouse'); place('beacon');
    for (let i=0;i<3;i++) {
      assert.ok(!decideCouncil(s,choices[i]).ok); signal(Object.keys(RIGS)[i]);
      fund(CHAPTERS[i].options[choices[i]].cost); assert.ok(decideCouncil(s,choices[i]).ok);
      assert.ok(!decideCouncil(s,Object.keys(CHAPTERS[i].options).find(k=>k!==choices[i])).ok);
      assert.deepEqual(importSave(JSON.stringify(s),s.lastTick).frontier,s.frontier);
    }
    const rate=rates(s); place('lighthouse'); assert.equal(rates(s).energy,rate.energy+5);
    assert.ok(!build(s,'lighthouse',worldOf(s).find(t=>canPlace(s,t.id)).id).ok);
    signal('scout'); assert.equal(s.frontier.signals,4); assert.equal(s.frontier.decisions.length,3);
  }
});

test('Reprise, exclusion des deux missions, rappel et crédits uniques', () => {
  const {s,place,fund}=expedition(); place('solar'); const hangar=place('hangar'); fund({water:25,energy:20});
  assert.ok(startSurvey(s,'flora',0).ok); assert.ok(!openTraverse(s,'scout').ok); assert.ok(finishSurvey(s,30_000).ok);
  const before={...s.resources}; assert.ok(openTraverse(s,'scout').ok); assert.equal(s.resources.energy,before.energy-3);
  assert.ok(!openTraverse(s,'hauler').ok); assert.ok(!startSurvey(s,'flora').ok); assert.ok(!startSurvey(s,'prism').ok);
  const {board}=fieldState(s); const path=landRoute(board,HOME,board.target);
  for (const id of path) assert.ok(driveRover(s,id).ok);
  assert.ok(dismantle(s,hangar).ok);
  const resumed=restore(JSON.stringify(s),s.lastTick+15*60_000); advance(resumed,s.lastTick+15*60_000);
  assert.deepEqual(fieldState(resumed).drive,fieldState(s).drive);
  const preRecall={...resumed.resources}; assert.ok(dockRover(resumed,true).ok);
  assert.deepEqual(resumed.resources,preRecall); assert.equal(resumed.frontier.signals,0);
  assert.equal(resumed.frontier.orders,0); assert.ok(!dockRover(resumed,true).ok);
});

test('Mandats facultatifs : la prime exige le déchargement au camp et peut se gagner sans signal', () => {
  const {s,place,fund}=expedition(983,'amber'); place('solar'); place('hangar'); fund(RIGS.hauler.cost);
  assert.ok(openTraverse(s,'hauler').ok); const {board}=fieldState(s); assert.match(board.order.name,/fonderie/);
  const veins=board.tiles.filter(t=>t.feature==='ore');
  const path=veins.map(t=>landRoute(board,HOME,t.id,x=>x.terrain!=='rift')).sort((a,b)=>a.length-b.length)[0];
  for (const id of [...path,...path.slice(0,-1).reverse(),HOME]) assert.ok(driveRover(s,id).ok);
  const before=s.resources.energy; assert.ok(dockRover(s).ok); assert.equal(s.frontier.signals,0); assert.equal(s.frontier.orders,1);
  assert.equal(s.resources.energy,before+14); assert.deepEqual(restore(JSON.stringify(s),s.lastTick).frontier,s.frontier);
  assert.ok(!dockRover(s).ok); assert.equal(s.resources.energy,before+14);
});

test('Équipes limitées : terrain, atelier voisin, choix du conseil, mobilité et production hors ligne', () => {
  const s=fresh(0,null); s.buildings.push({type:'mine',id:'4,9',level:1},{type:'solar',id:'4,8',level:1});
  // 5,9 is a natural ore deposit on the historical map.
  const info=colonySites(s)('mine','4,9'); assert.ok(info.terrain && info.partner); assert.equal(info.total,5);
  const original=rates(s); assert.equal(crewCapacity(s),1); assert.ok(assignCrew(s,'4,9',true).ok);
  assert.equal(rates(s).ore,original.ore+5); assert.ok(!assignCrew(s,'4,8',true).ok);
  s.frontier.sorties=3; s.frontier.signals=3; s.frontier.decisions=['guild','ecology','hearth'];
  assert.equal(crewCapacity(s),2); assert.ok(assignCrew(s,'4,8',true).ok); assert.equal(rates(s).ore,original.ore+8);
  const stock=s.resources.ore; advance(s,180_000); assert.equal(s.resources.ore,stock+15*rates(s).ore);
  assert.ok(relocate(s,'4,9','5,6').ok); assert.deepEqual(s.crews,['5,6','4,8']); assert.equal(rates(s).ore,original.ore+2);
  assert.ok(dismantle(s,'4,8').ok); assert.deepEqual(s.crews,['5,6']); assert.ok(assignCrew(s,'5,6',false).ok);
  assert.equal(rates(s).ore,original.ore);
});

test('Une réduction de logements suspend les dernières équipes puis les réactive, y compris après rechargement', () => {
  const s=fresh(0,null); s.buildings.push({type:'habitat',id:'4,5',level:1},{type:'mine',id:'6,5',level:1},{type:'pump',id:'5,6',level:1});
  assert.ok(assignCrew(s,'6,5',true).ok); assert.ok(assignCrew(s,'5,6',true).ok); const staffed=rates(s).water;
  assert.ok(dismantle(s,'4,5').ok); assert.equal(rates(s).water,3); assert.deepEqual(restore(JSON.stringify(s),0).crews,s.crews);
  s.buildings.push({type:'habitat',id:'4,5',level:1}); assert.equal(rates(s).water,staffed);
});

test('Anciennes colonies et itinéraires altérés : les données incompatibles restent isolées', () => {
  const raw=fresh(0,null); delete raw.frontier; delete raw.crews; raw.resources.ore=73;
  const old=importSave(JSON.stringify(raw),0); assert.equal(old.resources.ore,73); assert.equal(old.frontier.active,null); assert.deepEqual(old.crews,[]);
  raw.frontier={sorties:4,signals:2,orders:999,decisions:['guild','passage'],active:{rig:'hauler',perks:['cells','assay'],steps:['wait',{toString:0},'scan']}};
  raw.crews=['5,5','9,99','constructor']; const clean=restore(JSON.stringify(raw),0);
  assert.equal(clean.resources.ore,73); assert.deepEqual(clean.frontier.decisions,['guild']); assert.deepEqual(clean.frontier.active,{rig:'hauler',perks:[],surge:false,steps:['wait']}); assert.deepEqual(clean.crews,[]);
});


test('Vives-eaux facultatives : déblocage, prévisions, reprise et prime réservée au retour du signal', () => {
  const {s,place,fund,signal}=expedition(192); place('solar'); place('hangar'); fund(RIGS.scout.cost);
  const stock={...s.resources}; assert.equal(openTraverse(s,'scout',true).ok,false); assert.deepEqual(s.resources,stock);
  signal('scout'); fund(RIGS.scout.cost); assert.ok(openTraverse(s,'scout',true).ok);
  const {board,drive}=fieldState(s); assert.equal(drive.max,14); assert.equal(drive.sight,1);
  assert.equal(travelCost(drive,{terrain:'flat'},2),4); assert.equal(travelCost(drive,{terrain:'flat'},1),1);
  const route=landRoute(board,HOME,board.target);
  for (const id of route) assert.ok(driveRover(s,id).ok);
  const loaded=restore(JSON.stringify(s),s.lastTick); assert.deepEqual(fieldState(loaded).drive,fieldState(s).drive);
  for (const id of [...route.slice(0,-1).reverse(),HOME]) assert.ok(driveRover(loaded,id).ok);
  const energy=loaded.resources.energy; assert.ok(dockRover(loaded).ok); assert.equal(loaded.frontier.surgeWins,1);
  assert.equal(loaded.resources.energy,energy+8+(loaded.frontier.last.order?(board.order.reward.energy||0):0));
  assert.equal(restore(JSON.stringify(loaded),s.lastTick).frontier.last.surge,true);
});
