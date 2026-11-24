import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILDINGS, CYCLE, LIMIT, advance, build, canPlace, dismantle, finishSurvey, fresh,
  harvest, importSave, rates, relocate, restore, startSurvey, unlocked, worldOf,
} from '../src/engine.js';
import { SURVEYS, surveyProgress, surveyRoute, surveySites } from '../src/survey.js';
import { project, renderMap, roverPosition } from '../src/scenes.js';

const freeTile = state => worldOf(state).find(t => canPlace(state, t.id)).id;

test('Les trois sites occupent des gisements existants et tous les trajets restent à terre', () => {
  const worlds = [fresh(0, null)];
  for (const generator of [1, 2]) {
    for (let seed = 0; seed < 35; seed++) {
      const state = fresh(0, seed);
      state.world.generator = generator;
      worlds.push(state);
    }
  }
  for (const state of worlds) {
    const tiles = worldOf(state), sites = surveySites(tiles);
    assert.equal(new Set(Object.values(sites).map(t => t.id)).size, 3);
    assert.deepEqual(surveySites(structuredClone(tiles)), sites);
    for (const [key, site] of Object.entries(sites)) {
      assert.equal(site.node, SURVEYS[key].node);
      const path = surveyRoute(tiles, '5,5', key);
      assert.equal(path[0].id, '5,5');
      assert.equal(path.at(-1), site);
      for (const [i, tile] of path.entries()) {
        assert.notEqual(tile.terrain, 'water');
        if (i) assert.equal(Math.abs(tile.x - path[i-1].x) + Math.abs(tile.y - path[i-1].y), 1);
      }
      assert.deepEqual(roverPosition(path, 0), project(5,5));
      assert.deepEqual(roverPosition(path, .5), project(site.x, site.y));
      assert.deepEqual(roverPosition(path, 1), project(5,5));
    }
  }
});

test('Du premier prélèvement à l’observatoire avec les seules ressources du jeu', () => {
  let now = 100, state = fresh(now, 542);
  function fund(cost) {
    for (const [key, amount] of Object.entries(cost)) {
      while (state.resources[key] < amount) {
        now += CYCLE;
        advance(state, now);
        if (key === 'energy') assert.ok(rates(state).energy > 0);
        else assert.ok(harvest(state, worldOf(state).find(t => t.node === key).id, now).ok);
      }
    }
  }
  function construct(type) {
    fund(BUILDINGS[type].cost);
    assert.ok(build(state, type, freeTile(state)).ok);
  }
  const initial = structuredClone(state);
  assert.equal(startSurvey(state, 'flora', now).ok, false);
  assert.equal(build(state, 'observatory', freeTile(state)).ok, false);
  assert.deepEqual(state, initial);
  construct('hangar');
  construct('solar');
  for (const [key, survey] of Object.entries(SURVEYS)) {
    assert.equal(unlocked(state, 'observatory'), false);
    fund(survey.cost);
    const stock = { ...state.resources };
    assert.ok(startSurvey(state, key, now).ok);
    for (const [k, amount] of Object.entries(survey.cost)) assert.equal(state.resources[k], stock[k] - amount);
    const busy = structuredClone(state);
    assert.equal(startSurvey(state, 'strata', now).ok, false);
    assert.equal(finishSurvey(state, now + survey.duration - 1).ok, false);
    assert.deepEqual(state, busy);
    now += survey.duration;
    state = importSave(JSON.stringify(state), now);
    const before = { ...state.resources };
    assert.ok(finishSurvey(state, now).ok);
    for (const [k, amount] of Object.entries(survey.reward)) assert.equal(state.resources[k], before[k] + amount);
    const after = structuredClone(state);
    assert.equal(finishSurvey(state, now).ok, false);
    assert.equal(startSurvey(state, key, now).ok, false);
    assert.deepEqual(state, after);
  }
  assert.equal(unlocked(state, 'observatory'), true);
  construct('observatory');
  assert.equal(rates(state).crystal, 4);
  assert.equal(rates(state).energy, 6);
  for (const type of ['hangar','observatory']) {
    const snapshot = structuredClone(state);
    assert.equal(build(state, type, freeTile(state)).ok, false);
    assert.deepEqual(state, snapshot);
  }
  assert.deepEqual(importSave(JSON.stringify(state), now).survey, state.survey);
});

test('La sortie survit au déplacement et au démontage du hangar ainsi qu’à une longue absence', () => {
  const state = fresh(0, null), origin = freeTile(state);
  state.buildings.push({ id: origin, type: 'hangar', level: 1 });
  state.resources.energy = 0;
  const before = structuredClone(state);
  assert.equal(startSurvey(state, 'flora', 100).ok, false);
  assert.deepEqual(state, before);
  state.resources.energy = 2;
  assert.ok(startSurvey(state, 'flora', 100).ok);
  assert.equal(surveyProgress(state.survey.active, 50), 0);
  const other = freeTile(state);
  assert.ok(relocate(state, origin, other).ok);
  assert.ok(dismantle(state, other).ok);
  const loaded = restore(JSON.stringify(state), 86_400_000);
  assert.equal(loaded.survey.active.origin, origin);
  assert.equal(surveyProgress(loaded.survey.active, 86_400_000), 1);
  loaded.resources.bio = LIMIT - 1;
  assert.ok(finishSurvey(loaded, 86_400_000).ok);
  assert.equal(loaded.resources.bio, LIMIT);
  assert.equal(startSurvey(loaded, 'prism', 86_400_000).ok, false);
});

test('Les sauvegardes 4.1 et les carnets malformés conservent la colonie', () => {
  const state = fresh(200, 924);
  const legacy = { ...state };
  delete legacy.survey;
  assert.deepEqual(importSave(JSON.stringify(legacy), 200), state);
  state.survey = { completed: ['flora', 'flora', '__proto__', ['prism'], null], active: { site: 'flora', origin: '5,5', startedAt: 0 } };
  const copy = raw => importSave(JSON.stringify(raw), 200);
  assert.deepEqual(copy(state).survey, { completed: ['flora'], active: null });
  for (const changes of [{ site: {} }, { site: '__proto__' }, { startedAt: -1 }, { startedAt: '20' }, { origin: '999,999' }]) {
    state.survey.active = { site: 'prism', origin: '5,5', startedAt: 10, ...changes };
    assert.deepEqual(copy(state).survey, { completed: ['flora'], active: null });
    assert.deepEqual(copy(state).world, state.world);
  }
  state.survey.active = { site: 'prism', origin: '5,5', startedAt: 900 };
  assert.equal(copy(state).survey.active.startedAt, 200);
});

test('Les repères ouvrent les sites sans masquer la collecte ni le placement des bâtiments', () => {
  const state = fresh(0, 23), tiles = worldOf(state);
  const map = renderMap(state);
  for (const [key, site] of Object.entries(surveySites(tiles))) {
    assert.ok(map.includes(`data-survey-site="${key}"`));
    assert.ok(map.includes(`data-node="${site.id}"`));
  }
  assert.ok(!renderMap(state, { placing: 'hangar' }).includes('data-survey-site='));
  assert.ok(!renderMap(state, { idPrefix: 'preview' }).includes('data-survey-site='));
  state.buildings.push({ type: 'hangar', id: freeTile(state), level: 1 });
  assert.ok(startSurvey(state, 'flora', 0).ok);
  assert.ok(renderMap(state).includes('data-rover='));
  assert.ok(finishSurvey(state, SURVEYS.flora.duration).ok);
  assert.ok(!renderMap(state).includes('data-rover='));
});
