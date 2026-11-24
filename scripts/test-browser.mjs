// Exercise the built game in a disposable Chrome profile. Wait for actual image
// decoding and test completion before capturing the viewport.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';

const [server, output] = process.argv.slice(2);
async function waitFor(read, label) {
  const deadline = Date.now()+45_000;
  while (Date.now()<deadline) {
    const value = await read();
    if (value) return value;
    await sleep(150);
  }
  throw Error('Délai dépassé pour '+label);
}
async function checkLayout(name,width,height) {
  const profile = await mkdtemp(join(tmpdir(),'kepler-chrome-'));
  const chrome = spawn(process.env.CHROME_BIN || 'google-chrome',[
    '--headless','--no-sandbox','--disable-gpu','--hide-scrollbars','--no-first-run',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank',
  ],{stdio:'ignore'});
  const exited = once(chrome,'exit');
  let socket;
  try {
    const port = await waitFor(async() => {
      if (chrome.exitCode !== null) throw Error('Chrome a quitté le test.');
      try { return (await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]; }
      catch (error) { if (error.code!=='ENOENT') throw error; }
    },'le démarrage de Chrome');
    const targets = await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    socket = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
    await once(socket,'open');
    let sequence=0;
    const pending=new Map();
    socket.addEventListener('message',e=>{
      const msg=JSON.parse(e.data), job=pending.get(msg.id);
      if (!job) return;
      pending.delete(msg.id);
      if (msg.error) job.reject(Error(msg.error.message)); else job.resolve(msg.result);
    });
    const call=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++sequence; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params}));
    });
    async function evaluate(expression) {
      const reply=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,timeout:30_000});
      if (reply.exceptionDetails) throw Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
      return reply.result.value;
    }
    await call('Page.enable');
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:name==='mobile'});
    await call('Emulation.setTouchEmulationEnabled',{enabled:name==='mobile'});
    await call('Page.navigate',{url:server+'/tests/rover.browser.html?'+name});
    const status = await waitFor(async()=>{
      const s=await evaluate("document.querySelector('#result')?.dataset.status");
      return s && s!=='running' ? s : null;
    },'le parcours du rover ('+name+')');
    if (status!=='passed') throw Error(await evaluate("document.querySelector('#result').textContent"));

    await call('Page.navigate',{url:pathToFileURL(resolve(output,'NEON-Kepler.html')).href});
    await waitFor(()=>evaluate("document.querySelectorAll('#scene .structure').length === 12"),'la colonie hors ligne');
    const pictures=await evaluate(`(async()=>{
      const urls=new Set([...document.querySelectorAll('image[href],img[src]')]
        .map(el=>el.getAttribute('href') || el.getAttribute('src')).filter(url=>url.startsWith('blob:')));
      await Promise.all([...urls].map(url=>{const img=new Image();img.src=url;return img.decode();}));
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      return urls.size;
    })()`);
    if (pictures<20 || await evaluate('window.innerWidth')!==width) throw Error('Dimensions ou illustrations incorrectes.');
    const capture=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(join(output,'kepler-'+name+'.png'),Buffer.from(capture.data,'base64'));
    console.log(name+' '+width+' × '+height+' · partie jouée, aperçu hors ligne et '+pictures+' illustrations décodées.');
  } finally {
    socket?.close();
    chrome.kill();
    await exited;
    await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});
  }
}
await checkLayout('desktop',1440,1000);
await checkLayout('mobile',390,844);
