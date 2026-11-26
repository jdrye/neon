import {DISTRICTS, SCIENCE} from './colony-rules.js?v=8.0.0';

export const SIDE = 27, HOME = 17 * SIDE + 6, RIVAL = SIDE * SIDE - 1 - HOME, MID = 13 * SIDE + 13;
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
  skimmer: {name:'Voltigeur', art:'rts-skimmer', hp:82, speed:2.65, sight:6, damage:11, range:1.6, interval:1, counter:'watcher', cost:{food:35,crystal:19}, time:15, age:2, at:'workshop', note:'Unité rapide de reconnaissance. Avantage contre les Veilleurs.'},
};
export const STRUCTURES = {
  ...DISTRICTS,
  forum: {clearance:1.45, name:'Forum', art:'rts-forum', hp:620, age:1, cap:10, sight:6, damage:9, range:4.3, note:'Reçoit les cargaisons, forme les pionniers et prépare les passages d’âge.'},
  house: {max:3, clearance:0.88, name:'Habitat', art:'habitat', hp:160, age:1, cap:6, cost:{wood:32}, time:14, note:'Ouvre six places de population.'},
  depot: {clearance:0.95, name:'Dépôt', art:'hangar', hp:185, age:1, cost:{wood:36}, time:13, note:'Point de livraison pour toutes les ressources. Permet de rechercher les harnais.'},
  farm: {clearance:1.03, name:'Ferme', art:'hydroponics', hp:155, age:1, cost:{wood:42}, time:16, note:'Source permanente de vivres à exploiter par les pionniers.'},
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
export const keyOf = (x,y) => Math.round(y)*SIDE + Math.round(x);
export const pointOf = id => ({x:id%SIDE, y:Math.floor(id/SIDE)});
export const apart = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export const tileDistance = (a,b) => apart(pointOf(a),pointOf(b));
export const costText = cost => Object.entries(cost||{}).map(([k,n])=>`${n} ${RES[k].name.toLowerCase()}`).join(' · ');
export const canPay = (bank,cost) => Object.entries(cost).every(([k,n])=>bank[k]>=n);
export const fmtTime = seconds => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export const eachNeighbor = Array.from({length:SIDE*SIDE},(_,id)=>{
  const {x,y}=pointOf(id);
  return [[1,0],[0,1],[-1,0],[0,-1]].map(([a,b])=>[x+a,y+b]).filter(([a,b])=>a>=0&&b>=0&&a<SIDE&&b<SIDE).map(([a,b])=>keyOf(a,b));
});
function random(seed) {
  return () => {seed=(seed+0x6d2b79f5)>>>0; let a=Math.imul(seed^(seed>>>15),1|seed); a^=a+Math.imul(a^(a>>>7),61|a);return ((a^(a>>>14))>>>0)/4294967296;};
}
const charts=new Map();
export function battlefield(seed,region) {
  const key=region+seed; if(charts.has(key)) return charts.get(key);
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
  const map={cells,deposits:deposits.filter(d=>d.cell!==relay),relay};
  if(charts.size>=12)charts.delete(charts.keys().next().value); charts.set(key,map);return map;
}
