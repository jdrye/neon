export const ITEM = {cell:['▥','Cellule solaire'],flask:['♧','Fiole vide'],water:['◒','Eau pure'],crystal:['◇','Cristal harmonique'],seed:['❋','Graine de lumière']};
export const NOTES = [
 ['capsule','Une arrivée en douceur','La capsule est intacte. Une cellule solaire et une fiole nous aideront à rendre ce lieu habitable.'],
 ['pool','Une eau vivante','Les bassins filtrent naturellement l’eau. La vie s’est déjà inventé ses propres équilibres.'],
 ['stone','Le langage de la vallée','Trois gravures suivent le cycle du ciel : le soleil se lève, la vague l’accueille, la lune veille. Ordre : soleil → vague → lune.'],
 ['flower','La patience des fleurs','La fleur-lanterne s’ouvre au contact de l’eau pure et offre une unique graine lumineuse.'],
 ['beacon','Un signal dans le silence','Le cristal amplifie les ondes de la balise. Le ciel est assez vaste pour accueillir d’autres voyageurs.'],
 ['garden','La première aube','Notre premier jardin mêle technologie humaine et vie locale. Habiter cette planète commence par en prendre soin.']
];
export function fresh(){return {version:1,scene:0,inventory:[],flags:{},notes:[],selected:null};}
export function restore(raw){
 try {const s=JSON.parse(raw);if(s.version!==1||!Array.isArray(s.inventory)||!Array.isArray(s.notes)||!s.flags||typeof s.flags!=='object')return fresh();
 const allowed=['capsule','power','water','crystal','stone','seed','beacon','tuned','garden','finished'];
 return {version:1,scene:Number.isInteger(s.scene)&&s.scene>=0&&s.scene<4?s.scene:0,inventory:[...new Set(s.inventory.filter(x=>Object.hasOwn(ITEM,x)))],notes:[...new Set(s.notes.filter(x=>NOTES.some(n=>n[0]===x)))],flags:Object.fromEntries(allowed.filter(k=>s.flags[k]===true).map(k=>[k,true])),selected:null};
 }catch{return fresh();}
}
export function objective(s){const f=s.flags;if(!f.capsule)return 'Ouvrir la capsule d’exploration';if(!f.power)return 'Alimenter le dôme du camp';if(!f.seed)return 'Découvrir la graine de la forêt';if(!f.tuned)return 'Réveiller la balise de la crête';if(!f.garden)return 'Planter la graine dans le biodôme';if(!f.finished)return 'Inviter les pionniers depuis la balise';return 'Profiter de votre nouveau monde';}
export function hint(s){const f=s.flags;if(!f.capsule)return 'Dans la vallée, cliquez sur la capsule blanche, à gauche.';if(!f.power)return 'Sélectionnez la cellule solaire dans la sacoche, puis cliquez sur le dôme.';if(!f.water&&!f.seed)return 'Aux lagons, utilisez la fiole sur le bassin lumineux.';if(!f.seed)return 'Dans la forêt, offrez l’eau pure à la grande fleur-lanterne.';if(!f.crystal)return 'Un cristal se détache au bord du lagon. Cliquez dessus pour le recueillir.';if(!f.stone)return 'La stèle de la forêt porte la clé du signal. Examinez-la ; le carnet conservera son message.';if(!f.beacon)return 'Sur la crête, utilisez le cristal harmonique sur la balise.';if(!f.tuned)return 'Cliquez sur la balise. Réglez ses symboles dans l’ordre : soleil, vague, lune.';if(!f.garden)return 'Revenez au camp. Sélectionnez la graine puis cliquez sur le dôme alimenté.';if(!f.finished)return 'Le jardin est prêt. Cliquez sur la balise de la crête pour transmettre l’invitation.';return 'Votre mission est accomplie. Vous pouvez encore explorer et compléter le carnet.';}
export function interact(s,id){
 const f=s.flags;let message='',puzzle=false,ending=false;
 const add=i=>{if(!s.inventory.includes(i))s.inventory.push(i);};
 const use=i=>{s.inventory=s.inventory.filter(x=>x!==i);s.selected=null;};
 const note=i=>{if(!s.notes.includes(i))s.notes.push(i);};
 const selected=i=>s.selected===i&&s.inventory.includes(i);
 if(id==='capsule'){if(f.capsule)message='Notre capsule nous a bien protégés. Le reste du voyage se fera à pied.';else{f.capsule=true;add('cell');add('flask');note('capsule');message='La capsule s’ouvre. Une cellule solaire et une fiole rejoignent votre sacoche. De quoi commencer !';}}
 else if(id==='dome'){if(!f.power){if(selected('cell')){use('cell');f.power=true;message='Le dôme s’illumine. Un petit refuge, au milieu de l’inconnu. Il pourra accueillir une plante locale.';}else message='Le dôme attend une source d’énergie. La capsule doit contenir une cellule solaire.';}else if(f.garden)message='Le jardin respire doucement. Nous avons désormais une maison parmi les étoiles.';else if(selected('seed')){use('seed');f.garden=true;note('garden');message='La graine prend racine. Une lumière chaude traverse le dôme. Il ne reste qu’à inviter les pionniers depuis la balise.';}else message='Le biodôme est prêt. Une graine de cette planète pourrait s’y épanouir.';}
 else if(id==='pool'){note('pool');if(selected('flask')){use('flask');add('water');f.water=true;message='Vous recueillez un peu d’eau pure, sans troubler le bassin.';}else message='L’eau est limpide. Les filaments bleus la filtrent naturellement. Une fiole permettrait d’en recueillir.';}
 else if(id==='crystal'){if(f.crystal)message='Les autres cristaux restent en place. Un seul nous suffit.';else{f.crystal=true;add('crystal');message='Un cristal détaché repose sur le sable. Il vibre comme une note de musique. Vous le recueillez.';}}
 else if(id==='flower'){if(f.seed)message='La fleur oscille dans la brise. Merci pour son cadeau.';else if(selected('water')){use('water');add('seed');f.seed=true;note('flower');message='La fleur s’ouvre lentement et vous offre une graine de lumière. Un échange, plutôt qu’une conquête.';}else message='Cette fleur-lanterne garde ses pétales serrés. Quelques gouttes d’eau pure pourraient l’aider.';}
 else if(id==='stone'){f.stone=true;note('stone');message='Sur la stèle : « Le soleil se lève. La vague l’accueille. La lune veille. » Écho recopie ces trois symboles dans votre carnet.';}
 else if(id==='beacon'){if(!f.power)message='Le relais attend que le camp soit alimenté. Commençons par le dôme.';else if(!f.beacon){if(selected('crystal')){use('crystal');f.beacon=true;note('beacon');message='Le cristal trouve sa place au cœur de la balise. Cliquez à nouveau pour harmoniser le signal.';}else message='La balise a besoin d’un cristal capable d’amplifier son signal. Cherchons près de l’eau.';}else if(!f.tuned){puzzle=true;message='Trois fréquences attendent le bon ordre. La forêt conserve peut-être leur secret.';}else if(!f.garden)message='Le signal est prêt. Avant d’inviter les pionniers, faisons pousser un jardin dans le dôme.';else if(!f.finished){f.finished=true;ending=true;message='Le signal traverse les étoiles. « Nous arrivons. » La première colonie de Kepler vient de naître.';}else{ending=true;message='Les pionniers sont en route. Le temps nous appartient.';}}
 else if(id==='view')message='Au loin, deux lunes se lèvent sur une mer silencieuse. Vous restez un instant à contempler l’horizon.';
 return {message,puzzle,ending};
}
export function tune(s,sequence){if(!s.flags.beacon)return false;if(sequence.join(',')!=='0,1,2')return false;s.flags.tuned=true;return true;}
