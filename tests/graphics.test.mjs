import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BUILDINGS, fresh, worldOf } from '../src/engine.js';
import { BIOMES } from '../src/world.js';
import { buildingSymbol, cameraBounds, cameraViewBox, overviewCamera, renderMap, roverPosition, tilePosition } from '../src/scenes.js';
import { surveyRoute } from '../src/survey.js';

test('Les bâtiments, variantes de biomes et modules de niveau utilisent des illustrations WebP disponibles', async () => {
  let gallery = '';
  for (const [type,def] of Object.entries(BUILDINGS)) {
    const first = buildingSymbol(type);
    assert.ok(first.includes(`/${type}.webp`));
    gallery += first;
    if (def.max === 3) {
      assert.notEqual(buildingSymbol(type,2), first);
      assert.notEqual(buildingSymbol(type,3), buildingSymbol(type,2));
      gallery += buildingSymbol(type,3);
    }
  }
  for (const [biome,forest] of [['emerald','bio'],['amber','amber-grove'],['boreal','frost-pines']]) {
    const map = renderMap(fresh(0,4821,biome));
    assert.ok(map.includes(`/${forest}.webp`));
    assert.ok(map.includes(BIOMES[biome].grass[0]));
    gallery += map;
  }
  const files = new Set([...gallery.matchAll(/href="\.\/src\/art\/([\w-]+\.webp)"/g)].map(m => m[1]));
  for (const file of files) {
    const data = await readFile(new URL('../src/art/'+file,import.meta.url));
    assert.equal(data.toString('ascii',0,4),'RIFF',file);
    assert.equal(data.toString('ascii',8,12),'WEBP',file);
  }
});

test('Le cadrage contient le plateau entier en portrait et en paysage et le rover suit sa surface', () => {
  const states = [fresh(0,null),fresh(0,16),fresh(0,4821)];
  states[1].world.generator = 1;
  for (const state of states) {
    const tiles = worldOf(state), bounds = cameraBounds(tiles);
    for (const frame of [{width:400,height:500},{width:1250,height:650}]) {
      const {zoom,center} = overviewCamera(bounds,frame);
      const [left,top,w,h] = cameraViewBox(center,zoom,frame).split(' ').map(Number);
      assert.ok(left<=bounds.left && top<=bounds.top && left+w>=bounds.right && top+h>=bounds.bottom);
    }
    const path = surveyRoute(tiles,'5,5','flora');
    for (const [progress,tile] of [[0,path[0]],[.5,path.at(-1)],[1,path[0]]]) {
      const {x,y} = tilePosition(tiles,tile);
      assert.deepEqual(roverPosition(path,progress,tiles),{x,y});
    }
  }
});
