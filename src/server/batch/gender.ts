import pairs from '../../../data/gender-wiki.json';
import hotspots from '../../../data/gender-hotspots.json';
import {batchImage} from './imageAssets';
import {type BatchModule,type BatchState,type BatchContext,shuffleWith,nextRound,turn,finish,point} from './core';
export const GENDER_POOL=pairs.map((p,pairIndex)=>({...p,pairIndex})).filter(p=>p.verified&&hotspots[p.pairIndex].eligible);
export interface HitRect {x:number;y:number;width:number;height:number}
export function insideRegion(x:number,y:number,regions:HitRect[]){return regions.some(r=>x>=r.x&&y>=r.y&&x<=r.x+r.width&&y<=r.y+r.height);}
interface Board {errors:number;cooldown:number;solved:boolean;score:number;ready:boolean;found:string[];hit:{side:number;x:number;y:number}|null}
interface Data {pool:number[];pair:number;boards:Record<string,Board>;images:string[]}
const publicTarget=(t:(typeof hotspots)[number]['targets'][number])=>({id:t.id,label:t.label,regions:t.regions,outline:t.outline});
function begin(g:BatchState,c:BatchContext){const d=g.data as Data;d.pair=d.pool[g.round-1];const pair=pairs[d.pair];d.images=[batchImage(pair.male),batchImage(pair.female)];d.boards=Object.fromEntries(g.participants.map(id=>[id,{errors:0,cooldown:0,solved:false,score:0,ready:false,found:[],hit:null}]));g.phase='loading';turn(g,null,c.now+90000);}
function play(g:BatchState,c:BatchContext){g.phase='question';turn(g,null,c.now+c.ms.question);}
function reveal(g:BatchState,c:BatchContext){g.completedRounds++;g.phase='reveal';turn(g,null,c.now+c.ms.questionReveal);}
export const gender:BatchModule={
 create(g,c){g.totalRounds=c.settings.genderRounds;if(g.totalRounds>GENDER_POOL.length)throw new Error('题数超过当前可玩题库数量');g.data={pool:shuffleWith(GENDER_POOL.map(p=>p.pairIndex),c.random).slice(0,g.totalRounds),pair:0,boards:{},images:[]} satisfies Data;begin(g,c);},
 action(g,id,a,c){
  const d=g.data as Data,b=d.boards[id];if(!b)return '旁观玩家不能作答';
  if(a.type==='asset-failed'){finish(g,'图片加载失败，本场停止，已完成题目的得分保留');return null;}
  if(a.type==='assets-ready'&&g.phase==='loading'){b.ready=true;if(c.online.every(p=>d.boards[p]?.ready))play(g,c);return null;}
  if(g.phase!=='question')return '当前不能作答';if(b.solved)return '本题已全部找齐';if(c.now<b.cooldown)return '请等待两秒后再试';
  if(a.type!=='spot'||![0,1].includes(a.side as number)||typeof a.x!=='number'||typeof a.y!=='number'||!Number.isFinite(a.x)||!Number.isFinite(a.y)||a.x<0||a.x>1||a.y<0||a.y>1)return '无效点击位置';
  const x=Math.min(127,Math.floor(a.x*128)),y=Math.min(127,Math.floor(a.y*128));
  // Left/right pictures refer to the same independent target. Repeated clicks
  // never count a target twice, including when small tolerance areas overlap.
  const target=hotspots[d.pair].targets.find(t=>t.mask[y][x]==='1');
  if(target){
   if(b.found.includes(target.id))return '这处差异已经找到，请找其他位置';
   b.found.push(target.id);b.hit={side:a.side as number,x:a.x,y:a.y};
   b.solved=b.found.length===hotspots[d.pair].targets.length;
   if(b.solved){b.score=Math.max(0,Math.ceil(100*((g.deadline??c.now)-c.now)/c.ms.question)-20*b.errors);point(g,id,b.score);if(c.online.every(p=>d.boards[p]?.solved))reveal(g,c);}
  }else{b.errors++;b.cooldown=c.now+2000;}
  return null;
 },
 advance(g,c){if(g.deadline!==null&&c.now>=g.deadline){if(g.phase==='loading')finish(g,'图片未能及时加载，本场停止');else if(g.phase==='question')reveal(g,c);else if(g.phase==='reveal'){if(g.round>=g.totalRounds)finish(g);else{nextRound(g);begin(g,c);}}}},
 snapshot(g,id){const d=g.data as Data,b=d.boards[id],pair=pairs[d.pair],a=hotspots[d.pair],shown=g.phase==='reveal'||g.phase==='final';return {poolSize:GENDER_POOL.length,images:[...d.images],targetCount:a.targets.length,foundCount:b?.found.length??0,foundTargets:a.targets.filter(t=>b?.found.includes(t.id)).map(publicTarget),errors:b?.errors??0,cooldownEndsAt:b?.cooldown??0,solved:b?.solved??false,score:b?.score??0,hit:b?.hit??null,ready:b?.ready??false,...(shown?{pokemonId:pair.id,detail:pair.detail,targets:a.targets.map(publicTarget)}:{})};},
};
