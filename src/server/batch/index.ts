import {SECOND_DEFAULTS,isSecondGame,type BatchView,type SecondGameType} from '@/lib/secondTypes';
import {type BatchModule,type BatchState,type BatchContext,podium,finish} from './core';
import {typeBomb} from './typeBomb';
import {starterMemory} from './memory';
import {snorlaxBerries} from './berries';
import {electrodeRelay} from './relay';
import {sudowoodoQuoridor} from './wallGame';
import {driveRevavroom} from './driveGame';
import {gender} from './gender';
import {liarsDice} from './dice';
import {rocketSecret} from './rocket';
import {pokemonAuction} from './auction';
import {surroundMeloetta} from './meloetta';
import {pushYourLuck} from './adventure';
import {uid} from '../util';
import {clearGameTimers,type ServerRoom,type Broadcast} from '../state';
export const MODULES:Record<SecondGameType,BatchModule>={'type-bomb':typeBomb,'starter-memory':starterMemory,'snorlax-berries':snorlaxBerries,'electrode-relay':electrodeRelay,'gender-difference':gender,'sudowoodo-quoridor':sudowoodoQuoridor,'drive-revavroom':driveRevavroom,'rocket-secret':rocketSecret,'pokemon-auction':pokemonAuction,'pokemon-liars-dice':liarsDice,'surround-meloetta':surroundMeloetta,'pokemon-push-your-luck':pushYourLuck};
export function context(room:ServerRoom,now=Date.now()):BatchContext {
 const fast=process.env.PPT_FAST==='1',k=fast?.025:1;
 return {now,random:Math.random,online:room.players.filter(p=>p.connected).map(p=>p.id),hostId:room.hostId,settings:{...SECOND_DEFAULTS,...room.settings.second},ms:{turn:20000*k,wallTurn:30000*k,feedback:1500*k,memoryReveal:2000*k,question:15000*k,questionReveal:3000*k,prepare:3000*k,bombRound:180000*k,offline:30000*k,relayMin:20000*k,relayMax:40000*k,driveSecond:1000*k}};
}
export function settle(room:ServerRoom,g:BatchState){if(g.phase!=='final'||g.awarded)return;g.awarded=true;const result=g.kind==='drive-revavroom'||!g.completedRounds?{ranks:null,gains:Object.fromEntries(g.participants.map(id=>[id,0]))}:podium(g.points);g.ranks=result.ranks;g.gains=result.gains;for(const [id,n] of Object.entries(result.gains))room.scores[id]=(room.scores[id]??0)+n;room.status='RESULT';clearGameTimers(room);}
export function advanceBatch(room:ServerRoom,now=Date.now()){
 const g=room.game;if(!g||!isSecondGame(g.kind))return;const b=g as BatchState,c=context(room,now),m=MODULES[b.kind];c.online=c.online.filter(id=>b.participants.includes(id));m.connections?.(b,c);
 if(b.phase==='final'){settle(room,b);return;}
 const active=m.active?.(b)??b.participants,online=c.online.filter(id=>active.includes(id));const needsPause=['roundResult','mapResult','boxResult','discussion'].includes(b.phase)?false:['type-bomb','snorlax-berries','sudowoodo-quoridor'].includes(b.kind)?online.length<2:['drive-revavroom','rocket-secret','pokemon-auction','pokemon-liars-dice','surround-meloetta','pokemon-push-your-luck'].includes(b.kind)?online.length===0:false;
 if(needsPause){if(b.pausedAt===null)b.pausedAt=now;if(now-b.pausedAt>=c.ms.offline){m.abort?.(b,c);finish(b,'连接人数不足，本场结束；已完成局的成绩保留');settle(room,b);}return;}
 if(b.pausedAt!==null){const delta=now-b.pausedAt;if(b.deadline!==null)b.deadline+=delta;m.shiftTime?.(b,delta);b.pausedAt=null;}
 m.advance(b,c);settle(room,b);
}
export function startBatch(room:ServerRoom,broadcast:Broadcast){
 const kind=room.selectedGame as SecondGameType,participants=room.players.filter(p=>p.connected).map(p=>p.id),g:BatchState={kind,timers:[],matchId:uid(),roundId:uid(),turnId:uid(),phase:'',round:1,totalRounds:1,deadline:null,currentPlayerId:null,participants,points:Object.fromEntries(participants.map(id=>[id,0])),ranks:null,gains:null,notice:null,pausedAt:null,onlineIds:participants,processed:new Map(),awarded:false,completedRounds:0,data:null};
 MODULES[kind].create(g,context(room));room.game=g;room.status='PLAYING';g.timers.push(setInterval(()=>{advanceBatch(room);broadcast(room);},kind==='drive-revavroom'?50:100));broadcast(room);
}
export function batchView(room:ServerRoom,id:string):BatchView {
 const g=room.game as BatchState,c=context(room);return {game:g.kind,matchId:g.matchId,roundId:g.roundId,turnId:g.turnId,revision:room.revision??0,phase:g.phase,round:g.round,totalRounds:g.totalRounds,participants:[...g.participants],points:MODULES[g.kind].publicPoints?.(g,id)??{...g.points},ranks:g.ranks,gains:g.gains,currentPlayerId:g.currentPlayerId,endsAt:g.deadline,paused:g.pausedAt!==null,pauseEndsAt:g.pausedAt===null?null:g.pausedAt+c.ms.offline,notice:g.notice,data:MODULES[g.kind].snapshot(g,id,c) as Record<string,unknown>};
}
export function handleBatchAction(room:ServerRoom,id:string,payload:unknown,broadcast:Broadcast):string|null {
 const g=room.game as BatchState;advanceBatch(room);const p=payload as {meta?:Record<string,unknown>;action?:Record<string,unknown>},meta=p?.meta,a=p?.action;
 const respond=(error:string|null)=>{broadcast(room);return error;};
 if(!meta||typeof meta.actionId!=='string'||meta.actionId.length>100||!meta.actionId||!a||typeof a!=='object')return respond('操作缺少同步信息');
 const key=id+':'+meta.actionId,fingerprint=JSON.stringify(p),old=g.processed.get(key);if(old)return respond(old.fingerprint===fingerprint?old.error:'操作编号已使用');
 let error:string|null=null;
 if(meta.roomId!==room.code||meta.matchId!==g.matchId||meta.roundId!==g.roundId||meta.turnId!==g.turnId)error='局面已更新，请按最新画面操作';
 else if(!g.participants.includes(id)&&!(a.type==='end-match'&&id===room.hostId&&g.kind==='sudowoodo-quoridor'))error='你正在旁观，下一场可以参加';
 else if(g.pausedAt!==null)error='等待玩家重新连接';
 else if(g.phase==='final')error='本场已经结束';
 else {const c=context(room);c.online=c.online.filter(p=>g.participants.includes(p));error=MODULES[g.kind].action(g,id,a,c);}
 g.processed.set(key,{fingerprint,error});if(g.processed.size>512)g.processed.delete(g.processed.keys().next().value!);settle(room,g);return respond(error);
}
