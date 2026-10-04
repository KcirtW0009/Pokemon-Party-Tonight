import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('data/batch-assets-manifest.json','utf8'));
const pairs=JSON.parse((await readFile('data/gender-wiki.json','utf8')).replace(/^\uFEFF/,''));
if(pairs.some(p=>!p.verified)||pairs.length!==manifest.genderPairCount)throw Error('Unreviewed gender asset');
for(const entry of manifest.entries){const bytes=await readFile(entry.path);if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error(`Asset changed without review: ${entry.path}`);}
for(const p of pairs){const a=manifest.entries.find(x=>x.path===p.male),b=manifest.entries.find(x=>x.path===p.female);if(!a||!b||a.width/a.height!==b.width/b.height||a.sha256===b.sha256)throw Error(`Invalid gender pair: ${p.id}`);}
const annotations=JSON.parse(await readFile('data/gender-hotspots.json','utf8'));
if(annotations.length!==pairs.length)throw Error('Hotspot library does not cover every pair');
for(const [i,a] of annotations.entries()){
 if(a.pairIndex!==i||a.speciesId!==pairs[i].id||!a.verified)throw Error(`Unreviewed hotspot ${i}`);
 for(const side of ['male','female']){
  const mask=a.masks[side];if(mask.length!==32||mask.some(row=>!/^[01]{32}$/.test(row)))throw Error(`Invalid foreground mask ${i}`);
  if(!a.regions[side].length)throw Error(`Missing hotspot ${i}`);
  for(const r of a.regions[side]){if(![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1||r.y+r.height>1)throw Error(`Out of bounds hotspot ${i}`);
   let hits=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(mask[y][x]==='1'&&(x+.5)/32>=r.x&&(x+.5)/32<=r.x+r.width&&(y+.5)/32>=r.y&&(y+.5)/32<=r.y+r.height)hits++;
   if(!hits)throw Error(`Hotspot does not cover visible image ${i}/${side}`);
  }
 }
}
console.log(`HOTSPOTS PASS: ${annotations.length} reviewed pairs, opaque foreground hit masks`);
console.log(`BATCH ASSETS PASS: ${pairs.length} reviewed pairs, ${manifest.entries.length} PNGs`);
