// Resource and technology identifiers used by colonies before the shared map.
import {BUILDINGS, RESEARCH} from './engine.js?v=6.0.0';

export const colonyType = type => ({pod:'forum', habitat:'house'})[type] || type;
export const scienceIds = {optics:'solarOptics', ecology:'closedCycle', geology:'deepSurvey'};
export const sharedCost = amounts => Object.fromEntries(Object.entries(amounts || {}).map(([k,n]) => [k === 'bio' ? 'food' : k,n]));

const industry = {
  solar:[1,16,150], pump:[1,15,170], greenhouse:[1,20,170], mine:[1,22,210],
  hangar:[1,16,195], wind:[2,21,180], residence:[2,24,230], hydroponics:[2,24,195],
  quarry:[2,25,240], synthesizer:[2,27,210], laboratory:[2,24,215], beacon:[2,35,320],
  lighthouse:[3,38,330], observatory:[2,29,210],
};
const notes = {
  solar:'Alimente les chantiers et les sorties du rover.',pump:'Approvisionne les installations et le rover en eau.',
  greenhouse:'Cultive des vivres pour les pionniers et les troupes.',mine:'Verse minerai et cristaux dans les réserves de la cité.',
  hangar:'Abrite le rover qui explore cette carte et rapporte spécimens ou fragments.',wind:'Fournit de l’énergie aux installations avancées.',
  residence:'Ajoute douze places de population par niveau.',hydroponics:'Produit des vivres et recycle l’eau.',
  quarry:'Alimente les constructions et les renforts en minerai.',synthesizer:'Cultive des cristaux pour la recherche et les unités.',
  laboratory:'Réduit de 25 % le coût des nouvelles recherches civiles.',beacon:'Ouvre le port et prépare la liaison avec le phare.',
  lighthouse:'Au terme des trois décisions du conseil, produit énergie et cristaux.',observatory:'Valorise les trois spécimens du carnet et produit cristaux et énergie.',
};
export const DISTRICTS = Object.fromEntries(Object.entries(industry).map(([type,[age,time,hp]]) => {
  const old=BUILDINGS[type];
  return [type,{name:old.name,art:type,age,time,hp,clearance:.87,civil:true,cap:old.housing||0,
    cost:sharedCost(old.cost),output:sharedCost(old.output),max:old.max,requires:old.requires?colonyType(old.requires):null,
    unique:!!old.unique,note:notes[type]}];
}));
export const SCIENCE = Object.fromEntries(Object.entries(RESEARCH).map(([key,d]) => [
  scienceIds[key],{name:d.name,note:d.text.replace('biomasse','vivres'),at:d.requires,age:1,time:24,cost:sharedCost(d.cost),civil:true},
]));
// Habitats belong to both the town and the command economy.
export const IMPROVEMENTS = {};
for(const [type,d] of Object.entries({house:{max:3,cost:{wood:32}},...DISTRICTS})) {
  for(let level=2;level<=d.max;level++) {
    const cost=Object.fromEntries(Object.entries(d.cost).map(([key,n])=>[key,Math.ceil(n*(1+(level-1)*.65))]));
    IMPROVEMENTS[type+'-'+level]={name:'Niveau '+['','','II','III'][level],note:'Améliore cette installation sur sa case.',at:type,level,cost,time:10+level*5};
  }
}
