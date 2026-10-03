import type { Pokemon } from '@/lib/types';
import tagsRaw from '../../data/clue-tags.json';
import { ALL_POKEMON } from './pokedex';
import { sample } from './util';

export const TYPE_NAMES: Record<string, string> = {
  normal: '一般', fire: '火', water: '水', electric: '电', grass: '草', ice: '冰', fighting: '格斗', poison: '毒',
  ground: '地面', flying: '飞行', psychic: '超能力', bug: '虫', rock: '岩石', ghost: '幽灵', dragon: '龙', dark: '恶', steel: '钢', fairy: '妖精',
};
const SHAPES: Record<string, string> = {
  ball: '球形身体', squiggle: '蛇形身体', fish: '带鳍的身体', arms: '有手臂、没有腿的身体',
  blob: '身体呈团块状', upright: '双足、带尾巴的身体', legs: '有腿、没有手臂的身体',
  quadruped: '四足身体', wings: '有一对翅膀的身体', tentacles: '有触手的身体', heads: '由多个身体组成',
  humanoid: '双足、不带尾巴的身体', 'bug-wings': '有两对以上翅膀的身体', armor: '多足身体',
};
const COLORS: Record<string, string> = { black: '黑', blue: '蓝', brown: '褐', gray: '灰', green: '绿', pink: '粉红', purple: '紫', red: '红', white: '白', yellow: '黄' };
const EGGS: Record<string, string> = { monster: '怪兽', water1: '水中1', bug: '虫', flying: '飞行', ground: '陆上', fairy: '妖精', plant: '植物', humanshape: '人型', water3: '水中3', mineral: '矿物', indeterminate: '不定形', water2: '水中2', ditto: '百变怪', dragon: '龙', 'no-eggs': '未发现' };
type Tags = typeof tagsRaw[number];
export interface Clue { category: string; text: string; matchingCount: number }
const optionsById = new Map<number, Clue[]>();
for (const p of ALL_POKEMON) {
  const tag = tagsRaw[p.id - 1];
  const options: Clue[] = [];
  const add = (category: string, text: string, matchingCount: number) => {
    if (matchingCount >= 30 && matchingCount <= 350) options.push({ category, text, matchingCount });
  };
  const count = (predicate: (t: Tags) => boolean) => tagsRaw.filter(predicate).length;
  for (const type of p.types) add('type', `它有${TYPE_NAMES[type]}属性（双属性只透露一种）。`, ALL_POKEMON.filter(o => o.types.includes(type)).length);
  if (tag.shape) add('shape', `图鉴将它归为「${SHAPES[tag.shape]}」。`, count(t => t.shape === tag.shape));
  add('color', `它的图鉴颜色分类是${COLORS[tag.color]}色（不代表全身只有这种颜色）。`, count(t => t.color === tag.color));
  for (const egg of tag.eggGroups) add('egg', `它属于「${EGGS[egg]}」蛋组（有两个蛋组时只透露一个；蛋组不等于属性）。`, count(t => t.eggGroups.includes(egg)));
  if (tag.hasOtherForms) add('form', '它有其他形态，例如地区形态或特殊形态；不一定能随时切换。', count(t => t.hasOtherForms));
  if (tag.formsSwitchable) add('form', '它有能够切换的不同形态（按图鉴记录）。', count(t => t.formsSwitchable));
  const evolutionWords: Record<string, string> = { base: '它是进化链的起点，还能进化。', middle: '它由其他宝可梦进化而来，而且还能继续进化。', evolved: '它由其他宝可梦进化而来，后面没有普通进化。', single: '它没有普通的前置或后续进化（Mega 等特殊变化不算）。' };
  add('evolution', evolutionWords[tag.evolution], count(t => t.evolution === tag.evolution));
  if (!options.length) throw new Error(`No playable clue for #${p.id}`);
  optionsById.set(p.id, options);
}
export function clueOptions(p: Pokemon): Clue[] { return (optionsById.get(p.id) ?? []).map(o => ({ ...o })); }
export function randomClue(p: Pokemon, playerCount = 8): string {
  const options = clueOptions(p);
  const pool = playerCount <= 4 ? options.filter(o => ['type', 'shape', 'color'].includes(o.category)) : options;
  const categories = [...new Set(pool.map(o => o.category))];
  const category = sample([...categories, ...categories.filter(c => c === 'type')]);
  return sample(pool.filter(o => o.category === category)).text;
}
