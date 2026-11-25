import { LEVELS, MAPS, RES, SIDE, STRUCTURES, STUDIES, UNITS } from './strategy-rules.js?v=7.0.0';
import { atlas, jobDef, refreshVision } from './strategy-engine.js?v=7.0.0';

const cell = n => Number.isInteger(n)&&n>=0&&n<SIDE*SIDE;
const finite = (n,lo,hi) => Number.isFinite(n)&&n>=lo&&n<=hi;
const owns = (obj,key) => typeof key==='string'&&Object.hasOwn(obj,key);
const side = n => n===0||n===1;
export function readMatch(raw) {
  try {
    if(typeof raw!=='string'||raw.length>1000000)return null;
    const s=JSON.parse(raw);
    if(s?.version!==1||!Number.isSafeInteger(s.seed)||s.seed<0||s.seed>0xffffffff||!owns(MAPS,s.region)||!owns(LEVELS,s.level)||!Number.isSafeInteger(s.tick)||s.tick<0)return null;
    if(s.teams?.length!==2||!Array.isArray(s.units)||s.units.length>116||!Array.isArray(s.buildings)||s.buildings.length>SIDE*SIDE||!Array.isArray(s.nodes))return null;
    for(const t of s.teams){if(![1,2,3].includes(t.age)||!Array.isArray(t.explored)||t.explored.length!==SIDE*SIDE||!Array.isArray(t.tech)||!t.tech.every(k=>owns(STUDIES,k))||!Object.keys(RES).every(k=>finite(t.bank?.[k],0,9999))||!(t.enemyForum===null||cell(t.enemyForum)))return null;
      t.explored=t.explored.map(v=>v===1?1:0);if(!finite(t.trained,0,1e9)||!finite(t.lost,0,1e9))return null;}
    const ids=new Set(),homes=new Set();
    for(const e of [...s.units,...s.buildings]){if(!Number.isSafeInteger(e.id)||e.id<1||ids.has(e.id)||!side(e.side)||!Number.isFinite(e.hp)||e.hp<=0||!finite(e.cool,0,10))return null;ids.add(e.id);}
    for(const b of s.buildings){if(!owns(STRUCTURES,b.type)||!cell(b.cell)||homes.has(b.cell)||typeof b.ready!=='boolean'||b.hp>STRUCTURES[b.type].hp+.01||!finite(b.work,0,100)||!finite(b.hold,0,1e9)||!Array.isArray(b.queue)||b.queue.length>5||!(b.rally===null||cell(b.rally)))return null;
      homes.add(b.cell);for(const j of b.queue){const d=jobDef(j.kind,j.key);if(!d||d.at!==b.type||!finite(j.left,0,d.time))return null;}}
    for(const u of s.units){if(!owns(UNITS,u.type)||!finite(u.x,0,SIDE-1)||!finite(u.y,0,SIDE-1)||u.hp>UNITS[u.type].hp+.01||!cell(u.anchor)||!finite(u.work,0,1e9)||!Array.isArray(u.path)||u.path.length>SIDE*SIDE||!u.path.every(cell))return null;
      const o=u.order;if(!o||!['idle','move','advance','attack','gather','repair','assist'].includes(o.kind)||o.kind!=='idle'&&!cell(o.cell)||o.kind==='gather'&&!owns(RES,o.resource))return null;
      if(typeof u.goal!=='string'||u.goal.length>75||u.cargo&&(!owns(RES,u.cargo.kind)||!finite(u.cargo.n,0,14)))return null;}
    const deposits=atlas(s).deposits;if(s.nodes.length!==deposits.length||!s.nodes.every((n,i)=>n.cell===deposits[i].cell&&n.kind===deposits[i].kind&&finite(n.left,0,deposits[i].amount)))return null;
    if(!Number.isSafeInteger(s.nextId)||s.nextId<=Math.max(0,...ids)||!Number.isSafeInteger(s.rev)||s.rev<0||!finite(s.ai?.lastRaid,0,s.tick/4)||![-1,0,1].includes(s.relay?.owner)||![-1,0,1].includes(s.relay.contender)||!finite(s.relay.progress,0,12))return null;
    if(s.result!==null&&(![-1,0,1].includes(s.result?.winner)||!['forum','spire'].includes(s.result?.reason)))return null;
    if(!s.result&&![0,1].every(n=>s.buildings.filter(b=>b.side===n&&b.type==='forum'&&b.ready).length===1))return null;
    // Imported text is never inserted into game markup. The log is shown as text.
    s.log=Array.isArray(s.log)?s.log.filter(l=>Number.isInteger(l?.tick)&&typeof l.text==='string').slice(-12).map(l=>({tick:l.tick,text:l.text.slice(0,180)})):[];
    if(s.scenario!=='siege')delete s.scenario;
    if(!s.alarm||!cell(s.alarm.cell)||!Number.isSafeInteger(s.alarm.tick)||!finite(s.alarm.tick,0,s.tick))s.alarm=null;
    const c=s.command;
    const list=v=>Array.isArray(v)&&v.length<=116&&v.every(k=>typeof k==='string'&&/^(?:e[0-9]{1,12}|n[0-9]{1,3}|relay)$/.test(k));
    if(c && !(finite(c.center?.x,-3000,4500)&&finite(c.center?.y,-1000,4500)&&finite(c.zoom,.36,1.8)&&[1,2,3].includes(c.speed)&&list(c.selection)&&c.groups&&Object.entries(c.groups).every(([k,v])=>/^[1-5]$/.test(k)&&list(v))))delete s.command;
    s.effects=[];refreshVision(s);return s;
  } catch {return null;}
}
