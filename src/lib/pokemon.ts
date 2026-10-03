import raw from '../../data/pokemon.json';
import type { Pokemon } from './types';

export const POKEMON = raw as Pokemon[];
const BY_ID = new Map<number, Pokemon>(POKEMON.map((p) => [p.id, p]));

export function getPokemon(id: number): Pokemon | undefined {
  return BY_ID.get(id);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

/** 中文 / 英文 / 拼音 / 图鉴号搜索，最多返回 limit 个 */
export function searchPokemon(query: string, limit = 5, exclude?: Set<number>, allowed?: number[]): Pokemon[] {
  const rawQ = query.trim();
  if (!rawQ) return [];
  const q = norm(rawQ);
  const out: Pokemon[] = [];
  // 中文优先：包含即命中
  for (const p of POKEMON) {
    if (exclude?.has(p.id) || (allowed && !allowed.includes(p.id))) continue;
    if (p.nameZh.includes(rawQ)) {
      out.push(p);
      if (out.length >= limit) return out;
    }
  }
  for (const p of POKEMON) {
    if (exclude?.has(p.id) || (allowed && !allowed.includes(p.id))) continue;
    if (out.includes(p)) continue;
    if (norm(p.nameEn).includes(q) || (p.pinyin && norm(p.pinyin).includes(q)) || p.searchAliases?.some(a => norm(a).includes(q)) || String(p.id) === q) {
      out.push(p);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
