import {cp,mkdir,rm} from 'node:fs/promises';
import {gameModules,root} from './game-modules.mjs';

const sources=await gameModules();
const dist=new URL('dist/',root);
await rm(dist,{recursive:true,force:true});
await mkdir(new URL('src/',dist),{recursive:true});
for(const name of ['index.html','.nojekyll','src/strategy.css','src/art',...[...sources.keys()].map(n=>'src/'+n)]){
  await cp(new URL(name,root),new URL(name,dist),{recursive:true});
}
console.log('Colonie unifiée prête dans dist/.');
