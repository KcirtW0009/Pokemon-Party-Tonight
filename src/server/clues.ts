import type { Pokemon } from '@/lib/types';
import { ALL_POKEMON } from './pokedex';
import { sample } from './util';

export const TYPE_NAMES: Record<string, string> = {
  normal: '一般', fire: '火', water: '水', electric: '电', grass: '草', ice: '冰', fighting: '格斗', poison: '毒',
  ground: '地面', flying: '飞行', psychic: '超能力', bug: '虫', rock: '岩石', ghost: '幽灵', dragon: '龙', dark: '恶', steel: '钢', fairy: '妖精',
};
// Weight thresholds follow Grass Knot / Low Kick. Height and base-stat tiers are game-design choices.
export const WEIGHT_BOUNDS = [10, 25, 50, 100, 200, Infinity];
export const HEIGHT_BOUNDS = [0.5, 1, 1.5, 2, 3, Infinity];
export const STAT_BOUNDS = [50, 80, 110, Infinity];
const WEIGHT_WORDS = ['轻盈', '轻巧', '中等体重', '敦实', '沉重', '非常沉重'];
const HEIGHT_WORDS = ['小巧', '矮小', '中等身高', '高挑', '高大', '非常高大'];
const STAT_WORDS = ['偏低', '适中', '较高', '很高'];
const STATS = [['hp', 'HP'], ['attack', '攻击'], ['defense', '防御'], ['spAttack', '特攻'], ['spDefense', '特防'], ['speed', '速度']] as const;
export interface Clue { category: string; text: string; matchingCount: number }
export function tier(value: number, bounds: number[]): number { return bounds.findIndex(b => value < b); }
export function clueOptions(p: Pokemon): Clue[] {
  const options: Clue[] = [];
  const add = (category: string, text: string, matches: (other: Pokemon) => boolean) => {
    const matchingCount = ALL_POKEMON.filter(matches).length;
    if (matchingCount >= 30) options.push({ category, text, matchingCount });
  };
  for (const type of p.types) add('type', `它有${TYPE_NAMES[type]}属性（只透露一种）。`, o => o.types.includes(type));
  const w = tier(p.weight, WEIGHT_BOUNDS);
  add('weight', `它的体重属于「${WEIGHT_WORDS[w]}」档。`, o => tier(o.weight, WEIGHT_BOUNDS) === w);
  const h = tier(p.height, HEIGHT_BOUNDS);
  add('height', `它的身高属于「${HEIGHT_WORDS[h]}」档。`, o => tier(o.height, HEIGHT_BOUNDS) === h);
  for (const [key, label] of STATS) {
    const s = tier(p[key], STAT_BOUNDS);
    add('stat', `它的${label}种族值属于「${STAT_WORDS[s]}」档。`, o => tier(o[key], STAT_BOUNDS) === s);
  }
  return options;
}
export function randomClue(p: Pokemon): string {
  const options = clueOptions(p);
  const category = sample([...new Set(options.map(o => o.category))]);
  return sample(options.filter(o => o.category === category)).text;
}
