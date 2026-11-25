import { randomSeed } from './world.js?v=6.0.0';
import { AGES, DT, HOME, RES, SIDE, STRUCTURES, UNITS, fmtTime, keyOf, pointOf, tileDistance } from './strategy-rules.js?v=7.0.0';
import { atlas, cancelJob, cancelSite, construct, createMatch, enqueue, nearestSource, orderUnits, populationInfo, ready, setRally, unitCell, unitsOf, vision } from './strategy-engine.js?v=7.0.0';
import { tickMatch } from './strategy-ai.js?v=7.0.0';
import { readMatch } from './strategy-save.js?v=7.0.0';
import { BattleView } from './strategy-view.js?v=7.0.0';
import { arenaMarkup, button, commands, describe, helpMarkup, queueMarkup, setupMarkup } from './strategy-hud.js?v=7.0.0';

export function createCommandRoom(dialog,saveKey) {
  const one=q=>dialog.querySelector(q),byId=id=>document.getElementById(id);
  const options={seed:randomSeed(),region:'delta',level:'even'};
  let state=null,view=null,screen='setup',paused=true,speed=1,mode='',buildMenu=false,sheet='',beforeSheet=true;
  let selection=[],groups={},cursor=null,lastIdle=0,dragMode='select',pointer=null,focusBack=null,resizeObserver=null,frame=0,lastFrame=0,carry=0;
  let storage=true,radio='',radioAt=0,dirty=false,openFromHash=false;
  try{const raw=localStorage.getItem(saveKey);if(raw)state=readMatch(raw);}catch{storage=false;}
  function save(){if(!state||!dirty)return;if(view)state.command={groups,selection,center:{...view.center},zoom:view.zoom,speed};try{localStorage.setItem(saveKey,JSON.stringify(state));storage=true;dirty=false;}catch{storage=false;}}
  function speak(text){radio=text;radioAt=performance.now();if(byId('rts-radio'))byId('rts-radio').textContent=text;}
  function describeKey(key){if(!key||!state)return null;
    if(key==='relay')return {key,kind:'relay',e:state.relay,cell:atlas(state).relay};
    const id=Number(key.slice(1));if(key[0]==='n'){const e=state.nodes.find(n=>n.cell===id&&n.left>0);return e&&state.teams[0].explored[id]?{key,e,cell:id,kind:'node',visible:vision(state,0)[id]}:null;}
    const unit=state.units.find(u=>u.id===id),e=unit||state.buildings.find(b=>b.id===id);if(!e)return null;
    const cell=unit?unitCell(e):e.cell;return !e.side||vision(state,0)[cell]?{key,e,cell,kind:unit?'unit':'building'}:null;
  }
  const selected=()=>selection.map(describeKey).filter(Boolean);
  const group=()=>selected().filter(o=>o.kind==='unit'&&!o.e.side).map(o=>o.e);
  const ids=()=>group().map(u=>u.id);
  function setHtml(el,html){if(el.dataset.last!==html){el.dataset.last=html;el.innerHTML=html;}}
  function setText(el,value){if(el&&el.textContent!==String(value))el.textContent=value;}
  function hud(){if(screen!=='match')return;const entries=selected();selection=entries.map(o=>o.key);const t=state.teams[0],pop=populationInfo(state,0);
    for(const key of Object.keys(RES)){setText(one(`[data-stock="${key}"]`),t.bank[key]);const count=state.units.filter(u=>!u.side&&u.order.kind==='gather'&&u.order.resource===key).length;const label=one(`[data-gatherers="${key}"]`);setText(label,count);label.parentElement.parentElement.parentElement.title=`${RES[key].name} · ${count} pionnier(s) affecté(s)`;}
    setText(one('[data-rts-act="idle"]'),`Pionnier libre (${unitsOf(state,0,'worker').filter(u=>u.order.kind==='idle').length})`);
    setText(byId('rts-pop'),`${pop.used}${pop.reserved?'+'+pop.reserved:''}/${pop.cap}`);setText(byId('rts-age'),`Âge ${['I','II','III'][t.age-1]}`);setText(byId('rts-time'),fmtTime(state.tick*DT));
    const pause=one('[data-rts-act="pause"]');setText(pause,paused?'▶':'Ⅱ');pause.setAttribute('aria-label',paused?'Reprendre la simulation':'Mettre en pause');pause.setAttribute('aria-pressed',String(paused));setText(one('[data-rts-act="speed"]'),speed+'×');
    setText(one('[data-rts-act="drag"]'),dragMode==='select'?'Cadre':'Caméra');one('[data-rts-act="drag"]').setAttribute('aria-label',dragMode==='select'?'Glisser pour sélectionner. Passer en caméra.':'Glisser pour déplacer la caméra. Passer en sélection.');
    const ownSpire=ready(state,0,'spire')[0],enemySpire=ready(state,1,'spire')[0];
    const task=ownSpire?`Défendre la Flèche · ${Math.max(0,Math.ceil(90-ownSpire.hold))} s`:enemySpire?`Flèche adverse · ${Math.max(0,Math.ceil(90-enemySpire.hold))} s`:state.tick<200?'Développez votre forum et explorez les rives.':state.relay.owner===0?'Relais sous votre contrôle · +2 cristaux / 8 s':'Contrôlez le relais ou avancez vers Cendre.';
    setText(byId('rts-mission'),task);one('[data-rts-act="locate-spire"]').hidden=!enemySpire;
    const alert=byId('rts-alert');const danger=ready(state,0,'forum')[0]?.hp<STRUCTURES.forum.hp*.7;const alertText=paused?'Pause tactique · ordres disponibles':danger?'Votre forum est endommagé':enemySpire?'Flèche adverse en service':'';
    alert.hidden=!alertText;setText(alert,alertText);
    setHtml(byId('rts-info'),describe(state,entries));setHtml(byId('rts-commands'),commands(state,entries,buildMenu));setHtml(byId('rts-queue'),queueMarkup(entries[0]?.kind==='building'&&!entries[0].e.side?entries[0].e:null));
    const band=byId('rts-mode');band.hidden=!mode;setText(band.querySelector('span'),mode.startsWith('build:')?`Placer · ${STRUCTURES[mode.slice(6)].name}`:mode==='rally'?'Choisir le point de ralliement':mode==='advance'?'Choisir une destination pour progresser':'Choisir la cible de l’ordre');
    const last=state.log.at(-1)?.text||'';setText(byId('rts-radio'),!storage?'Sauvegarde indisponible · session en cours':radio&&performance.now()-radioAt<5000?radio:last);
    view.svg.dataset.tick=state.tick;view.svg.dataset.paused=String(paused);
  }
  function paint(){if(!view)return;hud();view.draw(selection,mode,cursor,speed);}
  function select(keys,center=false){dirty=true;selection=[...new Set(keys)].filter(k=>describeKey(k));mode='';buildMenu=false;if(center&&selection.length)view.focus(describeKey(selection[0]).cell);paint();}
  function apply(result,clear=true){if(result.ok){dirty=true;save();if(clear){mode='';buildMenu=false;}}speak(result.message);paint();return result;}
  function openSetup(){closeRenderer();screen='setup';sheet='';dialog.innerHTML=setupMarkup(options,state);dialog.setAttribute('aria-label','Préparer une escarmouche');}
  function open(){if(dialog.open)return;focusBack=document.activeElement;dialog.showModal();document.body.classList.add('rts-open');openSetup();one(state?'[data-rts-act="resume"]':'[data-rts-act="start"]').focus({preventScroll:true});}
  function leave(){if(view)dirty=true;save();closeRenderer();dialog.close();document.body.classList.remove('rts-open');if(openFromHash&&location.hash==='#strategie')history.replaceState(null,'',location.href.split('#')[0]);openFromHash=false;focusBack?.focus?.({preventScroll:true});}
  function closeRenderer(){cancelAnimationFrame(frame);resizeObserver?.disconnect();resizeObserver=null;view=null;pointer=null;carry=0;}
  function play(fresh=false){closeRenderer();if(fresh||!state){state=createMatch(options.seed,options.region,options.level);dirty=true;}const kept=!fresh&&state.command;screen='match';mode='';sheet='';buildMenu=false;cursor=null;speed=kept?.speed||1;groups=kept?.groups||{};paused=!fresh;selection=kept?.selection||['e'+(ready(state,0,'forum')[0]?.id||0)];radio='';
    dialog.innerHTML=arenaMarkup(state);dialog.setAttribute('aria-label','Les Deux Rives · commandement en temps réel');dragMode=matchMedia('(pointer:coarse)').matches||innerWidth<720?'pan':'select';
    view=new BattleView(byId('rts-map'),byId('rts-mini'),state);if(kept?.center){view.center={...kept.center};view.zoom=kept.zoom;view.camera();}resizeObserver=new ResizeObserver(()=>{if(view)view.resize();});resizeObserver.observe(view.svg);bindMap();paint();save();lastFrame=performance.now();frame=requestAnimationFrame(loop);if(state.result)displaySheet('result');else view.svg.focus({preventScroll:true});}
  function loop(now){if(!view||!dialog.open)return;const elapsed=Math.min(.5,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
    if(!paused&&!sheet&&!document.hidden&&!state.result){carry+=elapsed*speed;let advanced=false;while(carry>=DT&&!state.result){tickMatch(state);carry-=DT;advanced=true;dirty=true;}
      if(advanced){paint();if(state.tick%16<speed)save();if(state.result){save();displaySheet('result');}}}
    frame=requestAnimationFrame(loop);
  }
  function displaySheet(kind){if(!sheet)beforeSheet=paused;sheet=kind;paused=true;carry=0;let content='';
    if(kind==='help')content=helpMarkup();
    if(kind==='menu')content=`<h2>Conseil de commandement</h2><p>${fmtTime(state.tick*DT)} · ${AGES[state.teams[0].age-1]} · carte ${state.seed}</p><div class="rts-menu-actions">${button('back','Reprendre le commandement')}${button('help','Commandes et objectifs')}${button('setup','Configurer une autre partie')}${button('exit','Sauvegarder et retourner à la colonie')}</div>`;
    if(kind==='result'){const r=state.result,win=r.winner===0,t=state.teams[0];content=`<div class="rts-brow">FIN DE L’ESCARMOUCHE</div><h2>${r.winner===-1?'Égalité':win?'Victoire d’Aurore':'Victoire de Cendre'}</h2><p>${r.winner===-1?'Les deux cités ont atteint leur condition de victoire au même instant.':r.reason==='spire'?'La Flèche orbitale a terminé ses 90 secondes de synchronisation.':win?'Le forum des Maisons de Cendre est tombé.':'Le forum de la Ligue d’Aurore est tombé.'}</p><div class="rts-results"><span><b>${fmtTime(state.tick*DT)}</b>Durée</span><span><b>${t.age}</b>Âge atteint</span><span><b>${t.trained}</b>Unités formées</span></div>${button('setup','Préparer une autre escarmouche')}${button('exit','Retour à la colonie')}`;}
    const el=byId('rts-sheet');el.hidden=false;el.innerHTML=`<div class="rts-sheet-card">${content}</div>`;el.querySelector('button')?.focus();}
  function closeSheet(){sheet='';const el=byId('rts-sheet');if(el)el.hidden=true;paused=beforeSheet;lastFrame=performance.now();paint();view?.svg.focus({preventScroll:true});}
  function startNew(){const input=byId('rts-seed');if(!input?.reportValidity()||input.value==='')return;options.seed=Number(input.value)>>>0;
    if(!state){play(true);return;}if(one('.rts-confirm'))return;
    const el=document.createElement('div');el.className='rts-confirm';el.innerHTML=`<div><h2>Remplacer l’escarmouche ?</h2><p>La nouvelle partie remplacera le commandement sauvegardé sur cet appareil.</p>${button('confirm-start','Remplacer et jouer')}${button('keep','Conserver ma partie')}</div>`;dialog.append(el);el.querySelector('[data-rts-act="keep"]').focus();}
  function idle(){const free=unitsOf(state,0,'worker').filter(u=>u.order.kind==='idle');if(!free.length){speak('Tous les pionniers sont occupés.');return;}const i=free.findIndex(u=>u.id===lastIdle),u=free[(i+1)%free.length];lastIdle=u.id;select(['e'+u.id],true);}
  function rapid(kind){if(kind==='forum'){const b=ready(state,0,'forum')[0];if(b)select(['e'+b.id],true);return;}
    const us=unitsOf(state,0).filter(u=>kind==='army'?u.type!=='worker':u.type==='worker');if(us.length)select(us.map(u=>'e'+u.id),true);else speak('Aucune unité de ce type.');}
  function sendWorker(item,job){if(!item)return;const workers=unitsOf(state,0,'worker').sort((a,b)=>Number(a.order.kind!=='idle')-Number(b.order.kind!=='idle')||tileDistance(unitCell(a),item.cell)-tileDistance(unitCell(b),item.cell));
    for(const w of workers){const r=orderUnits(state,0,[w.id],job,item.cell,item.e.id);if(r.ok){select(['e'+w.id]);apply(r);return;}}speak('Aucun pionnier disponible pour cet ordre.');}
  function act(action,key){
    if(action==='exit'){leave();return;}if(action==='keep'){one('.rts-confirm')?.remove();one('[data-rts-act="start"]')?.focus();return;}
    if(screen==='setup'){
      if(one('.rts-confirm')&&action!=='confirm-start')return;
      if(action==='start')startNew();else if(action==='confirm-start')play(true);else if(action==='resume')play();
      else if(['map','level','reroll'].includes(action)){const el=byId('rts-seed');if(el.value&&el.checkValidity())options.seed=Number(el.value);if(action==='map')options.region=key;if(action==='level')options.level=key;if(action==='reroll')options.seed=randomSeed();openSetup();one(`[data-rts-act="${action}"]${key?`[data-key="${key}"]`:''}`)?.focus();}return;
    }
    if(action==='back'){closeSheet();return;}if(action==='help'||action==='menu'){displaySheet(action);return;}if(action==='setup'){save();openSetup();return;}if(sheet||state.result)return;
    const item=selected()[0],b=item?.kind==='building'?item.e:null;
    if(action==='pause'){paused=!paused;carry=0;lastFrame=performance.now();save();paint();return;}
    if(action==='speed'){dirty=true;speed=speed===3?1:speed+1;hud();return;}
    if(action==='locate-spire'){const spire=ready(state,1,'spire')[0];if(spire)select(['e'+spire.id],true);return;}
    if(action==='idle'){idle();return;}if(['workers','army','forum'].includes(action)){rapid(action);return;}
    if(action==='drag'){dragMode=dragMode==='pan'?'select':'pan';hud();return;}if(action==='home'){view.focus(HOME);return;}
    if(action==='zoom-in'||action==='zoom-out'){view.scale(action==='zoom-in'?1.2:1/1.2);return;}
    if(action==='cancel'||action==='back-orders'){mode='';buildMenu=false;cursor=null;paint();return;}
    if(action==='build-menu'){if(group().some(u=>u.type==='worker')){buildMenu=true;paint();}return;}
    if(action==='build'||['advance','rally','target'].includes(action)){mode=action==='build'?'build:'+key:action;cursor=item?.cell??HOME;buildMenu=false;paint();view.svg.focus({preventScroll:true});return;}
    if(action==='stop'){apply(orderUnits(state,0,ids(),'stop'));return;}
    if(action==='harvest'){let given=0;for(const u of group().filter(u=>u.type==='worker')){const c=nearestSource(state,0,unitCell(u),key);if(c!==null&&orderUnits(state,0,[u.id],'gather',c).ok)given++;}apply(given?{ok:true,message:`${given} pionnier(s) affecté(s) aux ${RES[key].name.toLowerCase()}.`}:{ok:false,message:'Explorez la carte pour repérer cette ressource.'});return;}
    if(['age','unit','tech'].includes(action)&&b){apply(enqueue(state,0,b.id,action,key));return;}
    if(action==='cancel-job'&&b){apply(cancelJob(state,0,b.id,Number(key)));return;}
    if(action==='cancel-site'&&b){apply(cancelSite(state,0,b.id));return;}
    if(['send-worker','assist-site','repair-site'].includes(action)){sendWorker(item,action==='send-worker'?'gather':action==='assist-site'?'assist':'repair');return;}
    if(action==='send-army'){const army=unitsOf(state,0).filter(u=>u.type!=='worker');select(army.map(u=>'e'+u.id));apply(orderUnits(state,0,army.map(u=>u.id),'advance',atlas(state).relay));}
  }
  function terrainAction(cell,key,force=false,extend=false){if(sheet||state.result)return;const target=describeKey(key),us=group(),idList=us.map(u=>u.id);
    if(mode.startsWith('build:')){const r=construct(state,0,idList,mode.slice(6),cell);if(r.ok)selection=['e'+r.id];apply(r);return;}
    if(mode==='rally'||force&&!us.length&&selected()[0]?.kind==='building'){const b=selected()[0]?.e;if(b)apply(setRally(state,0,b.id,cell));return;}
    if(mode==='advance'){apply(orderUnits(state,0,idList,'advance',cell));return;}
    const owned=target&&['unit','building'].includes(target.kind)&&target.e.side===0;
    if(extend&&owned&&target.kind==='unit'){const others=us.map(u=>'e'+u.id);select(others.includes(key)?others.filter(k=>k!==key):[...others,key]);return;}
    const commanded=force||mode==='target';
    if(owned&&!commanded){select([key]);return;}
    if(us.length){let kind='move';
      if(target?.kind==='node'&&us.some(u=>u.type==='worker')||owned&&target.e.type==='farm'&&target.e.ready&&us.some(u=>u.type==='worker'))kind='gather';
      else if(target?.e.side===1&&us.some(u=>u.type!=='worker'))kind='attack';
      else if(owned&&target.kind==='building'&&us.some(u=>u.type==='worker'))kind=!target.e.ready?'assist':target.e.hp<STRUCTURES[target.e.type].hp?'repair':'move';
      else if(target?.kind==='relay'&&us.some(u=>u.type!=='worker'))kind='advance';
      if(target?.e.side===1&&!commanded&&kind!=='attack'){select([key]);return;}
      apply(orderUnits(state,0,idList,kind,cell,target?.e.id));return;
    }
    select(key&&target?[key]:[]);
  }
  function bindMap(){const svg=view.svg,stage=svg.parentElement,box=byId('rts-marquee');
    const hit=e=>{const k=mode.startsWith('build:')||mode==='rally'||mode==='advance'?null:e.target.closest?.('[data-rts-object]')?.dataset.rtsObject;const obj=describeKey(k);return {key:k,cell:obj?.cell??view.cellAt(view.worldPoint(e.clientX,e.clientY))};};
    svg.addEventListener('contextmenu',e=>{e.preventDefault();const h=hit(e);terrainAction(h.cell,h.key,true);});
    svg.addEventListener('wheel',e=>{e.preventDefault();view.scale(e.deltaY<0?1.12:1/1.12);},{passive:false});
    svg.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==1||sheet)return;const h=hit(e);pointer={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,key:h.key,cell:h.cell,pan:e.button===1||dragMode==='pan',drag:false,id:e.pointerId,shift:e.shiftKey};});
    svg.addEventListener('pointermove',e=>{if(!pointer){if(mode){cursor=view.cellAt(view.worldPoint(e.clientX,e.clientY));view.cursor(cursor,mode);}return;}if(pointer.id!==e.pointerId)return;
      const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(!pointer.drag&&Math.hypot(dx,dy)<7)return;
      if(!pointer.drag){pointer.drag=true;svg.setPointerCapture(e.pointerId);}if(pointer.pan)view.pan(pointer.lastX-e.clientX,pointer.lastY-e.clientY);
      else{const r=stage.getBoundingClientRect();box.hidden=false;Object.assign(box.style,{left:Math.min(pointer.x,e.clientX)-r.left+'px',top:Math.min(pointer.y,e.clientY)-r.top+'px',width:Math.abs(dx)+'px',height:Math.abs(dy)+'px'});}
      pointer.lastX=e.clientX;pointer.lastY=e.clientY;});
    svg.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;box.hidden=true;
      if(p.drag&&!p.pan){const x1=Math.min(p.x,e.clientX),x2=Math.max(p.x,e.clientX),y1=Math.min(p.y,e.clientY),y2=Math.max(p.y,e.clientY);
        const keys=unitsOf(state,0).filter(u=>{const g=view.pieces.get('e'+u.id);const rect=g?.getBoundingClientRect();if(!rect)return false;const x=rect.left+rect.width/2,y=rect.top+rect.height*.65;return x>=x1&&x<=x2&&y>=y1&&y<=y2;}).map(u=>'e'+u.id);select(p.shift?[...group().map(u=>'e'+u.id),...keys]:keys);}
      else if(!p.drag&&e.button===0){cursor=p.cell;terrainAction(p.cell,p.key,false,p.shift);}});
    svg.addEventListener('pointercancel',()=>{pointer=null;box.hidden=true;});
    svg.addEventListener('dblclick',e=>{const o=describeKey(hit(e).key);if(o?.kind!=='unit'||o.e.side)return;const r=svg.getBoundingClientRect();select(unitsOf(state,0,o.e.type).filter(u=>{const p=view.screenPoint(view.point(u.x,u.y));return p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;}).map(u=>'e'+u.id));});
    const mini=one('[data-rts-minimap]');mini.onpointerdown=e=>{view.miniTravel(e.clientX,e.clientY);mini.setPointerCapture(e.pointerId);};mini.onpointermove=e=>{if(mini.hasPointerCapture(e.pointerId))view.miniTravel(e.clientX,e.clientY);};mini.onclick=e=>{if(!e.detail)view.focus(atlas(state).relay);};
  }
  dialog.addEventListener('click',e=>{const btn=e.target.closest('[data-rts-act]');if(btn&&!btn.disabled)act(btn.dataset.rtsAct,btn.dataset.key);});
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(screen==='setup'){if(one('.rts-confirm'))act('keep');else leave();}else if(sheet==='result')act('setup');else if(sheet)closeSheet();else if(mode||buildMenu)act('cancel');else displaySheet('menu');});
  dialog.addEventListener('keydown',e=>{if(screen!=='match'||sheet||e.target.matches('input,select,textarea')||e.key==='Escape')return;
    const k=e.key.toLowerCase();if(/^[1-5]$/.test(k)){e.preventDefault();if(e.ctrlKey||e.metaKey){groups[k]=group().map(u=>'e'+u.id);dirty=true;save();speak(`Groupe ${k} mémorisé.`);}else if(groups[k]?.length)select(groups[k],true);return;}
    if(e.ctrlKey||e.metaKey||e.altKey)return;const shortcuts={p:'pause',h:'forum',v:'workers',m:'army',q:'idle',a:'advance',b:'build-menu','+':'zoom-in','-':'zoom-out'};
    if(shortcuts[k]){e.preventDefault();act(shortcuts[k]);return;}
    const arrow={ArrowLeft:[-1,1],ArrowRight:[1,-1],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(arrow){e.preventDefault();const p=pointOf(cursor??selected()[0]?.cell??HOME);
      cursor=keyOf(Math.max(0,Math.min(SIDE-1,p.x+arrow[0])),Math.max(0,Math.min(SIDE-1,p.y+arrow[1])));view.focus(cursor);view.cursor(cursor,mode);view.svg.focus();return;}
    if((k==='enter'||k===' ')&&e.target===view.svg){e.preventDefault();const c=cursor??HOME;const unit=state.units.find(u=>unitCell(u)===c&&(!u.side||vision(state,0)[c])),b=state.buildings.find(b=>b.cell===c&&(!b.side||vision(state,0)[c]));const key=unit?'e'+unit.id:b?'e'+b.id:state.nodes.some(n=>n.cell===c&&n.left>0)?'n'+c:atlas(state).relay===c?'relay':null;terrainAction(c,key,false,e.shiftKey);}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&view){paused=true;carry=0;dirty=true;save();hud();}});window.addEventListener('pagehide',()=>{if(view)dirty=true;save();});
  return {open,deepLink(){openFromHash=true;open();}};
}
