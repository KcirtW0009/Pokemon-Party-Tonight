import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
const url=process.env.QA_URL??'http://localhost:3100';
const clients=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=20000){const end=Date.now()+ms;while(Date.now()<end){if(fn())return;await sleep(20);}throw new Error('Feedback test timed out');}
const ack=(c,e,p)=>new Promise((resolve,reject)=>c.timeout(5000).emit(e,p,(err,r)=>err?reject(err):resolve(r)));
const action=(c,a)=>ack(c,'game-action',{action:a});
async function client(){const c=io(url,{autoConnect:false,transports:['websocket'],reconnection:false});clients.push(c);c.on('room-state',v=>c.view=v);c.connect();await until(()=>c.connected);return c;}
try {
 const cs=[];let code;
 for(let i=0;i<3;i++){const c=await client();const identity=await ack(c,i?'join-room':'create-room',{code,nickname:['火神蛾的主人','小伙伴甲','小伙伴乙'][i]});assert.ok(identity.ok);code=identity.code??code;c.identity={...identity,code,nickname:['火神蛾的主人','小伙伴甲','小伙伴乙'][i]};cs.push(c);}
 await until(()=>cs.every(c=>c.view?.players.length===3));
 async function start(kind){for(const c of cs.slice(1))if(!c.view.players.find(p=>p.id===c.view.youId).ready)c.emit('toggle-ready');cs[0].emit('select-game',{game:kind});await until(()=>cs[0].view.selectedGame===kind&&cs[0].view.players.every(p=>p.ready));assert.ok((await ack(cs[0],'start-game')).ok);await until(()=>cs.every(c=>c.view.game?.game===kind));}
 await start('match');const pool=[...cs[0].view.game.candidateIds];const question=cs[0].view.game.question.text;
 assert.ok(cs.every(c=>c.view.game.question.text===question));assert.ok(!question.includes('{player}')&&!question.includes('左边'));
 assert.ok((await action(cs[0],{pokemonId:pool[0]})).ok);await until(()=>cs[0].view.game.myPick===pool[0]);
 assert.deepEqual(cs[0].view.game.candidateIds,pool);assert.equal(cs[1].view.game.myPick,null);
 for(const c of cs.slice(1))assert.ok((await action(c,{pokemonId:pool[0]})).ok);
 await until(()=>cs.every(c=>c.view.game.phase==='countdown'));assert.ok(cs.every(c=>c.view.game.myPick===pool[0]&&!c.view.game.result));
 cs[0].emit('back-to-lobby');await until(()=>cs.every(c=>c.view.status==='LOBBY'));
 await start('pixel');let wrongClient=cs[0];const first=await action(cs[0],{pokemonId:25});
 if(first.ok){wrongClient=cs[1];assert.equal((await action(wrongClient,{pokemonId:1})).ok,false);}
 await until(()=>wrongClient.view.game.myAttempted&&!wrongClient.view.game.mySolved);
 const stage=wrongClient.view.game.stage;const identity=wrongClient.identity;wrongClient.disconnect();
 const restored=await client();assert.ok((await ack(restored,'join-room',identity)).ok);await until(()=>restored.view?.game?.game==='pixel');
 assert.equal(restored.view.game.stage,stage);assert.equal(restored.view.game.myAttempted,true);
 await sleep(3100);assert.equal((await action(restored,{pokemonId:25})).ok,false,'old 3-second wait cannot unlock');
 await until(()=>restored.view.game.stage===stage+1);assert.equal(restored.view.game.myAttempted,false);
 const next=await action(restored,{pokemonId:25});if(!next.ok){await until(()=>restored.view.game.myAttempted);assert.equal((await action(restored,{pokemonId:1})).ok,false);}
 cs[0].connected?cs[0].emit('back-to-lobby'):cs[1].emit('back-to-lobby');
 console.log('FEEDBACK PUBLIC PASS: shared question/candidates, own choice retained and private through countdown; stage attempt persists across reconnect and 3 seconds, resets at next clarity.');
}finally{clients.forEach(c=>c.disconnect());}
