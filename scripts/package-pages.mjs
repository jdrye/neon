import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Ship the same tested build for both Pages sources: branch/root and Actions.
const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
if (!html.includes('./pages-assets/') || html.includes('/src/main.ts')) {
  throw new Error('Expected a compiled game with relative assets before packaging Pages.');
}
const source = resolve(root, 'dist/pages-assets');
const target = resolve(root, 'pages-assets');
const assets = await readdir(source);
if (!assets.some(file => file.endsWith('.js'))) throw new Error('Missing compiled game.');
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
await writeFile(resolve(root, 'index.html'), html);
await writeFile(resolve(root, '.nojekyll'), '');
await writeFile(resolve(root, 'dist/.nojekyll'), '');
// Only this generated directory is pruned; game sources and public assets are preserved.
for (const file of await readdir(target)) {
  if (!assets.includes(file)) await rm(resolve(target, file), { recursive: true });
}
console.log('GitHub Pages package ready: index.html + pages-assets/');
