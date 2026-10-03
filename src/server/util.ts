import { randomBytes } from 'node:crypto';

export function uid(): string {
  return randomBytes(24).toString('hex');
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function roomCode(): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 从 1..max 中随机取 n 个不重复的数 */
export function sampleIds(n: number, max: number, exclude: Set<number> = new Set()): number[] {
  const pool: number[] = [];
  for (let i = 1; i <= max; i++) if (!exclude.has(i)) pool.push(i);
  return shuffle(pool).slice(0, n);
}

export function cleanNickname(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const n = name.trim().replace(/\s+/g, ' ');
  return [...n].length > 0 && [...n].length <= 16 ? n : null;
}
