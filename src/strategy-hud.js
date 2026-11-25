import { artUrl } from './art-url.js?v=6.0.0';
import { AGES, DT, LEVELS, MAPS, RES, STRUCTURES, STUDIES, TEAMS, TRANSITIONS, UNITS, costText, fmtTime } from './strategy-rules.js?v=7.0.0';
import { buildReason, jobDef, jobReason } from './strategy-engine.js?v=7.0.0';

export const picture=(art,cls='')=>`<img class="${cls}" src="${artUrl(art)}" alt="" draggable="false">`;
export function button(act,text,key='',disabled=false,title='') {return `<button type="button" data-rts-act="${act}"${key?` data-key="${key}"`:''}${disabled?' disabled':''}${title?` title="${title}"`:''}>${text}</button>`;}
const prices=cost=>Object.entries(cost||{}).map(([k,n])=>`<span title="${RES[k].name}">${picture(RES[k].art)}${n}</span>`).join('');
function card(act,key,d,reason,art) {return `<button type="button" class="rts-card" data-rts-act="${act}" data-key="${key}" title="${d.note} ${reason||costText(d.cost)}" ${reason?'disabled':''}>${art?picture(art):''}<span><b>${d.name}</b><small class="rts-price">${prices(d.cost)}</small>${reason?`<small class="rts-locked">${reason}</small>`:''}</span></button>`;}
const crest='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 3 14 7-1 15-13 12L7 25 6 10Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m10 23 10-14 11 15-9-5-6 8 2-10Z" fill="currentColor"/></svg>';
export function setupMarkup(options,saved) {
  return `<div class="rts-setup"><div class="rts-keyart">${picture('rts-valley')}<div class="rts-keycopy"><span>${crest} NÉON</span><h1>Les Deux Rives</h1><p>Deux cités, un bassin à partager. Prenez le commandement d’Aurore face aux Maisons de Cendre.</p></div></div>
    <div class="rts-briefing"><div class="rts-brow">STRATÉGIE EN TEMPS RÉEL</div><h2>Préparer l’escarmouche</h2>
    ${saved?`<div class="rts-resume"><div><b>${saved.result?'Dernière partie':'Escarmouche sauvegardée'}</b><small>${MAPS[saved.region].name} · ${fmtTime(saved.tick*DT)} · âge ${saved.teams[0].age}</small></div>${button('resume',saved.result?'Voir le bilan':'Reprendre')}</div>`:''}
    <fieldset><legend>Champ de bataille</legend><div class="rts-options">${Object.entries(MAPS).map(([k,m])=>`<button data-rts-act="map" data-key="${k}" aria-pressed="${k===options.region}">${m.name}</button>`).join('')}</div><p>${MAPS[options.region].terrain}</p></fieldset>
    <fieldset><legend>Adversaire</legend><div class="rts-options">${Object.entries(LEVELS).map(([k,l])=>`<button data-rts-act="level" data-key="${k}" aria-pressed="${k===options.level}">${l.name}</button>`).join('')}</div><p>${{calm:'Cendre laisse davantage de temps pour organiser votre économie.',even:'Cendre développe sa cité et envoie des groupes à votre rencontre.',fierce:'Cendre forme plus de pionniers et lance ses premiers assauts plus tôt.'}[options.level]}</p></fieldset>
    <label class="rts-seed">Numéro de carte <input id="rts-seed" type="number" min="0" max="4294967295" step="1" value="${options.seed}">${button('reroll','↻','','','Tirer une autre carte')}</label>
    <p class="rts-win-note">Prenez le forum adverse ou bâtissez une Flèche orbitale et défendez-la pendant 90 secondes.</p>
    <button class="rts-primary" data-rts-act="start">${saved?'Lancer une nouvelle escarmouche':'Lancer l’escarmouche'} <span>→</span></button><button class="rts-text" data-rts-act="exit">Retour à la colonie</button></div></div>`;
}
export function arenaMarkup(s) {
  return `<div class="rts-play"><div class="rts-bar"><div class="rts-brand">${crest}<div><b>NÉON</b><small>LES DEUX RIVES</small></div></div>
    <div class="rts-stock" aria-label="Ressources d’Aurore">${Object.entries(RES).map(([k,r])=>`<div title="${r.name}" aria-label="${r.name}">${picture(r.art)}<span><b data-stock="${k}">0</b><small>${r.name} <i data-gatherers="${k}"></i></small></span></div>`).join('')}</div>
    <div class="rts-pop" title="Population, unités en formation et capacité"><b id="rts-pop"></b><small>Population</small></div><div class="rts-time"><b id="rts-time">0:00</b><small id="rts-age">Âge I</small></div>
    <div class="rts-controls">${button('pause','Ⅱ','','','Pause ou reprise (P)')}${button('speed','1×','','','Vitesse de simulation')}${button('menu','☰','','','Menu de l’escarmouche')}</div></div>
    <div class="rts-layout"><div class="rts-stage"><svg id="rts-map" tabindex="0" role="group" aria-label="Champ de bataille. Flèches pour viser, Entrée pour sélectionner ou donner un ordre."></svg>
      <div class="rts-map-title"><small>LIGUE D’AURORE</small><h2>${MAPS[s.region].name}</h2><span id="rts-mission"></span><button type="button" data-rts-act="locate-spire" hidden>Localiser la Flèche adverse</button></div><div id="rts-alert" hidden></div>
      <div id="rts-marquee" hidden></div><button class="rts-mini-wrap" data-rts-minimap aria-label="Centrer la caméra avec la minicarte"><svg id="rts-mini" viewBox="0 0 156 92" preserveAspectRatio="none" aria-hidden="true"></svg></button>
      <div class="rts-map-controls">${button('drag','Cadre','','','Alterner sélection au cadre et déplacement de la caméra')}${button('zoom-out','−','','','Dézoomer')}${button('zoom-in','+','','','Zoomer')}${button('home','⌾','','','Centrer sur le forum')}</div><div id="rts-mode" hidden><span></span>${button('cancel','Annuler')}</div></div>
    <div class="rts-dock"><div class="rts-quick" aria-label="Sélections rapides">${button('idle','Pionnier libre')}${button('workers','Pionniers')}${button('army','Armée')}${button('forum','Forum')}</div>
    <div id="rts-info"></div><div id="rts-commands"></div><div id="rts-queue"></div><div id="rts-radio" role="status" aria-live="polite"></div>
    <button class="rts-text rts-help" data-rts-act="help">Commandes et objectifs</button></div></div><div id="rts-sheet" hidden></div></div>`;
}
export function describe(s,items){
  if(!items.length)return `<div class="rts-selected"><div><small>COMMANDEMENT</small><h3>Aurore</h3><p>Choisissez des unités sur le terrain ou utilisez les sélections rapides.</p></div></div>`;
  const first=items[0];if(first.kind==='relay'){const r=s.relay;return `<div class="rts-selected">${picture('beacon')}<div><small>POINT DE CONTRÔLE</small><h3>Relais du bassin</h3><p>${r.owner<0?'Relais neutre':TEAMS[r.owner]} · ${r.contender>=0?`capture ${Math.floor(r.progress)} / 12 s`:'2 cristaux toutes les 8 s et vision locale'}</p></div></div>`;}
  if(first.kind==='node'){const n=first.e;return `<div class="rts-selected">${picture(RES[n.kind].art)}<div><small>GISEMENT</small><h3>${RES[n.kind].name}</h3><p>${first.visible?`${n.left} unités disponibles.`:'Dernière position connue.'} Assignez un pionnier pour exploiter ce site.</p></div></div>`;}
  const e=first.e,isUnit=first.kind==='unit',d=(isUnit?UNITS:STRUCTURES)[e.type];
  if(items.length>1){const counts={};for(const o of items)counts[o.e.type]=(counts[o.e.type]||0)+1;return `<div class="rts-selected">${picture(d.art)}<div><small>GROUPE D’AURORE</small><h3>${items.length} unités</h3><p>${Object.entries(counts).map(([k,n])=>`${n} × ${UNITS[k].name}`).join(' · ')}</p></div></div>`;}
  let status='';if(isUnit){status={idle:'Disponible',move:'En mouvement',advance:'En progression',attack:'Engagé',gather:e.order.delivering?'Retour au dépôt':`Collecte de ${RES[e.order.resource]?.name.toLowerCase()||''}`,assist:'Au chantier',repair:'En réparation'}[e.order.kind];if(e.cargo)status+=` · charge ${e.cargo.n} ${RES[e.cargo.kind].name.toLowerCase()}`;}
  else status=e.ready?(e.type==='spire'?`Synchronisation · ${Math.floor(e.hold)} / 90 s`:'En service'):`Chantier · ${Math.floor(e.work/d.time*100)} %`;
  return `<div class="rts-selected">${picture(d.art)}<div><small>${TEAMS[e.side].toUpperCase()}</small><h3>${d.name}</h3><p>${status} · ${Math.ceil(e.hp)} / ${d.hp} PV</p></div></div><p class="rts-note">${d.note}</p>`;
}
export function commands(s,items,buildMenu) {
  const first=items[0];if(!first)return '';
  if(first.kind==='node')return button('send-worker','Affecter un pionnier');
  if(first.kind==='relay')return button('send-army','Envoyer l’armée au relais');
  const e=first.e;if(e.side)return '';
  if(first.kind==='building'){
    if(!e.ready)return `<div class="rts-buttons">${button('assist-site','Affecter un pionnier')}${button('cancel-site','Annuler le chantier')}</div>`;
    const jobs=[];for(const [key,d] of Object.entries(UNITS))if(d.at===e.type)jobs.push(card('unit',key,d,jobReason(s,e,'unit',key),d.art));
    for(const [key,d] of Object.entries(STUDIES))if(d.at===e.type&&!s.teams[0].tech.includes(key))jobs.push(card('tech',key,d,jobReason(s,e,'tech',key),'vial'));
    if(e.type==='forum'&&s.teams[0].age<3){const key=s.teams[0].age+1; jobs.push(card('age',String(key),TRANSITIONS[key],jobReason(s,e,'age',String(key)),'beacon'));}
    let extra='';if(['forum','barracks','workshop'].includes(e.type))extra+=button('rally','Point de ralliement');if(e.type==='farm')extra+=button('send-worker','Affecter un pionnier');if(e.hp<STRUCTURES[e.type].hp-.01)extra+=button('repair-site','Réparer');
    return `<div class="rts-cards">${jobs.join('')}</div><div class="rts-buttons">${extra}</div>`;
  }
  const workers=items.some(o=>o.e.type==='worker'),military=items.some(o=>o.e.type!=='worker');
  if(buildMenu&&workers)return `<div class="rts-subhead"><b>Chantiers</b>${button('back-orders','Retour')}</div><div class="rts-cards buildings">${Object.entries(STRUCTURES).filter(([,d])=>d.cost).map(([k,d])=>card('build',k,d,buildReason(s,0,k),d.art)).join('')}</div>`;
  return `<div class="rts-buttons">${workers?button('build-menu','Construire (B)'):''}${military?button('advance','Avancer en combattant (A)'):''}${button('target','Ordre ciblé')}${button('stop','Halte')}</div>${workers?`<div class="rts-subhead"><b>Récolter à proximité</b></div><div class="rts-harvest">${Object.entries(RES).map(([k,r])=>button('harvest',`${picture(r.art)} ${r.name}`,k)).join('')}</div>`:''}`;
}
export function queueMarkup(b){if(!b?.queue?.length)return '';return `<div class="rts-subhead"><b>File de production</b></div><ol class="rts-jobs">${b.queue.map((j,i)=>`<li><span>${jobDef(j.kind,j.key).name}<small>${i?'En attente':j.left>0?`${Math.ceil(j.left)} s`:'En attente d’un logement'}</small></span>${button('cancel-job','×',String(i),false,'Annuler et rembourser')}</li>`).join('')}</ol>`;}
export function helpMarkup(){return `<h2>Commandes du terrain</h2><dl class="rts-keys"><dt>Clic ou toucher</dt><dd>Sélectionner une unité. Avec une sélection, toucher un gisement, une cible ou le sol donne l’ordre correspondant.</dd><dt>Clic droit</dt><dd>Donner un ordre contextuel. Un bâtiment de formation peut fixer un point de ralliement.</dd><dt>Glisser</dt><dd>Tracer une sélection sur ordinateur. Sur téléphone, déplacer la carte. Le bouton Cadre/Caméra inverse ces gestes.</dd><dt>Maj + clic · double-clic</dt><dd>Ajouter ou retirer une unité. Double-cliquer sélectionne son type à l’écran.</dd><dt>Ctrl + 1 à 5 · 1 à 5</dt><dd>Mémoriser puis rappeler un groupe.</dd><dt>H · V · M · Q</dt><dd>Forum, pionniers, armée et prochain pionnier libre.</dd><dt>B · A · P</dt><dd>Construire, avancer en combattant et mettre en pause.</dd><dt>Flèches · Entrée</dt><dd>Déplacer le curseur sur la carte puis interagir. Échap annule l’ordre préparé.</dd></dl><p>Un relais tenu 12 secondes par des unités militaires donne des cristaux et de la vision. Détruisez le forum ennemi ou gardez votre Flèche orbitale en service pendant 90 secondes.</p>${button('back','Reprendre le commandement')}`;}
