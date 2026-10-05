import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const base=process.env.QA_URL??'http://localhost:3100',clients=[];
const pairs=JSON.parse(readFileSync('data/gender-wiki.json','utf8')),hotspots=JSON.parse(readFileSync('data/gender-hotspots.json','utf8'));
const hashes=pairs.map(p=>createHash('sha256').update(readFileSync(p.male)).digest('hex'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));let checks=0;
function check(v,label){assert.ok(v,label);checks++;}
async function until(fn,label){const start=Date.now();while(Date.now()-start<20000){if(fn())return;await wait(20);}throw Error(label);}
const ack=(c,event,...args)=>new Promise((resolve,reject)=>c.timeout(8000).emit(event,...args,(err,r)=>err?reject(err):resolve(r)));
async function action(c,a){const g=c.view.game;const r=await ack(c,'game-action',{meta:{roomId:c.code,matchId:g.matchId,roundId:g.roundId,turnId:g.turnId,actionId:randomUUID()},action:a});return r;}
function timer(c){const left=c.timerStarts.get(c.view.game.turnId);check(left>119000&&left<=120000,'ordinary production operation timer is 120 seconds');}
try{
 for(let i=0;i<8;i++){const c=io(base,{transports:['websocket'],reconnection:false});clients.push(c);c.timerStarts=new Map();c.on('room-state',v=>{const g=v.game;if(g?.turnId&&g.endsAt&&!c.timerStarts.has(g.turnId))c.timerStarts.set(g.turnId,g.endsAt-v.serverTime);c.view=v;});await until(()=>c.connected,'connect');const r=await ack(c,i?'join-room':'create-room',{code:clients[0].code,nickname:'新版验收'+i});check(r.ok,'join');c.code=r.code??clients[0].code;}
 const h=clients[0];await until(()=>h.view?.players.length===8,'roster');
 const games=['type-bomb','starter-memory','snorlax-berries','gender-difference','rocket-secret','pokemon-liars-dice','surround-meloetta','pokemon-push-your-luck'];
 for(const game of games){
  h.emit('select-game',{game});h.emit('update-settings',{second:{genderRounds:1,trapRounds:1,luckRounds:1}});
  clients.slice(1).forEach(c=>c.emit('toggle-ready'));
  await until(()=>h.view.selectedGame===game&&h.view.players.every(p=>p.id===h.view.hostId||p.ready),'ready');
  check((await ack(h,'start-game')).ok,'start '+game);await until(()=>clients.every(c=>c.view.game?.game===game),'game view');
  if(game==='gender-difference'){
   await Promise.all(clients.map(async c=>{const r=await fetch(base+c.view.game.data.images[0]);check(r.ok,'anonymous image');const hash=createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),pair=hashes.indexOf(hash);check(pair>=0,'valid local image');c.annotation=hotspots[pair];check((await action(c,{type:'assets-ready'})).ok,'images ready');}));
   await until(()=>clients.every(c=>c.view.game.phase==='question'),'question');timer(h);
   for(const c of clients){const a=c.annotation;for(const t of a.targets){let hit;for(let y=0;y<128&&!hit;y++)for(let x=0;x<128;x++)if(t.mask[y][x]==='1'&&a.targets.every(other=>other.id===t.id||other.mask[y][x]!=='1')){hit={x:(x+.5)/128,y:(y+.5)/128};break;}check((await action(c,{type:'spot',side:0,...hit})).ok,'independent difference accepted');}}
   await until(()=>clients.every(c=>c.view.game.phase==='final'),'gender final');check(clients.every(c=>c.view.game.points[c.view.youId]>0),'all eight scored');
  }else{timer(h);if(game==='snorlax-berries'){check(h.view.game.data.plates.length===12&&!('bombs' in h.view.game.data),'fixed plates private bombs');check((await action(h,{type:'delivery'})).ok,'delivery');check((await action(h,{type:'take',indices:[0]})).ok,'selected position accepted');}if(game==='surround-meloetta')check(h.view.game.participants.length===8,'eight-player trap accepted');}
  console.log('PASS normal timing '+game);h.emit('back-to-lobby');await until(()=>clients.every(c=>c.view.status==='LOBBY'),'lobby');
 }
 // Separate three-player room: all three intelligence rounds and shared clues, no external inspection.
 const cs=clients.slice(0,3);for(const c of clients)c.emit('leave-room');await wait(150);
 for(const [i,c] of cs.entries()){const r=await ack(c,i?'join-room':'create-room',{code:cs[0].code,nickname:'拍卖新版'+i});check(r.ok,'auction join');c.code=r.code??cs[0].code;}
 h.emit('select-game',{game:'pokemon-auction'});h.emit('update-settings',{second:{auctionBoxes:1}});cs.slice(1).forEach(c=>c.emit('toggle-ready'));await until(()=>h.view.selectedGame==='pokemon-auction'&&h.view.players.every(p=>p.id===h.view.hostId||p.ready),'auction ready');check((await ack(h,'start-game')).ok,'auction start');await until(()=>cs.every(c=>c.view.game?.game==='pokemon-auction'),'auction views');
 await until(()=>cs.every(c=>c.view.game.phase==='purchase'),'separate purchase');timer(h);check((await action(h,{type:'buy-tool',tool:'scan'})).ok,'purchase backpack');await until(()=>h.view.game.data.myInventory.length===1,'bag');for(const c of cs)check((await action(c,{type:'ready'})).ok,'purchase complete');
 for(let round=1;round<=3;round++){
  await until(()=>cs.every(c=>c.view.game.phase==='intel'&&c.view.game.data.bidRound===round),'intel round');timer(h);check(h.view.game.data.publicInfo.length===(round===3?2:1),'hints appear only rounds one and three');check(cs.every(c=>JSON.stringify(c.view.game.data.publicInfo)===JSON.stringify(h.view.game.data.publicInfo)),'identical public intelligence');
  if(round===1){const itemId=h.view.game.data.myInventory[0].id;check((await action(h,{type:'use-tool',itemId,index:0})).ok,'scope at use');check(!(await action(h,{type:'use-tool',itemId,index:1})).ok,'one use limit');}
  for(const c of cs)check((await action(c,{type:'ready'})).ok,'intel ready');await until(()=>cs.every(c=>c.view.game.phase==='bid'),'simultaneous bid phase');timer(h);
  check(!(await action(h,{type:'buy-tool',tool:'wide'})).ok,'bid purchase prohibited');for(const c of cs)check((await action(c,{type:'bid',amount:1})).ok,'sealed bid');
 }
 await until(()=>cs.every(c=>c.view.game.phase==='final'),'auction final');check(cs.every(c=>JSON.stringify(c.view.game.points)===JSON.stringify(h.view.game.points)),'consistent auction settlement');
 console.log('PLAYTEST LIVE PASS: '+checks+' checks');
}finally{clients.forEach(c=>{c.emit('leave-room');c.disconnect();});}

