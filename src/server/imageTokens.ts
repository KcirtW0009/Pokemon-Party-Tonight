import { uid } from './util';

// token -> pokemonId。像素猜游戏中客户端只能看到 token，看不到图鉴 id。
const tokens = new Map<string, { pokemonId: number; expires: number }>();

export function createImageToken(pokemonId: number, ttlMs = 15 * 60 * 1000): string {
  const token = uid() + uid();
  tokens.set(token, { pokemonId, expires: Date.now() + ttlMs });
  if (tokens.size % 50 === 0) gc();
  return token;
}

export function resolveImageToken(token: string): number | null {
  const e = tokens.get(typeof token === 'string' ? token : '');
  if (!e) return null;
  if (e.expires < Date.now()) {
    tokens.delete(token);
    return null;
  }
  return e.pokemonId;
}

function gc(): void {
  const now = Date.now();
  for (const [k, v] of tokens) if (v.expires < now) tokens.delete(k);
}
