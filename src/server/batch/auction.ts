import {ALL_POKEMON,getPokemon} from '../pokedex';
import {choose,shuffleWith,type BatchModule,type BatchState,type BatchContext,turn,nextRound,finish} from './core';
import {uid} from '../util';
import {AUCTION_TOOLS,cardTier,CARD_TIERS,knownValueFloor,type AuctionTool,type AuctionInfo,type TierId} from '@/lib/auction';
export type {AuctionTool} from '@/lib/auction';
export const AUCTION={startingCash:10000,targetCash:15000,maxBoxes:15,noSaleLimit:3,tools:Object.fromEntries(Object.entries(AUCTION_TOOLS).map(([k,v])=>[k,v.price])) as Record<AuctionTool,number>} as const;

export function cardValue(id:number){const p=getPokemon(id)!;const bst=p.hp+p.attack+p.defense+p.spAttack+p.spDefense+p.speed;return Math.round(100*2**((bst-300)/100));}
export function makeBox(random:()=>number):(number|null)[]{const size=8+Math.floor(random()*8);const cards=Array.from({length:size},()=>choose(ALL_POKEMON,random).id);return shuffleWith([...cards,...Array(25-size).fill(null)],random);}
export function auctionWinner(bids:Record<string,number>,round:number,random:()=>number):string|null {const positive=Object.entries(bids).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);if(!positive.length)return null;if(positive.length===1)return positive[0][0];const highest=positive[0][1],second=positive[1][1],tied=positive.filter(([,v])=>v===highest);if(round===3)return choose(tied,random)[0];if(tied.length>1)return null;return highest*(round===1?2:5)>=second*(round===1?3:6)?positive[0][0]:null;}
interface Item {id:string;tool:AuctionTool}
type Info=AuctionInfo;
interface Data {
 box:(number|null)[];boxStart:Record<string,number>;inventory:Record<string,Item[]>;startInventory:Record<string,Item[]>;
 tools:Record<string,Info[]>;purchases:Record<string,number>;fees:Record<string,number>;ready:string[];usedThisRound:string[];
 bids:Record<string,number>;bidRound:number;publicInfo:Info[];lastBids:{highest:number;second:number;ratio:number}|null;noSales:number;
 events:{playerId:string;tool:AuctionTool;bidRound:number;axis?:string;index?:number;tier?:TierId}[];bidHistory:{bidRound:number;bids:Record<string,number>}[];
 result:{cards:(number|null)[];prices:number[];value:number;buyer:string|null;bid:number;tradeProfit:number;fees:Record<string,number>;net:Record<string,number>;bids:Record<string,number>}|null;
}
const data=(g:BatchState)=>g.data as Data;
function information(d:Data,tool:AuctionTool,axis?:unknown,index?:unknown,tier?:unknown):Info|string {
 if(tool==='wide'||tool==='region'){if(!['row','column'].includes(axis as string)||!Number.isInteger(index)||Number(index)<0||Number(index)>4)return '请选择合法行或列';const line=index as number;if(tool==='region'){const tiers=d.box.filter((_,i)=>axis==='row'?Math.floor(i/5)===line:i%5===line).map(p=>p===null?null:cardTier(p).id);return {tool,bidRound:d.bidRound,axis:axis as string,index:line,tiers,text:(axis==='row'?'行':'列')+' '+(line+1)+'：'+tiers.map(t=>t===null?'空':CARD_TIERS.find(x=>x.id===t)!.name).join('、')};}const values=d.box.filter((_,i)=>axis==='row'?Math.floor(i/5)===line:i%5===line).map(p=>p===null?0:cardValue(p));return {tool,bidRound:d.bidRound,axis:axis as string,index:line,sum:values.reduce((x,y)=>x+y,0),text:(axis==='row'?'行':'列')+' '+(line+1)+' 平均价值 '+(values.reduce((x,y)=>x+y,0)/5).toFixed(1)};}
 if(tool==='focus')return {tool,bidRound:d.bidRound,value:Math.max(...d.box.map(p=>p===null?0:cardValue(p))),text:'最高单卡 '+Math.max(...d.box.map(p=>p===null?0:cardValue(p)))};
 if(tool==='detector')return {tool,bidRound:d.bidRound,count:d.box.filter(p=>p!==null).length,text:'实际卡牌 '+d.box.filter(p=>p!==null).length+' 张'};
 if(tool==='tier'){const t=CARD_TIERS.find(t=>t.id===tier);if(!t)return '请选择档位';const count=d.box.filter(p=>p!==null&&cardTier(p).id===t.id).length;return {tool,bidRound:d.bidRound,tier:t.id,count,text:t.name+'卡 '+count+' 张'};}
 if(tool==='radar'){const valuable=d.box.filter(p=>p!==null&&cardTier(p).id==='valuable').length,top=d.box.filter(p=>p!==null&&cardTier(p).id==='top').length;return {tool,bidRound:d.bidRound,valuable,top,text:'珍贵 '+valuable+' 张，顶级 '+top+' 张'};}
 if(!Number.isInteger(index)||Number(index)<0||Number(index)>=25)return '请选择合法格子';const cell=index as number,p=d.box[cell],value=p===null?0:cardValue(p);return {tool,bidRound:d.bidRound,index:cell,pokemonId:p,value,text:'第 '+(cell+1)+' 格：'+(p===null?'空':getPokemon(p)!.nameZh+'，价值 '+value)};
}
function intel(g:BatchState,c:BatchContext){const d=data(g);d.ready=[];d.usedThisRound=[];d.bids={};if(d.bidRound===1||d.bidRound===3){const tool=choose(Object.keys(AUCTION.tools) as AuctionTool[],c.random);const info=information(d,tool,c.random()<.5?'row':'column',Math.floor(c.random()*(['wide','region'].includes(tool)?5:25)),choose([...CARD_TIERS],c.random).id);if(typeof info!=='string')d.publicInfo.push(info);}g.phase='intel';turn(g,null,c.now+c.ms.turn);}
function begin(g:BatchState,c:BatchContext,noSales=0,inventory?:Record<string,Item[]>){const bag=inventory?structuredClone(inventory):Object.fromEntries(g.participants.map(id=>[id,[]]));g.data={box:makeBox(c.random),boxStart:{...g.points},inventory:bag,startInventory:structuredClone(bag),tools:Object.fromEntries(g.participants.map(id=>[id,[]])),purchases:Object.fromEntries(g.participants.map(id=>[id,0])),fees:Object.fromEntries(g.participants.map(id=>[id,0])),ready:[],usedThisRound:[],bids:{},bidRound:1,publicInfo:[],lastBids:null,noSales,result:null,events:[],bidHistory:[]} satisfies Data;g.phase='purchase';turn(g,null,c.now+c.ms.turn);}
function bidding(g:BatchState,c:BatchContext){g.phase='bid';data(g).bids={};turn(g,null,c.now+c.ms.wallTurn);}
function settleBox(g:BatchState,c:BatchContext,buyer:string|null){const d=data(g),prices=d.box.map(id=>id===null?0:cardValue(id)),value=prices.reduce((a,b)=>a+b,0),bid=buyer?d.bids[buyer]:0;if(buyer)g.points[buyer]+=value-bid;d.noSales=buyer?0:d.noSales+1;d.result={cards:[...d.box],prices,value,buyer,bid,tradeProfit:buyer?value-bid:0,fees:{...d.fees},net:Object.fromEntries(g.participants.map(id=>[id,g.points[id]-d.boxStart[id]])),bids:{...d.bids}};g.completedRounds++;g.phase='boxResult';turn(g,null,c.now+c.ms.feedback*3);}
function decide(g:BatchState,c:BatchContext){const d=data(g);for(const id of g.participants)d.bids[id]??=0;d.bidHistory.push({bidRound:d.bidRound,bids:{...d.bids}});const winner=auctionWinner(d.bids,d.bidRound,c.random);if(winner||d.bidRound===3){settleBox(g,c,winner);return;}const sorted=Object.values(d.bids).sort((a,b)=>b-a);d.lastBids={highest:sorted[0]??0,second:sorted[1]??0,ratio:d.bidRound===1?1.5:1.2};d.bidRound++;intel(g,c);}
export const pokemonAuction:BatchModule={
 create(g,c){g.totalRounds=c.settings.auctionBoxes;g.points=Object.fromEntries(g.participants.map(id=>[id,AUCTION.startingCash]));begin(g,c);},
 action(g,id,a,c){const d=data(g);if(g.phase==='purchase'||g.phase==='intel'){
  if(d.ready.includes(id))return '情报操作已结束，请等待统一报价';
  if(a.type==='ready'){d.ready.push(id);if(c.online.every(p=>d.ready.includes(p))){if(g.phase==='purchase')intel(g,c);else bidding(g,c);};return null;}
  if(a.type==='buy-tool'){const tool=a.tool as AuctionTool;if(g.phase!=='purchase')return '当前不是购买阶段';if(!Object.hasOwn(AUCTION.tools,tool))return '请选择道具';if(d.purchases[id]>=2)return '每箱最多采购两件';const cost=AUCTION.tools[tool];if(g.points[id]<cost)return '余额不足';g.points[id]-=cost;d.fees[id]+=cost;d.purchases[id]++;d.inventory[id].push({id:uid(),tool});return null;}
  if(a.type==='use-tool'){if(g.phase!=='intel')return '购买完成后才能使用';if(d.usedThisRound.includes(id))return '本轮已经使用一件道具';const item=d.inventory[id].find(p=>p.id===a.itemId);if(!item)return '背包中没有这件道具';const info=information(d,item.tool,a.axis,a.index,a.tier);if(typeof info==='string')return info;d.inventory[id]=d.inventory[id].filter(p=>p.id!==item.id);d.tools[id].push(info);d.events.push({playerId:id,tool:item.tool,bidRound:d.bidRound,axis:info.axis,index:info.index,tier:info.tier});d.usedThisRound.push(id);return null;}
  return '请选择采购、使用道具或结束情报操作';
 }
 if(g.phase!=='bid'||a.type!=='bid')return '当前不能报价';if(d.bids[id]!==undefined)return '本轮报价已锁定';if(!Number.isSafeInteger(a.amount)||Number(a.amount)<0||Number(a.amount)>g.points[id])return '报价须为不超过余额的非负整数';d.bids[id]=a.amount as number;if(c.online.every(p=>d.bids[p]!==undefined))decide(g,c);return null;
 },
 advance(g,c){if(g.deadline===null||c.now<g.deadline)return;if(g.phase==='purchase')intel(g,c);else if(g.phase==='intel')bidding(g,c);else if(g.phase==='bid')decide(g,c);else if(g.phase==='boxResult'){const d=data(g);if(Object.values(g.points).some(v=>v>=AUCTION.targetCash)||g.round>=g.totalRounds||d.noSales>=AUCTION.noSaleLimit||Object.values(g.points).every(v=>v===0))finish(g);else{nextRound(g);begin(g,c,d.noSales,d.inventory);}}},
 snapshot(g,id){const d=data(g);return {events:structuredClone(d.events),bidHistory:structuredClone(d.bidHistory),knownFloor:knownValueFloor([...d.publicInfo,...(d.tools[id]??[])]),myCash:g.points[id]??0,myTools:structuredClone(d.tools[id]??[]),myInventory:structuredClone(d.inventory[id]??[]),myPurchases:d.purchases[id]??0,myUsedThisRound:d.usedThisRound.includes(id),myFees:d.fees[id]??0,ready:[...d.ready],myBid:d.bids[id]??null,bidRound:d.bidRound,submittedCount:Object.keys(d.bids).length,publicInfo:structuredClone(d.publicInfo),lastBids:d.lastBids,noSales:d.noSales,result:d.result,parameters:AUCTION};},
 publicPoints(g,id){const d=data(g);return ['boxResult','final'].includes(g.phase)?{...g.points}:{...d.boxStart,...(g.participants.includes(id)?{[id]:g.points[id]}:{})};},
 abort(g){const d=data(g);g.points={...d.boxStart};d.inventory=structuredClone(d.startInventory);},
};
