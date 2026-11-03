import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, restore, harvest, build, upgrade, upgradeCost, dismantle, salvage, advance, rates, population, canPlace, WORLD, BUILDINGS, GOALS, CYCLE, NODE_DELAY, LIMIT, collectRewards } from '../src/engine.js';

function expedition() {
  let now = 100000;
  const s = fresh(now);
  function fund(cost) {
    for (const [resource, amount] of Object.entries(cost)) {
      let guard = 0;
      while (s.resources[resource] < amount) {
        assert.ok(++guard < 500, 'resource acquisition must terminate');
        now += CYCLE; advance(s, now);
        if (resource === 'energy') assert.ok(rates(s).energy > 0);
        else assert.ok(harvest(s, WORLD.find(t => t.node === resource).id, now).ok);
      }
    }
  }
  function place(type) {
    fund(BUILDINGS[type].cost);
    const id = WORLD.find(t => canPlace(s, t.id)).id;
    assert.ok(build(s, type, id).ok);
    return id;
  }
  return { s, fund, place };
}

test('Progression jouable de zéro au port stellaire sans ressources injectées', () => {
  const { s, fund, place } = expedition();
  place('solar');
  const habitat = place('habitat');
  place('pump'); place('greenhouse'); place('mine');
  const before = population(s);
  fund(upgradeCost(s.buildings.find(b => b.id === habitat)));
  assert.ok(upgrade(s, habitat).ok);
  assert.equal(population(s), before + 6);
  place('beacon');
  assert.equal(population(s), 16);
  assert.deepEqual([...s.claimed].sort(), [0, 1, 2, 3, 4]);
  assert.ok(Object.values(s.resources).every(n => n >= 0));
  const resources = { ...s.resources };
  assert.deepEqual(collectRewards(s), []);
  assert.deepEqual(s.resources, resources, 'rewards are never duplicated');
});

test('Collecte renouvelable, délai par gisement et plafond', () => {
  const s = fresh(0), tile = WORLD.find(t => t.node === 'crystal');
  assert.ok(harvest(s, tile.id, 0).ok);
  assert.equal(s.resources.crystal, 3);
  assert.equal(harvest(s, tile.id, 1).ok, false);
  assert.ok(harvest(s, tile.id, NODE_DELAY).ok);
  s.resources.crystal = LIMIT - 1;
  assert.ok(harvest(s, tile.id, 2 * NODE_DELAY).ok);
  assert.equal(s.resources.crystal, LIMIT);
  assert.equal(harvest(s, tile.id, 3 * NODE_DELAY).ok, false);
});

test('Construction atomique : eau, ressources, occupation, prérequis et manque de stock', () => {
  const s = fresh();
  const start = structuredClone(s.resources);
  for (const id of ['8,1', '2,2', '5,5', '99,99']) assert.equal(build(s, 'solar', id).ok, false);
  const free = WORLD.find(t => canPlace(s, t.id)).id;
  assert.equal(build(s, 'greenhouse', free).ok, false);
  assert.equal(build(s, 'solar', free).ok, false);
  assert.deepEqual(s.resources, start);
  s.resources.ore = 12; s.resources.crystal = 3;
  assert.ok(build(s, 'solar', free).ok);
  assert.equal(s.resources.ore, 0); assert.equal(s.resources.crystal, 0);
  assert.equal(build(s, 'solar', free).ok, false);
});

test('Production réelle, niveaux, plafonnement hors ligne et absence de double crédit', () => {
  const s = fresh(0);
  s.buildings.push({ id: '4,5', type: 'solar', level: 2 }, { id: '6,5', type: 'mine', level: 1 });
  assert.deepEqual(rates(s), { ore: 3, bio: 0, water: 0, crystal: 1, energy: 4 });
  assert.equal(advance(s, CYCLE - 1), 0);
  assert.equal(advance(s, CYCLE), 1);
  assert.equal(s.resources.energy, 12);
  assert.equal(advance(s, CYCLE), 0);
  const before = s.resources.energy;
  assert.equal(advance(s, 24 * 3600000), 150);
  assert.equal(s.resources.energy, before + 600);
  assert.equal(advance(s, 24 * 3600000), 0);
  assert.equal(advance(s, 1), 0, 'clock reversal does not generate resources');
});

test('Améliorations, niveau maximal et démontage ne créent pas de matériaux', () => {
  const { s, fund, place } = expedition();
  const id = place('solar');
  for (let level = 2; level <= 3; level++) {
    fund(upgradeCost(s.buildings.find(b => b.id === id)));
    assert.ok(upgrade(s, id).ok);
    assert.equal(s.buildings.find(b => b.id === id).level, level);
  }
  assert.equal(upgrade(s, id).ok, false);
  const refund = salvage(s.buildings.find(b => b.id === id));
  const before = { ...s.resources };
  assert.ok(dismantle(s, id).ok);
  assert.ok(canPlace(s, id));
  for (const [k, n] of Object.entries(refund)) assert.equal(s.resources[k], before[k] + n);
  assert.equal(dismantle(s, '5,5').ok, false);
  assert.equal(dismantle(s, id).ok, false);
});

test('Sauvegarde restaurée, schéma ancien isolé et entrées corrompues filtrées', () => {
  const { s, place } = expedition(); place('solar'); place('habitat');
  const restored = restore(JSON.stringify(s), s.lastTick);
  assert.deepEqual(restored.buildings, s.buildings);
  assert.deepEqual(restored.resources, s.resources);
  assert.deepEqual(restored.claimed, s.claimed);
  for (const raw of [null, '{', '{}', '{"version":1}']) assert.deepEqual(restore(raw, 500), fresh(500));
  const bad = { ...s, buildings: [...s.buildings, { id: '8,1', type: 'solar', level: 999 }, { id: '5,5', type: 'solar', level: 1 }, { id: '0,3', type: '__proto__' }], resources: { ore: -1, crystal: 1e8 } };
  const cleaned = restore(JSON.stringify(bad), s.lastTick);
  assert.equal(cleaned.resources.ore, 0); assert.equal(cleaned.resources.crystal, LIMIT);
  assert.equal(cleaned.buildings.length, s.buildings.length);
});
