// Use the real pointer, keyboard and application entry points on desktop.
// The saved match is inspected for assertions. All game changes go through the UI.
import {writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export async function playCampaign({name, server, output, width, call, evaluate, press, waitFor}) {
  const action = (op, key) => `[data-rts-act="${op}"]` + (key ? `[data-key="${key}"]` : '');
  const use = (op, key) => press(action(op, key));
  const snapshot = "JSON.parse(localStorage.getItem((document.documentElement.dataset.saveKey || 'neon-colony-v2') + '-campagne-v8'))";
  const stateIs = (expression, label) =>
    waitFor(() => evaluate(`(s => !!s && (${expression}))(${snapshot})`), name + ' · ' + label);
  const appears = (selector, label) =>
    waitFor(() => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), name + ' · ' + label);

  async function pointInput(point, button = 'left') {
    await call('Input.dispatchMouseEvent', {type:'mousePressed', button, clickCount:1, ...point});
    await call('Input.dispatchMouseEvent', {type:'mouseReleased', button, clickCount:1, ...point});
  }

  async function locatePlot(type) {
    return evaluate(`(async () => {
      const s = ${snapshot};
      const module = (file,version) => import(location.protocol === 'file:' ? 'neon/'+file+'.js' : './src/'+file+'.js?v='+version);
      const {atlas,buildReason} = await module('strategy-engine','8.1.0');
      const {terrainOf} = await module('terrain','8.1.0');
      const {mapDistance} = await module('strategy-rules','8.1.0');
      const svg = document.querySelector('#rts-map'), map = atlas(s);
      const mesh = terrainOf(map.cells), type = ${JSON.stringify(type)};
      const tiles = map.cells.filter(t => !buildReason(s, 0, type, t.cell))
        .sort((a, b) => mapDistance(map.size, map.home, a.cell) - mapDistance(map.size, map.home, b.cell));
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

  await call('Page.navigate', {url:server + '/dist/'});
  await appears(action('start'), 'fondation de la colonie');
  await use('level', 'calm');
  await use('size','85');
  await evaluate("performance.mark('neon-wide-start')");
  await evaluate("document.querySelector('#rts-seed').value='93'");
  await use('start');
  await appears('#rts-map[data-tick]', 'champ de bataille');
  await use('pause');
  await appears('#rts-map[data-paused="true"]', 'pause tactique');
  await stateIs('s.size===85 && s.teams[0].explored.length===7225','carte immense sélectionnée');
  const loadTime=await evaluate(`Math.round(performance.getEntriesByName('neon-wide-start')[0] ? performance.now()-performance.getEntriesByName('neon-wide-start')[0].startTime : 0)`);
  const viewBox=()=>evaluate("document.querySelector('#rts-map').getAttribute('viewBox')");
  const startBox=await viewBox();
  await use('overview');
  if(await viewBox()===startBox)throw Error('La vue d’ensemble n’a pas déplacé le cadre');
  await use('home');
  const homeBox=await viewBox();
  const mini=await evaluate(`(() => {const r=document.querySelector('#rts-mini').getBoundingClientRect();return {x:r.left+r.width*.7,y:r.top+r.height*.63};})()`);
  await pointInput(mini);
  if(await viewBox()===homeBox)throw Error('La minicarte n’a pas déplacé le cadre');
  await use('home');
  const origin=await evaluate(`(() => {const r=document.querySelector('#rts-map').getBoundingClientRect();return {x:Math.round(r.left+r.width*.58),y:Math.round(r.top+r.height*.62)};})()`);
  const beforePan=await viewBox();
  await evaluate(`window.panFrames=[];window.panStart=requestAnimationFrame(function frame(previous){
    window.panStart=requestAnimationFrame(now=>{window.panFrames.push(now-previous);frame(now);});
  });true`);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'middle',buttons:4,clickCount:1,...origin});
  for(let i=1;i<=48;i++){
    const p={x:origin.x-Math.round(i*4),y:origin.y-Math.round(i*2)};
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',buttons:4,...p});
  }
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'middle',clickCount:1,x:origin.x-192,y:origin.y-96});
  if(await viewBox()===beforePan)throw Error('Le glissement au bouton du milieu ne déplace pas la caméra');
  const frames=await evaluate(`(() => {cancelAnimationFrame(window.panStart);const samples=window.panFrames.sort((a,b)=>a-b);return {count:samples.length,p95:Math.round(samples[Math.floor(samples.length*.95)]||0)};})()`);
  await use('home');
  console.log(name+' · Caméra au bouton du milieu vérifiée sur '+frames.count+' images, p95 '+frames.p95+' ms.');
  console.log(name+' · Carte 85 × 85 affichée et mise en pause en '+loadTime+' ms.');
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
  await use('build','hangar');
  const habitat = await locatePlot('hangar');
  await pointInput(habitat.point);
  await stateIs(`s.buildings.some(b => !b.side && b.type === 'hangar' && b.cell === ${habitat.cell})`, 'deuxième chantier');
  await use('pause');
  await stateIs("s.buildings.some(b => !b.side && b.type === 'hangar' && b.ready)", 'hangar civil sur la carte militaire');
  await use('workers');
  await use('harvest','food');
  await use('army');
  await call('Input.dispatchKeyEvent', {type:'keyDown', key:'&', code:'Digit1', windowsVirtualKeyCode:49, modifiers:2});
  await call('Input.dispatchKeyEvent', {type:'keyUp', key:'&', code:'Digit1', windowsVirtualKeyCode:49, modifiers:2});
  await stateIs('s.command.groups[1]?.length === 2', 'groupe de commandement');
  await pointInput(site.point, 'right');
  await stateIs("s.units.some(u => !u.side && u.type === 'guard' && u.order.kind === 'move')", 'ordre par clic droit');
  async function capture(label) {
    await evaluate(`(async () => {
      const root=document.getElementById('rts-screen'),svg=document.getElementById('rts-map');
      if(innerWidth!==${width}||root.scrollWidth>root.clientWidth+1||svg.clientWidth<250)throw Error('Carte hors cadre');
      const urls=new Set([...root.querySelectorAll('img[src],image[href]')].map(el=>el.getAttribute('src')||el.getAttribute('href')));
      await Promise.all([...urls].map(url=>{const img=new Image();img.src=url;return img.decode();}));
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    })()`);
    const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(join(output,label+'-'+name+'.png'),Buffer.from(screenshot.data,'base64'));
  }
  await use('pause');
  await use('panel','rover');
  await evaluate("window.campaignMap = document.getElementById('rts-map')");
  await use('dispatch','flora');
  await stateIs("s.campaign.rover?.kind === 'flora' && s.teams[0].bank.water === 6", 'provisions payées à la cité');
  await use('scan-rover');
  await use('panel','orders');
  await use('army');
  await use('pause');
  await use('panel','city');
  await stateIs("s.campaign.specimens.includes('flora') && !s.campaign.rover", 'prélèvement et livraison pendant le commandement de la cité');
  if (!await evaluate("document.getElementById('rts-map') === window.campaignMap")) throw Error('Carte remplacée entre deux ordres');
  await use('pause');
  await capture('immense');
  await use('overview');
  await capture('immense-vue-ensemble');
  await call('Page.navigate',{url:server+'/dist/#strategie'});
  await call('Page.reload');
  await appears('#rts-map[data-paused="true"]','le favori historique reprend la campagne');
  await stateIs("s.size===85 && s.campaign.specimens.includes('flora') && s.buildings.some(b => !b.side && b.type === 'hangar') && s.units.some(u => !u.side && u.type === 'guard')",'une seule sauvegarde pour le hangar, le carnet et l’armée');

  await call('Page.navigate',{url:server+'/tests/migration.browser.html'});
  await appears('#legacy-ready','préparation des deux sauvegardes historiques');
  await call('Page.navigate',{url:server+'/dist/'});
  await appears('#rts-map[data-paused="true"]','reprise de la cité et du siège historiques');
  await stateIs("s.size===27 && s.teams[0].age === 3 && s.campaign.deliveries === 44 && s.buildings.some(b => b.type === 'beacon' && !b.side) && s.units.filter(u => !u.side && u.type === 'watcher').length === 3", 'fusion de la cité et du siège');
  await use('panel','rover');
  await use('dispatch','strata');
  await use('panel','orders');
  await use('army');
  await use('home');
  await use('zoom-in');
  await use('pause');
  await waitFor(()=>evaluate("Number(document.getElementById('rts-map').dataset.tick)>=940"),'la défense de la cité');
  await capture('aurore');
  await use('panel','rover');
  await capture('rover');
  await use('panel','city');
  await capture('cite');

  await call('Page.navigate',{url:pathToFileURL(resolve(output,'NEON-Aurore.html')).href});
  await appears(action('start'),'ouverture du jeu autonome');
  await evaluate(`(async()=>{
    if(document.querySelector('[data-rts-act="scenario"],#strategy-open,#begin-strategy'))throw Error('Deuxième départ présent');
    const list=Object.entries(window.keplerPictures);
    await Promise.all(list.map(([,url])=>{if(!url.startsWith('blob:'))throw Error('Image externe');const img=new Image();img.src=url;return img.decode();}));
  })()`);
  await use('map','passes');
  await use('size','65');
  await use('start');
  await appears('#rts-map[data-tick]','fondation depuis le disque');
  await use('pause');
  await use('panel','rover');await use('plan-district','hangar');
  const offlinePlot=await locatePlot('hangar');
  await pointInput(offlinePlot.point);
  await stateIs("s.size===65 && s.region === 'passes' && s.buildings.some(b=>!b.side && b.type==='hangar') && s.units.some(u=>u.order.kind==='assist')",'chantier sur la carte hors ligne');
  console.log(name+' · partie unique, défense, construction civile, rover, migration et HTML autonome validés.');
}
