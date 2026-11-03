import {mkdir,rm,cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist');
for(const file of ['index.html','src','.nojekyll']) await cp(file,`dist/${file}`,{recursive:true});
console.log('Jeu statique prêt dans dist/ — aucun CDN ni serveur applicatif.');
