import {IMPROVEMENTS} from './colony-rules.js?v=8.1.0';
import { artUrl } from './art-url.js?v=6.0.0';
import { AGES, DT, GATHERED, LEVELS, MAPS, MAP_SIZES, RES, SIDE, STRUCTURES, STUDIES, TEAMS, TRANSITIONS, UNITS, costText, fmtTime } from './strategy-rules.js?v=8.1.0';
import { buildReason, jobDef, jobCost, jobReason } from './strategy-engine.js?v=8.1.0';

export const picture=(art,cls='')=>`<img class="${cls}" src="${artUrl(art)}" alt="" draggable="false">`;
export function button(act,text,key='',disabled=false,title='') {return `<button type="button" data-rts-act="${act}"${key?` data-key="${key}"`:''}${disabled?' disabled':''}${title?` title="${title}"`:''}>${text}</button>`;}
const prices=cost=>Object.entries(cost||{}).map(([k,n])=>`<span title="${RES[k].name}">${picture(RES[k].art)}${n}</span>`).join('');
function card(act,key,d,reason,art) {return `<button type="button" class="rts-card" data-rts-act="${act}" data-key="${key}" title="${d.note} ${reason||costText(d.cost)}" ${reason?'disabled':''}>${art?picture(art):''}<span><b>${d.name}</b><small class="rts-price">${prices(d.cost)}</small>${reason?`<small class="rts-locked">${reason}</small>`:''}</span></button>`;}
const crest='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 3 14 7-1 15-13 12L7 25 6 10Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m10 23 10-14 11 15-9-5-6 8 2-10Z" fill="currentColor"/></svg>';
export function setupMarkup(options,saved) {
  return `<div class="rts-setup"><div class="rts-keyart">${picture('rts-valley')}<div class="rts-keycopy"><span>${crest} NÉON</span><h1>Les Deux Rives</h1><p>Bâtissez Aurore, partez en rover au-delà des gués et défendez votre cité face aux Maisons de Cendre.</p></div></div>
    <div class="rts-briefing"><div class="rts-brow">PLANÈTE KEPLER</div><h2>Fonder Aurore</h2>
    <fieldset><legend>Bassin d’implantation</legend><div class="rts-options">${Object.entries(MAPS).map(([k,m])=>`<button data-rts-act="map" data-key="${k}" aria-pressed="${k===options.region}">${m.name}</button>`).join('')}</div><p>${MAPS[options.region].terrain}</p></fieldset>
    <fieldset><legend>Taille de carte</legend><div class="rts-options rts-sizes">${Object.entries(MAP_SIZES).map(([k,m])=>`<button data-rts-act="size" data-key="${k}" aria-pressed="${Number(k)===options.size}"><b>${m.name}</b><small>${k} × ${k}</small></button>`).join('')}</div><p>Jusqu’à ${MAP_SIZES[options.size].population} unités par camp avec les habitats.</p></fieldset>
    <fieldset><legend>Difficulté</legend><div class="rts-options">${Object.entries(LEVELS).map(([k,l])=>`<button data-rts-act="level" data-key="${k}" aria-pressed="${k===options.level}">${l.name}</button>`).join('')}</div><p>${{calm:'Cendre vous laisse davantage de temps pour installer la colonie.',even:'Cendre développe sa cité et envoie des groupes reconnaître les gués.',fierce:'Cendre lance ses premiers assauts plus tôt.'}[options.level]}</p></fieldset>
    <label class="rts-seed">Numéro de carte <input id="rts-seed" type="number" min="0" max="4294967295" step="1" value="${options.seed}">${button('reroll','↻','','','Tirer une autre carte')}</label>
    <button class="rts-primary" data-rts-act="start">Fonder la colonie <span>→</span></button>
    ${saved?button('resume','Revenir à ma colonie'):''}<button class="rts-text" data-rts-act="import">Importer une sauvegarde</button></div></div>`;
}
export function arenaMarkup(s) {
  return `<div class="rts-play"><div class="rts-bar"><div class="rts-brand">${crest}<div><b>NÉON</b><small>LES DEUX RIVES</small></div></div>
    <div class="rts-stock" aria-label="Ressources d’Aurore">${Object.entries(RES).map(([k,r])=>`<div title="${r.name}" aria-label="${r.name}">${picture(r.art)}<span><b data-stock="${k}">0</b><small>${r.name} <i data-gatherers="${k}"></i></small></span></div>`).join('')}</div>
    <div class="rts-pop" title="Population, unités en formation et capacité"><b id="rts-pop"></b><small>Population</small></div><div class="rts-time"><b id="rts-time">0:00</b><small id="rts-age">Âge I</small></div>
    <div class="rts-controls">${button('pause','Ⅱ','','','Pause ou reprise (P)')}${button('speed','1×','','','Vitesse de simulation')}${button('menu','☰','','','Menu de la colonie')}</div></div>
    <div class="rts-layout"><div class="rts-stage"><svg id="rts-map" tabindex="0" role="group" aria-label="Champ de bataille. Flèches pour viser, Entrée pour sélectionner ou donner un ordre."></svg>
      <div class="rts-map-title"><small>LIGUE D’AURORE</small><h2>${MAPS[s.region].name}</h2><small>${s.size??SIDE} × ${s.size??SIDE} · </small><span id="rts-mission"></span><button type="button" data-rts-act="locate-spire" hidden>Localiser la Flèche adverse</button><button type="button" data-rts-act="locate-contact" hidden>Voir le contact</button></div><div id="rts-alert" hidden></div>
      <div id="rts-marquee" hidden></div><button class="rts-mini-wrap" data-rts-minimap aria-label="Centrer la caméra avec la minicarte"><canvas width="312" height="184" aria-hidden="true"></canvas><svg id="rts-mini" viewBox="0 0 156 92" preserveAspectRatio="none" aria-hidden="true"></svg></button>
      <div class="rts-map-controls">${button('drag','Cadre','','','Alterner sélection au cadre et déplacement de la caméra')}${button('zoom-out','−','','','Dézoomer')}${button('zoom-in','+','','','Zoomer')}${button('overview','Carte','','','Vue d’ensemble de la carte')}${button('home','⌾','','','Centrer sur le forum')}</div><div id="rts-mode" hidden><span></span>${button('cancel','Annuler')}</div></div>
    <div class="rts-dock"><nav class="civic-nav" aria-label="Commandement de la colonie">${[['orders','Ordres'],['city','Cité'],['rover','Rover']].map(([k,n])=>`<button data-rts-act="panel" data-key="${k}" aria-pressed="${k==='orders'}">${n}</button>`).join('')}</nav><div id="civic-orders"><div class="rts-quick" aria-label="Sélections rapides">${button('idle','Pionnier libre')}${button('workers','Pionniers')}${button('army','Armée')}${button('forum','Forum')}</div>
    <div id="rts-info"></div><div id="rts-commands"></div><div id="rts-queue"></div>
    <section class="rts-intel" aria-label="Situation tactique"><h3>Effectifs</h3><div class="rts-roster">${Object.entries(UNITS).map(([k,d])=>`<button type="button" data-rts-act="cohort" data-key="${k}" title="Sélectionner les unités de ce type"><img src="${artUrl(d.art)}" alt=""><span>${d.name}<b data-roster="${k}">0</b></span></button>`).join('')}</div>
    <h3 id="rts-next-title">Prochain âge</h3><p id="rts-next"></p><details class="rts-history"><summary>Journal du commandement</summary><ol id="rts-log"></ol></details></section>
    </div><div id="civic-panel" hidden></div><div id="rts-radio" role="status" aria-live="polite"></div><button class="rts-text rts-help" data-rts-act="help">Commandes et objectifs</button></div></div><div id="rts-sheet" hidden></div></div>`;
}
export function describe(s,items){
  if(!items.length)return `<div class="rts-selected"><div><small>COMMANDEMENT</small><h3>Aurore</h3><p>Choisissez des unités sur le terrain ou utilisez les sélections rapides.</p></div></div>`;
  const first=items[0];if(first.kind==='rover')return `<div class="rts-selected">${picture('rover')}<div><small>EXPLORATION</small><h3>Rover de Kepler</h3><p>Transmet ses observations à la cité.</p></div></div>`;
  if(first.kind==='relay'){const r=s.relay;return `<div class="rts-selected">${picture('beacon')}<div><small>POINT DE CONTRÔLE</small><h3>Relais du bassin</h3><p>${r.owner<0?'Relais neutre':TEAMS[r.owner]} · ${r.contender>=0?`capture ${Math.floor(r.progress)} / 12 s`:'2 cristaux toutes les 8 s et vision locale'}</p></div></div>`;}
  if(first.kind==='node'){const n=first.e;return `<div class="rts-selected">${picture(RES[n.kind].art)}<div><small>GISEMENT</small><h3>${RES[n.kind].name}</h3><p>${first.visible?`${n.left} unités disponibles.`:'Dernière position connue.'} Assignez un pionnier pour exploiter ce site.</p></div></div>`;}
  const e=first.e,isUnit=first.kind==='unit',d=(isUnit?UNITS:STRUCTURES)[e.type];
  if(items.length>1){const counts={};for(const o of items)counts[o.e.type]=(counts[o.e.type]||0)+1;return `<div class="rts-selected">${picture(d.art)}<div><small>GROUPE D’AURORE</small><h3>${items.length} unités</h3><p>${Object.entries(counts).map(([k,n])=>`${n} × ${UNITS[k].name}`).join(' · ')}</p></div></div>`;}
  let status='';if(isUnit){status={idle:'Disponible',move:'En mouvement',advance:'En progression',attack:'Engagé',gather:e.order.delivering?'Retour au dépôt':`Collecte de ${RES[e.order.resource]?.name.toLowerCase()||''}`,assist:'Au chantier',repair:'En réparation',staff:'En poste à la production'}[e.order.kind];if(e.cargo)status+=` · charge ${e.cargo.n} ${RES[e.cargo.kind].name.toLowerCase()}`;}
  else status=e.ready?(e.type==='spire'?`Synchronisation · ${Math.floor(e.hold)} / 90 s`:(d.max>1?'En service · niveau '+(e.level||1):'En service')):`Chantier · ${Math.floor(e.work/d.time*100)} %`;
  return `<div class="rts-selected">${picture(d.art)}<div><small>${TEAMS[e.side].toUpperCase()}</small><h3>${d.name}</h3><p>${status} · ${Math.ceil(e.hp)} / ${d.hp} PV</p></div></div><p class="rts-note">${d.note}</p>`;
}
const catalog={
  base:['house','depot','farm','barracks','solar','pump','hangar'],
  industry:['solar','pump','greenhouse','mine','wind','residence','hydroponics','quarry','synthesizer'],
  army:['house','depot','farm','barracks','workshop','tower','spire'],
  science:['hangar','laboratory','beacon','observatory','lighthouse'],
};
export function commands(s,items,buildMenu,filter='base') {
  const first=items[0];if(!first)return '';
  if(first.kind==='rover')return button('panel','Ouvrir les commandes du rover','rover');
  if(first.kind==='node')return button('send-worker','Affecter un pionnier');
  if(first.kind==='relay')return button('send-army','Envoyer l’armée au relais');
  const e=first.e;if(e.side)return '';
  if(first.kind==='building'){
    if(!e.ready)return `<div class="rts-buttons">${button('assist-site','Affecter un pionnier')}${button('cancel-site','Annuler le chantier')}</div>`;
    const jobs=[];for(const [key,d] of Object.entries(UNITS))if(d.at===e.type)jobs.push(card('unit',key,d,jobReason(s,e,'unit',key),d.art));
    for(const [key,d] of Object.entries(STUDIES))if(d.at===e.type&&!s.teams[0].tech.includes(key))jobs.push(card('tech',key,{...d,cost:jobCost(s,e,'tech',key)},jobReason(s,e,'tech',key),'vial'));
    if(e.type==='forum'&&s.teams[0].age<3){const key=s.teams[0].age+1; jobs.push(card('age',String(key),TRANSITIONS[key],jobReason(s,e,'age',String(key)),'beacon'));}
    const next=e.type+'-'+((e.level||1)+1),upgrade=IMPROVEMENTS[next];if(upgrade)jobs.push(card('level-up',next,upgrade,jobReason(s,e,'level',next),STRUCTURES[e.type].art));
    let extra='';
    if(e.type==='hangar')extra+=button('panel','Préparer une sortie','rover');
    if(Object.keys(STRUCTURES[e.type].output||{}).length)extra+=button('staff-site','Affecter un pionnier à la production');
    if(STRUCTURES[e.type].civil||e.type==='house')extra+=button('relocate','Déplacer')+button('salvage','Démonter');
    if(['forum','barracks','workshop'].includes(e.type))extra+=button('rally','Point de ralliement');if(e.type==='farm')extra+=button('send-worker','Affecter un pionnier');if(e.hp<STRUCTURES[e.type].hp-.01)extra+=button('repair-site','Réparer');
    return `<div class="rts-cards">${jobs.join('')}</div><div class="rts-buttons">${extra}</div>`;
  }
  const workers=items.some(o=>o.e.type==='worker'),military=items.some(o=>o.e.type!=='worker');
  if(buildMenu&&workers)return `<div class="rts-subhead"><b>Chantiers</b>${button('back-orders','Retour')}</div>
    <div class="civic-pills">${[['base','Essentiels'],['industry','Économie'],['army','Défense'],['science','Science']].map(([k,n])=>`<button data-rts-act="filter" data-key="${k}" aria-pressed="${filter===k}">${n}</button>`).join('')}</div>
    <div class="rts-cards buildings">${catalog[filter].map(k=>{const d=STRUCTURES[k],voucher=s.campaign?.charters.find(v=>v.type===k);return card('build',k,voucher?{...d,name:d.name+' · kit niv. '+voucher.level,cost:{}}:d,buildReason(s,0,k),d.art);}).join('')}</div>`;
  return `<div class="rts-buttons">${workers?button('build-menu','Construire (B)'):''}${military?button('advance','Avancer en combattant (A)'):''}${button('target','Ordre ciblé')}${button('stop','Halte')}</div>${workers?`<div class="rts-subhead"><b>Récolter à proximité</b></div><div class="rts-harvest">${GATHERED.map(k=>button('harvest',`${picture(RES[k].art)} ${RES[k].name}`,k)).join('')}</div>`:''}`;
}
export function queueMarkup(b){if(!b?.queue?.length)return '';return `<div class="rts-subhead"><b>File de production</b></div><ol class="rts-jobs">${b.queue.map((j,i)=>`<li><span>${jobDef(j.kind,j.key).name}<small>${i?'En attente':j.left>0?`${Math.ceil(j.left)} s`:'En attente d’un logement'}</small></span>${button('cancel-job','×',String(i),false,'Annuler et rembourser')}</li>`).join('')}</ol>`;}
export function helpMarkup(){return `<h2>Commandes du terrain</h2><dl class="rts-keys"><dt>Clic gauche</dt><dd>Sélectionner une unité. Cliquez ensuite sur un gisement, une cible ou le sol pour donner un ordre.</dd><dt>Clic droit</dt><dd>Donner un ordre contextuel. Un bâtiment de formation peut fixer un point de ralliement.</dd><dt>Glisser</dt><dd>Tracer une sélection au clic gauche. Maintenez le bouton du milieu pour déplacer la caméra.</dd><dt>Molette · minicarte · O</dt><dd>Zoomer vers le pointeur, centrer la caméra, afficher la vue d’ensemble.</dd><dt>Maj + clic · double-clic</dt><dd>Ajouter ou retirer une unité. Double-cliquer sélectionne son type à l’écran.</dd><dt>Ctrl + 1 à 5 · 1 à 5</dt><dd>Mémoriser puis rappeler un groupe.</dd><dt>H · V · M · Q</dt><dd>Forum, pionniers, armée et prochain pionnier libre.</dd><dt>B · A · P</dt><dd>Construire, avancer en combattant et mettre en pause.</dd><dt>Flèches · Entrée</dt><dd>Déplacer le curseur sur la carte puis interagir. Échap annule l’ordre préparé.</dd></dl><p>Les rubriques Cité et Rover gardent la carte en mouvement. Les installations produisent toutes les 12 secondes. Les ressources du rover rejoignent le stock au retour. Un relais tenu 12 secondes par des unités militaires donne des cristaux et de la vision. Détruisez le forum ennemi ou gardez votre Flèche orbitale en service pendant 90 secondes pour pacifier le bassin. Votre colonie poursuit ensuite ses découvertes.</p>${button('back','Reprendre le commandement')}`;}
