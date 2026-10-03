import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import { readFile } from 'node:fs/promises';
const URL = 'http://127.0.0.1:3100';
const dex = JSON.parse(await readFile('data/pokemon.json', 'utf8'));
const sockets = [];
let checks = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function check(value, label) { assert.ok(value, label); checks++; console.log(`ok: ${label}`); }
async function until(fn, label, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { const v = fn(); if (v) return v; await sleep(10); }
  throw new Error(`Timeout: ${label}`);
}
const ack = (c, event, ...args) => new Promise((resolve, reject) => c.timeout(5000).emit(event, ...args, (err, result) => err ? reject(err) : resolve(result)));
const action = (c, a) => ack(c, 'game-action', { action: a });
async function client() {
  const c = io(URL, { autoConnect: false, transports: ['websocket'], reconnection: false });
  sockets.push(c); c.on('room-state', v => { c.view = v; }); c.connect();
  await until(() => c.connected, 'connect'); return c;
}
async function room(n) {
  const clients = [];
  for (let i = 0; i < n; i++) {
    const c = await client();
    const code = clients[0]?.identity.code;
    const r = await ack(c, i ? 'join-room' : 'create-room', { code, nickname: `训练家${i}` });
    check(r.ok, `join ${i+1}/${n}`);
    c.identity = { ...r, code: r.code ?? code, nickname: `训练家${i}` }; clients.push(c);
  }
  await until(() => clients.every(c => c.view?.players.length === n), 'roster'); return clients;
}
const phase = (cs, kind, target, round) => until(() => cs.every(c => c.view?.game?.game === kind && c.view.game.phase === target && (!round || c.view.game.round === round)) && cs[0].view.game, `${kind}:${target}:${round ?? ''}`);
async function start(cs, kind) {
  for (const c of cs) if (c.view.youId !== c.view.hostId && !c.view.players.find(p => p.id === c.view.youId).ready) c.emit('toggle-ready');
  const host = cs.find(c => c.view.youId === c.view.hostId);
  await until(() => host.view.players.filter(p => p.connected && p.id !== host.view.hostId).every(p => p.ready), 'ready');
  host.emit('select-game', { game: kind }); host.emit('update-settings', { matchRounds: 3, pixelRounds: 5 });
  await until(() => cs.every(c => c.view.selectedGame === kind && c.view.settings.matchRounds === 3), 'settings');
  check((await ack(host, 'start-game')).ok, `${cs.length} players start ${kind}`);
  await until(() => cs.every(c => c.view.game?.game === kind), 'all game views');
  check(Object.values(host.view.scores).every(v => v === 0), 'fresh game scores');
}
async function lobby(cs) {
  cs.find(c => c.view.youId === c.view.hostId).emit('back-to-lobby');
  await until(() => cs.every(c => c.view.status === 'LOBBY' && !c.view.game), 'return lobby');
}
async function match(cs) {
  await start(cs, 'match');
  for (let r = 1; r <= 3; r++) {
    await phase(cs, 'match', 'pick', r);
    const candidate=cs[0].view.game.candidateIds[0]; check(cs.every(c => JSON.stringify(c.view.game.candidateIds)===JSON.stringify(cs[0].view.game.candidateIds)), 'shared candidate pool'); check((await action(cs[0], { pokemonId: candidate })).ok, 'candidate accepted');
    await until(() => cs[1].view.game.submittedCount === 1, 'submitted count');
    check(!cs[1].view.game.myPick && !cs[1].view.game.result, 'opponent selection private');
    check(!(await action(cs[0], { pokemonId: 1 })).ok, 'duplicate submission denied');
    for (const c of cs.slice(1)) check((await action(c, { pokemonId: candidate })).ok, 'match submit');
    await phase(cs, 'match', 'countdown', r); check(cs.every(c => !c.view.game.result), 'countdown private');
    await phase(cs, 'match', 'reveal', r);
    check(cs[0].view.game.result.groups[0].playerIds.length === cs.length, 'grouping correct');
    check(Object.values(cs[0].view.game.result.gains).every(v => v === (cs.length - 1) * 100), 'matching formula');
    check(!(await action(cs[0], { pokemonId: 1 })).ok, 'wrong phase denied');
  }
  await phase(cs, 'match', 'final');
  check(Object.values(cs[0].view.scores).every(v => v === 3 * (cs.length - 1) * 100), 'match final score');
  await lobby(cs);
}
async function battle(cs) {
  await start(cs, 'battle'); const used = cs.map(() => new Set());
  for (let r = 1; r <= 5; r++) {
    await phase(cs, 'battle', 'pick', r);
    if (r === 1) for (const c of cs) check(c.view.game.myHand.length === 5 && new Set(c.view.game.myHand).size === 5 && !('hands' in c.view.game), 'five unique private cards');
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i]; check(c.view.game.myHand.every(id => !used[i].has(id)), 'used cards removed');
      const id = c.view.game.myHand[0]; check((await action(c, { pokemonId: id })).ok, 'play own card'); used[i].add(id);
      if (i === 0) check(!(await action(c, { pokemonId: id })).ok, 'double play denied');
    }
    await phase(cs, 'battle', 'countdown', r); check(cs.every(c => !c.view.game.result), 'battle choice private');
    await phase(cs, 'battle', 'reveal', r); const g = cs[0].view.game;
    const max = Math.max(...Object.values(g.result.values));
    for (const [pid,id] of Object.entries(g.result.plays)) {
      check(g.result.values[pid] === dex[id-1][g.stat], 'dataset stat correct');
      check(g.result.gains[pid] === (g.result.values[pid] === max ? 100 : 0), 'winner points correct');
    }
  }
  await phase(cs, 'battle', 'final'); check(cs[0].view.game.round === 5, 'five battle rounds'); await lobby(cs);
}
async function pixel(cs) {
  await start(cs, 'pixel'); const answers = new Set();
  for (let r = 1; r <= 5; r++) {
    await phase(cs, 'pixel', 'guess', r); const g = cs[0].view.game;
    check(cs.every(c => c.view.game.imageToken === g.imageToken && c.view.game.endsAt === g.endsAt), 'same pixel round/deadline');
    check(!('pokemonId' in g) && !('pokemon' in g) && !g.result && !/official-artwork/.test(JSON.stringify(g)), 'no obvious answer metadata');
    if (r === 1) {
      const img = await fetch(`${URL}/api/pokemon-image?token=${g.imageToken}`);
      check(img.status === 200 && img.headers.get('content-type') === 'image/png', 'opaque image endpoint');
      check((await fetch(`${URL}/api/pokemon-image?token=nope`)).status === 404, 'invalid image denied');
      check(!(await action(cs[0], { pokemonId: 1026 })).ok, 'invalid dex denied');
      const attempt = await action(cs[0], { pokemonId: 260 });
      if (!attempt.ok) check(!(await action(cs[0], { pokemonId: 25 })).ok, 'cooldown enforced');
    }
    for (let s = 1; s <= 5; s++) {
      await until(() => cs.every(c => c.view.game.phase === 'guess' && c.view.game.stage === s), `stage ${s}`);
      check(cs.every(c => c.view.game.endsAt === cs[0].view.game.endsAt), 'stage sync');
    }
    await phase(cs, 'pixel', 'reveal', r); const id = cs[0].view.game.result.pokemon.id;
    check(id >= 1 && id <= 1025 && !answers.has(id), 'valid nonrepeated answer'); answers.add(id);
  }
  await phase(cs, 'pixel', 'final'); await lobby(cs);
}
async function ditto(cs) {
  await start(cs, 'ditto'); await phase(cs, 'ditto', 'confirm');
  const d = cs.find(c => c.view.game.amDitto); const trainers = cs.filter(c => !c.view.game.amDitto);
  check(trainers.length === cs.length-1 && !d.view.game.pokemon && !d.view.game.dittoId, 'one Ditto with no secret');
  const answer = trainers[0].view.game.pokemon.id;
  check(trainers.every(c => c.view.game.pokemon.id === answer), 'same trainer secret');
  check(new Set(d.view.game.speakOrder).size === cs.length, 'complete speaking order');
  for (const c of cs) check((await action(c, { type: 'confirm' })).ok, 'role confirm');
  for (let i = 0; i < cs.length; i++) {
    await until(() => cs.every(c => c.view.game.phase === 'speak' && c.view.game.speakerIndex === i), 'speaker');
    const c = cs.find(c => c.view.youId === c.view.game.speakOrder[i]);
    check((await action(c, { type: 'word', text: '可爱' })).ok, 'speaker done');
  }
  await phase(cs, 'ditto', 'discuss'); check((await action(cs.find(c=>c.view.youId===c.view.hostId),{type:'discussion-done'})).ok,'host ends discussion'); await phase(cs, 'ditto', 'vote');
  check(!(await action(cs[0], { type: 'vote', targetId: cs[0].view.youId })).ok, 'no self vote');
  for (const c of trainers) check((await action(c, { type: 'vote', targetId: d.view.youId })).ok, 'trainer vote');
  await until(() => d.view.game.votedCount === trainers.length, 'private vote count');
  check(!d.view.game.tally && !('votes' in d.view.game), 'votes private');
  check((await action(d, { type: 'vote', targetId: trainers[0].view.youId })).ok, 'Ditto vote');
  await phase(cs, 'ditto', 'dittoGuess'); check(!d.view.game.pokemon, 'caught Ditto secret private');
  check(!(await action(trainers[0], { type: 'ditto-guess', pokemonId: answer })).ok, 'trainer cannot guess');
  check((await action(d, { type: 'ditto-guess', pokemonId: answer })).ok, 'comeback guess');
  await phase(cs, 'ditto', 'final'); check(d.view.scores[d.view.youId] === 150 && d.view.game.pokemon.id === answer, 'comeback score/reveal'); await lobby(cs);
}
const server = process.env.QA_EXTERNAL ? null : spawn(process.execPath, ['dist/server.cjs'], { env: { ...process.env, PORT: '3100', PPT_FAST: '1', NODE_ENV: 'production' }, stdio: ['ignore','pipe','pipe'] });
let log = ''; server?.stdout.on('data', d => { log += d; }); server?.stderr.on('data', d => { log += d; });
try {
  if (server) { await until(() => log.includes('ready on') || server.exitCode !== null, 'server ready', 31000); assert.equal(server.exitCode, null, log); }
  check((await fetch(URL)).status === 200, 'production homepage');
  const bad = await client();
  check(!(await ack(bad, 'join-room', { code: 'ZZZZ', nickname: 'A' })).ok, 'invalid room denied');
  for (const nickname of ['', '长'.repeat(17)]) check(!(await ack(bad, 'create-room', { nickname })).ok, 'invalid nickname denied'); bad.disconnect();
  for (const n of [2,3,8]) {
    console.log(`\n=== ${n} CLIENTS ===`); const cs = await room(n); const extra = await client();
    check(!(await ack(extra, 'join-room', { code: cs[0].identity.code, nickname: '训练家1' })).ok, 'duplicate nickname denied');
    check(!(await ack(extra, 'join-room', { code: cs[0].identity.code, nickname: '训练家0', playerId: cs[0].view.youId })).ok, 'public ID cannot steal seat');
    if (n === 8) check(!(await ack(extra, 'join-room', { code: cs[0].identity.code, nickname: '第九人' })).ok, 'ninth denied'); extra.disconnect();
    if (n === 2) {
      cs[0].emit('select-game', { game: 'ditto' }); await until(() => cs[0].view.selectedGame === 'ditto', 'select Ditto');
      check(!(await ack(cs[0], 'start-game')).ok, 'two player Ditto denied');
    }
    await match(cs); await battle(cs); await pixel(cs); if (n >= 3) await ditto(cs); await match(cs);
    const old = cs[0]; const id = old.view.youId; old.disconnect();
    await until(() => cs[1].view.hostId === cs[1].view.youId, 'host migration');
    check(!cs[1].view.players.find(p => p.id === id).connected, 'disconnect recognized');
    const reconnect = await client(); check((await ack(reconnect, 'join-room', old.identity)).ok, 'token reconnect');
    await until(() => reconnect.view?.youId === id, 'same identity'); check(reconnect.view.hostId !== id, 'migrated host retained');
    cs.forEach(c => c.disconnect()); reconnect.disconnect();
  }
  for (const kind of ['match','battle','pixel','ditto']) {
    const cs = await room(3); await start(cs, kind);
    const departing = cs[2]; const playerId = departing.view.youId; departing.disconnect();
    await until(() => !cs[0].view.players.find(p => p.id === playerId).connected, 'non-host disconnect');
    const rejoined = await client();
    check((await ack(rejoined, 'join-room', departing.identity)).ok, `${kind} active reconnect`);
    await until(() => rejoined.view?.youId === playerId && rejoined.view.game?.game === kind, 'private state restored');
    cs[0].disconnect();
    await until(() => cs[1].view.hostId === cs[1].view.youId, 'active host migration');
    check(true, `${kind} active host migration`);
    if(kind==='ditto') {
      const returned=await client();check((await ack(returned,'join-room',cs[0].identity)).ok,'Ditto previous host reconnects');
      await until(()=>returned.view?.game?.phase==='discuss','discussion after timed words',20000);
      await action(cs[1],{type:'discussion-done'});await until(()=>returned.view.game.phase==='vote','vote');
      const voters=[cs[1],rejoined,returned];const d=voters.find(c=>c.view.game.amDitto);const trainer=voters.find(c=>!c.view.game.amDitto);
      for(const c of voters)check((await action(c,{type:'vote',targetId:c===d?trainer.view.youId:d.view.youId})).ok,'reconnected secret vote');
      await until(()=>d.view.game.phase==='dittoGuess','caught');
      const answer=trainer.view.game.pokemon.id;await action(d,{type:'ditto-guess',pokemonId:answer});returned.disconnect();
    }
    await until(() => cs[1].view.status === 'RESULT' && rejoined.view.status === 'RESULT', `${kind} disconnect game finishes`, 40000);
    check(true, `${kind} timers recover disconnected game`);
    await lobby([cs[1], rejoined]); cs[1].disconnect(); rejoined.disconnect();
  }
  {
    const cs=await room(2);const host=cs[0];
    cs[1].emit('toggle-ready');host.emit('update-settings',{matchRounds:1,pixelRounds:17,dittoRounds:6,targetScore:500});
    await until(()=>cs.every(c=>c.view.settings.matchRounds===1&&c.view.settings.pixelRounds===17&&c.view.settings.dittoRounds===6&&c.view.settings.targetScore===500),'custom settings');
    cs[1].emit('update-settings',{targetScore:0});host.emit('update-settings',{matchRounds:21,pixelRounds:0,dittoRounds:1.5,targetScore:123});await sleep(30);
    check(host.view.settings.targetScore===500&&host.view.settings.matchRounds===1&&host.view.settings.pixelRounds===17&&host.view.settings.dittoRounds===6,'settings bounds and host authority');
    for(let i=1;i<=5;i++){
      await until(()=>host.view.players.every(p=>p.ready),'ready target');check((await ack(host,'start-game')).ok,'start cumulative match');
      await phase(cs,'match','pick');check(host.view.scores[host.view.youId]===(i-1)*100,'cross game cumulative scores');
      const id=host.view.game.candidateIds[0];for(const c of cs)await action(c,{pokemonId:id});await phase(cs,'match','final');
      check(host.view.scores[host.view.youId]===i*100,'cumulative result');await lobby(cs);cs[1].emit('toggle-ready');
    }
    await until(()=>host.view.players.every(p=>p.ready),'ready reset');check((await ack(host,'start-game')).ok,'new score race');await phase(cs,'match','pick');check(Object.values(host.view.scores).every(s=>s===0),'reached target starts fresh race');
    await lobby(cs);cs.forEach(c=>c.disconnect());
  }
  console.log(`\nMULTIPLAYER PASS: ${checks} checks`);
} catch(e) { console.error(e); console.error(log); process.exitCode = 1; }
finally {
  sockets.forEach(c => c.disconnect());
  if (server) {
    server.kill();
    server.stdout.destroy(); server.stderr.destroy();
  }
}
