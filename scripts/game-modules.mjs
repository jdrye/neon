import {readFile} from 'node:fs/promises';

export const root=new URL('../',import.meta.url);
const imports=/from\s+(['"])\.\/([\w-]+\.js)(?:\?[^'"]*)?\1/g;
export async function gameModules() {
  const sources=new Map(),pending=['app.js'];
  for(const name of pending) {
    const source=await readFile(new URL('src/'+name,root),'utf8');
    sources.set(name,source);
    for(const match of source.matchAll(imports))if(!pending.includes(match[2]))pending.push(match[2]);
  }
  return sources;
}
export const offlineImports=source=>source.replace(imports,(_,quote,name)=>"from 'neon/"+name+"'");
