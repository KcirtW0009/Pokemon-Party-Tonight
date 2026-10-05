import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('data/batch-assets-manifest.json','utf8'));
const pairs=JSON.parse((await readFile('data/gender-wiki.json','utf8')).replace(/^\uFEFF/,''));
if(pairs.some(p=>!p.verified)||pairs.length!==manifest.genderPairCount)throw Error('Unreviewed gender asset');
for(const entry of manifest.entries){const bytes=await readFile(entry.path);if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Asset changed without review: '+entry.path);}
for(const p of pairs){const a=manifest.entries.find(x=>x.path===p.male),b=manifest.entries.find(x=>x.path===p.female);if(!a||!b||a.width/a.height!==b.width/b.height||a.sha256===b.sha256)throw Error('Invalid gender pair: '+p.id);}
const annotations=JSON.parse(await readFile('data/gender-hotspots.json','utf8'));
if(annotations.length!==pairs.length)throw Error('Hotspot library does not cover every pair');
for(const [i,a] of annotations.entries()){
 if(a.pairIndex!==i||a.speciesId!==pairs[i].id||!a.verified)throw Error('Unreviewed hotspot '+i);
 if(!a.eligible){if(!a.exclusionReason||a.targets.length)throw Error('Missing exclusion reason '+i);continue;}
 if(!a.targets.length)throw Error('No independent targets '+i);
 if(new Set(a.targets.map(t=>t.id)).size!==a.targets.length)throw Error('Duplicate target IDs '+i);
 for(const t of a.targets){
  if(t.mask.length!==128||t.mask.some(row=>!/^[01]{128}$/.test(row)))throw Error('Invalid target click mask '+i);
  if(!t.outline||!/^([M0-9 hvz\-])+$/.test(t.outline))throw Error('Invalid difference silhouette '+i);
  for(const side of ['male','female'])for(const r of t.regions[side]){
   if(![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1||r.y+r.height>1||r.width*r.height>.18)throw Error('Broad or invalid target '+i);
  }
  let unique=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(t.mask[y][x]==='1'&&!a.targets.some(o=>o!==t&&o.mask[y][x]==='1'))unique++;
  if(!unique)throw Error('Target cannot be independently selected '+i+'/'+t.id);
 }
}
const eligible=annotations.filter(a=>a.eligible);
console.log('HOTSPOTS PASS: '+eligible.length+' playable pairs, '+annotations.filter(a=>!a.eligible).length+' exclusions, '+eligible.reduce((sum,a)=>sum+a.targets.length,0)+' independent targets');
console.log('BATCH ASSETS PASS: '+pairs.length+' reviewed source pairs, '+manifest.entries.length+' unchanged PNGs');
