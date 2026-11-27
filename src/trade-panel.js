import {RES, isMilitary} from './strategy-rules.js?v=8.2.0';
import {buildReason, unitsOf} from './strategy-engine.js?v=8.2.0';
import {CONTRACTS, POST_NAMES, knownPost, manifest, proceeds, tradingHall} from './trade.js?v=8.2.0';
import {button,picture} from './command-ui.js?v=8.2.0';

const resource=(key,n)=>'<span class="freight-value">'+picture(RES[key].art)+n+' '+RES[key].name.toLowerCase()+'</span>';
function postControl(s,index) {
  if(knownPost(s,0,index))return button('show-post','Voir le comptoir',String(index));
  return button('scout-post','Reconnaître',String(index),!unitsOf(s,0,'skimmer').length,'Envoyer un Voltigeur dans ce secteur');
}
export function tradeOffice(s) {
  const trade=s.campaign.trade,site=s.buildings.find(b=>!b.side&&b.type==='market');
  const count=trade.deliveries[0],convoys=unitsOf(s,0,'caravan');
  const hall=site?button('inspect-type',site.ready?'Voir la halle':'Voir le chantier','market'):
    button('plan-district','Placer la halle','market',!!buildReason(s,0,'market'),buildReason(s,0,'market')||'54 bois · 18 minerai');
  const ports=trade.posts.map((_,i)=>'<div><span><b>'+POST_NAMES[i]+'</b><small>'+(knownPost(s,0,i)?'Comptoir reconnu':'Secteur à reconnaître')+'</small></span>'+postControl(s,i)+'</div>').join('');
  return '<section class="civic-block freight-office"><div class="freight-head">'+picture('trade-market')+
    '<div><h3>Routes marchandes</h3><p>'+convoys.length+' convoi'+(convoys.length>1?'s':'')+' · '+count+' livraison'+(count>1?'s':'')+'</p></div></div>'+
    '<p>À l’âge II, la halle échange vos vivres contre du minerai ou votre bois contre des cristaux. Les routes longues rapportent davantage par livraison.</p>'+
    '<div class="rts-buttons">'+hall+(convoys.length?button('next-caravan','Sélectionner un convoi'):'')+'</div><div class="freight-ports">'+ports+'</div></section>';
}
export function postDescription(index) {
  return '<div class="rts-selected">'+picture('trade-post')+'<div><small>COMMERCE NEUTRE</small><h3>'+POST_NAMES[index]+'</h3><p>Les convois des deux cités peuvent y échanger leur cargaison.</p></div></div>';
}
export function caravanOrders(s,u) {
  const o=u.order,escorts=unitsOf(s,0).filter(g=>g.order.kind==='escort'&&g.order.target===u.id).length;
  const protection=button('auto-escort','Affecter une escorte','',!unitsOf(s,0).some(g=>isMilitary(g.type)&&g.order.kind==='idle'),'Détacher le soldat disponible le plus proche');
  if(o.kind==='trade'){
    const step=o.phase==='load'?0:o.phase==='out'?1:2;
    const stops=['Halle',POST_NAMES[o.post].replace('Comptoir du ',''),'Retour'].map((v,i)=>'<span '+(i===step?'aria-current="step"':'')+'>'+v+'</span>').join('');
    return '<section class="freight-contract"><h3>'+POST_NAMES[o.post]+'</h3><div class="freight-track" aria-label="Étapes de la navette">'+stops+'</div><p>'+manifest(s,u)+'</p><small>'+escorts+' escorte'+(escorts>1?'s':'')+' · '+(o.repeat?'Navette régulière':'Dernier trajet')+'</small></section><div class="rts-buttons">'+protection+
      button('recall-trade','Rappeler le convoi','',!o.repeat)+button('show-post','Voir le comptoir',String(o.post))+'</div>';
  }
  const base=tradingHall(s,u);
  return '<div class="rts-subhead"><b>Ouvrir une route</b></div>'+s.campaign.trade.posts.map((_,i)=>{
    const charted=knownPost(s,0,i);
    const choices=charted&&base?Object.entries(CONTRACTS).map(([good,c])=>button('charter',resource(c.input,c.fee)+'<span aria-hidden="true"> → </span>'+resource(good,proceeds(s,base.cell,i,good)),i+'-'+good)).join(''):charted?'Une halle accessible est nécessaire.':postControl(s,i);
    return '<section class="freight-choice"><b>'+POST_NAMES[i]+'</b><div>'+choices+'</div></section>';
  }).join('')+'<div class="rts-buttons">'+protection+button('target','Déplacer')+'</div>';
}
