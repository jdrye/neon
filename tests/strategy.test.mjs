import test from 'node:test';
import assert from 'node:assert/strict';
import {DT, HOME, MID, RIVAL, SIDE, STRUCTURES, UNITS, tileDistance} from '../src/strategy-rules.js';
import {
  atlas, buildReason, cancelJob, cancelSite, construct, createMatch, enqueue, nearestSource,
  orderUnits, populationInfo, ready, refreshVision, routeDistance, setRally, tickSimulation, unitCell, unitsOf, vision,
} from '../src/strategy-engine.js';
import {planSide, tickMatch} from '../src/strategy-ai.js';
import {readMatch} from '../src/strategy-save.js';

const teamWorkers = s => unitsOf(s, 0, 'worker');
const keys = units => units.map(u => u.id);
const forum = s => ready(s, 0, 'forum')[0];
function until(state, predicate, limit = 160, advance = tickSimulation) {
  for (let i = 0; i < limit && !predicate(); i++) advance(state);
  assert.ok(predicate(), 'Condition attendue au tour ' + state.tick);
}
function plot(s, type) {
  return atlas(s).cells.filter(c => !buildReason(s, 0, type, c.cell))
    .sort((a, b) => tileDistance(HOME, a.cell) - tileDistance(HOME, b.cell))[0].cell;
}

test('192 champs de bataille reproductibles, avec des accès aux ressources, au relais et aux deux forums', () => {
  const fingerprints = new Set();
  for (const region of ['delta', 'passes', 'mesas']) {
    for (let i = 0; i < 64; i++) {
      const seed = (i * 2654435761) >>> 0;
      const s = createMatch(seed, region);
      const start = unitCell(teamWorkers(s)[0]);
      const map = atlas(s);
      assert.equal(map.cells.length, SIDE ** 2);
      assert.deepEqual(map.deposits, atlas(createMatch(seed, region)).deposits);
      for (const n of map.deposits) {
        assert.ok(map.deposits.some(other => other.cell === SIDE ** 2 - 1 - n.cell && other.kind === n.kind && other.amount === n.amount));
      }
      const local = s.nodes.filter(n => tileDistance(HOME, n.cell) < 4.4);
      assert.equal(new Set(local.map(n => n.kind)).size, 4);
      for (const cell of [MID, RIVAL, ...local.map(n => n.cell)]) assert.ok(routeDistance(s, start, cell) >= 0, `${region}, carte ${seed}, case ${cell}`);
      fingerprints.add(map.deposits.map(n => n.cell).join(',') + '/' + region);
      assert.deepEqual(s.teams[0].bank, s.teams[1].bank);
    }
  }
  assert.ok(fingerprints.size >= 185);
});

test('les pionniers transportent réellement les cargaisons et déposent une ressource avant de changer de collecte', () => {
  const s = createMatch(13);
  const worker = teamWorkers(s).find(u => u.order.kind === 'idle');
  const crystal = nearestSource(s, 0, unitCell(worker), 'crystal');
  const node = s.nodes.find(n => n.cell === crystal);
  const stock = s.teams[0].bank.crystal, initial = node.left;
  assert.ok(orderUnits(s, 0, [worker.id], 'gather', crystal).ok);
  until(s, () => worker.cargo?.n === 6);
  assert.equal(node.left, initial - 6);
  assert.equal(s.teams[0].bank.crystal, stock);
  const wood = nearestSource(s, 0, unitCell(worker), 'wood');
  assert.ok(orderUnits(s, 0, [worker.id], 'gather', wood).ok);
  until(s, () => s.teams[0].bank.crystal > stock);
  assert.equal(s.teams[0].bank.crystal, stock + 6);
  assert.equal(node.left, initial - 6);
  assert.ok(tileDistance(unitCell(worker), HOME) <= 1.45);
  until(s, () => worker.cargo?.kind === 'wood');
});

test('les chantiers occupent le terrain, plusieurs bâtisseurs gagnent du temps et une annulation rembourse une seule fois', () => {
  function buildWith(n) {
    const s = createMatch(42);
    const workers = teamWorkers(s);
    const site = plot(s, 'barracks');
    const bank = {...s.teams[0].bank};
    assert.equal(construct(s, 0, keys(workers), 'barracks', HOME).ok, false);
    assert.deepEqual(s.teams[0].bank, bank);
    const r = construct(s, 0, keys(workers.slice(0,n)), 'barracks', site);
    assert.ok(r.ok);
    const b = s.buildings.find(b => b.id === r.id);
    assert.equal(s.teams[0].bank.wood, bank.wood - STRUCTURES.barracks.cost.wood);
    assert.equal(construct(s, 0, keys(workers), 'house', site).ok, false);
    assert.equal(enqueue(s, 0, b.id, 'unit', 'guard').ok, false);
    until(s, () => b.work > 3);
    const backup = readMatch(JSON.stringify(s));
    assert.ok(backup);
    const wood = backup.teams[0].bank.wood;
    assert.ok(cancelSite(backup, 0, r.id).ok);
    const returned = Math.floor(STRUCTURES.barracks.cost.wood * (1 - b.work / STRUCTURES.barracks.time));
    assert.equal(backup.teams[0].bank.wood, wood + returned);
    assert.ok(backup.units.every(u => u.order.target !== r.id));
    assert.equal(cancelSite(backup, 0, r.id).ok, false);
    until(s, () => b.ready);
    return s.tick;
  }
  assert.ok(buildWith(4) < buildWith(1));
});

test('la file réserve le logement et les ressources, respecte les prérequis et rallie les recrues', () => {
  const s = createMatch(18), hall = forum(s);
  const bank = {...s.teams[0].bank};
  assert.equal(enqueue(s, 0, hall.id, 'age', 2).ok, false);
  assert.equal(enqueue(s, 0, hall.id, 'unit', 'watcher').ok, false);
  assert.deepEqual(s.teams[0].bank, bank);
  assert.ok(setRally(s, 0, hall.id, unitCell(teamWorkers(s)[0])).ok);
  assert.equal(setRally(s, 0, hall.id, HOME).ok, false);
  assert.ok(enqueue(s, 0, hall.id, 'unit', 'worker').ok);
  assert.ok(enqueue(s, 0, hall.id, 'unit', 'worker').ok);
  assert.equal(s.teams[0].bank.food, 100 - 2 * UNITS.worker.cost.food);
  assert.deepEqual(populationInfo(s, 0), {used:6, reserved:2, cap:10});
  assert.ok(cancelJob(s, 0, hall.id, 1).ok);
  assert.equal(cancelJob(s, 0, hall.id, 1).ok, false);
  assert.equal(s.teams[0].bank.food, 100 - UNITS.worker.cost.food);
  until(s, () => s.teams[0].trained === 1);
  assert.deepEqual(populationInfo(s, 0), {used:7, reserved:0, cap:10});
  const recruit = teamWorkers(s).at(-1);
  assert.equal(recruit.order.cell, hall.rally);
  assert.ok(tileDistance(HOME, unitCell(recruit)) <= 1.45);
  while (s.teams[0].trained < 4) {
    until(s, () => s.teams[0].bank.food >= UNITS.worker.cost.food, 550);
    assert.ok(enqueue(s, 0, hall.id, 'unit', 'worker').ok);
    until(s, () => !hall.queue.length);
  }
  assert.equal(populationInfo(s, 0).used, 10);
  assert.match(enqueue(s, 0, hall.id, 'unit', 'worker').message, /habitat/);
});

test('exploration, groupes, capture du relais et revenu territorial', () => {
  const s = createMatch(32, 'passes');
  const scout = unitsOf(s, 0, 'skimmer')[0], enemy = ready(s, 1, 'forum')[0];
  assert.equal(vision(s, 0)[RIVAL], 0);
  assert.equal(orderUnits(s, 0, [scout.id], 'attack', null, enemy.id).ok, false);
  assert.equal(orderUnits(s, 0, [enemy.id], 'move', MID).ok, false);
  const group = teamWorkers(s).slice(0, 3);
  assert.ok(orderUnits(s, 0, keys(group), 'move', HOME).ok);
  assert.equal(new Set(group.map(u => u.order.cell)).size, group.length);
  assert.ok(orderUnits(s, 0, [scout.id], 'advance', MID).ok);
  until(s, () => s.relay.contender === 0, 220);
  assert.equal(s.relay.owner, -1);
  const captureStarted = s.tick;
  until(s, () => s.relay.owner === 0);
  assert.ok((s.tick - captureStarted + 1) * DT >= 12);
  const bank = s.teams[0].bank.crystal;
  until(s, () => s.teams[0].bank.crystal > bank, 32);
  assert.equal(s.teams[0].bank.crystal, bank + 2);
  refreshVision(s);
  assert.equal(s.teams[0].explored[MID], 1);
});

test('une sauvegarde en pleine production restitue le parcours, les livraisons et les ordres', () => {
  const s = createMatch(12345);
  assert.ok(enqueue(s, 0, forum(s).id, 'unit', 'worker').ok);
  for (let i = 0; i < 15; i++) tickMatch(s);
  const restored = readMatch(JSON.stringify(s));
  assert.ok(restored);
  assert.equal(restored.tick, s.tick);
  for (let i = 0; i < 120; i++) { tickMatch(s); tickMatch(restored); }
  assert.deepEqual(restored.teams, s.teams);
  assert.deepEqual(restored.units, s.units);
  assert.deepEqual(restored.buildings, s.buildings);
  for (const mutate of [c => c.nodes[0].left = 100000, c => c.units[0].type = 'constructor', c => c.units[0].x = -1, c => c.buildings[0].id = c.units[0].id]) {
    const bad = structuredClone(s);
    mutate(bad);
    assert.equal(readMatch(JSON.stringify(bad)), null);
  }
  assert.equal(readMatch('invalide'), null);
});

test('le rival commence avec son économie et doit effectivement financer sa première formation', () => {
  const s = createMatch(12);
  Object.keys(s.teams[1].bank).forEach(k => s.teams[1].bank[k] = 0);
  tickMatch(s);
  assert.equal(s.buildings.filter(b => b.side === 1).length, 1);
  assert.equal(ready(s, 1)[0].queue.length, 0);
  assert.equal(unitsOf(s, 1).length, 6);
  until(s, () => s.teams[1].trained > 0, 600, tickMatch);
  assert.ok(s.nodes.some((n,i) => n.cell > 0 && n.left < atlas(s).deposits[i].amount));
});

for (const [seed, region, level, pilot, expected] of [
  [93, 'delta', 'calm', true, {winner:0, reason:'forum'}],
  [511, 'mesas', 'fierce', true, {winner:0, reason:'spire'}],
  [8, 'delta', 'fierce', false, {winner:1, reason:'forum'}],
]) {
  test(`partie complète par les commandes normales · ${region} ${seed} · ${expected.winner ? 'défaite' : 'victoire'} ${expected.reason}`, () => {
    const s = createMatch(seed, region, level), brain = {lastRaid:0};
    until(s, () => s.result, 3200, game => {
      if (pilot && game.tick % 12 === 0) planSide(game, 0, 'fierce', brain);
      tickMatch(game);
    });
    assert.deepEqual(s.result, expected);
    assert.ok(s.teams[1].trained > 5);
    if (expected.reason === 'spire') {
      assert.equal(s.teams[0].age, 3);
      assert.ok(s.teams[0].tech.length > 0);
      assert.ok(ready(s, 0, 'spire')[0].hold >= 90);
    }
    assert.deepEqual(readMatch(JSON.stringify(s))?.result, expected);
    const finishedAt = s.tick;
    tickMatch(s);
    assert.equal(s.tick, finishedAt);
  });
}
