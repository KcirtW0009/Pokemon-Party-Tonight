// Phase 1: Pokémon 数据构建脚本。
// Import National Dex #001–#1025 names, base stats and official artwork.
// 生成 data/pokemon.json，并把图片下载到 public/pokemon/。
// 运行时不再请求任何外部 API。
//
// 用法: npm run build:data
import { writeFile, mkdir, readFile, rename } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const IMG_DIR = path.join(ROOT, 'public', 'pokemon', 'official-artwork');
const TOTAL = 1025;
const CONCURRENCY = 12;
const CACHE_DIR = path.join(DATA_DIR, 'source-cache');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, retries = 5) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (res.status === 429) {
        await sleep(2000 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      await sleep(800 * (i + 1));
    }
  }
  throw lastErr;
}

async function downloadImage(id) {
  const localPath = path.join(IMG_DIR, `${id}.png`);
  const localUrl = `/pokemon/official-artwork/${id}.png`;
  if (existsSync(localPath) && (await readFile(localPath)).subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return localUrl;
  const remotes = [
    `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${id}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
  ];
  for (const remote of remotes) {
    try {
      const res = await fetch(remote, { signal: AbortSignal.timeout(30000) });
      if (!res.ok || !res.body) throw new Error(`image HTTP ${res.status}`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(localPath + '.tmp'));
      const bytes = await readFile(localPath + '.tmp');
      if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Invalid PNG');
      await rename(localPath + '.tmp', localPath);
      return localUrl;
    } catch (e) {
      console.warn(`[warn] 图片下载失败 #${id} (${remote}): ${e.message}`);
    }
  }
  throw new Error(`Artwork #${id} unavailable; refusing incomplete dataset`);
}

function langOf(entry) {
  return (entry.language.name || '').toLowerCase();
}

function zhName(species) {
  const hans = species.names.find((n) => langOf(n) === 'zh-hans');
  if (hans) return hans.name;
  const hant = species.names.find((n) => langOf(n) === 'zh-hant');
  if (hant) return hant.name;
  return species.name;
}

function enName(species, pokemon) {
  const en = species.names.find((n) => langOf(n) === 'en');
  return en ? en.name : pokemon.name;
}

function toPinyin(zh) {
  try {
    return pinyin(zh, { toneType: 'none', type: 'array' }).join('').toLowerCase();
  } catch {
    return '';
  }
}

function statOf(pokemon, key) {
  const s = pokemon.stats.find((x) => x.stat.name === key);
  return s ? s.base_stat : 0;
}

async function buildOne(id) {
  const cached = async (kind) => {
    const file = path.join(CACHE_DIR, `${kind}-${id}.json`);
    if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8'));
    const value = await fetchJson(`https://pokeapi.co/api/v2/${kind}/${id}`);
    await writeFile(file, JSON.stringify(value));
    return value;
  };
  const [pokemon, species] = await Promise.all([
    cached('pokemon'), cached('pokemon-species'),
  ]);
  const nameZh = zhName(species);
  if (!species.names.some(n => langOf(n) === 'zh-hans')) throw new Error(`Missing simplified Chinese name #${id}`);
  const image = await downloadImage(id);
  return {
    id,
    nameZh,
    nameEn: enName(species, pokemon),
    pinyin: toPinyin(nameZh),
    searchAliases: id === 260 ? ['juzhaoguai'] : [],
    image,
    types: pokemon.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name),
    hp: statOf(pokemon, 'hp'),
    attack: statOf(pokemon, 'attack'),
    defense: statOf(pokemon, 'defense'),
    spAttack: statOf(pokemon, 'special-attack'),
    spDefense: statOf(pokemon, 'special-defense'),
    speed: statOf(pokemon, 'speed'),
    height: pokemon.height / 10, // 分米 -> 米
    weight: Math.round((pokemon.weight / 10) * 10) / 10, // 百克 -> 千克
  };
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(IMG_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });
  const results = new Array(TOTAL);
  let done = 0;
  const ids = Array.from({ length: TOTAL }, (_, i) => i + 1);
  async function worker() {
    while (ids.length) {
      const id = ids.shift();
      try {
        results[id - 1] = await buildOne(id);
      } catch (e) {
        console.error(`[error] #${id} 失败: ${e.message}`);
        process.exitCode = 1;
        return;
      }
      done++;
      if (done % 10 === 0) console.log(`progress ${done}/${TOTAL}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (Array.from(results).some((r) => !r) || done !== TOTAL) throw new Error('部分宝可梦构建失败');
  await writeFile(path.join(DATA_DIR, 'pokemon.json'), JSON.stringify(results, null, 1) + '\n');
  console.log(`done: data/pokemon.json (${results.length} 条)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
