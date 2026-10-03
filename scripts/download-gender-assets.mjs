import {mkdir,writeFile} from 'node:fs/promises';
const entries=[[3,'花朵中央的种子'],[12,'后翅的黑色斑块'],[25,'尾巴末端的形状'],[26,'尾巴尖端的形状'],[84,'脖子的颜色'],[85,'脖子的颜色'],[129,'胡须的颜色'],[130,'胡须的颜色'],[194,'头部鳃枝的数量'],[202,'嘴唇的颜色'],[214,'角的形状'],[415,'下方脸部的红色斑点']];
const manifest=[];
for(const [id,detail] of entries){
  const pair={id,detail,verified:false,source:'https://www.serebii.net/blackwhite/genderdifference.shtml'};
  for(const gender of ['male','female']){
    const url=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${gender==='female'?'female/':''}${id}.png`;
    const response=await fetch(url);if(!response.ok)throw new Error(`${id}: ${response.status}`);
    const file=`assets/gender-pairs/${id}/${gender}.png`;await mkdir(`assets/gender-pairs/${id}`,{recursive:true});await writeFile(file,Buffer.from(await response.arrayBuffer()));pair[gender]=file;pair[`${gender}Source`]=url;
  }
  manifest.push(pair);
}
await writeFile('data/gender-pairs.json',JSON.stringify(manifest,null,2)+'\n');
