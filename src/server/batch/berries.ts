import {uid} from '../util';
import {finish,nextRound,nextOnline,point,shuffleWith,turn,type BatchModule,type BatchState,type BatchContext} from './core';
export function berryRisk(fruit:number,bombs:number,k:number):number {if(k<1||k>fruit+bombs)return 0;if(k>fruit)return 1;let safe=1;for(let i=0;i<k;i++)safe*=(fruit-i)/(fruit+bombs-i);return 1-safe;}
interface Plate {bomb:boolean;taken:boolean}
interface BerryData {plates:Plate[];deliveryUsed:string[];roundStart:Record<string,number>;last:{eventId:string;playerId:string;type:string;indices:number[];amount:number;gain:number;automatic:boolean}|null;exploded:boolean}
const data=(g:BatchState)=>g.data as BerryData;
function plates(c:BatchContext,bombs=1):Plate[]{return shuffleWith(Array.from({length:12},(_,i)=>({bomb:i<bombs,taken:false})),c.random);}
function begin(g:BatchState,c:BatchContext,used:string[]=[]){g.data={plates:plates(c),deliveryUsed:used,roundStart:{...g.points},last:null,exploded:false} satisfies BerryData;g.phase='turn';turn(g,g.participants[(g.round-1)%g.participants.length],c.now+c.ms.turn);}
function take(g:BatchState,id:string,indices:number[],c:BatchContext,automatic=false){const d=data(g);const bomb=indices.some(i=>d.plates[i].bomb);indices.forEach(i=>d.plates[i].taken=true);const gain=bomb?-2:indices.length;point(g,id,gain);d.exploded=bomb;d.last={eventId:uid(),playerId:id,type:bomb?'bomb':'safe',indices:[...indices],amount:indices.length,gain,automatic};if(bomb)g.completedRounds++;g.phase=bomb?'roundResult':'feedback';turn(g,id,c.now+c.ms.feedback*(bomb?3:1));}
export const snorlaxBerries:BatchModule={
 create(g,c){g.totalRounds=c.settings.berryRounds;begin(g,c);},
 action(g,id,a,c){const d=data(g);if(g.phase!=='turn'||g.currentPlayerId!==id)return '还没轮到你';if(a.type==='delivery'){if(d.deliveryUsed.includes(id))return '整场外卖已经用过';d.deliveryUsed.push(id);point(g,id,-2);d.roundStart[id]-=2;const bombs=d.plates.filter(p=>!p.taken&&p.bomb).length+1;d.plates=plates(c,Math.min(12,bombs));d.last={eventId:uid(),playerId:id,type:'delivery',indices:[],amount:0,gain:-2,automatic:false};return null;}const indices=a.indices;if(a.type!=='take'||!Array.isArray(indices)||indices.length<1||indices.length>3||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=12||d.plates[i].taken))return '请选择 1–3 颗尚未拿走的树果';take(g,id,indices,c);return null;},
 advance(g,c){if(g.phase==='final'||g.deadline===null||c.now<g.deadline)return;const d=data(g);if(g.phase==='roundResult'){if(g.round>=g.totalRounds)finish(g);else{nextRound(g);begin(g,c,d.deliveryUsed);}}else if(g.phase==='turn'){const first=d.plates.findIndex(p=>!p.taken);if(first>=0)take(g,g.currentPlayerId!,[first],c,true);}else{g.phase='turn';turn(g,nextOnline(g,c,g.currentPlayerId),c.now+c.ms.turn);}},
 snapshot(g){const d=data(g);return {plates:d.plates.map(p=>p.taken?p.bomb?'bomb':'empty':'full'),total:d.plates.filter(p=>!p.taken).length,deliveryUsed:[...d.deliveryUsed],last:d.last?{...d.last,indices:[...d.last.indices]}:null,exploded:d.exploded};},
 abort(g){if(g.phase!=='roundResult')g.points={...data(g).roundStart};},
};
