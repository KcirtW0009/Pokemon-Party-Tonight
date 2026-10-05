export type AdventureCard=number|'shield'|'peek'|'trick'|'delivery'|'discard'|'double';
export const NUMBER_IDS=[0,172,133,7,1,25,5,8,2,26,6];
export const SPECIAL_IDS={shield:143,peek:178,trick:65,delivery:225,discard:510,double:979};
export const adventureDeck=():AdventureCard[]=>[...Array.from({length:10},(_,i)=>Array(3).fill(i+1)).flat(),...Array(2).fill('shield'),...Array(2).fill('peek'),...Array(2).fill('trick'),...Array(2).fill('delivery'),...Array(2).fill('discard'),...Array(2).fill('double')];
export const handTotal=(hand:number[])=>hand.reduce((a,b)=>a+b,0);
export interface ExpeditionPlayer {hand:number[];shield:boolean;status:'active'|'stopped'|'bust';banked:number}
export function legalTrades(players:Record<string,ExpeditionPlayer>,id:string){const mine=players[id];if(!mine||mine.status==='bust')return [];const options:{target:string;own:number;other:number;myAfter:number;theirAfter:number}[]=[];for(const [target,p] of Object.entries(players)){if(target===id||p.status==='bust')continue;for(const own of mine.hand)for(const other of p.hand){const a=mine.hand.filter(n=>n!==own).concat(other),b=p.hand.filter(n=>n!==other).concat(own);if(new Set(a).size===a.length&&new Set(b).size===b.length)options.push({target,own,other,myAfter:handTotal(a),theirAfter:handTotal(b)});}}return options;}
