import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
const base=process.env.QA_URL??'http://localhost:3100',sockets=[];let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await wait(20);}throw Error('State timeout');}
const ack=(c,event,...args)=>new Promise((resolve,reject)=>c.timeout(5000).emit(event,...args,(error,r)=>error?reject(error):resolve(r)));
async function client(){const c=io(base,{transports:['websocket'],reconnection:false});sockets.push(c);c.on('room-state',v=>c.view=v);await until(()=>c.connected);return c;}
try{
 const host=await client(),friend=await client(),outsider=await client();
 const h=await ack(host,'create-room',{nickname:'旧昵称'});check(h.ok,'room created');
 const f=await ack(friend,'join-room',{code:h.code,nickname:'朋友'});check(f.ok,'friend joined');await until(()=>host.view.players.length===2);
 check(!(await ack(outsider,'rename-player',{nickname:'假冒'})).ok,'outsider cannot rename a seat');
 const initial=host.view,renamed=await ack(host,'rename-player',{nickname:'  新昵称  '});check(renamed.ok&&renamed.nickname==='新昵称','rename trims valid name');
 await until(()=>friend.view.players.find(p=>p.id===h.playerId).nickname==='新昵称');
 check(host.view.youId===h.playerId&&host.view.hostId===h.playerId&&JSON.stringify(host.view.scores)===JSON.stringify(initial.scores),'rename preserves identity host and scores');
 check(!(await ack(host,'rename-player',{nickname:'朋友'})).ok,'duplicate nickname rejected');
 check(!(await ack(host,'rename-player',{nickname:'   '})).ok,'blank nickname rejected');
 check(!(await ack(outsider,'join-room',{code:h.code,nickname:'偷换名字',sessionToken:h.sessionToken})).ok,'connected token cannot steal seat or rename');
 check(host.view.players.find(p=>p.id===h.playerId).nickname==='新昵称','failed operations keep name');
 friend.emit('leave-room');await until(()=>host.view.players.find(p=>p.id===f.playerId).connected===false);
 const rejoin=await ack(friend,'join-room',{code:h.code,nickname:'退出后修改',sessionToken:f.sessionToken});check(rejoin.ok&&rejoin.playerId===f.playerId,'rejoin with new name retains own seat');
 await until(()=>host.view.players.find(p=>p.id===f.playerId).nickname==='退出后修改');
 check(host.view.players.length===2,'rejoin does not create duplicate seat');
 host.emit('select-game',{game:'starter-memory'});friend.emit('toggle-ready');await until(()=>host.view.players.every(p=>p.ready));
 check((await ack(host,'start-game')).ok,'start game');await until(()=>friend.view.game?.game==='starter-memory');
 const before=friend.view.game;check((await ack(friend,'rename-player',{nickname:'游戏中改名'})).ok,'rename available during game');
 await until(()=>host.view.players.find(p=>p.id===f.playerId).nickname==='游戏中改名');
 check(friend.view.game.matchId===before.matchId&&friend.view.game.turnId===before.turnId&&friend.view.game.participants.includes(f.playerId),'rename preserves active game and participation');
 console.log(`RENAME PASS: ${checks} checks`);
}finally{for(const c of sockets){c.emit('leave-room');c.disconnect();}}
