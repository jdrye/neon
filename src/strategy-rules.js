import {DISTRICTS, SCIENCE} from './colony-rules.js?v=8.2.0';

export const SIDE = 27, HOME = 17 * SIDE + 6, RIVAL = SIDE * SIDE - 1 - HOME, MID = 13 * SIDE + 13;
export const MAP_SIZES = {
  27: {name:'Classique', population:58},
  45: {name:'Grande', population:90},
  65: {name:'Vaste', population:140},
  85: {name:'Immense', population:200},
};
export const validSize = size => Number.isInteger(size)&&Object.hasOwn(MAP_SIZES,size);
export const populationLimit = size => MAP_SIZES[size??SIDE].population;
export const DT = .25;
export const RES = {
  food: { name: 'Vivres', art: 'planter' }, wood: { name: 'Bois', art: 'bio' },
  ore: { name: 'Minerai', art: 'ore' }, crystal: { name: 'Cristaux', art: 'crystal' },
  water: { name:'Eau', art:'water' }, energy: { name:'Énergie', art:'battery' },
};
export const GATHERED = ['food','wood','ore','crystal'];
export const AGES = ['Atterrissage','Expansion','Rayonnement'];
export const TEAMS = ['Ligue d’Aurore','Maisons de Cendre'];
export const MAPS = {
  delta: { name: 'Delta des Saules', biome: 'emerald', terrain: 'Trois gués relient les deux rives.' },
  mesas: { name: 'Plateaux d’ambre', biome: 'amber', terrain: 'Les lacs laissent la plaine centrale ouverte.' },
  passes: { name: 'Cols de givre', biome: 'boreal', terrain: 'Deux cols traversent la crête centrale.' },
};
export const LEVELS = {
  calm: { name:'Découverte', interval:7, raid:235, repeat:130, settlers:8, army:5, grow:150 },
  even: { name:'Stratège', interval:4, raid:145, repeat:95, settlers:11, army:6, grow:95 },
  fierce:{ name:'Vétéran', interval:3, raid:95, repeat:66, settlers:14, army:5, grow:70 },
};
export const UNITS = {
  worker: {name:'Pionnier', art:'rts-worker', hp:45, speed:1.62, sight:4, damage:0, range:0, interval:1, cost:{food:32}, time:12, age:1, at:'forum', note:'Récolte, livre, bâtit et répare.'},
  guard: {name:'Sentinelle', art:'rts-guard', hp:108, speed:1.45, sight:4, damage:13, range:1.5, interval:1.15, counter:'skimmer', cost:{food:32,ore:12}, time:12, age:1, at:'barracks', note:'Unité de contact. Avantage contre les Voltigeurs.'},
  watcher: {name:'Veilleur', art:'rts-watcher', hp:63, speed:1.55, sight:5, damage:10, range:3.8, interval:1.5, counter:'guard', cost:{wood:22,crystal:16}, time:14, age:2, at:'barracks', note:'Unité à distance. Avantage contre les Sentinelles.'},
  caravan: {name:'Convoi', art:'trade-caravan', hp:76, speed:1.8, sight:3, damage:0, range:0, interval:1, cost:{wood:27,food:16}, time:16, age:2, at:'market', note:'Échange une cargaison au comptoir et la rapporte à la cité. Vulnérable sans escorte.'},
  skimmer: {name:'Voltigeur', art:'rts-skimmer', hp:82, speed:2.65, sight:6, damage:11, range:1.6, interval:1, counter:'watcher', cost:{food:35,crystal:19}, time:15, age:2, at:'workshop', note:'Unité rapide de reconnaissance. Avantage contre les Veilleurs.'},
};
export const isMilitary = type => (UNITS[type]?.damage || 0) > 0;
export const STRUCTURES = {
  ...DISTRICTS,
  forum: {clearance:1.45, name:'Forum', art:'rts-forum', hp:620, age:1, cap:10, sight:6, damage:9, range:4.3, note:'Reçoit les cargaisons, forme les pionniers et prépare les passages d’âge.'},
  house: {max:3, clearance:0.88, name:'Habitat', art:'habitat', hp:160, age:1, cap:6, cost:{wood:32}, time:14, note:'Ouvre six places de population.'},
  depot: {clearance:0.95, name:'Dépôt', art:'hangar', hp:185, age:1, cost:{wood:36}, time:13, note:'Point de livraison pour toutes les ressources. Permet de rechercher les harnais.'},
  farm: {clearance:1.03, name:'Ferme', art:'hydroponics', hp:155, age:1, cost:{wood:42}, time:16, note:'Source permanente de vivres à exploiter par les pionniers.'},
  market: {clearance:1.05, name:'Halle marchande', art:'trade-market', hp:245, age:2, cost:{wood:54,ore:18}, time:23, note:'Forme les convois et réceptionne les cargaisons des comptoirs.'},
  barracks: {clearance:1.12, name:'Caserne', art:'rts-barracks', hp:280, age:1, cost:{wood:55,ore:20}, time:22, note:'Forme les Sentinelles, puis les Veilleurs à l’âge II.'},
  tower: {clearance:0.84, name:'Vigie', art:'rts-tower', hp:310, age:2, sight:7, damage:18, range:5.1, cost:{wood:40,ore:44}, time:27, note:'Protège les abords avec un émetteur automatique.'},
  workshop: {clearance:1.12, name:'Atelier', art:'laboratory', hp:240, age:2, cost:{wood:62,ore:32}, time:25, note:'Assemble les Voltigeurs et recherche des améliorations.'},
  spire: {clearance:1.27, name:'Flèche orbitale', art:'rts-spire', hp:460, age:3, sight:7, cost:{wood:145,ore:125,crystal:95}, time:55, note:'Maintenez la Flèche en service 90 secondes pour remporter la partie.'},
};
export const STUDIES = {
  ...SCIENCE,
  harness:{name:'Harnais de portage',at:'depot',age:1,cost:{food:32,wood:22},time:20,note:'Charge de chaque pionnier portée de 8 à 14 unités.'},
  optics:{name:'Lentilles accordées',at:'workshop',age:2,cost:{ore:34,crystal:28},time:27,note:'Les Veilleurs et les Vigies gagnent une case de portée.'},
  plating:{name:'Coques renforcées',at:'workshop',age:3,cost:{ore:65,crystal:34},time:32,note:'Les unités militaires reçoivent 25 % de dégâts en moins.'},
};
export const TRANSITIONS = {
  2:{name:'Âge II · Expansion',at:'forum',cost:{food:112,ore:38,crystal:12},time:32,note:'Achever deux types de bâtiments différents en plus du forum.'},
  3:{name:'Âge III · Rayonnement',at:'forum',cost:{food:190,ore:85,crystal:50},time:46,note:'Achever un atelier et acquérir au moins une recherche.'},
};
export const mapKey = (size=SIDE,x,y) => Math.round(y)*size + Math.round(x);
export const mapPoint = (size=SIDE,id) => ({x:id%size, y:Math.floor(id/size)});
export const keyOf = (x,y) => mapKey(SIDE,x,y);
export const pointOf = id => mapPoint(SIDE,id);
export const apart = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export const mapDistance = (size=SIDE,a,b) => Math.hypot(a%size-b%size,Math.floor(a/size)-Math.floor(b/size));
export const tileDistance = (a,b) => mapDistance(SIDE,a,b);
export const costText = cost => Object.entries(cost||{}).map(([k,n])=>`${n} ${RES[k].name.toLowerCase()}`).join(' · ');
export const canPay = (bank,cost) => Object.entries(cost).every(([k,n])=>bank[k]>=n);
export const fmtTime = seconds => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const grids=new Map();
export function grid(size=SIDE) {
  if(!grids.has(size)){
    const count=size*size, center=(size-1)/2;
    const home=size===SIDE?HOME:mapKey(size,Math.round(size*.23),Math.round(size*.63));
    const neighbors=Array.from({length:count},(_,id)=>{
      const {x,y}=mapPoint(size,id);
      const cells=[];
      if(x<size-1)cells.push(id+1);
      if(y<size-1)cells.push(id+size);
      if(x>0)cells.push(id-1);
      if(y>0)cells.push(id-size);
      return cells;
    });
    grids.set(size,{size,count,home,rival:count-1-home,relay:mapKey(size,center,center),neighbors});
  }
  return grids.get(size);
}
export const eachNeighbor=grid().neighbors;
function random(seed) {
  return () => {seed=(seed+0x6d2b79f5)>>>0; let a=Math.imul(seed^(seed>>>15),1|seed); a^=a+Math.imul(a^(a>>>7),61|a);return ((a^(a>>>14))>>>0)/4294967296;};
}
const charts=new Map();
function classicBattlefield(seed,region) {
  const rng=random(seed), wave=1.2+rng()*.72, spread=1.2+rng()*.5;
  const cells=Array.from({length:SIDE*SIDE},(_,id)=>{
    const {x,y}=pointOf(id), dx=x-13,dy=y-13;
    const line=Math.round(Math.sin(dy*.36)*wave);
    const river=Math.abs(dx-line)<=1, ford=[-7,0,7].some(g=>Math.abs(dy-g)<=.1);
    const coast=(dx/14.5)**2+(dy/14)**2>1.03 || Math.abs(dx)>12 || Math.abs(dy)>12;
    const lake=region==='mesas' && ((dx-2)**2/8+(dy+6)**2/10<1 || (dx+2)**2/8+(dy-6)**2/10<1);
    const ridge=region==='passes' && (Math.abs(dy)<=6 ? Math.abs(dx)===1 : Math.abs(dx-line)<spread) && ![-5,5].some(g=>Math.abs(dy-g)<=1);
    const water=coast || lake || (region==='delta' && river && !ford);
    return {id:`${x},${y}`,cell:id,x,y,terrain:water?'water':'grass',ridge:!coast&&ridge,ford:region==='delta'&&river&&ford,variant:Math.floor(rng()*10000)};
  });
  // Opposite camps have the same clear space and the same natural reserves.
  for(const home of [HOME,RIVAL]) for(const c of cells) if(tileDistance(c.cell,home)<=4.25){c.terrain='grass';c.ridge=false;c.ford=false;}
  for(const c of cells) if(c.terrain==='grass' && (c.ford || eachNeighbor[c.cell].some(n=>cells[n].terrain==='water'))) c.terrain='sand';
  const deposits=[]; const occupied=new Set([HOME,RIVAL]);
  const add=(id,kind,amount)=>{const other=SIDE*SIDE-1-id;if(id===other||occupied.has(id)||occupied.has(other))return false;
    if([id,other].some(i=>cells[i].terrain==='water'||cells[i].ridge||cells[i].ford))return false;
    for(const n of [id,other]) {occupied.add(n);deposits.push({cell:n,kind,amount});}return true;};
  for(const [x,y,kind] of [[3,16,'wood'],[4,15,'wood'],[5,19,'food'],[8,18,'food'],[8,15,'ore'],[5,14,'crystal']]) add(keyOf(x,y),kind,kind==='crystal'?240:320);
  for(const kind of ['wood','food','ore','crystal','wood','food','ore','crystal','wood','wood','food']) {
    for(let tries=0;tries<120;tries++) {const x=2+Math.floor(rng()*10),y=2+Math.floor(rng()*23),id=keyOf(x,y);
      if(tileDistance(id,HOME)<4.4 || tileDistance(id,MID)<2.6 || [...occupied].some(n=>tileDistance(id,n)<1.8))continue;
      if(add(id,kind,kind==='crystal'?350:470)) break;
    }
  }
  const relay=MID;
  cells[relay].terrain='sand';cells[relay].ridge=false;
  return {cells,deposits:deposits.filter(d=>d.cell!==relay)};
}

function wideBattlefield(seed,region,board) {
  const {size,count,home,rival,relay,neighbors}=board, middle=(size-1)/2;
  const rng=random(seed), key=(x,y)=>mapKey(size,x,y), distance=(a,b)=>mapDistance(size,a,b);
  const wave=1.6+rng()*2.4, frequency=.12+rng()*.07;
  const crossing=Math.round(middle*(.39+rng()*.22)), width=size>=65?2:1;
  const lakes=Array.from({length:region==='mesas'?Math.ceil(size/18):Math.ceil(size/29)},(_,i)=>({
    x:middle*(.32+rng()*.28),y:middle*(-.77+(i+.3)*1.54/Math.ceil(size/18)),
    rx:2.2+rng()*size*.045,ry:2.5+rng()*size*.05,
  }));
  const cells=Array.from({length:count},(_,cell)=>{
    const {x,y}=mapPoint(size,cell),dx=x-middle,dy=y-middle;
    const line=Math.round(Math.sin(dy*frequency)*wave);
    const coast=Math.max(Math.abs(dx),Math.abs(dy))>=middle-1||
      Math.pow(dx/(middle-1),4)+Math.pow(dy/(middle-1),4)>1+.06*Math.cos((dx-dy)*.31);
    const clear=distance(cell,home)<=5.5||distance(cell,rival)<=5.5||distance(cell,relay)<=3;
    const channel=Math.abs(dx-line)<=width;
    const gap=[-crossing,0,crossing].some(y=>Math.abs(dy-y)<=2);
    const ford=region==='delta'&&channel&&gap&&!coast;
    const lake=!clear&&lakes.some(l=>[-1,1].some(sign=>((dx-sign*l.x)/l.rx)**2+((dy-sign*l.y)/l.ry)**2<1));
    const water=coast||lake||region==='delta'&&channel&&!gap;
    const ridge=region==='passes'&&!water&&!clear&&channel&&!gap;
    return {id:`${x},${y}`,cell,x,y,terrain:water?'water':'grass',ridge,ford,variant:Math.floor(rng()*10000)};
  });
  for(const c of cells)if(c.terrain==='grass'&&(c.ford||neighbors[c.cell].some(n=>cells[n].terrain==='water')))c.terrain='sand';

  const deposits=[], occupied=new Set([home,rival,relay]);
  function add(cell,kind,amount) {
    const other=count-1-cell;
    if([cell,other].some(id=>occupied.has(id)||!cells[id]||cells[id].terrain==='water'||cells[id].ridge||cells[id].ford))return false;
    for(const id of [cell,other]){occupied.add(id);deposits.push({cell:id,kind,amount});}
    return true;
  }
  const origin=mapPoint(size,home);
  for(const [dx,dy,kind] of [[-3,-1,'wood'],[-2,-2,'wood'],[-1,2,'food'],[2,1,'food'],[2,-2,'ore'],[-1,-3,'crystal']]){
    add(key(origin.x+dx,origin.y+dy),kind,kind==='crystal'?280:380);
  }
  const kinds=['wood','food','ore','wood','crystal','food','ore','crystal'];
  const reserves=Math.round(count/47);
  for(let i=0;i<reserves;i++){
    const kind=kinds[i%kinds.length];
    for(let attempt=0;attempt<90;attempt++){
      const x=2+Math.floor(rng()*(middle-3)),y=2+Math.floor(rng()*(size-4)),cell=key(x,y);
      if(Math.abs(x-middle)<=width+Math.ceil(wave)+2||distance(cell,home)<5||neighbors[cell].some(n=>occupied.has(n)))continue;
      if(add(cell,kind,kind==='crystal'?380+rngInt(181):490+rngInt(231)))break;
    }
  }
  function rngInt(limit){return Math.floor(rng()*limit);}
  return {cells,deposits};
}

export function battlefield(seed,region,size=SIDE) {
  const key=`${region}:${seed}:${size}`;
  if(charts.has(key))return charts.get(key);
  const board=grid(size);
  const terrain=size===SIDE?classicBattlefield(seed,region):wideBattlefield(seed,region,board);
  const map={...board,...terrain};
  if(charts.size>=8)charts.delete(charts.keys().next().value);
  charts.set(key,map);
  return map;
}
