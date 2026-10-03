import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
const clients = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ack = (c, event, ...args) => new Promise((resolve,reject) => c.timeout(3000).emit(event,...args,(err,v) => err ? reject(err) : resolve(v)));
async function connect() {
  const c = io('http://localhost:3100', { transports: ['websocket'], autoConnect: false }); clients.push(c);
  c.on('room-state', v => { c.view = v; }); c.on('room-error', v => { c.error = v.message; });
  await new Promise(r => { c.once('connect',r); c.connect(); }); return c;
}
try {
  const a = await connect(); const b = await connect(); const attacker = await connect();
  attacker.emit('create-room', null); attacker.emit('join-room', {}); attacker.emit('start-game'); attacker.emit('game-action', {}, 'invalid callback');
  const created = await ack(a,'create-room',{ nickname:'房间测试甲' }); assert.ok(created.ok);
  const joined = await ack(b,'join-room',{ code:created.code,nickname:'房间测试乙' }); assert.ok(joined.ok);
  const repeated = await ack(b,'join-room',{ code:created.code,nickname:'房间测试乙' }); assert.ok(repeated.ok);
  await sleep(100); assert.equal(a.view.players.length,2);
  assert.equal((await ack(a,'start-game')).ok,false); // unready
  b.emit('select-game',{game:'battle'}); await sleep(50); assert.equal(a.view.selectedGame,'match');
  b.emit('toggle-ready'); await sleep(50); assert.ok((await ack(a,'start-game')).ok);
  assert.equal((await ack(attacker,'join-room',{code:created.code,nickname:'陌生人'})).ok,false);
  attacker.emit('game-action',{action:{pokemonId:1025}},'invalid callback');
  assert.ok((await ack(b,'game-action',{action:{pokemonId:b.view.game.candidateIds[0]}})).ok); await sleep(50);
  assert.equal(a.view.game.myPick,null); assert.equal(a.view.game.result,null);
  b.emit('back-to-lobby'); await sleep(50); assert.equal(a.view.status,'PLAYING');
  a.emit('back-to-lobby'); await sleep(50); assert.equal(a.view.status,'LOBBY');
  a.emit('kick-player',{playerId:joined.playerId}); await sleep(100); assert.equal(a.view.players.length,1); assert.match(b.error,/移出/);
  assert.equal((await ack(b,'game-action',{action:{pokemonId:1025}})).ok,false);
  assert.ok((await ack(attacker,'join-room',{code:created.code,nickname:'新玩家'})).ok);
  attacker.emit('toggle-ready'); a.emit('select-game',{game:'pixel'}); await sleep(80);
  assert.ok((await ack(a,'start-game')).ok); await sleep(30);
  assert.ok(a.view.game.endsAt-Date.now()>14000 && a.view.game.endsAt-Date.now()<=15000);
  assert.equal(a.view.game.stage,0); // Six 15-second stages = 90 seconds.
  a.emit('back-to-lobby'); await sleep(50); attacker.emit('toggle-ready'); a.emit('select-game',{game:'battle'}); await sleep(50);
  assert.ok((await ack(a,'start-game')).ok); await sleep(30);
  assert.ok(a.view.game.endsAt-Date.now()>59000 && a.view.game.endsAt-Date.now()<=60000);
  assert.equal(a.view.game.totalRounds,5);
  a.emit('back-to-lobby'); await sleep(50);
  assert.ok((await ack(b,'join-room',{code:created.code,nickname:'重返训练家'})).ok);
  attacker.emit('toggle-ready'); b.emit('toggle-ready'); a.emit('select-game',{game:'ditto'}); await sleep(80);
  assert.ok((await ack(a,'start-game')).ok); await sleep(30);
  for(const c of [a,b,attacker]) assert.ok((await ack(c,'game-action',{action:{type:'confirm'}})).ok);
  for(let i=0;i<3;i++) { await sleep(20); const speaker=[a,b,attacker].find(c=>c.view.youId===a.view.game.speakOrder[i]); assert.ok((await ack(speaker,'game-action',{action:{type:'word',text:'圆滚滚'}})).ok); }
  await sleep(30); assert.equal(a.view.game.phase,'discuss'); assert.equal(a.view.game.endsAt,null); assert.equal(a.view.game.words.length,3);
  assert.ok((await ack(b,'game-action',{action:{type:'remind'}})).ok); await sleep(30); assert.ok(a.view.game.reminders.includes(b.view.youId));
  assert.ok((await ack(a,'game-action',{action:{type:'discussion-done'}})).ok); await sleep(30);
  assert.ok(a.view.game.endsAt-Date.now()>44000 && a.view.game.endsAt-Date.now()<=45000);
  for(const c of [a,b,attacker]) assert.ok((await ack(c,'game-action',{action:{type:'vote',targetId:'abstain'}})).ok);
  await sleep(30); assert.equal(a.view.game.phase,'speak'); assert.equal(a.view.game.cycle,2); assert.equal(a.view.game.tally[0].count,3);
  a.emit('back-to-lobby'); await sleep(30);
  console.log('ROOM PASS: malformed packets, readiness, host permissions, duplicate joins, late joins, secrets, kick, reusable room.');
  console.log('NORMAL TIMING PASS: 90-second pixel round, 60-second battle pick, unlimited discussion, 45-second secret vote, public words/reminder/abstention continuation.');
} finally { clients.forEach(c => c.disconnect()); }
