import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {io} from 'socket.io-client';
const url=process.env.QA_URL??'http://127.0.0.1:3100';let server,logs='',checks=0;const clients=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,ms=60000){const start=Date.now();while(Date.now()-start<ms){if(fn())return;await wait(15);}throw Error('Timeout: '+label);}
const check=(v,l)=>{assert.ok(v,l);checks++;};
const ack=(c,e,...a)=>new Promise((resolve,reject)=>c.timeout(5000).emit(e,...a,(err,r)=>err?reject(err):resolve(r)));
async function action(c,a){const g=c.view.game;return ack(c,'game-action',{meta:{roomId:c.code,matchId:g.matchId,roundId:g.roundId,turnId:g.turnId,actionId:randomUUID()},action:a});}
try{
 if(!process.env.QA_URL){server=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,NODE_ENV:'production',PORT:'3100',PPT_FAST:'1'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);await until(()=>logs.includes('ready on'),'start server');}
 for(let i=0;i<3;i++){const c=io(url,{transports:['websocket'],reconnection:false});clients.push(c);c.on('room-state',v=>{if(c.view)check(v.revision>c.view.revision,'monotonic revision');c.view=v;});await until(()=>c.connected,'connect');const r=await ack(c,i?'join-room':'create-room',{code:clients[0].code,nickname:'第三批联机测试'+i});check(r.ok,'join');c.code=r.code??clients[0].code;}
 const host=clients[0];await until(()=>clients.every(c=>c.view?.players.length===3),'roster');
 for(const game of ['rocket-secret','pokemon-auction','pokemon-liars-dice','surround-meloetta','pokemon-push-your-luck']){
  host.emit('select-game',{game});host.emit('update-settings',{second:{rocketCycles:1,auctionBoxes:1,diceMatches:1,trapRounds:1,luckRounds:1}});for(const c of clients.slice(1))c.emit('toggle-ready');await until(()=>host.view.selectedGame===game&&host.view.players.every(p=>p.id===host.view.hostId||p.ready),'ready');check((await ack(host,'start-game')).ok,'start '+game);await until(()=>clients.every(c=>c.view.game?.game===game),'views');
  let limit=0;while(host.view.game.phase!=='final'&&limit++<2500){const g=host.view.game;
   if(game==='rocket-secret'){
    if(g.phase==='transmit'){const sender=clients.find(c=>c.view.youId===g.currentPlayerId);if(sender?.view.game.turnId===g.turnId)check((await action(sender,{type:'transmit',texts:['花香','海浪','天空','伙伴']})).ok,'transmit');}
    else if(g.phase==='decode'){const sender=clients.find(c=>c.view.game.data.role==='sender'),answer=sender.view.game.data.answer;check(clients.filter(c=>c!==sender).every(c=>!('answer' in c.view.game.data)),'no answer leak');for(const c of clients.filter(c=>c!==sender&&!c.view.game.data.myGuess))await action(c,{type:'guess-sequence',picks:answer});}
    else if(g.phase==='discussion'){check(g.endsAt===null,'discussion unlimited');await action(host,{type:'next'});}
   }else if(game==='pokemon-auction'){
    check(!('box' in g.data),'sealed box');if(g.phase==='shop')for(const c of clients.filter(c=>!g.data.ready.includes(c.view.youId)))await action(c,{type:'ready'});
    else if(g.phase==='bid')for(const [i,c] of clients.entries())if(c.view.game.data.myBid===null)await action(c,{type:'bid',amount:i?0:1});
   }else if(game==='pokemon-liars-dice'&&g.phase==='turn'){
    const current=clients.find(c=>c.view.youId===g.currentPlayerId);check(clients.every(c=>!('dice' in c.view.game.data)),'private dice');if(current?.view.game.turnId===g.turnId)await action(current,g.data.call?{type:'open'}:{type:'call',count:g.data.totalDice,face:0});
   }else if(game==='surround-meloetta'&&g.phase==='turn'){
    const c=clients.find(c=>c.view.youId===g.currentPlayerId),d=g.data;let cell;for(let q=-5;q<=5&&!cell;q++)for(let r=-5;r<=5&&!cell;r++)if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))<=5&&!(d.position.q===q&&d.position.r===r)&&!d.obstacles.some(h=>h.q===q&&h.r===r))cell={q,r};if(c?.view.game.turnId===g.turnId&&cell)await action(c,{type:'block',...cell});
   }else if(game==='pokemon-push-your-luck'&&['turn','peek','trick'].includes(g.phase)){
    const c=clients.find(c=>c.view.youId===g.currentPlayerId);if(c?.view.game.turnId===g.turnId){const d=c.view.game.data;const a=g.phase==='peek'?{type:'stop'}:g.phase==='trick'?{type:'trade',...d.tradeOptions[0]}:d.players[c.view.youId].hand.length>=2?{type:'stop'}:{type:'draw'};await action(c,a);}
   }
   await wait(25);
  }
  await until(()=>clients.every(c=>c.view.game.phase==='final'),game+' final');const reference=JSON.stringify(host.view.scores),points=JSON.stringify(host.view.game.points);check(clients.every(c=>JSON.stringify(c.view.scores)===reference&&JSON.stringify(c.view.game.points)===points),'consistent final scores');check(clients.every(c=>c.view.status==='RESULT'),'result state');console.log('PASS three real sockets: '+game);host.emit('back-to-lobby');await until(()=>clients.every(c=>c.view.status==='LOBBY'),'lobby');
 }
 console.log(`THIRD MULTIPLAYER PASS: ${checks} checks`);
}catch(e){console.error(e);console.error(logs);process.exitCode=1;}finally{clients.forEach(c=>c.disconnect());server?.kill();server?.stdout.destroy();server?.stderr.destroy();}
