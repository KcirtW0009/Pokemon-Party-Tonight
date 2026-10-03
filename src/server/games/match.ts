import questionsRaw from '../../../data/questions.json';
import type { MatchRoundResult, MatchView, Question } from '@/lib/types';
import { T } from '../config';
import { activePlayers, after, clearGameTimers, type Broadcast, type MatchState, type ServerRoom } from '../state';
import { sample, shuffle } from '../util';
import { ALL_POKEMON } from '../pokedex';
import { targetReached } from '../score';

const QUESTIONS = questionsRaw as Question[];

function state(room: ServerRoom): MatchState {
  const g = room.game;
  if (!g || g.kind !== 'match') throw new Error('not a match game');
  return g;
}

export function questionForRoom(room: ServerRoom, id: number): Question {
  const question = QUESTIONS.find((q) => q.id === id) ?? QUESTIONS[0];
  const target = sample(activePlayers(room));
  return { ...question, text: question.text.replaceAll('{player}', `「${target.nickname}」`) };
}
export function matchCandidates(question: Question): number[] {
  return shuffle(ALL_POKEMON.filter(p => !question.requiredType || p.types.includes(question.requiredType)).map(p => p.id)).slice(0, 10);
}

export function startMatch(room: ServerRoom, broadcast: Broadcast): void {
  clearGameTimers(room);
  const totalRounds = room.settings.matchRounds;
  const ids = shuffle(QUESTIONS.map((q) => q.id)).slice(0, totalRounds);
  const question = questionForRoom(room, ids[0]);
  room.status = 'PLAYING';
  room.game = {
    kind: 'match',
    timers: [],
    phase: 'pick',
    round: 1,
    totalRounds,
    question,
    candidateIds: matchCandidates(question),
    questionIds: ids,
    picks: {},
    endsAt: Date.now() + T.matchPickMs,
    revealEndsAt: null,
    result: null,
  };
  after(room, T.matchPickMs, () => {
    autoSubmit(room);
    showReveal(room, broadcast);
  });
  broadcast(room);
}

/** 超时未提交的玩家随机选一只，避免卡死 */
function autoSubmit(room: ServerRoom): void {
  const g = state(room);
  for (const p of activePlayers(room)) {
    if (!(p.id in g.picks)) g.picks[p.id] = shuffle(g.candidateIds)[0];
  }
}

function showReveal(room: ServerRoom, broadcast: Broadcast): void {
  const g = state(room);
  if (g.phase !== 'pick') return;
  clearGameTimers(room);
  g.phase = 'countdown';
  g.endsAt = Date.now() + T.countdownMs;
  after(room, T.countdownMs, () => finishReveal(room, broadcast));
  broadcast(room);
}

function finishReveal(room: ServerRoom, broadcast: Broadcast): void {
  const g = state(room);
  if (g.phase !== 'countdown') return;
  const groups = new Map<number, string[]>();
  for (const [pid, pokeId] of Object.entries(g.picks)) {
    const arr = groups.get(pokeId) ?? [];
    arr.push(pid);
    groups.set(pokeId, arr);
  }
  const gains: Record<string, number> = {};
  const groupList: MatchRoundResult['groups'] = [];
  for (const [pokeId, pids] of groups) {
    groupList.push({ pokemonId: pokeId, playerIds: pids });
    const gain = pids.length >= 2 ? (pids.length - 1) * 100 : 0;
    for (const pid of pids) {
      gains[pid] = gain;
      room.scores[pid] = (room.scores[pid] ?? 0) + gain;
    }
  }
  groupList.sort((a, b) => b.playerIds.length - a.playerIds.length);
  g.result = { picks: { ...g.picks }, groups: groupList, gains };
  g.phase = 'reveal';
  g.endsAt = null;
  g.revealEndsAt = Date.now() + T.revealMs;
  after(room, T.revealMs, () => nextRound(room, broadcast));
  broadcast(room);
}

function nextRound(room: ServerRoom, broadcast: Broadcast): void {
  const g = state(room);
  if (g.round >= g.totalRounds || targetReached(room)) {
    g.phase = 'final';
    g.result = null;
    g.revealEndsAt = null;
    room.status = 'RESULT';
    broadcast(room);
    return;
  }
  clearGameTimers(room);
  g.round += 1;
  g.question = questionForRoom(room, g.questionIds[g.round - 1]);
  g.candidateIds = matchCandidates(g.question);
  g.picks = {};
  g.result = null;
  g.phase = 'pick';
  g.endsAt = Date.now() + T.matchPickMs;
  g.revealEndsAt = null;
  after(room, T.matchPickMs, () => {
    autoSubmit(room);
    showReveal(room, broadcast);
  });
  broadcast(room);
}

export function handleMatchAction(
  room: ServerRoom,
  playerId: string,
  action: unknown,
  broadcast: Broadcast,
): string | null {
  const g = state(room);
  if (g.phase !== 'pick') return '本轮已结束';
  if (typeof action !== 'object' || action === null) return '无效操作';
  const pokemonId = (action as { pokemonId?: unknown }).pokemonId;
  if (typeof pokemonId !== 'number' || !Number.isInteger(pokemonId) || pokemonId < 1 || pokemonId > 1025) {
    return '请选择一只宝可梦';
  }
  if (g.picks[playerId] !== undefined) return '你已提交过答案';
  if (!g.candidateIds.includes(pokemonId)) return '请选择本题的候选宝可梦';
  g.picks[playerId] = pokemonId;
  // 全员提交则直接开奖
  const allIn = activePlayers(room).every((p) => p.id in g.picks);
  if (allIn) {
    showReveal(room, broadcast);
  } else {
    broadcast(room);
  }
  return null;
}

export function matchView(room: ServerRoom, playerId: string): MatchView {
  const g = state(room);
  const active = activePlayers(room);
  return {
    game: 'match',
    candidateIds: g.phase === 'final' ? [] : [...g.candidateIds],
    phase: g.phase,
    round: g.round,
    totalRounds: g.totalRounds,
    question: g.phase === 'final' ? null : g.question,
    endsAt: g.phase === 'pick' || g.phase === 'countdown' ? g.endsAt : null,
    myPick: g.phase === 'pick' || g.phase === 'countdown' ? (g.picks[playerId] ?? null) : null,
    submittedCount: Object.keys(g.picks).length,
    playerCount: active.length,
    result: g.phase === 'reveal' ? g.result : null,
    revealEndsAt: g.phase === 'reveal' ? g.revealEndsAt : null,
  };
}
