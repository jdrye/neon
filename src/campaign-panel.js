import {GOALS} from './engine.js?v=6.0.0';
import {CHAPTERS,RIGS} from './frontier.js?v=6.0.0';
import {SURVEYS} from './survey.js?v=6.0.0';
import {sharedCost} from './colony-rules.js?v=8.1.0';
import {RES,STRUCTURES,canPay,costText} from './strategy-rules.js?v=8.1.0';
import {buildReason,ready} from './strategy-engine.js?v=8.1.0';
import {districtRates,goalTexts} from './campaign.js?v=8.1.0';
import {MISSIONS,contested,councilEffects,departureCost} from './campaign-rover.js?v=8.1.0';
import {button,picture} from './strategy-hud.js?v=8.1.0';

function decisions(s) {
  const c=s.campaign,chapter=CHAPTERS[c.decisions.length];
  if(!chapter||c.decisions.length>=c.signals)return '';
  return `<section class="civic-block"><h3>Conseil · ${chapter.title}</h3><p>${chapter.story}</p><div class="civic-list">${Object.entries(chapter.options).map(([key,o])=>{
    const cost=sharedCost(o.cost);
    return button('vote',`<b>${o.name}</b><span>${councilEffects[key]}</span><small>${costText(cost)}</small>`,key,!canPay(s.teams[0].bank,cost));
  }).join('')}</div></section>`;
}
export function cityPanel(s) {
  const c=s.campaign,goal=GOALS.findIndex((_,i)=>!c.claimed.includes(i)),rate=districtRates(s);
  const counts=new Map();
  for(const b of ready(s,0)){const group=counts.get(b.type)||[];group.push(b);counts.set(b.type,group);}
  return `<section class="civic-block"><h3>${c.peace?'Le bassin pacifié':'La cité d’Aurore'}</h3>
    ${goal<0?'<p>Les sept objectifs de la métropole sont accomplis.</p>':`<p><strong>${GOALS[goal].name}</strong><br>${goalTexts[goal]}<br><small>Prime · ${costText(sharedCost(GOALS[goal].reward))}</small></p>`}
    <div class="rts-buttons">${button('open-build','Ouvrir les chantiers')}</div>
    ${c.charters.length?`<p>${c.charters.length} installation(s) issue(s) des archives attendent un emplacement gratuit dans les chantiers.</p>`:''}</section>
    ${decisions(s)}<section class="civic-block"><h3>Production des installations</h3><p>${Object.values(rate).some(n=>n)?'Versement toutes les 12 secondes dans les réserves communes.':'Une centrale fournit l’énergie et un collecteur fournit l’eau. Les pionniers peuvent renforcer leur rendement.'}</p>
    <div class="civic-rates">${Object.entries(rate).filter(([,n])=>n).map(([k,n])=>`<span>${picture(RES[k].art)} +${n} ${RES[k].name.toLowerCase()}</span>`).join('')}</div></section>
    <section class="civic-block"><h3>Installations en service</h3><div class="civic-facilities">${[...counts].map(([type,bs])=>button('inspect-type',`${picture(STRUCTURES[type].art)}<span>${STRUCTURES[type].name}</span><b>${bs.length}</b>`,type)).join('')}</div></section>`;
}
export function roverPanel(s,rig,surge) {
  const c=s.campaign,r=c.rover,hangar=ready(s,0,'hangar')[0],site=s.buildings.find(b=>!b.side&&b.type==='hangar');
  let body='';
  if(r) {
    const status=r.stage==='home'?'Retour à la cité':r.stage==='out'?'En route vers le site':contested(s,r)?'Prélèvement suspendu · envoyez une escorte':'Prélèvement en cours';
    body=`<div class="civic-portrait">${picture('rover')}<div><small>${RIGS[r.rig].name}</small><h3>${MISSIONS[r.kind].name}</h3><p>${status}${r.loaded?' · soute chargée':''}</p></div></div>
    <div class="rts-buttons">${button('locate-rover','Suivre le rover')}${button('locate-target','Voir le site')}${button('scan-rover',r.scanUntil>s.tick?'Radar actif':'Balayer au radar','',r.scanUntil>s.tick||!canPay(s.teams[0].bank,{energy:c.decisions.includes('passage')&&!r.scans?0:2}))}${button('recall-rover','Rappeler le rover','',r.stage==='home')}</div>`;
  }else if(!hangar) {
    body=`<div class="civic-portrait">${picture('hangar')}<div><small>EXPÉDITIONS</small><h3>Hangar à rover</h3><p>${site?'Chantier en cours dans la cité.':'Les pionniers construisent le hangar sur votre carte. Le rover partage les réserves et la visibilité des troupes.'}</p></div></div>
    ${site?button('inspect-type','Voir le chantier','hangar'):button('plan-district','Placer le hangar','hangar',!!buildReason(s,0,'hangar'),costText(STRUCTURES.hangar.cost))}`;
  }else{
    body=`<div class="civic-portrait">${picture('rover')}<div><small>EXPÉDITIONS</small><h3>Rover au hangar</h3><p>La cargaison rejoint le stock au retour. Une escorte peut sécuriser le prélèvement.</p></div></div>
    <div class="civic-pills" aria-label="Équipement du rover">${Object.entries(RIGS).map(([k,d])=>`<button data-rts-act="rig" data-key="${k}" aria-pressed="${rig===k}">${d.name}</button>`).join('')}</div>
    <p class="civic-note">${{scout:'Rapide, révèle quatre cases autour du véhicule.',crawler:'Conserve sa vitesse aux gués à marée haute.',hauler:'Double le minerai et les cristaux rapportés.'}[rig]}</p>
    ${c.signals?button('surge',surge?'Vives-eaux activées · désactiver':'Activer les vives-eaux pour le signal'):''}
    <div class="civic-list">${Object.entries(MISSIONS).map(([key,m])=>{
      const done=c.specimens.includes(key),cost=departureCost(key,rig);
      return button('dispatch',`<b>${m.name}</b><span>${done?'Spécimen dans le carnet':key==='signal'?'Rapporter un fragment pour le conseil':SURVEYS[key].specimen}</span><small>${costText(cost)}</small>`,key,done||!canPay(s.teams[0].bank,cost));
    }).join('')}</div>`;
  }
  return `${body}<p class="civic-logbook">Carnet · ${c.specimens.length}/3 spécimens · ${c.signals} fragment(s) · ${c.decisions.length}/3 décisions</p>${decisions(s)}`;
}
