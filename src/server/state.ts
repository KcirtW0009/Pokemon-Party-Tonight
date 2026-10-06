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
  manualPausedAt?:number|null;
  scheduledTimers?:Map<NodeJS.Timeout,{deadline:number;fn:()=>void}>;
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
function schedule(room:ServerRoom,deadline:number,fn:()=>void):void {
 if(!room.game)return;const game=room.game;const t=setTimeout(()=>{room.scheduledTimers?.delete(t);game.timers=game.timers.filter(handle=>handle!==t);if(room.game!==game)return;if(room.manualPausedAt!=null)return;fn();},Math.max(1,deadline-Date.now()));
 (room.scheduledTimers??=new Map()).set(t,{deadline,fn});game.timers.push(t);
}
export function after(room:ServerRoom,ms:number,fn:()=>void):void {schedule(room,Date.now()+ms,fn);}
export function freezeScheduledTimers(room:ServerRoom):void {for(const t of room.scheduledTimers?.keys()??[])clearTimeout(t);}
export function resumeScheduledTimers(room:ServerRoom,delta:number):void {const tasks=[...room.scheduledTimers?.values()??[]];const handles=new Set(room.scheduledTimers?.keys());if(room.game)room.game.timers=room.game.timers.filter(t=>!handles.has(t));room.scheduledTimers?.clear();for(const task of tasks)schedule(room,task.deadline+delta,task.fn);}
export function clearGameTimers(room:ServerRoom):void {if(room.game){for(const t of room.game.timers)clearTimeout(t);room.game.timers=[];}room.scheduledTimers?.clear();}

/** 当前在线玩家 */
export function activePlayers(room: ServerRoom): ServerPlayer[] {
  return room.players.filter((p) => p.connected);
}

export function playerName(room: ServerRoom, id: string): string {
  return room.players.find((p) => p.id === id)?.nickname ?? '???';
}
