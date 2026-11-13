import { RESOURCES, BUILDINGS, GOALS, WORLD, TILE_MAP, CYCLE, fresh, restore, population, rates, affordable, unlocked, harvest, build, upgrade, upgradeCost, advance, salvage, dismantle, relocate, goalSteps, importSave, NODE_DELAY, RESEARCH, research, productionMultiplier } from './engine.js?v=3.2.0';
import { renderMap, buildingPreview, project } from './scenes.js?v=3.2.0';

const $ = id => document.getElementById(id);
const KEY = 'neon-colony-v2';
let state = fresh(), stored = false, selected = '5,5', chosen = null, placing = null;
const homeCamera = () => window.innerWidth <= 760 ? { zoom: 1.4, center: { x: 550, y: 340 } } : { zoom: 1, center: { x: 550, y: 410 } };
let { zoom, center } = homeCamera();
let moving = null;
let audio = null, sound = false;
try { const raw = localStorage.getItem(KEY); stored = !!raw; state = restore(raw); } catch { /* Session-only mode remains playable. */ }
const offlineCycles = advance(state);

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); $('save-state').textContent = 'Progression enregistrée'; }
  catch { $('save-state').textContent = 'Session uniquement · stockage bloqué'; }
}
function say(text) { $('message').textContent = text; }
function show(html) { $('modal-content').innerHTML = html; if (!$('modal').open) $('modal').showModal(); }
function close() { $('modal').close(); }
$('modal').querySelector('.close').onclick = close;
$('modal').addEventListener('click', e => {
  if (e.target !== $('modal')) return;
  const r = $('modal').getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
});
function costs(cost) {
  return `<div class="cost">${Object.entries(cost).map(([k, n]) => `<span data-cost-key="${k}" data-cost-value="${n}" class="${state.resources[k] < n ? 'missing' : ''}" title="${RESOURCES[k].name} : ${n}"><b aria-hidden="true" style="color:${RESOURCES[k].color}">${RESOURCES[k].icon}</b><span class="sr-only">${RESOURCES[k].name} : </span>${n}</span>`).join('')}</div>`;
}
function drawStats() {
  const production = rates(state);
  $('resources').innerHTML = Object.entries(RESOURCES).map(([key, r]) => `<div class="resource" title="${r.name} : ${state.resources[key]} ; production ${production[key]} par cycle de 12 secondes"><span class="icon" aria-hidden="true" style="color:${r.color}">${r.icon}</span><div><strong class="value">${state.resources[key]}</strong>${production[key] ? `<span class="rate">+${production[key]}/cycle</span>` : ''}</div><span class="name">${r.name}</span></div>`).join('');
  $('population').textContent = population(state);
  $('mobile-population').textContent = ` · ${population(state)} pionniers`;
  $('colony-stage').textContent = state.claimed.includes(4) ? 'COLONIE STELLAIRE' : population(state) >= 10 ? 'UN NOUVEAU FOYER' : 'CAMP PIONNIER';
  document.querySelectorAll('[data-cost-key]').forEach(e => e.classList.toggle('missing', state.resources[e.dataset.costKey] < Number(e.dataset.costValue)));
  const current = GOALS.findIndex((g, i) => !state.claimed.includes(i));
  const goal = GOALS[current];
  $('goal-count').textContent = `${String(current < 0 ? GOALS.length : current + 1).padStart(2, '0')} / ${String(GOALS.length).padStart(2, '0')}`;
  $('goal-title').textContent = goal ? goal.name : 'Une colonie parmi les étoiles';
  $('goal-text').textContent = goal ? goal.text + (current === 0 ? ` (${Math.min(5, state.harvests)}/5)` : current === 4 ? ` (${population(state)}/16 habitants)` : '') : 'Les pionniers ont trouvé leur foyer. Continuez à bâtir, améliorer et prendre soin de ce monde.';
  $('goal-checklist').innerHTML = goalSteps(state, current).map(step => `<li class="${step.done ? 'done' : ''}"><span aria-hidden="true">${step.done ? '✓' : '○'}</span> ${step.text}</li>`).join('');
  $('goal-track').innerHTML = GOALS.map((_, i) => `<i class="${state.claimed.includes(i) ? 'done' : ''}"></i>`).join('');
  $('goal-reward').innerHTML = goal ? `RÉCOMPENSE ${Object.entries(goal.reward).map(([k, n]) => `<span>${RESOURCES[k].icon} +${n}</span>`).join('')}` : '✧ Expédition accomplie · exploration libre';
  const action = $('inspect-action');
  if (action) {
    if (chosen) action.disabled = !unlocked(state, chosen) || !affordable(state, BUILDINGS[chosen].cost);
    else {
      const b = state.buildings.find(b => b.id === selected);
      if (b) action.disabled = b.level >= BUILDINGS[b.type].max || !affordable(state, upgradeCost(b));
    }
  }
}
function drawMap() {
  $('scene').innerHTML = renderMap(state, { selection: selected, placing, zoom, center });
  $('zoom-label').textContent = `${Math.round(zoom * 100)} %`;
  $('zoom-out').disabled = zoom <= .8;
  $('zoom-in').disabled = zoom >= 1.8;
  $('placement').hidden = !placing;
  if (placing) $('placement').querySelector('span').textContent = `${moving ? 'Déplacer : ' : ''}${BUILDINGS[placing].name} · choisissez une case claire`;
  $('map-tip').textContent = placing ? 'Les cases illuminées sont constructibles. Le coût est débité uniquement à la pose.' : 'Cliquez pour collecter · Glissez pour explorer · + / − pour zoomer';
}
const shortDescription = {
  solar: 'Énergie renouvelable', habitat: '+6 pionniers / niveau', pump: 'Eau atmosphérique',
  greenhouse: 'Culture de biomasse', mine: 'Minerai & cristaux', beacon: 'Votre lien avec les étoiles',
};
function drawCatalog() {
  $('catalog').innerHTML = Object.entries(BUILDINGS).filter(([key]) => key !== 'pod').map(([key, d]) => `<button class="build-card ${unlocked(state, key) ? '' : 'locked'}" data-build="${key}" aria-pressed="${chosen === key}" aria-label="Construire : ${d.name}"><span class="tag">${unlocked(state, key) ? 'CONSTRUIRE' : 'À DÉBLOQUER'}</span><span class="art">${buildingPreview(key)}</span><span class="name">${d.name}</span><span class="description">${shortDescription[key]}</span>${costs(d.cost)}${unlocked(state, key) ? '' : `<span class="lock-note">Requis : ${BUILDINGS[d.requires].name}</span>`}</button>`).join('');
}
function drawInspector() {
  const panel = $('inspector');
  if (chosen) {
    const d = BUILDINGS[chosen], ready = unlocked(state, chosen);
    panel.innerHTML = `<div class="preview">${buildingPreview(chosen)}</div><span class="eyebrow">PROJET DE CONSTRUCTION</span><h2>${d.name}</h2><p>${d.description}</p>${costs(d.cost)}${!ready ? `<p>Requis : ${BUILDINGS[d.requires].name}.</p>` : ''}<button class="action" id="inspect-action" ${ready && affordable(state, d.cost) ? '' : 'disabled'}>${placing ? 'Choisissez une case sur la carte' : 'Choisir un emplacement'}</button>`;
    $('inspect-action').onclick = () => { placing = chosen; drawMap(); drawInspector(); focusMap(); };
    return;
  }
  const b = state.buildings.find(b => b.id === selected), tile = TILE_MAP[selected];
  if (b) {
    const d = BUILDINGS[b.type], max = b.level >= d.max;
    const yieldText = d.output ? Object.entries(d.output).map(([k, n]) => `+${n * b.level * productionMultiplier(state, b.type)} ${RESOURCES[k].name.toLowerCase()}`).join(' · ') + ' / cycle' : b.type === 'habitat' ? `${6 * b.level} pionniers accueillis` : b.type === 'beacon' ? 'Le réseau stellaire est ouvert.' : '4 pionniers · le cœur de la colonie';
    panel.innerHTML = `<div class="preview">${buildingPreview(b.type)}</div><span class="eyebrow">BÂTIMENT · NIVEAU ${b.level}</span><h2>${d.name}</h2><p>${d.description}</p><p class="detail">${yieldText}</p>${max ? '<p>Niveau maximal atteint.</p>' : `<span class="eyebrow">AMÉLIORATION NIVEAU ${b.level + 1}</span>${costs(upgradeCost(b))}<button class="action" id="inspect-action" ${affordable(state, upgradeCost(b)) ? '' : 'disabled'}>Améliorer au niveau ${b.level + 1}</button>`}`;
    if (b.type !== 'pod') {
      const move = document.createElement('button'); move.className = 'move-building'; move.textContent = 'Déplacer gratuitement';
      move.onclick = () => { moving = b.id; placing = b.type; chosen = null; drawMap(); say('Choisissez une case illuminée. Échap ou Annuler conserve le bâtiment à sa place.'); focusMap(); };
      panel.append(move);
      const remove = document.createElement('button'); remove.className = 'dismantle'; remove.textContent = 'Démonter et récupérer 50 %';
      remove.onclick = () => {
        show(`<span class="section-label">RÉORGANISER LA COLONIE</span><h2>Libérer ce terrain ?</h2><p>Le bâtiment sera démonté. Vous récupérerez la moitié des matériaux investis, améliorations comprises.</p>${costs(salvage(b))}<button class="primary" id="confirm-dismantle">Démonter</button> <button id="keep-building">Conserver</button>`);
        $('keep-building').onclick = close;
        $('confirm-dismantle').onclick = () => { advance(state); close(); handle(dismantle(state, b.id)); };
      }; panel.append(remove);
    }
    if (!max) $('inspect-action').onclick = () => { advance(state); handle(upgrade(state, b.id)); };
  } else if (tile?.node) {
    const r = RESOURCES[tile.node];
    panel.innerHTML = `<span class="eyebrow">RESSOURCE RENOUVELABLE</span><h2 style="color:${r.color}">${r.icon} ${r.name}</h2><p>${tile.node === 'bio' ? 'Prélevez les fibres végétales sans abattre les arbres. La flore se régénère naturellement.' : tile.node === 'water' ? 'Une source d’eau pure, alimentée par les pluies de Kepler.' : tile.node === 'crystal' ? 'Des fragments lumineux affleurent sans cesse à la surface.' : 'Des fragments minéraux à transformer en structures durables.'}</p><p class="detail">+${tile.node === 'crystal' ? 3 : 5} par collecte · renouvellement en 2,5 s</p><button class="action" id="collect">Collecter ${r.name.toLowerCase()}</button>`;
    $('collect').onclick = () => collect(selected);
  } else panel.innerHTML = '<span class="eyebrow">UN TERRAIN À IMAGINER</span><h2>Votre prochain projet.</h2><p>Choisissez une construction ci-dessous. Les terrains disponibles s’illumineront sur la carte.</p><p class="detail">Les sources et la flore restent protégées.</p>';
}
function updateTimers() {
  const now = Date.now();
  const progress = Math.max(0, Math.min(1, (now - state.lastTick) / CYCLE));
  $('cycle-progress').value = progress;
  $('cycle-label').textContent = `Prochaine production dans ${Math.max(1, Math.ceil((1 - progress) * CYCLE / 1000))} s`;
  document.querySelectorAll('[data-node]').forEach(el => {
    const remaining = Math.max(0, (state.cooldowns[el.dataset.node] || 0) - now);
    el.classList.toggle('regenerating', remaining > 0);
    el.setAttribute('aria-label', `${RESOURCES[TILE_MAP[el.dataset.node].node].name} · ${remaining ? 'en régénération' : 'prêt à collecter'}`);
  });
  const collectButton = $('collect');
  if (collectButton) {
    const remaining = Math.max(0, (state.cooldowns[selected] || 0) - now);
    collectButton.disabled = remaining > 0;
    collectButton.textContent = remaining ? `Régénération · ${(remaining / 1000).toFixed(1)} s` : `Collecter ${RESOURCES[TILE_MAP[selected].node].name.toLowerCase()}`;
  }
}
function drawResearch() {
  $('research-cards').innerHTML = Object.entries(RESEARCH).map(([key, def]) => {
    const done = (state.research || []).includes(key);
    return `<article class="research-card ${done ? 'researched' : ''}"><span class="research-icon">${{optics:'☀',ecology:'❧',geology:'◈'}[key]}</span><span class="eyebrow">${done ? 'TECHNOLOGIE ACQUISE' : 'RECHERCHE'}</span><h3>${def.name}</h3><p>${def.text}</p>${done ? '<p class="detail">✓ Bonus permanent actif</p>' : `${costs(def.cost)}<button data-research="${key}" ${state.buildings.some(b => b.type === def.requires) && affordable(state, def.cost) ? '' : 'disabled'}>Débloquer</button><small>Requis : ${BUILDINGS[def.requires].name}</small>`}</article>`;
  }).join('');
}
$('research-cards').onclick = e => { const button = e.target.closest('[data-research]'); if (button) { advance(state); handle(research(state, button.dataset.research)); } };
function render() {
  const active = document.activeElement;
  const focusId = active?.id, tileId = active?.dataset?.tile, buildType = active?.dataset?.build;
  drawMap(); drawCatalog(); drawInspector(); drawStats(); drawResearch(); updateTimers();
  const target = focusId ? $(focusId) : tileId ? $('scene').querySelector(`[data-tile="${tileId}"]`) : buildType ? $('catalog').querySelector(`[data-build="${buildType}"]`) : null;
  target?.focus({ preventScroll: true });
}
function focusMap() { if (window.innerWidth <= 760) $('world').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
function cancelPlacement() { moving = null; placing = null; chosen = null; render(); }
$('cancel').onclick = cancelPlacement;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').open) cancelPlacement(); });
$('catalog').addEventListener('click', e => {
  const card = e.target.closest('[data-build]'); if (!card) return;
  advance(state); moving = null; chosen = card.dataset.build; selected = null;
  placing = unlocked(state, chosen) && affordable(state, BUILDINGS[chosen].cost) ? chosen : null;
  render();
  say(placing ? `${BUILDINGS[chosen].name} : choisissez une case illuminée. Vous pouvez annuler sans dépenser de ressources.` : !unlocked(state, chosen) ? `Pour ce projet, construisez d’abord : ${BUILDINGS[BUILDINGS[chosen].requires].name}.` : 'Récoltez les ressources manquantes, indiquées en rose. Les bâtiments déjà en service continuent de produire.');
  if (placing) focusMap();
});
function handle(result) {
  if (result.ok) { save(); render(); }
  say(result.message + (result.rewards?.length ? ` Étape accomplie : ${result.rewards.join(' · ')}. Récompense ajoutée !` : ''));
  if (result.rewards?.includes('Première Aube')) showEnding();
}
function floating(id, text) {
  const tile = TILE_MAP[id], p = project(tile.x, tile.y);
  const svg = $('scene').querySelector('svg'), point = svg.createSVGPoint();
  point.x = p.x; point.y = p.y - 55;
  const screen = point.matrixTransform(svg.getScreenCTM()), rect = $('world').getBoundingClientRect();
  const e = document.createElement('span'); e.className = 'floating'; e.textContent = text;
  e.style.left = `${screen.x - rect.left}px`; e.style.top = `${screen.y - rect.top}px`;
  $('float-layer').append(e); setTimeout(() => e.remove(), 1500);
}
function collect(id) {
  advance(state); const result = harvest(state, id); handle(result);
  if (result.ok) floating(id, `+${result.amount} ${RESOURCES[result.resource].icon}`);
}
function actOnTile(id) {
  advance(state);
  if (placing) {
    const result = moving ? relocate(state, moving, id) : build(state, placing, id);
    if (result.ok) { moving = null; placing = null; chosen = null; selected = id; }
    handle(result); return;
  }
  chosen = null; selected = id;
  if (TILE_MAP[id]?.node) collect(id);
  else { drawMap(); drawCatalog(); drawInspector(); drawStats(); }
}
let pointer = null, dragged = false;
$('world').addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  pointer = { x: e.clientX, y: e.clientY, center: { ...center }, id: e.pointerId };
  dragged = false;
});
$('world').addEventListener('pointermove', e => {
  if (!pointer) return;
  const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
  if (Math.abs(dx) + Math.abs(dy) < 8 && !dragged) return;
  dragged = true;
  $('world').setPointerCapture(e.pointerId);
  const scale = Math.max(1100 / zoom / $('world').clientWidth, 800 / zoom / $('world').clientHeight);
  center = { x: Math.max(150, Math.min(950, pointer.center.x - dx * scale)), y: Math.max(180, Math.min(700, pointer.center.y - dy * scale)) };
  drawMap();
});
$('world').addEventListener('pointerup', () => { pointer = null; });
$('world').addEventListener('pointercancel', () => { pointer = null; dragged = false; });
$('world').addEventListener('click', e => { if (dragged) { dragged = false; return; } const tile = e.target.closest('[data-tile]'); if (tile) actOnTile(tile.dataset.tile); });
$('world').addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-tile]')) {
    e.preventDefault(); const id = e.target.dataset.tile; actOnTile(id);
    $('scene').querySelector(`[data-tile="${id}"]`)?.focus({ preventScroll: true });
  }
});
$('zoom-in').onclick = () => { zoom = Math.min(1.8, Math.round((zoom + .2) * 10) / 10); drawMap(); };
$('zoom-out').onclick = () => { zoom = Math.max(.8, Math.round((zoom - .2) * 10) / 10); drawMap(); };
$('center').onclick = () => { ({ zoom, center } = homeCamera()); drawMap(); };
function guide(intro = false) {
  show(`<span class="section-label">UN MONDE À HABITER, PAS À CONQUÉRIR</span><h2>${intro ? 'Votre colonie commence<br>par un premier geste.' : 'Le guide des pionniers'}</h2><p>Bienvenue sur Kepler. Écho vous accompagne pour transformer un module isolé en une colonie vivante.</p><ul><li><strong>Collectez</strong> en cliquant sur les roches, cristaux, arbres et sources. Ils se renouvellent en 2,5 secondes.</li><li><strong>Construisez</strong> : choisissez un bâtiment dans le catalogue, puis une case illuminée. Son coût est prélevé à la pose.</li><li><strong>Améliorez</strong> : cliquez sur un bâtiment posé pour consulter sa production et atteindre les niveaux II et III.</li><li><strong>Accueillez</strong> : chaque niveau d’habitat ajoute 6 pionniers. Atteignez 16 habitants, construisez une serre et un port stellaire.</li></ul><p>Les installations produisent toutes les 12 secondes. La production pendant votre absence est récupérée jusqu’à 30 minutes. Pas de famine, de combat, ni d’entretien à payer. Vos réserves sont limitées à 9 999 par ressource.</p><p>Glissez la carte pour vous déplacer, utilisez + / − pour zoomer. Au clavier : Tab, Entrée ; Échap pour annuler une construction. Sur mobile, vous pouvez aussi collecter depuis la fiche de la ressource sélectionnée.</p><button class="primary" id="begin">${intro ? 'Fonder ma colonie →' : 'Revenir sur Kepler →'}</button>`);
  $('begin').onclick = () => { close(); save(); };
}
$('guide').onclick = () => guide();
$('objectives').onclick = () => show(`<span class="section-label">CARNET DE COLONISATION</span><h2>De l’abri à la colonie.</h2>${GOALS.map((g, i) => `<article><h3 class="${state.claimed.includes(i) ? 'complete' : ''}">${state.claimed.includes(i) ? '✓' : String(i + 1).padStart(2, '0')} · ${g.name}</h3><p>${g.text}</p><div class="reward">${Object.entries(g.reward).map(([k, n]) => `${RESOURCES[k].icon} +${n} ${RESOURCES[k].name.toLowerCase()}`).join(' · ')}</div></article>`).join('')}`);
function showEnding() {
  show('<div class="finish-symbol">✧</div><span class="section-label">UNE NOUVELLE COLONIE EST NÉE</span><h2>Ce monde est devenu<br>votre foyer.</h2><p>La lumière du port stellaire s’élève au-dessus des toits. Les pionniers ont de l’eau, un jardin et une place où vivre. Première Aube figure désormais sur les cartes des voyageurs.</p><p>Votre aventure continue : agrandissez les quartiers, améliorez les installations et imaginez la colonie qui vous ressemble.</p><button class="primary" id="continue">Continuer à faire grandir la colonie →</button>');
  $('continue').onclick = close;
}
$('settings').onclick = () => {
  show('<span class="section-label">VOTRE EXPÉDITION</span><h2>Options de bord</h2><p>La sauvegarde est automatique sur cet appareil et ce navigateur. L’ancienne aventure Première Aube reste dans une sauvegarde séparée. Aucune donnée n’est envoyée à un serveur.</p><p>Les animations respectent le réglage « réduire les mouvements » de votre appareil.</p><div class="settings-actions"><button id="export-save">Exporter la sauvegarde</button><button id="import-save">Importer une sauvegarde</button><input id="save-file" type="file" accept=".json,application/json" hidden><button id="reset" class="danger">Recommencer la colonie</button><button id="back">Revenir au jeu</button></div>');
  $('export-save').onclick = () => {
    advance(state); save();
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'neon-colonie.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('Sauvegarde exportée. Conservez ce fichier pour retrouver votre colonie.');
  };
  $('import-save').onclick = () => $('save-file').click();
  $('save-file').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 1000000) throw new Error('Fichier trop volumineux.');
      const candidate = importSave(await file.text());
      show(`<span class="section-label">REPRENDRE UNE EXPÉDITION</span><h2>Importer cette colonie ?</h2><p>${candidate.buildings.length} bâtiments · ${population(candidate)} pionniers. Cette sauvegarde remplacera votre colonie actuelle. Exportez votre progression avant de la remplacer si vous souhaitez la conserver.</p><button id="confirm-import" class="primary">Remplacer et reprendre</button> <button id="cancel-import">Annuler</button>`);
      $('cancel-import').onclick = close;
      $('confirm-import').onclick = () => {
        state = candidate; advance(state); moving = null; chosen = null; placing = null; selected = '5,5';
        save(); render(); close(); say('Colonie importée. Votre expédition peut reprendre.');
      };
    } catch { say('Import impossible : choisissez un fichier JSON de sauvegarde NÉON valide. Votre colonie est conservée.'); }
  };
  $('back').onclick = close;
  $('reset').onclick = () => {
    show('<span class="section-label">NOUVELLE EXPÉDITION</span><h2>Repartir du premier jour ?</h2><p>Les bâtiments et les réserves de cette colonie seront effacés sur cet appareil.</p><button class="primary" id="confirm-reset">Oui, recommencer</button> <button id="keep">Garder ma colonie</button>');
    $('keep').onclick = close;
    $('confirm-reset').onclick = () => { state = fresh(); moving = null; selected = '5,5'; chosen = null; placing = null; ({ zoom, center } = homeCamera()); save(); render(); close(); say('Un nouveau départ. Commençons par quelques prélèvements autour du module.'); };
  };
};
$('sound').onclick = async () => {
  try {
    if (!audio) {
      const Context = window.AudioContext || window.webkitAudioContext;
      audio = new Context();
      const master = audio.createGain(); master.gain.value = .065; master.connect(audio.destination);
      [130.81, 196, 261.63, 329.63].forEach((f, i) => { const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = 'sine'; osc.frequency.value = f; gain.gain.value = .22 / (i + 1); osc.connect(gain); gain.connect(master); osc.start(); });
    }
    sound = !sound;
    if (sound) await audio.resume(); else await audio.suspend();
    $('sound').setAttribute('aria-pressed', String(sound)); $('sound').title = sound ? 'Désactiver le son' : 'Activer le son';
  } catch { sound = false; say('L’ambiance sonore n’est pas disponible dans ce navigateur. La colonie continue de grandir.'); }
};
document.addEventListener('visibilitychange', () => { if (audio) { if (document.hidden) audio.suspend(); else if (sound) audio.resume(); } if (document.hidden) save(); });
window.addEventListener('pagehide', save);
setInterval(() => { const cycles = advance(state); if (cycles) { save(); drawStats(); drawResearch(); } }, 1000);
setInterval(updateTimers, 100);
render();
if (!stored) guide(true);
else if (offlineCycles && Object.values(rates(state)).some(n => n > 0)) { save(); say(`Heureux de vous retrouver. Vos installations ont produit pendant votre absence (${offlineCycles} cycles, maximum 30 minutes).`); }
else say('Votre colonie vous attend. Choisissez une ressource à récolter ou un nouveau projet à bâtir.');
