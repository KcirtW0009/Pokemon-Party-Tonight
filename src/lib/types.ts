// 前后端共享的协议类型。服务端权威，客户端只做展示。
// Shared protocol types (client + server). Server is authoritative.

import type {SecondGameType,SecondSettings,BatchView,ActionEnvelope} from './secondTypes';
export type GameType = 'ditto' | 'pixel' | 'match' | 'battle' | SecondGameType;
export type RoomStatus = 'LOBBY' | 'PLAYING' | 'RESULT';

export interface Pokemon {
  id: number;
  nameZh: string;
  nameEn: string;
  pinyin: string;
  searchAliases?: string[];
  image: string;
  types: string[];
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  height: number;
  weight: number;
}

export interface Question {
  id: number;
  text: string;
  category: string;
  requiredType?: string;
}

export interface PlayerInfo {
  id: string;
  nickname: string;
  connected: boolean;
  ready: boolean;
}

export interface RoomSettings {
  second?: SecondSettings;
  /** 像素猜宝可梦轮数 */
  pixelRounds: number;
  /** 默契挑战轮数 */
  matchRounds: number;
  dittoRounds: number;
  dittoMode?:'blank'|'paired';
  targetScore: number;
}

export const GAME_META: Record<
  GameType,
  { name: string; icon: string; minPlayers: number; maxPlayers: number; desc: string }
> = {
  'rocket-secret':{name:'火箭队秘密行动',icon:'📡',minPlayers:3,maxPlayers:8,desc:'发报员传递四条暗号，接头员和截获者秘密破解宝可梦序列。'},
  'pokemon-auction':{name:'宝可梦卡牌拍卖',icon:'🔨',minPlayers:2,maxPlayers:6,desc:'购买私人情报、秘密报价，竞拍盲盒后自动出售卡牌。试玩参数待平衡验证。'},
  'pokemon-liars-dice':{name:'宝可梦大话骰',icon:'🎲',minPlayers:3,maxPlayers:8,desc:'私人骰子、公开叫数；百变怪万能，三命淘汰赛。'},
  'surround-meloetta':{name:'圈住美洛耶塔',icon:'🎵',minPlayers:2,maxPlayers:8,desc:'轮流放置障碍围住美洛耶塔；舞步形态可破障一次。'},
  'pokemon-push-your-luck':{name:'宝可梦探险：贪心抽卡',icon:'🧭',minPlayers:2,maxPlayers:8,desc:'继续抽牌或暂时停手，下次可返场；重复数字爆点，六种道具改变局势。'},
  'type-bomb': {name:'属性炸弹',icon:'💣',minPlayers:2,maxPlayers:8,desc:'轮流猜属性，用公开伤害推理；每轮剩余生命累计排名。'},
  'starter-memory': {name:'记忆大师',icon:'🃏',minPlayers:2,maxPlayers:8,desc:'轮流翻两张牌，找出成对的御三家。'},
  'snorlax-berries': {name:'卡比兽的树果',icon:'🍒',minPlayers:2,maxPlayers:8,desc:'抽取树果得分，也可以请信使补货；当心炸弹。'},
  'electrode-relay': {name:'顽皮雷弹',icon:'⚡',minPlayers:2,maxPlayers:8,desc:'按住蓄力后松手传递，爆炸时间保密。'},
  'gender-difference': {name:'宝可梦来找茬',icon:'🔍',minPlayers:2,maxPlayers:8,desc:'左右比较雌雄图片，找齐每处独立差异。'},
  'sudowoodo-quoridor': {name:'树才怪挡路',icon:'🌳',minPlayers:2,maxPlayers:4,desc:'移动到对岸，或放置墙壁改变路线。'},
  'drive-revavroom': {name:'一起开噗隆隆姆',icon:'🚗',minPlayers:2,maxPlayers:8,desc:'化身晕乎乎的晃晃斑，试探错乱的方向键，和伙伴一起驶过三张地图；合作不计分。'},
  ditto: {
    name: '谁是百变怪',
    icon: '🎭',
    minPlayers: 3,
    maxPlayers: 8,
    desc: '1 名百变怪混在训练家中，描述发言后投票指认，被抓的百变怪可猜宝可梦翻盘。',
  },
  pixel: {
    name: '像素猜宝可梦',
    icon: '👾',
    minPlayers: 2,
    maxPlayers: 8,
    desc: '像素图从模糊到清晰，每档只能猜一次，越早猜中得分越高。',
  },
  match: {
    name: '训练家默契挑战',
    icon: '🤝',
    minPlayers: 2,
    maxPlayers: 8,
    desc: '所有人秘密选一只宝可梦回答同一问题，选得一样的人得分。',
  },
  battle: {
    name: '宝可梦猜拳',
    icon: '⚔️',
    minPlayers: 2,
    maxPlayers: 8,
    desc: '每人 5 只随机手牌，每轮按随机属性比大小，一牌只能用一次。',
  },
};

// ---------------- 默契挑战 ----------------
export interface MatchRoundResult {
  picks: Record<string, number>;
  groups: { pokemonId: number; playerIds: string[] }[];
  gains: Record<string, number>;
}
export interface MatchView {
  candidateIds: number[];
  game: 'match';
  phase: 'pick' | 'countdown' | 'reveal' | 'final';
  round: number;
  totalRounds: number;
  question: Question | null;
  endsAt: number | null;
  myPick: number | null;
  submittedCount: number;
  playerCount: number;
  result: MatchRoundResult | null;
  revealEndsAt: number | null;
}

// ---------------- 宝可梦猜拳 ----------------
export type BattleStat =
  | 'hp'
  | 'attack'
  | 'defense'
  | 'spAttack'
  | 'spDefense'
  | 'speed'
  | 'height'
  | 'weight';

export const BATTLE_STATS: { key: BattleStat; label: string; unit: string }[] = [
  { key: 'hp', label: 'HP', unit: '' },
  { key: 'attack', label: '攻击', unit: '' },
  { key: 'defense', label: '防御', unit: '' },
  { key: 'spAttack', label: '特攻', unit: '' },
  { key: 'spDefense', label: '特防', unit: '' },
  { key: 'speed', label: '速度', unit: '' },
  { key: 'height', label: '身高', unit: 'm' },
  { key: 'weight', label: '体重', unit: 'kg' },
];

export interface BattleRoundResult {
  plays: Record<string, number>;
  values: Record<string, number>;
  winners: string[];
  gains: Record<string, number>;
  ranks: Record<string, number>;
}
export interface BattleView {
  direction: 'highest' | 'lowest';
  game: 'battle';
  phase: 'pick' | 'countdown' | 'reveal' | 'final';
  round: number;
  totalRounds: number;
  stat: BattleStat | null;
  statLabel: string | null;
  endsAt: number | null;
  myHand: number[];
  myUsed: number[];
  myPick: number | null;
  submittedCount: number;
  playerCount: number;
  result: BattleRoundResult | null;
  revealEndsAt: number | null;
}

// ---------------- 像素猜宝可梦 ----------------
export const PIXEL_STAGES = [8, 12, 20, 32, 64, 0] as const; // 0 = 原图
export const PIXEL_SCORES = [1000, 800, 600, 400, 250, 100];
export const PIXEL_STAGE_MS = 15000;

export interface PixelRoundResult {
  pokemon: Pokemon;
  winners: { playerId: string; points: number; stage: number }[];
}
export interface PixelView {
  myAttempted: boolean;
  game: 'pixel';
  phase: 'guess' | 'reveal' | 'final';
  round: number;
  totalRounds: number;
  stage: number;
  imageToken: string | null;
  endsAt: number | null;
  mySolved: boolean;
  myScore: number;
  solvedCount: number;
  playerCount: number;
  result: PixelRoundResult | null;
  revealEndsAt: number | null;
}

// ---------------- 谁是百变怪 ----------------
export type DittoPhase = 'confirm' | 'speak' | 'discuss' | 'vote' | 'revote' | 'dittoGuess' | 'roundResult' | 'final';
export interface DittoWord {pokemonId:number;name:string;}
export interface DittoView {
  mode?:'blank'|'paired';
  myWord?:string|null;
  revealedWords?:{trainers:string;ditto:string}|null;
  round: number;
  totalRounds: number;
  cycle: number;
  aliveIds: string[];
  eliminatedIds: string[];
  words: { cycle: number; playerId: string; text: string }[];
  reminders: string[];
  notice: string | null;
  clue: string | null;
  paused: boolean;
  game: 'ditto';
  phase: DittoPhase;
  amDitto: boolean;
  pokemon: Pokemon | null; // 仅训练家可见
  speakOrder: string[];
  speakerIndex: number;
  endsAt: number | null;
  confirmedCount: number;
  playerCount: number;
  iConfirmed: boolean;
  iVoted: boolean;
  votedCount: number;
  candidates: string[] | null; // revote 时限定候选
  tally: { targetId: string; count: number }[] | null;
  accusedId: string | null;
  dittoCaught: boolean | null;
  dittoGuess: number | null;
  gains: Record<string, number> | null;
  winners: string[] | null;
  resultTitle: string | null;
  /** 仅终局公布，用于揭晓百变怪身份 */
  dittoId: string | null;
}

export type GameView = MatchView | BattleView | PixelView | DittoView | BatchView;

export interface RoomView {
  manualPausedAt?:number|null;
  genderPoolSize?:number;
  revision?: number;
  serverTime: number;
  code: string;
  hostId: string;
  players: PlayerInfo[];
  selectedGame: GameType;
  settings: RoomSettings;
  status: RoomStatus;
  scores: Record<string, number>;
  game: GameView | null;
  youId: string;
}

// ---------------- Socket 协议 ----------------
export interface ClientToServerEvents {
  'create-room': (
    payload: { nickname: string; playerId?: string },
    ack: (res: { ok: boolean; code?: string; playerId?: string; sessionToken?: string; error?: string }) => void,
  ) => void;
  'join-room': (
    payload: { code: string; nickname: string; playerId?: string; sessionToken?: string },
    ack: (res: { ok: boolean; playerId?: string; sessionToken?: string; error?: string }) => void,
  ) => void;
  'rename-player': (payload: { nickname: string }, ack: (res: {ok:boolean;nickname?:string;error?:string}) => void) => void;
  'leave-room': () => void;
  'toggle-ready': () => void;
  'select-game': (payload: { game: GameType }) => void;
  'update-settings': (payload: Partial<RoomSettings>) => void;
  'start-game': (ack: (res: { ok: boolean; error?: string }) => void) => void;
  'kick-player': (payload: { playerId: string }) => void;
  'game-action': (payload: { action: unknown; meta?: ActionEnvelope }, ack?: (res: { ok: boolean; error?: string }) => void) => void;
  'back-to-lobby': () => void;
}

export interface ServerToClientEvents {
  'room-state': (view: RoomView) => void;
  'room-error': (payload: { message: string }) => void;
}

