import {readFile,mkdir,writeFile} from 'node:fs/promises';
const pairs=JSON.parse(await readFile('data/gender-wiki.json','utf8'));
let done=0;
for(let start=0;start<pairs.length;start+=4){await Promise.all(pairs.slice(start,start+4).map(async pair=>{
 for(const gender of ['male','female']){
  const file=pair[gender];try{await readFile(file);continue;}catch{}
  const response=await fetch(pair[gender+'Source'],{headers:{Referer:'https://wiki.52poke.com/'}});if(!response.ok)throw new Error(`${pair.label}: ${response.status}`);
  await mkdir(file.slice(0,file.lastIndexOf('/')),{recursive:true});await writeFile(file,Buffer.from(await response.arrayBuffer()));
 }done++;
}));console.log(`${done}/${pairs.length}`);}
