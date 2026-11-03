import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,interact,tune,objective} from '../src/engine.js';
const use=(s,item,target)=>{s.selected=item;return interact(s,target);};
test('Expédition complète, usages d’objets, carnet et invitation finale',()=>{
 const s=fresh();interact(s,'capsule');assert.deepEqual(s.inventory,['cell','flask']);
 use(s,'cell','dome');assert.ok(s.flags.power);assert.ok(!s.inventory.includes('cell'));
 use(s,'flask','pool');assert.deepEqual(s.inventory,['water']);interact(s,'crystal');
 interact(s,'stone');use(s,'water','flower');assert.ok(s.flags.seed);
 use(s,'crystal','beacon');assert.ok(interact(s,'beacon').puzzle);
 assert.equal(tune(s,[2,1,0]),false);assert.equal(tune(s,[0,1,2]),true);
 assert.equal(interact(s,'beacon').ending,false);
 use(s,'seed','dome');assert.equal(interact(s,'beacon').ending,true);
 assert.equal(s.notes.length,6);assert.deepEqual(s.inventory,[]);assert.ok(s.flags.finished);
 assert.equal(objective(s),'Profiter de votre nouveau monde');
 assert.deepEqual(restore(JSON.stringify(s)),s);
});
test('Exploration libre, mauvais objet conservé, actions répétées sans duplication',()=>{
 const s=fresh();interact(s,'beacon');assert.equal(s.flags.beacon,undefined);
 assert.equal(tune(s,[0,1,2]),false);interact(s,'capsule');interact(s,'capsule');assert.equal(s.inventory.length,2);
 use(s,'cell','flower');assert.ok(s.inventory.includes('cell'));assert.equal(s.flags.seed,undefined);
 interact(s,'crystal');interact(s,'crystal');assert.equal(s.inventory.filter(i=>i==='crystal').length,1);
 use(s,'flask','pool');interact(s,'pool');assert.equal(s.notes.filter(x=>x==='pool').length,1);
});
test('Jardin planté avant le relais : aucun blocage',()=>{
 const s=fresh();interact(s,'capsule');use(s,'cell','dome');use(s,'flask','pool');use(s,'water','flower');use(s,'seed','dome');
 interact(s,'crystal');use(s,'crystal','beacon');tune(s,[0,1,2]);assert.ok(interact(s,'beacon').ending);
});
test('Sauvegardes absentes, invalides et anciennes',()=>{
 for(const raw of [null,'{','{}','{"version":9}']) assert.deepEqual(restore(raw),fresh());
 const s=restore(JSON.stringify({version:1,scene:99,flags:{power:true,unknown:true},inventory:['cell','cell','invalid'],notes:['stone','invalid']}));
 assert.equal(s.scene,0);assert.deepEqual(s.inventory,['cell']);assert.deepEqual(s.notes,['stone']);assert.deepEqual(s.flags,{power:true});
});
