import { artUrl } from './art-url.js?v=6.0.0';
import { BUILDINGS, RESOURCES, affordable, buildRequirement, colonySites, crewCapacity, fieldState, has } from './engine.js?v=6.0.0';
import { CHAPTERS, COLS, HOME, RIGS, canScan, coordinate, neighbors, radarCost, returnRoute, sector, tideHigh, travelCost } from './frontier.js?v=6.0.0';
import { TERRAIN_LABELS, WORKSHOPS } from './crews.js?v=6.0.0';

const titles = { rover: 'Rover', council: 'Conseil', crews: 'Équipes' };
const manifest = cost => Object.entries(cost).map(([k, n]) => `${n} ${RESOURCES[k].name.toLowerCase()}`).join(' · ');
const illustration = (name, cls = '') => `<img class="${cls}" src="${artUrl(name)}" alt="">`;
const tag = (text, value) => `<div><dt>${text}</dt><dd>${value}</dd></div>`;
const position = id => ({ x: 41 + 52 * (id % COLS) + 26 * (Math.floor(id / COLS) & 1), y: 37 + 45 * Math.floor(id / COLS) });
const hex = '0,-29 25,-14.5 25,14.5 0,29 -25,14.5 -25,-14.5';
const featureNames = { base: 'Camp avancé', signal: 'Signal', cache: 'Borne de recharge', crystal: 'Filon de cristaux', ore: 'Filon de minerai' };

export function operationStatus(s) {
  if (s.frontier.active) return 'Reprendre le pilotage';
  if (s.frontier.decisions.length < CHAPTERS.length && s.frontier.signals > s.frontier.decisions.length) return 'Réunir le conseil';
  if (s.frontier.decisions.length === CHAPTERS.length && !has(s, 'lighthouse')) return 'Bâtir le phare';
  return 'Ouvrir les opérations';
}
export function suggestedTab(s) {
  if (s.frontier.active) return 'rover';
  return operationStatus(s) === 'Ouvrir les opérations' ? 'rover' : 'council';
}

function crewStatus(s, id) {
  const index = s.crews.indexOf(id);
  return index < 0 ? 'Libre' : index < crewCapacity(s) ? 'En activité' : 'En attente de pionniers';
}
export function inspectorCrew(s, b) {
  const def = WORKSHOPS[b.type];
  if (!def) return '';
  const site = colonySites(s)(b.type, b.id), assigned = s.crews.includes(b.id);
  return `<div class="worksite-detail"><strong>Équipe de terrain</strong><p>+${site.total} ${RESOURCES[site.resource].name.toLowerCase()} / cycle avec une équipe.</p>
    <ul><li>${site.terrain ? '✓' : '○'} ${TERRAIN_LABELS[def.terrain]} voisin · +${site.landBonus}</li><li>${site.partner ? '✓' : '○'} ${def.partners.map(k => BUILDINGS[k].name).join(' ou ')} à côté · +2</li></ul>
    <button data-inspect-crew="${b.id}" ${!assigned && s.crews.length >= crewCapacity(s) ? 'disabled' : ''}>${assigned ? 'Rappeler l’équipe' : 'Affecter une équipe'}</button> <button data-ops-crews>Gérer les équipes</button></div>`;
}
function crewsPage(s) {
  const capacity = crewCapacity(s), inspect = colonySites(s);
  const active = Math.min(s.crews.length, capacity);
  const buildings = s.buildings.filter(b => WORKSHOPS[b.type]).map(b => ({ b, site: inspect(b.type, b.id) }));
  buildings.sort((a,b) => Number(s.crews.includes(b.b.id))-Number(s.crews.includes(a.b.id)) || b.site.total-a.site.total);
  const rows = buildings.map(({b,site}) => {
    const assigned = s.crews.includes(b.id), definition = WORKSHOPS[b.type];
    return `<li class="duty-row">${illustration(b.type)}<div><b>${BUILDINGS[b.type].name}</b><small>${b.id} · ${crewStatus(s,b.id)}</small><small>${site.terrain ? '✓' : '○'} ${TERRAIN_LABELS[definition.terrain]} · ${site.partner ? '✓' : '○'} Atelier partenaire</small></div><div class="duty-yield">+${site.total}<small>${RESOURCES[site.resource].name} / cycle</small></div><div class="duty-actions"><button data-op="crew" data-site-id="${b.id}" ${!assigned && s.crews.length >= capacity ? 'disabled' : ''}>${assigned ? 'Rappeler' : 'Affecter'}</button><button data-op="locate" data-site-id="${b.id}">Sur la carte</button></div></li>`;
  }).join('');
  return `<div class="ops-heading"><div><small>COLONIE</small><h3>Équipes de terrain</h3></div><strong>${active} / ${capacity} en activité</strong></div>
    <p>Une équipe apporte un supplément de production. Un gisement favorable ou un atelier partenaire sur l’une des quatre cases voisines l’augmente. Les cases dorées signalent ces emplacements pendant la construction.</p>
    <p class="ops-note">Les quatre premiers pionniers forment une équipe. Chaque groupe de six pionniers supplémentaires en forme une autre, jusqu’à six. Si un logement disparaît, les dernières affectations attendent son remplacement.</p>
    ${rows ? `<ul class="duties">${rows}</ul>` : '<p>Construisez une centrale solaire pour donner son premier poste à l’équipe.</p><button class="primary" data-op="project" data-type="solar">Choisir une centrale solaire</button>'}`;
}

function lastReport(s) {
  const last = s.frontier.last;
  if (!last) return '';
  return `<p class="ops-note"><b>Dernier retour · secteur ${last.number}</b><br>${last.recalled ? 'Rapatriement à vide.' : `${last.signal ? 'Fragment transmis. ' : ''}${last.ore} minerais et ${last.crystal} cristaux déchargés.${last.order ? ` Prime du mandat · ${manifest(sector(s.world,last.number).order.reward)}.` : ''}`}</p>`;
}
function hangarPage(s, rig) {
  const f = s.frontier, next = sector(s.world, f.sorties + 1), def = RIGS[rig];
  const cards = Object.entries(RIGS).map(([key, r]) => `<button class="rig-card" data-op="rig" data-rig="${key}" aria-pressed="${key === rig}"><b>${r.name}</b><span>${r.battery + (f.decisions.includes('cells') ? 3 : 0)} charges</span></button>`).join('');
  let command;
  if (s.survey.active) command = '<p>Le rover est parti chercher un spécimen. Récupérez sa cargaison à son retour pour reprendre le pilotage.</p><button class="primary" data-op="survey">Suivre l’expédition</button>';
  else if (!has(s, 'hangar')) command = '<p>Le module pionnier a repéré le signal. Il faut un hangar pour mettre le rover en route.</p><button class="primary" data-op="project" data-type="hangar">Construire le hangar</button>';
  else command = `<button class="primary" data-op="launch" data-pay-rig="${rig}">Prendre les commandes →</button><small class="funding" data-funding-rig="${rig}"></small>`;
  return `<div class="ops-heading"><div><small>RECONNAISSANCE · SECTEUR ${f.sorties + 1}</small><h3>${next.region.name}</h3></div></div>
    ${f.orders ? `<small class="order-count">${f.orders} mandat${f.orders>1?'s':''} accompli${f.orders>1?'s':''}</small>` : ''}<p>Pilotez le rover jusqu’au signal, puis ramenez le fragment au camp. La brume masque le relief. Un détour vers une borne peut vous donner assez de charge pour prélever un filon.</p>
    <div class="rig-picker" aria-label="Équipement du rover">${cards}</div><div class="rig-brief">${illustration('rover')}<div><b>${def.name}</b><p>${def.detail}</p><small>Provisions au départ · ${manifest(def.cost)}</small></div></div>
    <details class="field-order" open><summary>Mandat facultatif · ${next.order.name}</summary><p>${next.order.text} Prime au retour · ${manifest(next.order.reward)}.</p></details>
    <div class="ops-command">${command}</div>${lastReport(s)}`;
}
function councilPage(s, pending) {
  const f = s.frontier, index = f.decisions.length, chapter = CHAPTERS[index];
  const history = f.decisions.map((key,i) => `<li><b>${CHAPTERS[i].options[key].name}</b><small>${CHAPTERS[i].options[key].effect}</small></li>`).join('');
  let body;
  if (!chapter) {
    const lit = has(s, 'lighthouse'), name = f.decisions.includes('passage') ? 'Le passage des îles' : 'Le foyer des veilleurs';
    const reason = buildRequirement(s, 'lighthouse');
    body = `<div class="council-finale">${illustration('lighthouse')}<div><h3>${lit ? name : 'Élever le phare des marées'}</h3><p>${lit ? (f.decisions.includes('passage') ? 'Une voile répond au loin. Un équipage qui cherchait la passe vient de retrouver la côte.' : 'À la nuit tombée, chaque atelier allume sa lampe à l’heure du phare. Depuis le large, on distingue la ville entière.') : 'Les trois fragments donnent la fréquence de la lanterne. Le port stellaire peut maintenant alimenter le phare.'}</p>${lit ? '<b>Phare en service · campagne accomplie</b>' : `<small>${reason || manifest(BUILDINGS.lighthouse.cost)}</small><button class="primary" data-op="project" data-type="${reason && !has(s,'beacon') ? 'beacon' : 'lighthouse'}">${reason && !has(s,'beacon') ? 'Voir le port stellaire' : 'Choisir l’emplacement du phare'}</button>`}</div></div>`;
  } else {
    const ready = f.signals > index, chosen = chapter.options[pending];
    body = `<div class="ops-heading"><div><small>TRANSMISSION ${index + 1} / ${CHAPTERS.length}</small><h3>${chapter.title}</h3></div></div>`;
    if (!ready) body += `<p>${index ? 'Le conseil attend la prochaine transmission.' : 'Une balise répond sous la surface. Le conseil a besoin du premier enregistrement pour en comprendre le message.'} Rapportez un fragment depuis la carte de reconnaissance.</p><button class="primary" data-op="tab" data-tab="rover">${f.active ? 'Reprendre le pilotage' : 'Préparer une sortie'}</button>`;
    else {
      body += `<p>${chapter.story}</p><p class="ops-note">La colonie peut financer un seul de ces deux projets. Son effet est permanent.</p><div class="decision-options">${Object.entries(chapter.options).map(([key, choice]) => `<button data-op="proposal" data-choice="${key}" aria-pressed="${key === pending}"><strong>${choice.name}</strong><span>${choice.effect}</span><small>${manifest(choice.cost)}</small></button>`).join('')}</div>`;
      if (chosen) body += `<div class="ops-command"><button class="primary" data-op="ratify" data-choice="${pending}" data-pay-choice="${pending}">Adopter ce projet</button><small class="funding" data-funding-choice="${pending}"></small></div>`;
    }
  }
  return `<ol class="signal-track" aria-label="Fragments du signal">${CHAPTERS.map((ch,i) => `<li class="${i < index ? 'settled' : i < f.signals ? 'received' : ''}"><span>${i < index ? '✓' : i+1}</span>${['L’abri','Les archives','Le phare'][i]}</li>`).join('')}</ol>${body}${history ? `<details class="decisions-log"><summary>Décisions adoptées (${index})</summary><ul>${history}</ul></details>` : ''}`;
}

function featureMark(feature) {
  if (feature === 'signal') return '<g class="signal-glyph"><circle r="9" fill="none" stroke="#ffce78"/><circle r="4" fill="#fff0a8"/><path d="M0-15v4m0 22v4m11-15h4m-30 0h4" stroke="#ffdb93" stroke-width="2"/></g>';
  const sprite = { base: 'hangar', cache: 'battery', crystal: 'crystal', ore: 'ore' }[feature];
  return sprite ? `<image href="${artUrl(sprite)}" x="-15" y="-17" width="30" height="29"/>` : '';
}
function fieldMap(board, drive, route) {
  const near = neighbors[drive.at];
  const paths = drive.trail.map(id => { const p=position(id); return `${p.x},${p.y}`; }).join(' ');
  const groundTexture = { 'site-flora': 'prairie', 'site-strata': 'sand', 'site-prism': 'rock-shelf' }[board.region.art];
  const picture = `<pattern id="field-surface" width="175" height="125" patternUnits="userSpaceOnUse"><image href="${artUrl(groundTexture)}" width="175" height="125" preserveAspectRatio="xMidYMid slice"/></pattern>`;
  let ground='', symbols='', controls='';
  for (const t of board.tiles) {
    const p=position(t.id), trans=`transform="translate(${p.x} ${p.y})"`, seen=drive.seen.has(t.id), current=t.id===drive.at;
    const knownSignal = t.feature === 'signal';
    const reachable = near.includes(t.id) && t.terrain !== 'rift' && travelCost(drive,t) <= drive.fuel;
    ground += `<g ${trans}><polygon points="${hex}" class="field-tile ${seen ? 'known '+t.terrain : 'fog'}"/>${seen && t.terrain !== 'rift' ? `<polygon points="${hex}" fill="url(#field-surface)" opacity=".26"/>` : ''}${!seen ? `<polygon points="${hex}" fill="url(#field-noise)"/>` : ''}</g>`;
    let symbol = '';
    if ((seen || knownSignal) && t.feature && (!drive.used.has(t.id) || knownSignal)) symbol=featureMark(t.feature);
    else if (seen && t.terrain === 'rift') symbol='<path d="m-16 10 10-11 5 2 7-13-2 13-7 4-2 7Z" fill="#080f1a" stroke="#63818b" stroke-width=".8"/>';
    else if (seen && t.terrain === 'flat') symbol='<path d="M-13 -3q4-4 8 0t8 0t8 0m-22 6q4-4 8 0t8 0" fill="none" stroke="#a5e7de" stroke-width="1.7"/>';
    else if (seen && t.terrain === 'rock') symbol=`<image href="${artUrl('ore-slate')}" x="-13" y="-12" width="26" height="21" opacity=".7"/>`;
    if (current) symbol=`${t.feature === 'base' ? '<circle r="17" fill="none" stroke="#97f2d4" stroke-dasharray="2 3"/>' : ''}<image href="${artUrl('rover')}" x="-18" y="-16" width="36" height="31"/>`;
    if (symbol) symbols+=`<g ${trans} pointer-events="none">${symbol}</g>`;
    if (reachable) {
      const c=travelCost(drive,t), label=`${coordinate(t.id)} · ${featureNames[t.feature] || (t.terrain==='rock' ? 'Éboulis' : t.terrain === 'flat' ? 'Estran' : board.region.plain)} · ${c} charge${c>1?'s':''}`;
      controls+=`<g ${trans} class="field-move" data-op="move" data-cell="${t.id}" role="button" tabindex="0" aria-label="${label}"><title>${label}</title><polygon points="${hex}"/><text y="19">${c}</text></g>`;
    }
  }
  const letters = Array.from({length:COLS},(_,i)=>`<text x="${41 + i*52}" y="7">${'ABCDEFG'[i]}</text>`).join('');
  const numbers = Array.from({length:5},(_,i)=>`<text x="9" y="${40+i*45}">${i+1}</text>`).join('');
  const homeTrail = route.length ? [drive.at,...route].map(id => { const p=position(id); return `${p.x},${p.y}`; }).join(' ') : '';
  return `<svg class="field-map" viewBox="0 -3 403 253" role="group" aria-label="Carte tactique du secteur ${board.number}"><defs>${picture}<pattern id="field-noise" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".75" fill="#76a7ac" opacity=".32"/></pattern></defs><g class="field-coords">${letters}${numbers}</g>${ground}<polyline points="${paths}" fill="none" stroke="#d0b376" stroke-width="2" stroke-dasharray="3 4" pointer-events="none"/>${homeTrail ? `<polyline class="return-line" points="${homeTrail}" fill="none" stroke="#9cf8ed" stroke-linecap="round" stroke-width="3" stroke-dasharray="4 4" pointer-events="none"/>` : ''}${symbols}${controls}</svg>`;
}
function fieldPage(s, view) {
  const {board, drive} = fieldState(s), atCamp = drive.at === HOME, route = returnRoute(board,drive), reserve = route.cost;
  const charge = radarCost(drive), onRoute = drive.trail.length > 1;
  const legend = [['signal','Signal'],['cache','Borne +5'],['ore','Filon'],['base','Camp']].map(([key,label])=>`<span><svg viewBox="-18 -18 36 36" aria-hidden="true">${featureMark(key)}</svg>${label}</span>`).join('');
  const tide = tideHigh(drive.turn), until = (tide ? 5 : 3) - drive.turn % 5;
  const forecast = Array.from({length:5},(_,i) => `<i class="${tideHigh(drive.turn+i)?'high':'low'}" aria-hidden="true"></i>`).join('');
  const [amount, goal, unit] = board.order.progress(drive);
  const safety = drive.fuel < reserve ? 'Batterie trop faible pour ce trajet de retour. Cherchez une borne ou rappelez le rover.' : `Retour connu le plus court · ${reserve} charge${reserve>1?'s':''}, hors recharge.`;
  return `<div class="field-layout"><div class="field-console" style="--region:${board.region.color}"><div class="field-title"><div><small>SECTEUR ${board.number} · ${coordinate(drive.at)}</small><h3>${board.region.name}</h3></div><b class="field-live">${RIGS[drive.rig].name}</b></div>${fieldMap(board,drive,view.route ? route.path : [])}<div class="field-legend">${legend}</div></div>
    <section class="telemetry"><dl>${tag('Batterie',`${drive.fuel} <small>/ ${drive.max}</small>`)}${tag('Signal',drive.signal?'À bord':coordinate(board.target))}${tag('Soute',`${drive.cargo.ore} <small>minerais</small> · ${drive.cargo.crystal} <small>cristaux</small>`)}</dl>
    <div class="tide-readout"><div><b>Marée ${tide?'haute':'basse'}</b><span>${forecast}</span></div><small>Bascule dans ${until} tour${until>1?'s':''} · estran ${tide?3:1} ⚡</small></div>
    <p class="route-status ${drive.fuel<reserve?'low':''}">${safety}${view.route && route.path.length ? `<br>${route.path[0]===drive.at ? 'Attendez un tour sur place.' : `Première étape · ${coordinate(route.path[0])}.`}` : ''}</p><p class="field-help">Les cases cerclées sont à portée. Le chiffre indique la dépense pour y entrer. Ramenez le signal au camp pour le transmettre.</p>
    <details class="field-order"><summary>Mandat · ${amount} / ${goal} ${unit}</summary><p>${board.order.name}. ${board.order.text} Prime · ${manifest(board.order.reward)}.</p></details>
    <div class="drive-actions"><button data-op="route" aria-pressed="${view.route}" ${atCamp?'disabled':''}>${view.route?'Masquer le retour':'Tracer le retour'}</button><button data-op="wait" ${drive.fuel?'':'disabled'}>Attendre · 1 ⚡</button><button data-op="scan" ${canScan(drive)?'':'disabled'}>Balayer au radar · ${charge} ⚡</button><button class="primary" data-op="dock" ${atCamp&&onRoute?'':'disabled'}>Décharger au camp</button></div>
    ${view.recall ? '<div class="recall-check"><p>Le rover reviendra immédiatement. Le signal et les matériaux à bord seront abandonnés.</p><button data-op="rescue">Confirmer le rappel à vide</button> <button data-op="cancel-recall">Continuer la sortie</button></div>' : '<button class="quiet-command" data-op="recall">Rappeler le rover à vide</button>'}</section></div>`;
}
export function operationsPanel(s, view) {
  const body = view.tab === 'crews' ? crewsPage(s) : view.tab === 'council' ? councilPage(s,view.pending) : s.frontier.active ? fieldPage(s,view) : hangarPage(s,view.rig);
  const inField = view.tab === 'rover' && !!s.frontier.active;
  return `<div class="operations ${inField ? 'in-field' : ''}"><div class="ops-mast">${illustration('tidal-station')}<div><small>OPÉRATIONS DE KEPLER</small><h2>Le Signal des marées</h2></div></div>
    <nav class="ops-tabs" aria-label="Postes d’opérations">${Object.entries(titles).map(([key,name])=>`<button data-op="tab" data-tab="${key}" aria-pressed="${view.tab===key}">${name}${key==='council' && s.frontier.signals>s.frontier.decisions.length && s.frontier.decisions.length<3 ? ' <i aria-label="Décision disponible">●</i>':''}</button>`).join('')}</nav>
    <div class="ops-body">${body}<p class="ops-feedback" role="status" aria-live="polite">${view.message}</p></div></div>`;
}
export function updateFunding(root, state) {
  for (const button of root.querySelectorAll('[data-pay-rig],[data-pay-choice]')) {
    const rig = button.dataset.payRig, choice = button.dataset.payChoice;
    const cost = rig ? RIGS[rig].cost : CHAPTERS[state.frontier.decisions.length]?.options[choice]?.cost;
    if (!cost) continue;
    button.disabled = !affordable(state,cost);
    const hint = root.querySelector(rig ? '[data-funding-rig]' : '[data-funding-choice]');
    if (hint) hint.textContent = button.disabled ? 'À réunir · '+manifest(Object.fromEntries(Object.entries(cost).filter(([k,n])=>n>state.resources[k]).map(([k,n])=>[k,n-state.resources[k]]))) : '';
  }
}
