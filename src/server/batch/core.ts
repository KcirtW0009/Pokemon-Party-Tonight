import type {SecondGameType,SecondSettings} from '@/lib/secondTypes';
import {uid} from '../util';
export interface BatchState {
  kind:SecondGameType;timers:NodeJS.Timeout[];matchId:string;roundId:string;turnId:string;
  phase:string;round:number;totalRounds:number;deadline:number|null;currentPlayerId:string|null;
  participants:string[];points:Record<string,number>;ranks:Record<string,number>|null;gains:Record<string,number>|null;
  notice:string|null;pausedAt:number|null;onlineIds:string[];
  processed:Map<string,{fingerprint:string;error:string|null}>;
  awarded:boolean;completedRounds:number;data:unknown;
}
export interface BatchContext {
  now:number;random:()=>number;online:string[];hostId:string;settings:SecondSettings;
  ms:{turn:number;wallTurn:number;feedback:number;memoryReveal:number;question:number;questionReveal:number;prepare:number;bombRound:number;offline:number;relayMin:number;relayMax:number;driveSecond:number};
}
export interface BatchModule {
  create(g:BatchState,c:BatchContext):void;
  action(g:BatchState,id:string,a:Record<string,unknown>,c:BatchContext):string|null;
  advance(g:BatchState,c:BatchContext):void;
  snapshot(g:BatchState,id:string,c:BatchContext):object;
  connections?(g:BatchState,c:BatchContext):void;
  shiftTime?(g:BatchState,delta:number):void;
  abort?(g:BatchState,c:BatchContext):void;
  active?(g:BatchState):string[];
  publicPoints?(g:BatchState,id:string):Record<string,number>;
}
export function shuffleWith<T>(items:T[],random:()=>number):T[]{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function choose<T>(items:T[],random:()=>number):T {if(!items.length)throw new Error('Empty random pool');return items[Math.floor(random()*items.length)];}
export function turn(g:BatchState,id:string|null,deadline:number|null){g.turnId=uid();g.currentPlayerId=id;g.deadline=deadline;}
export function nextRound(g:BatchState){g.round++;g.roundId=uid();g.turnId=uid();g.notice=null;}
export function finish(g:BatchState,notice:string|null=null){g.phase='final';g.deadline=null;g.currentPlayerId=null;g.notice=notice;g.turnId=uid();}
export function nextOnline(g:BatchState,c:BatchContext,after:string|null):string|null {
  const start=after?g.participants.indexOf(after):-1;
  for(let k=1;k<=g.participants.length;k++){const id=g.participants[(start+k)%g.participants.length];if(c.online.includes(id))return id;}
  return null;
}
export function point(g:BatchState,id:string,n:number){g.points[id]=(g.points[id]??0)+n;}
export function podium(points:Record<string,number>){
  const ranks:Record<string,number>={},gains:Record<string,number>={};
  for(const [id,value] of Object.entries(points)){const rank=1+Object.values(points).filter(v=>v>value).length;ranks[id]=rank;gains[id]=[100,50,25][rank-1]??0;}
  return {ranks,gains};
}
