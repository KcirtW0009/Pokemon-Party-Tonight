// 服务端游戏逻辑单元测试：构造假房间，直接调用各游戏模块，断言规则/计分。
// 用法: npx tsx scripts/logic-test.ts
import { battleView, handleBattleAction, startBattle } from '../src/server/games/battle';
import { dittoView, handleDittoAction, startDitto } from '../src/server/games/ditto';
import { handleMatchAction, matchView, startMatch } from '../src/server/games/match';
import { handlePixelAction, pixelView, startPixel } from '../src/server/games/pixel';
import type { BattleState, DittoState, MatchState, PixelState, ServerRoom } from '../src/server/state';
import { searchPokemon } from '../src/lib/pokemon';
import { sampleIds } from '../src/server/util';

let passed = 0;
function ok(cond: unknown, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    passed++;
    console.log(`ok: ${msg}`);
  }
}
const noop = () => {};

function makeRoom(ids: string[]): ServerRoom {
  return {
    code: 'TEST',
    hostId: ids[0],
    players: ids.map((id, i) => ({ id, nickname: `P${i}`, connected: true, ready: true, socketId: null })),
    selectedGame: 'match',
    settings: { pixelRounds: 5, matchRounds: 3, dittoRounds: 1, targetScore: 0 },
    status: 'LOBBY',
    scores: Object.fromEntries(ids.map((id) => [id, 0])),
    game: null,
    deleteTimer: null,
  };
}

async function main() {
ok(sampleIds(1025, 1025).includes(1025), 'full National Dex pool includes #1025');
ok(searchPokemon('巨').length === 5, 'selector Chinese substring returns five');
ok(searchPokemon('SWAMPERT')[0]?.id === 260, 'selector English case-insensitive');
ok(searchPokemon('juzhaoguai')[0]?.id === 260, 'selector practical pinyin alias');
ok(searchPokemon('桃歹')[0]?.id === 1025, 'selector last National Dex entry');
ok(searchPokemon('巨', 5, new Set([260]), [260]).length === 0, 'selector excludes disabled within allowed pool');
// ---------- 默契挑战 ----------
{
  const room = makeRoom(['a', 'b', 'c']);
  room.selectedGame = 'match';
  startMatch(room, noop);
  const g = room.game as MatchState; g.candidateIds = [25,1,4,7,10,13,16,19,21,23];
  ok(g.phase === 'pick' && g.question, 'match: 开局进入 pick 且有题目');
  ok(matchView(room, 'a').myPick === null, 'match: 未提交时 myPick 为空');
  ok(handleMatchAction(room, 'a', { pokemonId: 25 }, noop) === null, 'match: A 提交');
  ok(handleMatchAction(room, 'a', { pokemonId: 25 }, noop) === '你已提交过答案', 'match: 重复提交被拒');
  ok(handleMatchAction(room, 'b', { pokemonId: 25 }, noop) === null, 'match: B 提交相同');
  ok(handleMatchAction(room, 'c', { pokemonId: 1 }, noop) === null, 'match: C 提交不同并触发全员开奖');
  await new Promise(r => setTimeout(r, 3100));
  ok(g.phase === 'reveal', 'match: 全员提交后进入 reveal');
  ok(g.result!.gains.a === 100 && g.result!.gains.b === 100 && g.result!.gains.c === 0, 'match: 2人相同各+100，独享+0');
  ok(room.scores.a === 100 && room.scores.c === 0, 'match: 总分累计正确');
  ok(matchView(room, 'c').result!.groups[0].playerIds.length === 2, 'match: 公开视图包含分组');
  // 全员在线人数视角：断线玩家不计入 — 由 rooms 层保证，此处略
}

// ---------- 宝可梦猜拳 ----------
{
  const room = makeRoom(['a', 'b']);
  room.selectedGame = 'battle';
  startBattle(room, noop);
  const g = room.game as BattleState;
  g.stat = 'speed'; // 固定属性以便断言
  g.direction = 'highest';
  g.hands = { a: [25, 1, 4, 7, 10], b: [1, 4, 7, 10, 13] };
  ok(battleView(room, 'a').myHand.length === 5, 'battle: 每人 5 张手牌');
  ok(handleBattleAction(room, 'a', { pokemonId: 999 }, noop) === '请选择手牌中的宝可梦', 'battle: 非手牌被拒');
  ok(handleBattleAction(room, 'a', { pokemonId: 25 }, noop) === null, 'battle: A 出皮卡丘(速90)');
  ok(handleBattleAction(room, 'b', { pokemonId: 1 }, noop) === null, 'battle: B 出妙蛙种子(速45)触发开奖');
  await new Promise(r => setTimeout(r, 3100));
  ok(g.phase === 'reveal', 'battle: 全员出牌后 reveal');
  ok(JSON.stringify(g.result!.winners) === '["a"]', 'battle: 速度高者胜');
  ok(g.result!.gains.a === 100 && g.result!.gains.b === 50, 'battle: 冠军+100，亚军+50');
  ok(!g.hands.a.includes(25) && !g.hands.b.includes(1), 'battle: 用过的牌被消耗');
  // 平局
  g.phase = 'pick';
  g.plays = {};
  g.result = null;
  g.hands = { a: [25], b: [25] };
  handleBattleAction(room, 'a', { pokemonId: 25 }, noop);
  handleBattleAction(room, 'b', { pokemonId: 25 }, noop);
  await new Promise(r => setTimeout(r, 3100));
  ok(g.result!.winners.length === 2 && g.result!.gains.a === 100 && g.result!.gains.b === 100, 'battle: 平局双方都+100');
}

// ---------- 像素猜宝可梦 ----------
{
  const room = makeRoom(['a', 'b']);
  room.selectedGame = 'pixel';
  startPixel(room, noop);
  const g = room.game as PixelState;
  const answer = g.pokemonId;
  const wrong = answer === 25 ? 1 : 25;
  ok(pixelView(room, 'a').imageToken === g.token && pixelView(room, 'a').stage === 0, 'pixel: 视图有 token 无答案');
  ok((handlePixelAction(room, 'a', { pokemonId: wrong }, noop) ?? '').includes('下一档'), 'pixel: 猜错须等下一档');
  ok((handlePixelAction(room, 'a', { pokemonId: answer }, noop) ?? '').includes('已猜过'), 'pixel: 同档不能再猜');
  g.stage = 1;
  ok(handlePixelAction(room, 'a', { pokemonId: answer }, noop) === null, 'pixel: 猜中');
  ok(g.phase === 'guess' && pixelView(room, 'b').result === null, 'pixel: first solve does not finish other players');
  ok(g.solved.a.points === 800 && room.scores.a === 800, 'pixel: 第1阶段猜中+800');
  ok(handlePixelAction(room, 'a', { pokemonId: answer }, noop) === '你已经猜中了', 'pixel: 猜中后不再接受');
  ok(handlePixelAction(room, 'b', { pokemonId: answer }, noop) === null, 'pixel: B 也猜中触发结算');
  ok(g.phase === 'reveal' && g.result!.pokemon.id === answer, 'pixel: 全员猜中进入 reveal 并公布答案');
  ok(g.result!.winners.length === 2, 'pixel: winners 记录完整');
}

// ---------- 谁是百变怪：抓住 + 猜中翻盘 ----------
{
  const room = makeRoom(['d', 't1', 't2']);
  room.selectedGame = 'ditto';
  startDitto(room, noop);
  const g = room.game as DittoState;
  const ditto = g.dittoId;
  const others = ['d', 't1', 't2'].filter((id) => id !== ditto);
  // 身份隔离
  const dvDitto = dittoView(room, ditto);
  const dvT = dittoView(room, others[0]);
  ok(dvDitto.amDitto && dvDitto.pokemon === null, 'ditto: 百变怪看不到宝可梦');
  ok(!dvT.amDitto && dvT.pokemon && dvT.pokemon.id === g.pokemonId, 'ditto: 训练家能看到宝可梦');
  // 确认
  for (const id of ['d', 't1', 't2']) ok(handleDittoAction(room, id, { type: 'confirm' }, noop) === null, `ditto: ${id} 确认`);
  ok(g.phase === 'speak', 'ditto: 全员确认后进入发言');
  ok(handleDittoAction(room, others[0], { type: 'vote', targetId: ditto }, noop) === '不在投票阶段', 'ditto: 发言阶段不能投票');
  // 走完发言
  while (g.phase === 'speak') {
    const cur = g.speakOrder[g.speakerIndex];
    ok(handleDittoAction(room, cur, { type: 'word', text: '可爱' }, noop) === null, `ditto: ${cur} 发言完成`);
  }
  ok(String(g.phase) === 'discuss', 'ditto: 报词结束进入不限时讨论'); handleDittoAction(room, room.hostId, {type:'discussion-done'}, noop);
  ok(handleDittoAction(room, others[0], { type: 'vote', targetId: others[0] }, noop) === '不能投自己', 'ditto: 不能投自己');
  ok(handleDittoAction(room, others[0], { type: 'vote', targetId: 'nobody' }, noop) === '投票对象无效', 'ditto: 无效目标被拒');
  for (const id of ['d', 't1', 't2']) {
    handleDittoAction(room, id, { type: 'vote', targetId: id === ditto ? others[0] : ditto }, noop);
  }
  ok(g.phase === 'dittoGuess' && g.dittoCaught === true, 'ditto: 全票抓中进入翻盘猜');
  ok(handleDittoAction(room, others[0], { type: 'ditto-guess', pokemonId: 1 }, noop) === '只有被抓的百变怪可以猜', 'ditto: 训练家不能猜');
  ok(handleDittoAction(room, ditto, { type: 'ditto-guess', pokemonId: g.pokemonId }, noop) === null, 'ditto: 百变怪猜中');
  ok(String(g.phase) === 'final' && room.status === 'RESULT', 'ditto: 终局');
  ok(room.scores[ditto] === 150, 'ditto: 翻盘+150');
  const fv = dittoView(room, others[0]);
  ok(fv.dittoId === ditto && fv.pokemon?.id === g.pokemonId && fv.tally!.length > 0, 'ditto: 终局公开身份/答案/票数');
}

// ---------- 谁是百变怪：两次平票逃脱 ----------
{
  const room = makeRoom(['d', 't1', 't2', 't3']);
  room.selectedGame = 'ditto';
  startDitto(room, noop);
  const g = room.game as DittoState;
  const ditto = g.dittoId;
  // 跳过确认与发言
  g.phase = 'speak';
  g.speakerIndex = g.speakOrder.length; // 直接结束发言
  // 手动进入投票（复用内部流转：逐个 speak-done 会走到 beginVote）
  g.phase = 'speak';
  g.speakerIndex = g.speakOrder.length - 1;
  handleDittoAction(room, g.speakOrder[g.speakerIndex], { type: 'word', text: '可爱' }, noop);
  handleDittoAction(room, room.hostId, {type:'discussion-done'}, noop); ok(String(g.phase) === 'vote', 'ditto(平票): 进入投票');
  // 4 人互投制造平票：每人得 1 票（排除自投，t1->t2, t2->t1, t3->d, d->t3）
  const ids = ['d', 't1', 't2', 't3'];
  const votes: Record<string, string> = { d: 't3', t1: 't2', t2: 't1', t3: 'd' };
  for (const id of ids) handleDittoAction(room, id, { type: 'vote', targetId: votes[id] }, noop);
  ok(String(g.phase) === 'revote' && (g.candidates?.length ?? 0) === 4, 'ditto(平票): 第一次平票进入复投');
  ok(handleDittoAction(room, 'd', { type: 'vote', targetId: 'd' }, noop) === '不能投自己', 'ditto(复投): 仍不能自投');
  for (const id of ids) handleDittoAction(room, id, { type: 'vote', targetId: votes[id] }, noop);
  ok(String(g.phase) === 'speak', 'ditto(平票): 再次平票继续报词');
  ok(room.scores[ditto] === 0, 'ditto(平票): 尚未结束不计分');
}

for (let stage = 0; stage < 6; stage++) {
  const room = makeRoom(['a','b']); startPixel(room, noop);
  const g = room.game as PixelState; g.pokemonId = 1025; g.stage = stage;
  handlePixelAction(room, 'a', { pokemonId: 1025 }, noop);
  ok(room.scores.a === [1000,800,600,400,250,100][stage], `pixel stage ${stage} scoring for #1025`);
  ok(g.phase === 'guess', 'remaining player continues after correct guess');
}
{
  const room = makeRoom(['a','b','c']); startDitto(room, noop);
  const g = room.game as DittoState; g.phase = 'dittoGuess';
  const wrong = g.pokemonId === 1025 ? 260 : 1025;
  handleDittoAction(room, g.dittoId, { type: 'ditto-guess', pokemonId: wrong }, noop);
  ok(room.players.every(p => room.scores[p.id] === (p.id === g.dittoId ? 0 : 100)), 'Ditto incorrect final guess: trainers +100');
}
console.log(`\n${passed} assertions passed${process.exitCode ? ' (WITH FAILURES)' : ''}`);
process.exit(process.exitCode ?? 0);

}
main().catch(e => { console.error(e); process.exit(1); });
