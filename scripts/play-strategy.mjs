// Use the real pointer, keyboard and application entry points on both devices.
// The saved match is inspected for assertions. All game changes go through the UI.
import {writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export async function playStrategy({name, server, output, width, call, evaluate, press, waitFor}) {
  const mobile = name === 'mobile';
  const action = (op, key) => `[data-rts-act="${op}"]` + (key ? `[data-key="${key}"]` : '');
  const use = (op, key) => press(action(op, key));
  const snapshot = "JSON.parse(localStorage.getItem((document.documentElement.dataset.saveKey || 'neon-colony-v2') + '-strategie-v1'))";
  const stateIs = (expression, label) =>
    waitFor(() => evaluate(`(s => !!s && (${expression}))(${snapshot})`), name + ' · ' + label);
  const appears = (selector, label) =>
    waitFor(() => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), name + ' · ' + label);

  async function pointInput(point, button = 'left') {
    if (mobile) {
      await call('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[point]});
      await call('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    } else {
      await call('Input.dispatchMouseEvent', {type:'mousePressed', button, clickCount:1, ...point});
      await call('Input.dispatchMouseEvent', {type:'mouseReleased', button, clickCount:1, ...point});
    }
  }

  async function locatePlot(type) {
    return evaluate(`(async () => {
      const s = ${snapshot};
      const {atlas, buildReason} = await import('./src/strategy-engine.js?v=7.0.0');
      const {terrainOf} = await import('./src/terrain.js?v=6.0.0');
      const {HOME, tileDistance} = await import('./src/strategy-rules.js?v=7.0.0');
      const svg = document.querySelector('#rts-map'), map = atlas(s);
      const mesh = terrainOf(map.cells), type = ${JSON.stringify(type)};
      const tiles = map.cells.filter(t => !buildReason(s, 0, type, t.cell))
        .sort((a, b) => tileDistance(HOME, a.cell) - tileDistance(HOME, b.cell));
      for (const tile of tiles) {
        const p = mesh.positions.get(tile.id);
        const pixel = new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM());
        if (document.elementFromPoint(pixel.x, pixel.y)?.closest('#rts-map')) {
          return {cell:tile.cell, point:{x:pixel.x, y:pixel.y}};
        }
      }
      throw Error('Aucun terrain disponible dans la caméra');
    })()`);
  }

  await call('Page.navigate', {url:server + '/dist/#strategie'});
  await appears(action('start'), 'préparation de l’escarmouche');
  await use('level', 'calm');
  await evaluate("document.querySelector('#rts-seed').value='93'");
  await use('start');
  await appears('#rts-map[data-tick]', 'champ de bataille');
  await use('pause');
  await appears('#rts-map[data-paused="true"]', 'pause tactique');
  const food = await evaluate(`(${snapshot}).teams[0].bank.food`);
  await use('unit', 'worker');
  await stateIs(`s.teams[0].bank.food === ${food - 32} && s.buildings[0].queue.length === 1`, 'réservation de la recrue');
  await use('cancel-job', '0');
  await stateIs(`s.teams[0].bank.food === ${food} && !s.buildings[0].queue.length`, 'annulation remboursée');
  await use('unit', 'worker');
  await use('workers');
  await use('build-menu');
  await use('build', 'barracks');
  const site = await locatePlot('barracks');
  const wood = await evaluate(`(${snapshot}).teams[0].bank.wood`);
  await pointInput(site.point);
  await stateIs(`s.buildings.some(b => !b.side && b.type === 'barracks' && b.cell === ${site.cell}) && s.teams[0].bank.wood === ${wood - 55} && s.units.filter(u => !u.side && u.order.kind === 'assist').length === 5`, 'construction donnée sur le terrain');

  await use('speed');
  await use('speed');
  await use('pause');
  await waitFor(() => evaluate(`!!document.querySelector('${action('unit','guard')}:enabled')`), name + ' · caserne achevée');
  await use('unit', 'guard');
  await use('workers');
  await use('harvest', 'wood');
  await stateIs("s.units.filter(u => !u.side && u.order.resource === 'wood').length >= 5", 'affectation de toute une équipe');
  await stateIs("s.units.some(u => !u.side && u.type === 'guard')", 'première Sentinelle formée');
  await use('pause');
  await use('workers');
  await use('build-menu');
  await use('build','house');
  const habitat = await locatePlot('house');
  await pointInput(habitat.point);
  await stateIs(`s.buildings.some(b => !b.side && b.type === 'house' && b.cell === ${habitat.cell})`, 'deuxième chantier');
  await use('pause');
  await stateIs("s.buildings.some(b => !b.side && b.type === 'house' && b.ready)", 'habitat et places supplémentaires');
  await use('workers');
  await use('harvest','food');
  await use('army');
  if (!mobile) {
    await call('Input.dispatchKeyEvent', {type:'keyDown', key:'&', code:'Digit1', windowsVirtualKeyCode:49, modifiers:2});
    await call('Input.dispatchKeyEvent', {type:'keyUp', key:'&', code:'Digit1', windowsVirtualKeyCode:49, modifiers:2});
    await stateIs('s.command.groups[1]?.length === 2', 'groupe de commandement');
    await pointInput(site.point, 'right');
    await stateIs("s.units.some(u => !u.side && u.type === 'guard' && u.order.kind === 'move')", 'ordre par clic droit');
  }
  await use('forum');
  await use('home');
  if (!mobile) await use('zoom-in');
  await evaluate(`(async () => {
    const root = document.querySelector('#rts-screen');
    if (innerWidth !== ${width} || root.scrollWidth > root.clientWidth + 1) throw Error('Débordement horizontal du commandement');
    const urls = new Set([...root.querySelectorAll('img[src], image[href]')].map(e => e.getAttribute('src') || e.getAttribute('href')));
    await Promise.all([...urls].map(url => { const image = new Image(); image.src = url; return image.decode(); }));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  })()`);
  const shot = await call('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
  await writeFile(join(output, 'deux-rives-' + name + '.png'), Buffer.from(shot.data, 'base64'));
  await use('pause');
  await call('Page.reload');
  await appears(action('resume'), 'proposition de reprise');
  await use('resume');
  await appears('#rts-map[data-paused="true"]', 'reprise en pause');
  await stateIs("s.buildings.some(b => !b.side && b.type === 'barracks' && b.ready) && s.buildings.some(b => !b.side && b.type === 'house' && b.ready) && s.units.some(u => !u.side && u.type === 'guard')", 'restauration du commandement');

  await call('Page.navigate', {url:pathToFileURL(resolve(output, 'NEON-Deux-Rives.html')).href});
  await appears(action('start'), 'jeu autonome ouvert depuis le disque');
  await evaluate(`(async () => {
    const list = Object.entries(window.keplerPictures).filter(([k]) => k.startsWith('rts-'));
    if (list.length < 9 || list.some(([,url]) => !url.startsWith('blob:'))) throw Error('Illustrations de stratégie manquantes');
    await Promise.all(list.map(([,url]) => { const img = new Image(); img.src = url; return img.decode(); }));
  })()`);
  await use('map','passes');
  await use('start');
  await appears('#rts-map[data-tick]', 'escarmouche autonome jouable');
  await use('idle');
  await use('harvest','crystal');
  await stateIs("s.region === 'passes' && s.units.some(u => !u.side && u.order.resource === 'crystal')", 'ordre autonome sans serveur');
  await use('menu');
  await use('setup');
  await use('scenario');
  await appears(action('confirm-start'), 'confirmation de changement de partie');
  await use('confirm-start');
  await appears('#rts-map[data-paused="true"]', 'transfert du commandement en pause');
  await stateIs("s.scenario === 'siege' && s.tick === 936 && s.teams[0].age === 3 && s.units.filter(u => !u.side && u.type === 'worker').length === 14", 'siège avancé issu du jeu normal');
  await use('pause');
  await waitFor(() => evaluate("Number(document.querySelector('#rts-map').dataset.tick) >= 942"), name + ' · bataille en cours');
  await evaluate(`(async () => {
    const urls = new Set([...document.querySelectorAll('#rts-screen img[src], #rts-screen image[href]')].map(e => e.getAttribute('src') || e.getAttribute('href')));
    await Promise.all([...urls].map(url => { const img = new Image(); img.src = url; return img.decode(); }));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  })()`);
  const siegeShot = await call('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
  await writeFile(join(output, 'siege-aurore-' + name + '.png'), Buffer.from(siegeShot.data, 'base64'));
  await use('cohort','watcher');
  await waitFor(() => evaluate("Number(document.querySelector('[data-roster=watcher]').textContent) === document.querySelectorAll('.rts-piece.unit.selected').length"), name + ' · sélection des Veilleurs par les effectifs');
  console.log(name + ' · formation, annulation, construction au pointeur, récolte, armée, sauvegarde, reprise et jeu autonome validés.');
}
