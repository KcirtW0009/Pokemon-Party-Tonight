import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const pairs=JSON.parse(readFileSync('data/gender-wiki.json','utf8')),hotspots=JSON.parse(readFileSync('data/gender-hotspots.json','utf8'));
const maleHashes=pairs.map(p=>createHash('sha256').update(readFileSync(p.male)).digest('hex'));
function hit(pair){const h=hotspots[pair];for(const r of h.regions.male)for(let y=0;y<32;y++)for(let x=0;x<32;x++){const px=(x+.5)/32,py=(y+.5)/32;if(h.masks.male[y][x]==='1'&&px>=r.x&&px<=r.x+r.width&&py>=r.y&&py<=r.y+r.height)return {side:0,x:px,y:py};}throw Error('No foreground hotspot');}
const url=process.env.QA_URL??'http://127.0.0.1:3100',sockets=[];let checks=0,logs='',server;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,ms=30000){const start=Date.now();while(Date.now()-start<ms){const v=fn();if(v)return v;await wait(10);}throw new Error(`Timeout ${label}`);}
function check(v,label){assert.ok(v,label);checks++;if(label!=='monotonic revision'&&label!=='drive mapping never transmitted')console.log(`ok: ${label}`);}
const ack=(c,event,...args)=>new Promise((resolve,reject)=>c.timeout(5000).emit(event,...args,(err,r)=>err?reject(err):resolve(r)));
async function client(){const c=io(url,{autoConnect:false,transports:['websocket'],reconnection:false});sockets.push(c);c.on('room-state',v=>{if(c.view)check(v.revision>c.view.revision,'monotonic revision');c.view=v;});c.connect();await until(()=>c.connected,'connect');return c;}
async function action(c,a,override){const g=c.view.game,meta={roomId:c.identity.code,matchId:g.matchId,roundId:g.roundId,turnId:g.turnId,actionId:crypto.randomUUID(),...override};return ack(c,'game-action',{action:a,meta});}
const crypto={randomUUID:()=>createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex')};
async function makeRoom(){const cs=[];for(let i=0;i<3;i++){const c=await client(),code=cs[0]?.identity.code,r=await ack(c,i?'join-room':'create-room',{code,nickname:`新增测试${i}`});check(r.ok,'join three actual sockets');c.identity={...r,code:r.code??code};cs.push(c);}await until(()=>cs.every(c=>c.view?.players.length===3),'roster');return cs;}
async function start(cs,game,second={}){const h=cs[0];h.emit('select-game',{game});h.emit('update-settings',{second:{bombRounds:2,genderRounds:4,memoryPairs:6,berryRounds:3,relayRounds:4,wallRounds:3,driveSeconds:60,...second}});for(const c of cs.slice(1))c.emit('toggle-ready');await until(()=>h.view.selectedGame===game&&h.view.players.filter(p=>p.connected).every(p=>p.id===h.view.hostId||p.ready),'ready');const r=await ack(h,'start-game');check(r.ok,`start ${game}: ${r.error??''}`);await until(()=>cs.every(c=>c.view.game?.game===game),'game view');}
async function done(cs,game){await until(()=>cs.every(c=>c.view.game?.phase==='final'),`${game} final`,60000);const scores=JSON.stringify(cs[0].view.scores),points=JSON.stringify(cs[0].view.game.points);check(cs.every(c=>JSON.stringify(c.view.scores)===scores&&JSON.stringify(c.view.game.points)===points),`${game} identical final scores`);check(cs.every(c=>c.view.status==='RESULT'),`${game} result status`);cs[0].emit('back-to-lobby');await until(()=>cs.every(c=>c.view.status==='LOBBY'),'lobby');}
try{
 if(!process.env.QA_URL){server=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,NODE_ENV:'production',PORT:'3100',PPT_FAST:'1'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);await until(()=>logs.includes('ready on'),'server',30000);}
 const cs=await makeRoom();
 for(const game of ['type-bomb','starter-memory','snorlax-berries','electrode-relay','gender-difference','sudowoodo-quoridor','drive-revavroom']){
  await start(cs,game);const seen=new Map();let last='',latencies=[];
  if(game==='type-bomb'){
   const h=cs[0],c=cs.find(c=>c.view.youId===h.view.game.currentPlayerId),g=c.view.game,meta={roomId:c.identity.code,matchId:g.matchId,roundId:g.roundId,turnId:g.turnId,actionId:'dedup'},payload={meta,action:{type:'guess',pokemonId:g.data.allowedPokemon[0]}};
   const first=await ack(c,'game-action',payload),second=await ack(c,'game-action',payload);check(first.ok&&second.ok,'duplicate game packet idempotent');check(!(await action(c,{type:'guess',pokemonId:1},{turnId:'stale'})).ok,'stale packet rejected');
   const observer=await client(),joined=await ack(observer,'join-room',{code:h.identity.code,nickname:'旁观者'});check(joined.ok,'late join spectator');observer.identity={...joined,code:h.identity.code};await until(()=>observer.view?.game,'observer snapshot');check(!observer.view.game.participants.includes(observer.view.youId),'spectator outside roster');check(!(await action(observer,{type:'guess',pokemonId:1})).ok,'spectator actions rejected');observer.emit('leave-room');observer.disconnect();
   check(!('answerId' in h.view.game.data)&&!('answerTypes' in h.view.game.data),'bomb private answer absent');
  }
  while(cs[0].view.game?.phase!=='final'){
   const g=cs[0].view.game;if(!g){await wait(10);continue;}
   if(game==='starter-memory')for(const card of g.data.cards)if(card.pokemonId)seen.set(card.index,card.pokemonId);
   if(game==='gender-difference'&&g.phase==='loading'&&last!==g.roundId){last=g.roundId;await Promise.all(cs.map(async c=>{const cg=c.view.game;check(cg.data.images.length===2&&!('regions' in cg.data)&&!('masks' in cg.data),'two anonymous images without answer regions');const hash=createHash('sha256').update(Buffer.from(await (await fetch(url+cg.data.images[0])).arrayBuffer())).digest('hex');const pair=maleHashes.indexOf(hash);check(pair>=0,'local male image served successfully');c.hit=hit(pair);await action(c,{type:'assets-ready'});}));await until(()=>cs.every(c=>c.view.game.phase==='question'),'gender ready');await Promise.all(cs.map(c=>action(c,{type:'spot',...c.hit})));}
   else if(game==='drive-revavroom'&&['prepare','play'].includes(g.phase)&&last!==g.roundId+Math.floor(g.data.elapsed/100)){last=g.roundId+Math.floor(g.data.elapsed/100);await Promise.all(cs.map(async(c,i)=>{const now=Date.now();const r=await action(c,{type:'input',key:['up','right','left'][i],inputSeq:(c.seq??=0)+1});c.seq++;if(r.ok)latencies.push(Date.now()-now);}));check(!('maps' in g.data),'drive mapping never transmitted');}
   else if(g.phase==='turn'){
    const c=cs.find(c=>c.view.youId===g.currentPlayerId);if(c&&c.view.game.turnId===g.turnId){
     let a;if(game==='type-bomb')a={type:'guess',pokemonId:g.data.allowedPokemon[Math.floor(Math.random()*g.data.allowedPokemon.length)]};
     if(game==='snorlax-berries'){check(g.data.plates.length===12&&!('bombs' in g.data),'12 plates hide bomb positions');a={type:'take',indices:g.data.plates.map((v,i)=>v==='full'?i:null).filter(v=>v!==null).slice(0,3)};}
     if(game==='starter-memory'){
      const available=g.data.cards.filter(x=>x.status==='back'),open=g.data.cards.find(x=>x.status==='open');let target;
      if(open)target=available.find(x=>seen.get(x.index)===open.pokemonId)??available[0];else target=available.find(x=>available.some(y=>y.index!==x.index&&seen.get(x.index)&&seen.get(y.index)===seen.get(x.index)))??available.find(x=>!seen.has(x.index))??available[0];
      if(target)a={type:'flip',index:target.index};
     }
     if(game==='sudowoodo-quoridor'){const d=c.view.game.data,p=d.pawns.find(p=>p.id===c.view.youId);const distance=t=>p.goal==='top'?t.y:p.goal==='bottom'?8-t.y:p.goal==='left'?t.x:8-t.x;const target=[...d.legalMoves].sort((a,b)=>distance(a)-distance(b))[0];if(target)a={type:'move',...target};}
     if(a)await action(c,a);
    }
   }
   await wait(20);
  }
  if(game==='drive-revavroom'){check(cs.every(c=>Object.values(c.view.game.gains).every(n=>n===0)),'cooperative drive no podium');console.log(`Measured drive acknowledgment: n=${latencies.length}, median=${latencies.sort((a,b)=>a-b)[Math.floor(latencies.length/2)]}ms, max=${Math.max(...latencies)}ms (local sockets)`);}
  await done(cs,game);
 }
 // Refresh/reconnect uses private session token and host migrates while absent.
 await start(cs,'starter-memory');const old=cs[0],identity=old.identity;old.disconnect();await until(()=>cs[1].view.hostId===cs[1].view.youId,'host migration');const returned=await client(),r=await ack(returned,'join-room',{code:identity.code,nickname:'新增测试0',sessionToken:identity.sessionToken});check(r.ok&&r.playerId===identity.playerId,'reconnection keeps player identity');await until(()=>returned.view?.game,'rejoined game');check(returned.view.game.participants.includes(returned.view.youId),'rejoined seat retains participation');cs[1].emit('back-to-lobby');await until(()=>returned.view.status==='LOBBY','cleanup');
 console.log(`BATCH MULTIPLAYER PASS: ${checks} checks`);
}catch(e){console.error(e);console.error(logs);process.exitCode=1;}finally{sockets.forEach(c=>c.disconnect());server?.kill();server?.stdout.destroy();server?.stderr.destroy();}

