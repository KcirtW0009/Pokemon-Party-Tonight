import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source='https://wiki.52poke.com/zh-hans/拥有性别差异的宝可梦列表';
const pairs=JSON.parse((await readFile('data/gender-wiki.json','utf8')).replace(/^\uFEFF/,''));
const attribution='Pokémon images © Nintendo / Creatures / GAME FREAK. Unofficial fan project; source availability is not a commercial image license.';
const entries=[];
for(const pair of pairs)for(const gender of ['male','female'])entries.push({purpose:'gender-difference',speciesId:pair.id,form:pair.label,gender,path:pair[gender],sourcePage:source,downloadURL:pair[gender+'Source'],verified:pair.verified,attribution});
const starters=[1,4,7,152,155,158,252,255,258,387,390,393,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912];
for(const id of [...new Set([...starters,143,225,101,185,966,172,25,26,151,150,132,648,133,5,8,2,6,178,65])])entries.push({purpose:starters.includes(id)?'starter-memory':'game-character',speciesId:id,path:`public/pokemon/official-artwork/${id}.png`,sourcePage:'https://github.com/PokeAPI/sprites',downloadURL:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,attribution});
entries.push({purpose:'snorlax-berries',path:'public/batch/sitrus-berry.png',sourcePage:'https://wiki.52poke.com/zh-hans/文柚果',downloadURL:'https://media.52poke.com/wiki/d/d7/Bag_%E6%96%87%E6%9F%9A%E6%9E%9C_BDSP_Sprite.png',attribution});
entries.push({purpose:'meloetta-pirouette',speciesId:648,path:'public/batch/meloetta-pirouette.png',sourcePage:'https://github.com/PokeAPI/sprites',downloadURL:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10018.png',attribution});
for(const entry of entries){const bytes=await readFile(entry.path);if(bytes.readUInt32BE(0)!==0x89504e47)throw new Error(`Not PNG: ${entry.path}`);entry.sha256=createHash('sha256').update(bytes).digest('hex');entry.width=bytes.readUInt32BE(16);entry.height=bytes.readUInt32BE(20);entry.bytes=bytes.length;}
await writeFile('data/batch-assets-manifest.json',JSON.stringify({source,reviewedAt:'2026-10-04',genderPairCount:pairs.length,entries},null,2)+'\n');
console.log(`Validated ${entries.length} local assets, ${pairs.length} manually reviewed gender pairs`);
