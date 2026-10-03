import type {
  BattleRoundResult,
  BattleStat,
  DittoPhase,
  GameType,
  MatchRoundResult,
  PixelRoundResult,
  Question,
  RoomSettings,
  RoomStatus,
} from '@/lib/types';

export interface ServerPlayer {
  id: string;
  nickname: string;
  connected: boolean;
  ready: boolean;
  socketId: string | null;
  sessionToken?: string;
}

interface BaseGame {
  kind: GameType;
  timers: NodeJS.Timeout[];
}

export interface MatchState extends BaseGame {
  candidateIds: number[];
  kind: 'match';
  phase: 'pick' | 'countdown' | 'reveal' | 'final';
  round: number;
  totalRounds: number;
  question: Question;
  questionIds: number[];
  picks: Record<string, number>;
  endsAt: number | null;
  revealEndsAt: number | null;
  result: MatchRoundResult | null;
}

export interface BattleState extends BaseGame {
  direction: 'highest' | 'lowest';
  directions: ('highest' | 'lowest')[];
  kind: 'battle';
  phase: 'pick' | 'countdown' | 'reveal' | 'final';
  round: number;
  totalRounds: number;
  stat: BattleStat;
  hands: Record<string, number[]>;
  initialHands: Record<string, number[]>;
  plays: Record<string, number>;
  endsAt: number | null;
  revealEndsAt: number | null;
  result: BattleRoundResult | null;
}

export interface PixelState extends BaseGame {
  attemptedStages: Record<string, number>;
  kind: 'pixel';
  phase: 'guess' | 'reveal' | 'final';
  round: number;
  totalRounds: number;
  pokemonId: number;
  usedIds: number[];
  token: string;
  stage: number;
  solved: Record<string, { stage: number; points: number }>;
  endsAt: number | null;
  revealEndsAt: number | null;
  result: PixelRoundResult | null;
}

export interface DittoState extends BaseGame {
  round: number;
  totalRounds: number;
  participantIds: string[];
  aliveIds: string[];
  eliminatedIds: string[];
  cycle: number;
  words: { cycle: number; playerId: string; text: string }[];
  reminders: string[];
  notice: string | null;
  clue: string;
  paused: boolean;
  pausedRemainingMs: number | null;
  kind: 'ditto';
  phase: DittoPhase;
  dittoId: string;
  pokemonId: number;
  confirmed: string[];
  speakOrder: string[];
  speakerIndex: number;
  endsAt: number | null;
  votes: Record<string, string>;
  candidates: string[] | null;
  revoted: boolean;
  tally: { targetId: string; count: number }[] | null;
  accusedId: string | null;
  dittoCaught: boolean | null;
  dittoGuess: number | null;
  gains: Record<string, number> | null;
  winners: string[] | null;
  resultTitle: string | null;
}

export type ServerGame = MatchState | BattleState | PixelState | DittoState | import('./batch/core').BatchState;

export interface ServerRoom {
  revision?: number;
  code: string;
  hostId: string;
  players: ServerPlayer[];
  selectedGame: GameType;
  settings: RoomSettings;
  status: RoomStatus;
  scores: Record<string, number>;
  game: ServerGame | null;
  deleteTimer: NodeJS.Timeout | null;
}

export type Broadcast = (room: ServerRoom) => void;

/** 注册一个延时任务，随游戏结束自动清理 */
export function after(room: ServerRoom, ms: number, fn: () => void): void {
  if (!room.game) return;
  room.game.timers.push(setTimeout(fn, ms));
}

export function clearGameTimers(room: ServerRoom): void {
  if (room.game) {
    for (const t of room.game.timers) clearTimeout(t);
    room.game.timers = [];
  }
}

/** 当前在线玩家 */
export function activePlayers(room: ServerRoom): ServerPlayer[] {
  return room.players.filter((p) => p.connected);
}

export function playerName(room: ServerRoom, id: string): string {
  return room.players.find((p) => p.id === id)?.nickname ?? '???';
}
