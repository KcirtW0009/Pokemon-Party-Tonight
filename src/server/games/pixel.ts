import type { PixelRoundResult, PixelView } from '@/lib/types';
import { PIXEL_SCORES } from '@/lib/types';
import { T } from '../config';
import { createImageToken } from '../imageTokens';
import { getPokemon } from '../pokedex';
import { activePlayers, after, clearGameTimers, type Broadcast, type PixelState, type ServerRoom } from '../state';
import { sampleIds } from '../util';
import { targetReached } from '../score';

const LAST_STAGE = 5;

function state(room: ServerRoom): PixelState {
  const g = room.game;
  if (!g || g.kind !== 'pixel') throw new Error('not a pixel game');
  return g;
}

export function startPixel(room: ServerRoom, broadcast: Broadcast): void {
  clearGameTimers(room);
  room.status = 'PLAYING';
  room.game = {
    kind: 'pixel',
    timers: [],
    phase: 'guess',
    round: 0,
    totalRounds: room.settings.pixelRounds,
    pokemonId: 0,
    usedIds: [],
    token: '',
    stage: 0,
    solved: {},
    locks: {},
    endsAt: null,
    revealEndsAt: null,
    result: null,
  };
  nextRound(room, broadcast);
}

function nextRound(room: ServerRoom, broadcast: Broadcast): void {
  const g = state(room);
  if (g.round >= g.totalRounds || targetReached(room)) {
    g.phase = 'final';
    g.result = null;
    g.token = '';
    g.revealEndsAt = null;
    g.endsAt = null;
    room.status = 'RESULT';
    broadcast(room);
    return;
  }
  clearGameTimers(room);
  const used = new Set(g.usedIds);
  const id = sampleIds(1, 1025, used)[0];
  g.round += 1;
  g.pokemonId = id;
  g.usedIds.push(id);
  g.token = createImageToken(id);
  g.stage = 0;
  g.solved = {};
  g.locks = {};
  g.result = null;
  g.phase = 'guess';
  g.endsAt = Date.now() + T.pixelStageMs;
  g.revealEndsAt = null;
  after(room, T.pixelStageMs, () => advanceStage(room, broadcast));
  broadcast(room);
}

function advanceStage(room: ServerRoom, broadcast: Broadcast): void {
  const g = state(room);
  if (g.phase !== 'guess') return;
  if (g.stage >= LAST_STAGE) {
    endRound(room, broadcast);
    return;
  }
  g.stage += 1;
  g.endsAt = Date.now() + T.pixelStageMs;
  after(room, T.pixelStageMs, () => advanceStage(room, broadcast));
  broadcast(room);
}

function endRound(room: ServerRoom, broadcast: Broadcast): void {
  const g = state(room);
  if (g.phase !== 'guess') return;
  clearGameTimers(room);
  const pokemon = getPokemon(g.pokemonId);
  if (!pokemon) {
    nextRound(room, broadcast);
    return;
  }
  const winners = Object.entries(g.solved).map(([playerId, s]) => ({
    playerId,
    points: s.points,
    stage: s.stage,
  }));
  winners.sort((a, b) => b.points - a.points);
  g.result = { pokemon, winners };
  g.phase = 'reveal';
  g.endsAt = null;
  g.revealEndsAt = Date.now() + T.revealMs;
  after(room, T.revealMs, () => nextRound(room, broadcast));
  broadcast(room);
}

export function handlePixelAction(
  room: ServerRoom,
  playerId: string,
  action: unknown,
  broadcast: Broadcast,
): string | null {
  const g = state(room);
  if (g.phase !== 'guess') return '本轮已结束';
  if (typeof action !== 'object' || action === null) return '无效操作';
  const pokemonId = (action as { pokemonId?: unknown }).pokemonId;
  if (typeof pokemonId !== 'number' || !Number.isInteger(pokemonId) || pokemonId < 1 || pokemonId > 1025) {
    return '请选择一只宝可梦';
  }
  if (g.solved[playerId]) return '你已经猜中了';
  const now = Date.now();
  if ((g.locks[playerId] ?? 0) > now) return '猜错锁定中，请稍候';
  if (pokemonId === g.pokemonId) {
    const points = PIXEL_SCORES[Math.min(g.stage, PIXEL_SCORES.length - 1)];
    g.solved[playerId] = { stage: g.stage, points };
    room.scores[playerId] = (room.scores[playerId] ?? 0) + points;
    const allSolved = activePlayers(room).every((p) => p.id in g.solved);
    if (allSolved) {
      endRound(room, broadcast);
    } else {
      broadcast(room);
    }
    return null;
  }
  g.locks[playerId] = now + T.pixelGuessLockMs;
  broadcast(room);
  return '猜错了，锁定 3 秒';
}

export function pixelView(room: ServerRoom, playerId: string): PixelView {
  const g = state(room);
  const active = activePlayers(room);
  return {
    game: 'pixel',
    phase: g.phase,
    round: g.round,
    totalRounds: g.totalRounds,
    stage: g.stage,
    imageToken: g.phase === 'guess' ? g.token : null,
    endsAt: g.phase === 'guess' ? g.endsAt : null,
    mySolved: !!g.solved[playerId],
    myScore: g.solved[playerId]?.points ?? 0,
    myLockedUntil: (g.locks[playerId] ?? 0) > Date.now() ? g.locks[playerId] : null,
    solvedCount: Object.keys(g.solved).length,
    playerCount: active.length,
    result: g.phase === 'reveal' ? g.result : null,
    revealEndsAt: g.phase === 'reveal' ? g.revealEndsAt : null,
  };
}
