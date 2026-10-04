import {ALL_POKEMON,getPokemon} from '../pokedex';
import {TYPE_NAMES} from '../clues';
import {choose,finish,nextRound,nextOnline,point,turn,type BatchModule,type BatchState,type BatchContext} from './core';
export const typeKey=(types:string[])=>[...types].sort().join('+');
export const TYPE_COMBOS=[...new Map(ALL_POKEMON.map(p=>[typeKey(p.types),p.types])).values()];
export function damage(guess:string[],answer:string[]):number {const intersection=guess.filter(t=>answer.includes(t)).length;return !intersection?0:typeKey(guess)===typeKey(answer)?2:1;}
export interface BombHistory {playerId:string;pokemonId:number|null;types:string[];damage:number;dead:boolean}
export function inferTypes(possible:string[][],history:BombHistory[]):Record<string,'unknown'|'safe'|'possible'|'dangerous'>{
  if(!possible.length)throw new Error('Type inference contradiction');
  return Object.fromEntries(Object.keys(TYPE_NAMES).map(t=>[t,possible.every(c=>!c.includes(t))?'safe':possible.every(c=>c.includes(t))?'dangerous':history.some(h=>h.damage>0&&h.types.includes(t))?'possible':'unknown']));
}
interface BombData {answerId:number;answerTypes:string[];hearts:Record<string,number>;possible:string[][];used:string[];history:BombHistory[];statuses:ReturnType<typeof inferTypes>;count:number;reason:string|null}
const data=(g:BatchState)=>g.data as BombData;
export function legalBombIds(d:Pick<BombData,'used'|'statuses'>):number[]{return ALL_POKEMON.filter(p=>!d.used.includes(typeKey(p.types))&&!p.types.some(t=>d.statuses[t]==='safe')).map(p=>p.id);}
function begin(g:BatchState,c:BatchContext){const answer=choose(ALL_POKEMON,c.random);g.data={answerId:answer.id,answerTypes:[...answer.types],hearts:Object.fromEntries(g.participants.map(id=>[id,2])),possible:TYPE_COMBOS.map(a=>[...a]),used:[],history:[],statuses:Object.fromEntries(Object.keys(TYPE_NAMES).map(t=>[t,'unknown'])),count:0,reason:null} satisfies BombData;g.phase='turn';turn(g,g.participants[(g.round-1)%g.participants.length],c.now+c.ms.turn);}
function endRound(g:BatchState,c:BatchContext,reason:string){const d=data(g);if(g.phase==='roundResult'||g.phase==='final')return;for(const id of g.participants)point(g,id,d.hearts[id]);g.completedRounds++;d.reason=reason;g.phase='roundResult';turn(g,null,c.now+c.ms.feedback*2);}
export const typeBomb:BatchModule={
 create(g,c){g.totalRounds=c.settings.bombRounds;begin(g,c);},
 action(g,id,a,c){const d=data(g);if(g.phase!=='turn'||g.currentPlayerId!==id)return '还没轮到你';if(a.type!=='guess'||!Number.isInteger(a.pokemonId))return '请选择宝可梦';const p=getPokemon(a.pokemonId as number);if(!p)return '无效宝可梦';const key=typeKey(p.types);if(d.used.includes(key))return '这个属性组合本局已用过';if(p.types.some(t=>d.statuses[t]==='safe'))return '不能提交含已确认安全属性的宝可梦';
   const hit=damage(p.types,d.answerTypes);d.hearts[id]=Math.max(0,d.hearts[id]-hit);d.used.push(key);d.count++;d.history.push({playerId:id,pokemonId:p.id,types:[...p.types],damage:hit,dead:d.hearts[id]===0});d.possible=d.possible.filter(combo=>damage(p.types,combo)===hit);d.statuses=inferTypes(d.possible,d.history);
   if(d.hearts[id]===0)endRound(g,c,'有玩家生命归零');else if(d.count>=10)endRound(g,c,'已完成 10 次有效猜测');else if(!legalBombIds(d).length)endRound(g,c,'已没有合法候选');else{g.phase='feedback';g.deadline=c.now+c.ms.feedback;}return null;
 },
 advance(g,c){const d=data(g);if(g.phase==='final'||g.deadline===null||c.now<g.deadline)return;if(g.phase==='roundResult'){if(g.round>=g.totalRounds)finish(g);else{nextRound(g);begin(g,c);}}else if(g.phase==='turn'){const id=g.currentPlayerId!;const hit=d.hearts[id];d.hearts[id]=0;d.history.push({playerId:id,pokemonId:null,types:[],damage:hit,dead:true});endRound(g,c,'操作超时，失去两颗心');}else{g.phase='turn';turn(g,nextOnline(g,c,g.currentPlayerId),c.now+c.ms.turn);}}, snapshot(g){const d=data(g);return {hearts:{...d.hearts},history:d.history.map(h=>({...h,types:[...h.types]})),usedTypeKeys:[...d.used],typeStatuses:{...d.statuses},guessCount:d.count,allowedPokemon:legalBombIds(d),reason:d.reason,answer:g.phase==='roundResult'||g.phase==='final'?getPokemon(d.answerId):null};},

};
