import {isSecondGame} from '@/lib/secondTypes';
import {MODULES} from './batch';
import {freezeScheduledTimers,resumeScheduledTimers,type ServerRoom} from './state';
export function setManualPause(room:ServerRoom,id:string,paused:unknown,now=Date.now()):string|null {
 if(id!==room.hostId)return '只有房主可以暂停或恢复游戏';
 if(typeof paused!=='boolean')return '无效暂停操作';
 if(!room.game||room.status!=='PLAYING')return '当前没有进行中的游戏';
 if(paused===(room.manualPausedAt!=null))return null;
 const g=room.game;
 if(paused){room.manualPausedAt=now;freezeScheduledTimers(room);if(g.kind==='electrode-relay')(g.data as {pressStartedAt:number|null}).pressStartedAt=null;return null;}
 const delta=Math.max(0,now-room.manualPausedAt!);room.manualPausedAt=null;
 if(isSecondGame(g.kind)){
  const b=g as import('./batch/core').BatchState;if(b.deadline!==null)b.deadline+=delta;if(b.pausedAt!==null)b.pausedAt+=delta;MODULES[b.kind].shiftTime?.(b,delta);
 }else{
  const original=g as Exclude<typeof g,import('./batch/core').BatchState>;
  if(original.endsAt!==null)original.endsAt+=delta;if('revealEndsAt' in original&&original.revealEndsAt!==null)original.revealEndsAt+=delta;
 }
 resumeScheduledTimers(room,delta);return null;
}
