import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('data/batch-assets-manifest.json','utf8'));
const pairs=JSON.parse((await readFile('data/gender-wiki.json','utf8')).replace(/^\uFEFF/,''));
if(pairs.some(p=>!p.verified)||pairs.length!==manifest.genderPairCount)throw Error('Unreviewed gender asset');
for(const entry of manifest.entries){const bytes=await readFile(entry.path);if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error(`Asset changed without review: ${entry.path}`);}
for(const p of pairs){const a=manifest.entries.find(x=>x.path===p.male),b=manifest.entries.find(x=>x.path===p.female);if(!a||!b||a.width/a.height!==b.width/b.height||a.sha256===b.sha256)throw Error(`Invalid gender pair: ${p.id}`);}
console.log(`BATCH ASSETS PASS: ${pairs.length} reviewed pairs, ${manifest.entries.length} PNGs`);
