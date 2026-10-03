import type { BattleRoundResult, BattleStat, BattleView } from '@/lib/types';
import { BATTLE_STATS } from '@/lib/types';
import { BATTLE_ROUNDS, T } from '../config';
import { getPokemon } from '../pokedex';
import { activePlayers, after, clearGameTimers, type Broadcast, type BattleState, type ServerRoom } from '../state';
import { sample, sampleIds } from '../util';

function state(room: ServerRoom): BattleState {
  const g = room.game;
  if (!g || g.kind !== 'battle') throw new Error('not a battle game');
  return g;
}

function statValue(pokemonId: number, stat: BattleStat): number {
  const p = getPokemon(pokemonId);
  if (!p) return 0;
  return p[stat];
}

export function startBattle(room: ServerRoom, broadcast: Broadcast): void {
  clearGameTimers(room);
  const hands: Record<string, number[]> = {};
  for (const p of activePlayers(room)) hands[p.id] = sampleIds(5, 1025);
  room.status = 'PLAYING';
  room.game = {
    kind: 'battle',
    timers: [],
    phase: 'pick',
    round: 1,
    totalRounds: BATTLE_ROUNDS,
    stat: sample(BATTLE_STATS).key,
    hands,
    initialHands: Object.fromEntries(Object.entries(hands).map(([id, hand]) => [id, [...hand]])),
    plays: {},
    endsAt: Date.now() + T.battlePickMs,
    revealEndsAt: null,
    result: null,
  };
  after(room, T.battlePickMs, () => {
    autoPlay(room);
    showReveal(room, broadcast);
  });
  broadcast(room);
}

function autoPlay(room: ServerRoom): void {
  const g = state(room);
  for (const p of activePlayers(room)) {
    if (!(p.id in g.plays)) {
      const hand = g.hands[p.id] ?? [];
      if (hand.length > 0) g.plays[p.id] = sample(hand);
    }
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
  const values: Record<string, number> = {};
  let best = -Infinity;
  for (const [pid, pokeId] of Object.entries(g.plays)) {
    const v = statValue(pokeId, g.stat);
    values[pid] = v;
    if (v > best) best = v;
  }
  const winners = Object.entries(values)
    .filter(([, v]) => v === best)
    .map(([pid]) => pid);
  const gains: Record<string, number> = {};
  for (const [pid, pokeId] of Object.entries(g.plays)) {
    const gain = winners.includes(pid) ? 100 : 0;
    gains[pid] = gain;
    room.scores[pid] = (room.scores[pid] ?? 0) + gain;
    // 消耗手牌
    g.hands[pid] = (g.hands[pid] ?? []).filter((id) => id !== pokeId);
  }
  g.result = { plays: { ...g.plays }, values, winners, gains };
  g.phase = 'reveal';
  g.endsAt = null;
  g.revealEndsAt = Date.now() + T.revealMs;
  after(room, T.revealMs, () => nextRound(room, broadcast));
  broadcast(room);
}

function nextRound(room: ServerRoom, broadcast: Broadcast): void {
  const g = state(room);
  if (g.round >= g.totalRounds) {
    g.phase = 'final';
    g.result = null;
    g.revealEndsAt = null;
    g.stat = sample(BATTLE_STATS).key;
    room.status = 'RESULT';
    broadcast(room);
    return;
  }
  clearGameTimers(room);
  g.round += 1;
  // 避免连续两轮同一属性
  let s = sample(BATTLE_STATS).key;
  if (s === g.stat) s = sample(BATTLE_STATS).key;
  g.stat = s;
  g.plays = {};
  g.result = null;
  g.phase = 'pick';
  g.endsAt = Date.now() + T.battlePickMs;
  g.revealEndsAt = null;
  after(room, T.battlePickMs, () => {
    autoPlay(room);
    showReveal(room, broadcast);
  });
  broadcast(room);
}

export function handleBattleAction(
  room: ServerRoom,
  playerId: string,
  action: unknown,
  broadcast: Broadcast,
): string | null {
  const g = state(room);
  if (g.phase !== 'pick') return '本轮已结束';
  if (typeof action !== 'object' || action === null) return '无效操作';
  const pokemonId = (action as { pokemonId?: unknown }).pokemonId;
  const hand = g.hands[playerId] ?? [];
  if (typeof pokemonId !== 'number' || !hand.includes(pokemonId)) return '请选择手牌中的宝可梦';
  if (g.plays[playerId] !== undefined) return '你已出牌';
  g.plays[playerId] = pokemonId;
  const allIn = activePlayers(room).every((p) => p.id in g.plays);
  if (allIn) {
    showReveal(room, broadcast);
  } else {
    broadcast(room);
  }
  return null;
}

export function battleView(room: ServerRoom, playerId: string): BattleView {
  const g = state(room);
  const active = activePlayers(room);
  const meta = BATTLE_STATS.find((s) => s.key === g.stat);
  return {
    game: 'battle',
    phase: g.phase,
    round: g.round,
    totalRounds: g.totalRounds,
    stat: g.stat,
    statLabel: meta ? `${meta.label}${meta.unit ? `（${meta.unit}）` : ''}最高` : null,
    endsAt: g.phase === 'pick' || g.phase === 'countdown' ? g.endsAt : null,
    myHand: [...(g.hands[playerId] ?? [])],
    myUsed: (g.initialHands[playerId] ?? []).filter(id => !(g.hands[playerId] ?? []).includes(id)),
    myPick: g.phase === 'pick' ? (g.plays[playerId] ?? null) : null,
    submittedCount: Object.keys(g.plays).length,
    playerCount: active.length,
    result: g.phase === 'reveal' ? g.result : null,
    revealEndsAt: g.phase === 'reveal' ? g.revealEndsAt : null,
  };
}
