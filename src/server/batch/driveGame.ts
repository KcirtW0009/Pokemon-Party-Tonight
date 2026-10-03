import mapsRaw from '../../../data/drive-maps.json';
import {CAR_RADIUS,INPUTS,combine,moveCar,circleHits,validateMap,type DriveInput,type DriveMap,type Vector} from '@/lib/driving';
import {shuffleWith,choose,finish,nextRound,turn,type BatchModule,type BatchState,type BatchContext} from './core';
export const DRIVE_MAPS=mapsRaw as DriveMap[];
if(DRIVE_MAPS.some(m=>!validateMap(m)))throw new Error('Unreachable driving map');
interface DriveData {maps:Record<string,Record<DriveInput,DriveInput>>;inputs:Record<string,DriveInput|null>;sequences:Record<string,number>;position:Vector;velocity:Vector;simAt:number;accumulator:number;startedAt:number|null;lastAcceptedAt:Record<string,number>;results:{mapId:string;success:boolean;elapsed:number}[];completed:boolean}
const data=(g:BatchState)=>g.data as DriveData;
function prepare(g:BatchState,c:BatchContext,results:DriveData['results']=[],keep?:DriveData['maps']){const maps:DriveData['maps']=keep??{};
  // Each player gets one permutation, not four independent random samples.
  if(!keep)for(const id of g.participants){const values=shuffleWith([...INPUTS],c.random);maps[id]=Object.fromEntries(INPUTS.map((key,i)=>[key,values[i]])) as Record<DriveInput,DriveInput>;}
  g.data={maps,inputs:Object.fromEntries(g.participants.map(id=>[id,null])),sequences:{},position:{...DRIVE_MAPS[g.round-1].spawn},velocity:{x:0,y:0},simAt:c.now,accumulator:0,startedAt:null,lastAcceptedAt:{},results,completed:false} satisfies DriveData;g.phase='prepare';turn(g,null,c.now+c.ms.prepare);
}
function result(g:BatchState,c:BatchContext,success:boolean){const d=data(g);if(g.phase!=='play')return;d.results.push({mapId:DRIVE_MAPS[g.round-1].id,success,elapsed:Math.max(0,c.now-d.startedAt!)});d.completed=success;d.velocity={x:0,y:0};g.completedRounds++;g.phase='mapResult';turn(g,null,c.now+c.ms.feedback*2);}
export const driveRevavroom:BatchModule={
 create(g,c){g.totalRounds=3;prepare(g,c);},
 action(g,id,a,c){const d=data(g);if(!['prepare','play'].includes(g.phase))return '当前地图已结束';if(a.type!=='input'||!INPUTS.includes(a.key as DriveInput)||!Number.isSafeInteger(a.inputSeq))return '无效方向输入';const seq=a.inputSeq as number;if(seq<0||seq<=(d.sequences[id]??-1))return '旧输入序号已丢弃';d.sequences[id]=seq;d.inputs[id]=a.key as DriveInput;d.lastAcceptedAt[id]=c.now;return null;},
 advance(g,c){const d=data(g);if(g.phase==='final')return;if(g.phase==='prepare'&&c.now>=g.deadline!){for(const id of g.participants)if(c.online.includes(id)&&!d.inputs[id])d.inputs[id]=choose([...INPUTS],c.random);g.phase='play';d.startedAt=c.now;d.simAt=c.now;turn(g,null,c.now+c.settings.driveSeconds*c.ms.driveSecond);return;}
   if(g.phase==='mapResult'&&c.now>=g.deadline!){if(g.round===g.totalRounds)finish(g,'三张地图已结束；再次开局将重新随机按键映射');else{nextRound(g);prepare(g,c,d.results);}return;}
   if(g.phase!=='play')return;if(c.now>=g.deadline!){result(g,c,false);return;}
   const map=DRIVE_MAPS[g.round-1];const inputs=g.participants.filter(id=>c.online.includes(id)&&d.inputs[id]).map(id=>d.maps[id][d.inputs[id]!]);d.velocity=combine(inputs,map.speed);d.accumulator+=Math.max(0,Math.min(c.now-d.simAt,100));d.simAt=c.now;
   while(d.accumulator>=50){d.position=moveCar(d.position,d.velocity,0.05,map);d.accumulator-=50;if(circleHits(d.position,CAR_RADIUS,map.goal)){result(g,c,true);break;}}
 },
 snapshot(g,_id,c){const d=data(g);return {map:DRIVE_MAPS[g.round-1],position:{...d.position},velocity:{...d.velocity},inputs:{...d.inputs},inputAcceptedAt:{...d.lastAcceptedAt},elapsed:d.startedAt===null?0:Math.max(0,c.now-d.startedAt),results:d.results.map(r=>({...r})),completed:d.completed};},
 connections(g,c){const d=data(g);for(const id of g.participants)if(!c.online.includes(id))d.inputs[id]=null;},
 shiftTime(g,delta){const d=data(g);if(d.startedAt!==null)d.startedAt+=delta;d.simAt+=delta;},
};
