import {shuffleWith,nextOnline,turn,finish,point,type BatchModule,type BatchState,type BatchContext} from './core';
export const STARTERS=[1,4,7,152,155,158,252,255,258,387,390,393,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912];
interface MemoryCard {index:number;pokemonId:number;owner:string|null}
interface MemoryData {cards:MemoryCard[];open:number[];last:{playerId:string;matched:boolean;pokemonIds:number[]}|null}
const data=(g:BatchState)=>g.data as MemoryData;
function next(g:BatchState,c:BatchContext){const d=data(g);d.open=[];if(d.cards.every(card=>card.owner!==null)){g.completedRounds++;finish(g);return;}const again=g.phase==='feedback'&&d.last?.matched&&c.online.includes(g.currentPlayerId!);g.phase='turn';turn(g,again?g.currentPlayerId:nextOnline(g,c,g.currentPlayerId),c.now+c.ms.turn);}
export const starterMemory:BatchModule={
 create(g,c){const pool=shuffleWith(STARTERS,c.random).slice(0,c.settings.memoryPairs);g.totalRounds=1;g.data={cards:shuffleWith([...pool,...pool],c.random).map((pokemonId,index)=>({index,pokemonId,owner:null})),open:[],last:null} satisfies MemoryData;g.phase='turn';turn(g,g.participants[0],c.now+c.ms.turn);},
 action(g,id,a,c){const d=data(g);if(g.phase!=='turn'||g.currentPlayerId!==id)return '不是你的翻牌回合';if(a.type!=='flip'||!Number.isInteger(a.index))return '请选择牌';const card=d.cards[a.index as number];if(!card||card.owner!==null||d.open.includes(card.index))return '这张牌不能翻';d.open.push(card.index);if(d.open.length===2){const pair=d.open.map(i=>d.cards[i]);const matched=pair[0].pokemonId===pair[1].pokemonId;if(matched){pair.forEach(p=>p.owner=id);point(g,id,1);}d.last={playerId:id,matched,pokemonIds:pair.map(p=>p.pokemonId)};g.phase='feedback';g.deadline=c.now+c.ms.memoryReveal;}return null;},
 advance(g,c){if(g.phase!=='final'&&g.deadline!==null&&c.now>=g.deadline)next(g,c);},
 snapshot(g){const d=data(g);return {cards:d.cards.map(card=>({cardId:`${g.matchId.slice(0,8)}-${card.index}`,index:card.index,status:card.owner?'matched':d.open.includes(card.index)?'open':'back',owner:card.owner,...(card.owner||d.open.includes(card.index)?{pokemonId:card.pokemonId}:{})})),remainingPairs:d.cards.filter(card=>!card.owner).length/2,last:d.last};},
};
