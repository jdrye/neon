// Package the shipped modules and illustrations for opening directly from disk.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const out = process.argv[2] || 'dist/NEON-Kepler.html';
const root = new URL('../', import.meta.url);
const read = (name, encoding) => readFile(new URL(name,root),encoding);
const files = await readdir(new URL('src/',root));
const imports = {};
for (const name of files.filter(f => f.endsWith('.js'))) {
  const source = name === 'art-url.js' ? 'export const artUrl = name => window.keplerPictures[name];'
    : (await read('src/'+name,'utf8')).replace(/from (['"])\.\/([\w-]+\.js)(?:\?[^'"]*)?\1/g, "from 'neon/$2'");
  imports['neon/'+name] = 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
}

const images = {};
for (const name of await readdir(new URL('src/art/',root))) {
  if (name.endsWith('.webp')) images[name.slice(0,-5)] = (await read('src/art/'+name)).toString('base64');
}
const colony = JSON.parse(await read('examples/colonie-kepler.json','utf8'));
const css = (await read('src/style.css','utf8')).replace("url('./art/landing.webp')",'var(--arrival-art)');
const strategyCss = await read('src/strategy.css','utf8');
const directStrategy = process.argv.includes('--strategy');
const bootstrap = `<script type="application/json" id="preview-colony"></script>
<script>
(() => {
  const pictures = {};
  for (const [name, data] of Object.entries(${JSON.stringify(images)})) {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    pictures[name] = URL.createObjectURL(new Blob([bytes], {type:'image/webp'}));
  }
  window.keplerPictures = Object.freeze(pictures);
  document.documentElement.style.setProperty('--arrival-art', 'url("'+pictures.landing+'")');
  const colony = ${JSON.stringify(colony)};
  colony.lastTick = Date.now();
  document.getElementById('preview-colony').textContent = JSON.stringify(colony);
})();
</script>
<script type="importmap">${JSON.stringify({imports})}</script>
<script type="module">import 'neon/app.js';</script>`;
const html = (await read('index.html','utf8'))
  .replace('<html lang="fr">',`<html lang="fr" data-save-key="neon-preview-v5"${directStrategy?' data-mode="strategy"':''}>`)
  .replace(/<link rel="stylesheet"[^>]+>/g, link => '<style>'+(link.includes('strategy.css')?strategyCss:css)+'</style>')
  .replace(/<script type="module" src="[^"]+"><\/script>/, () => bootstrap)
  .replace('class="brand" href="./"', 'class="brand" href="#"');
await mkdir(dirname(out),{recursive:true});
await writeFile(out,html);
console.log('Aperçu jouable écrit dans '+out);
