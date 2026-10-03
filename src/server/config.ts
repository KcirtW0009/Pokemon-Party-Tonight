// 服务端计时配置。PPT_FAST=1 时全部缩短，用于自动化测试 / 本地联调。
const FAST = process.env.PPT_FAST === '1';

export const T = {
  countdownMs: FAST ? 200 : 3000,
  matchPickMs: FAST ? 1500 : 45000,
  battlePickMs: FAST ? 1500 : 60000,
  revealMs: FAST ? 800 : 6000,
  pixelStageMs: FAST ? 400 : 15000,
  dittoConfirmMs: FAST ? 1200 : 30000,
  dittoSpeakMs: FAST ? 2000 : 60000,
  dittoVoteMs: FAST ? 1500 : 45000,
  dittoGuessMs: FAST ? 1500 : 30000,
  emptyRoomDeleteMs: 60_000,
};

export const MATCH_ROUND_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);
export const PIXEL_ROUND_OPTIONS = MATCH_ROUND_OPTIONS;
export const BATTLE_ROUNDS = 5;
