// Embed exactly the modules reachable from the one browser entry point.
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {gameModules,offlineImports,root} from './game-modules.mjs';
const out=process.argv[2]||'dist/NEON-Aurore.html';
const read=(name,encoding)=>readFile(new URL(name,root),encoding);
const imports={};
for(const [name,original] of await gameModules()){
  const source=name==='art-url.js'?'export const artUrl = name => window.keplerPictures[name];':offlineImports(original);
  imports['neon/'+name]='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
}
const images={};
for(const name of (await readdir(new URL('src/art/',root))).sort()){
  if(name.endsWith('.webp'))images[name.slice(0,-5)]=(await read('src/art/'+name)).toString('base64');
}
const bootstrap=`<script>
const pictures = {};
for (const [name,data] of Object.entries(${JSON.stringify(images)})) {
  const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
  pictures[name]=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
}
window.keplerPictures=Object.freeze(pictures);
</script>
<script type="importmap">${JSON.stringify({imports})}</script>
<script type="module">import 'neon/app.js';</script>`;
const css=await read('src/strategy.css','utf8');
const html=(await read('index.html','utf8')).replace('<html lang="fr">','<html lang="fr" data-save-key="neon-preview-v5">')
  .replace(/<link rel="stylesheet"[^>]+>/,()=>'<style>'+css+'</style>')
  .replace(/<script type="module" src="[^"]+"><\/script>/,()=>bootstrap);
await mkdir(dirname(out),{recursive:true});await writeFile(out,html);
console.log('Colonie autonome prête dans '+out);
