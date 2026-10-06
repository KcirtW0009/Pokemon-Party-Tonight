import type { DittoView } from '@/lib/types';
import { T } from '../config';
import { getPokemon } from '../pokedex';
import { randomClue } from '../clues';
import { targetReached } from '../score';
import { activePlayers, after, clearGameTimers, playerName, type Broadcast, type DittoState, type ServerRoom } from '../state';
import { sample, sampleIds, shuffle } from '../util';
const ABSTAIN = 'abstain';
function state(room: ServerRoom): DittoState {
  if (!room.game || room.game.kind !== 'ditto') throw new Error('not a ditto game');
  return room.game;
}
function arm(room: ServerRoom, broadcast: Broadcast, ms: number): void {
  const g = state(room);
  g.endsAt = Date.now() + ms;
  after(room, ms, () => {
    if (g.paused) return;
    if (g.phase === 'confirm') beginWords(room, broadcast);
    else if (g.phase === 'speak') {
      g.words.push({ cycle: g.cycle, playerId: g.speakOrder[g.speakerIndex], text: '未报词' });
      advanceSpeaker(room, broadcast);
    } else if (g.phase === 'vote' || g.phase === 'revote') {
      for (const id of g.aliveIds) if (!(id in g.votes)) g.votes[id] = ABSTAIN;
      closeVote(room, broadcast);
    } else if (g.phase === 'dittoGuess') resolveGuess(room, broadcast, null);
  });
}
export function startDitto(room: ServerRoom, broadcast: Broadcast): void {
  const previous = room.game?.kind === 'ditto' ? room.game : null;
  const round = previous?.phase === 'roundResult' ? previous.round + 1 : 1;
  const participantIds = round > 1 && previous ? previous.participantIds : activePlayers(room).map(p => p.id);
  clearGameTimers(room);
  const pokemonId = sampleIds(1, 1025)[0];
  room.status = 'PLAYING';
  room.game = {
    kind: 'ditto', timers: [], phase: 'confirm', round, totalRounds: room.settings.dittoRounds,
    participantIds, aliveIds: [...participantIds], eliminatedIds: [], cycle: 0, words: [], reminders: [], notice: null,
    clue: randomClue(getPokemon(pokemonId)!, participantIds.length), paused: false, pausedRemainingMs: null,
    dittoId: sample(participantIds), pokemonId, confirmed: [], speakOrder: shuffle(participantIds), speakerIndex: 0,
    endsAt: null, votes: {}, candidates: null, revoted: false, tally: null, accusedId: null, dittoCaught: null,
    dittoGuess: null, gains: null, winners: null, resultTitle: null,
  };
  arm(room, broadcast, T.dittoConfirmMs);
  syncDittoConnections(room, broadcast);
  broadcast(room);
}
function beginWords(room: ServerRoom, broadcast: Broadcast, notice: string | null = null): void {
  const g = state(room);
  clearGameTimers(room);
  g.phase = 'speak'; g.cycle++; g.speakOrder = g.speakOrder.filter(id => g.aliveIds.includes(id));
  g.speakerIndex = 0; g.reminders = []; g.votes = {}; g.candidates = null; g.revoted = false; g.notice = notice;
  arm(room, broadcast, T.dittoSpeakMs);
  broadcast(room);
}
function advanceSpeaker(room: ServerRoom, broadcast: Broadcast): void {
  const g = state(room);
  clearGameTimers(room);
  g.speakerIndex++;
  if (g.speakerIndex >= g.speakOrder.length) { g.phase = 'discuss'; g.endsAt = null; }
  else arm(room, broadcast, T.dittoSpeakMs);
  broadcast(room);
}
function beginVote(room: ServerRoom, broadcast: Broadcast): void {
  const g = state(room);
  clearGameTimers(room);
  g.phase = 'vote'; g.votes = {}; g.tally = null; g.notice = null;
  arm(room, broadcast, T.dittoVoteMs);
  broadcast(room);
}
function closeVote(room: ServerRoom, broadcast: Broadcast): void {
  const g = state(room);
  clearGameTimers(room);
  const counts = new Map<string, number>();
  for (const value of Object.values(g.votes)) counts.set(value, (counts.get(value) ?? 0) + 1);
  g.tally = [...counts].map(([targetId, count]) => ({ targetId, count })).sort((a, b) => b.count - a.count);
  if ((counts.get(ABSTAIN) ?? 0) > g.aliveIds.length / 2) {
    beginWords(room, broadcast, '弃权超过半数，继续下一轮报词与讨论。'); return;
  }
  const targets = g.tally.filter(t => t.targetId !== ABSTAIN);
  const tied = targets.filter(t => t.count === targets[0]?.count).map(t => t.targetId);
  if (tied.length !== 1) {
    if (tied.length > 1 && !g.revoted) {
      g.phase = 'revote'; g.revoted = true; g.candidates = tied; g.votes = {};
      g.notice = '最高票平票，请在平票对象中复投，也可以弃权。';
      arm(room, broadcast, T.dittoVoteMs); broadcast(room); return;
    }
    beginWords(room, broadcast, '复投仍平票，继续下一轮报词与讨论。'); return;
  }
  g.accusedId = tied[0];
  if (g.accusedId === g.dittoId) {
    g.dittoCaught = true; g.phase = 'dittoGuess'; g.notice = '百变怪被投出！还有一次猜宝可梦翻盘的机会。';
    arm(room, broadcast, T.dittoGuessMs); broadcast(room); return;
  }
  g.aliveIds = g.aliveIds.filter(id => id !== g.accusedId);
  g.eliminatedIds.push(g.accusedId);
  const notice = `${playerName(room, g.accusedId)} 不是百变怪，已出局。`;
  if (g.aliveIds.length <= 2) finish(room, broadcast, 'escape', `${notice} 百变怪存活到最后两人，获胜！`);
  else { beginWords(room, broadcast, notice); syncDittoConnections(room, broadcast); }
}
function finish(room: ServerRoom, broadcast: Broadcast, outcome: 'escape' | 'comeback' | 'trainers', title: string): void {
  const g = state(room);
  clearGameTimers(room);
  g.gains = Object.fromEntries(g.participantIds.map(id => [id, outcome === 'trainers' ? (id === g.dittoId ? 0 : 100) : (id === g.dittoId ? (outcome === 'escape' ? 200 : 150) : 0)]));
  for (const [id, points] of Object.entries(g.gains)) room.scores[id] = (room.scores[id] ?? 0) + points;
  g.winners = g.participantIds.filter(id => g.gains![id] > 0);
  g.resultTitle = title; g.endsAt = null; g.paused = false;
  g.phase = g.round >= g.totalRounds || targetReached(room) ? 'final' : 'roundResult';
  room.status = g.phase === 'final' ? 'RESULT' : 'PLAYING';
  broadcast(room);
}
function resolveGuess(room: ServerRoom, broadcast: Broadcast, guess: number | null): void {
  const g = state(room); g.dittoGuess = guess;
  finish(room, broadcast, guess === g.pokemonId ? 'comeback' : 'trainers', guess === g.pokemonId ? '百变怪猜中了宝可梦，极限翻盘！' : '训练家们成功抓住了百变怪！');
}
// Pause every timed phase when nobody alive is connected; spectators cannot advance the game alone.
export function syncDittoConnections(room: ServerRoom, broadcast: Broadcast): void {
  if (room.game?.kind !== 'ditto'||room.manualPausedAt!=null) return;
  const g = room.game;
  if (g.phase === 'final' || g.phase === 'roundResult') return;
  const online = room.players.some(p => p.connected && g.aliveIds.includes(p.id));
  if (!online && !g.paused) {
    g.pausedRemainingMs = g.endsAt === null ? null : Math.max(1, g.endsAt - Date.now());
    clearGameTimers(room); g.endsAt = null; g.paused = true;
  } else if (online && g.paused) {
    g.paused = false;
    if (g.pausedRemainingMs !== null) arm(room, broadcast, g.pausedRemainingMs);
    g.pausedRemainingMs = null;
  }
}
export function handleDittoAction(room: ServerRoom, playerId: string, action: unknown, broadcast: Broadcast): string | null {
  const g = state(room);
  if (typeof action !== 'object' || action === null) return '无效操作';
  const a = action as { type?: unknown; text?: unknown; targetId?: unknown; pokemonId?: unknown };
  if (a.type === 'next-round') {
    if (playerId !== room.hostId || g.phase !== 'roundResult') return '只有房主可开始下一局';
    startDitto(room, broadcast); return null;
  }
  if (g.paused) return '等待存活玩家重连';
  if (a.type === 'discussion-done') {
    if (g.phase !== 'discuss' || playerId !== room.hostId) return '只有房主可结束讨论';
    beginVote(room, broadcast); return null;
  }
  if (!g.aliveIds.includes(playerId)) return '你已出局，只能观战';
  if (a.type === 'confirm') {
    if (g.phase !== 'confirm') return '已进入下一阶段';
    if (!g.confirmed.includes(playerId)) g.confirmed.push(playerId);
    if (g.aliveIds.every(id => g.confirmed.includes(id))) beginWords(room, broadcast);
    else broadcast(room);
    return null;
  }
  if (a.type === 'word') {
    if (g.phase !== 'speak' || g.speakOrder[g.speakerIndex] !== playerId) return '还没轮到你报词';
    const text = typeof a.text === 'string' ? a.text.trim() : '';
    if (!text || [...text].length > 12 || /[\r\n\p{Cc}]/u.test(text)) return '请输入 1–12 字的短语';
    if (text.includes(getPokemon(g.pokemonId)!.nameZh)) return '请不要直接报出宝可梦的名字';
    g.words.push({ cycle: g.cycle, playerId, text }); advanceSpeaker(room, broadcast); return null;
  }
  if (a.type === 'remind') {
    if (g.phase !== 'discuss') return '不在讨论阶段';
    if (playerId === room.hostId) return '房主可直接结束讨论';
    if (g.reminders.includes(playerId)) return '本轮已提醒';
    g.reminders.push(playerId); broadcast(room); return null;
  }
  if (a.type === 'vote') {
    if (g.phase !== 'vote' && g.phase !== 'revote') return '不在投票阶段';
    const target = a.targetId;
    if (typeof target !== 'string' || (target !== ABSTAIN && !g.aliveIds.includes(target))) return '投票对象无效';
    if (target === playerId) return '不能投自己';
    if (target !== ABSTAIN && g.phase === 'revote' && !g.candidates?.includes(target)) return '复投只能投平票候选人';
    if (playerId in g.votes) return '你已投票';
    g.votes[playerId] = target;
    if (g.aliveIds.every(id => id in g.votes)) closeVote(room, broadcast); else broadcast(room);
    return null;
  }
  if (a.type === 'ditto-guess') {
    if (g.phase !== 'dittoGuess' || playerId !== g.dittoId) return '只有被抓的百变怪可以猜';
    if (typeof a.pokemonId !== 'number' || !Number.isInteger(a.pokemonId) || !getPokemon(a.pokemonId)) return '请选择一只宝可梦';
    resolveGuess(room, broadcast, a.pokemonId); return null;
  }
  return '未知操作';
}
export function dittoView(room: ServerRoom, playerId: string): DittoView {
  const g = state(room);
  const ended = g.phase === 'final' || g.phase === 'roundResult';
  const amDitto = g.dittoId === playerId;
  return {
    game: 'ditto', phase: g.phase, round: g.round, totalRounds: g.totalRounds, cycle: g.cycle,
    aliveIds: [...g.aliveIds], eliminatedIds: [...g.eliminatedIds], words: [...g.words], reminders: [...g.reminders],
    notice: g.notice, clue: amDitto ? g.clue : null, paused: g.paused, amDitto,
    pokemon: !amDitto || ended ? getPokemon(g.pokemonId) : null,
    speakOrder: [...g.speakOrder], speakerIndex: g.speakerIndex, endsAt: g.endsAt,
    confirmedCount: g.confirmed.length, playerCount: g.aliveIds.length, iConfirmed: g.confirmed.includes(playerId),
    iVoted: playerId in g.votes, votedCount: Object.keys(g.votes).length,
    candidates: g.phase === 'revote' ? g.candidates : null,
    tally: g.tally ? [...g.tally] : null, accusedId: g.accusedId, dittoCaught: g.dittoCaught,
    dittoGuess: ended ? g.dittoGuess : null, gains: ended ? g.gains : null, winners: ended ? g.winners : null,
    resultTitle: ended ? g.resultTitle : null, dittoId: ended ? g.dittoId : null,
  };
}
