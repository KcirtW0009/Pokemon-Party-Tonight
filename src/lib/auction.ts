import {getPokemon} from './pokemon';
export const CARD_TIERS=[{id:'ordinary',name:'普通',minBST:0,maxBST:299,min:42,max:99},{id:'good',name:'优良',minBST:300,maxBST:399,min:100,max:199},{id:'rare',name:'稀有',minBST:400,maxBST:499,min:200,max:399},{id:'valuable',name:'珍贵',minBST:500,maxBST:599,min:400,max:799},{id:'top',name:'顶级',minBST:600,maxBST:9999,min:800,max:1838}] as const;
export type TierId=typeof CARD_TIERS[number]['id'];
export const AUCTION_TOOLS={wide:{name:'广角镜',price:100,hint:'查看所选行或列的平均价值'},focus:{name:'焦点镜',price:150,hint:'查看箱中最高单卡价值'},detector:{name:'探宝器',price:100,hint:'查看箱中实际卡牌数量'},scan:{name:'扫描仪',price:50,hint:'查看所选格子的卡牌及价值'},tier:{name:'分级探测器',price:100,hint:'选择一个档位，查看整箱该档卡牌数量'},region:{name:'分区鉴定镜',price:100,hint:'查看所选行或列五个位置的档位，包括空格'},radar:{name:'珍品雷达',price:150,hint:'查看整箱珍贵与顶级卡数量'}} as const;
export type AuctionTool=keyof typeof AUCTION_TOOLS;
export function cardTier(id:number){const p=getPokemon(id)!;const bst=p.hp+p.attack+p.defense+p.spAttack+p.spDefense+p.speed;return CARD_TIERS.find(t=>bst<=t.maxBST)!;}
export interface AuctionInfo {tool:AuctionTool;text:string;bidRound:number;axis?:string;index?:number;pokemonId?:number|null;value?:number;sum?:number;count?:number;tier?:TierId;tiers?:(TierId|null)[];valuable?:number;top?:number}
// Only disclosed constraints enter this calculation. Independent regions combine;
// overlapping regions and whole-box bounds compete instead of being added twice.
export function knownValueFloor(infos:AuctionInfo[]){let count=8,highest=0;const counts=new Map<TierId,number>(),cells=new Map<number,number>(),regions:{mask:number;value:number}[]=[];
 for(const i of infos){if(i.tool==='detector')count=i.count??count;if(i.tool==='focus')highest=Math.max(highest,i.value??0);if(i.tool==='tier'&&i.tier)counts.set(i.tier,i.count??0);if(i.tool==='radar'){counts.set('valuable',i.valuable??0);counts.set('top',i.top??0);}if(i.tool==='scan'&&i.index!==undefined)cells.set(i.index,i.value??0);if(i.axis&&i.index!==undefined){const indices=Array.from({length:5},(_,n)=>i.axis==='row'?i.index!*5+n:n*5+i.index!);if(i.tool==='wide')regions.push({mask:indices.reduce((m,n)=>m|(1<<n),0),value:i.sum??0});if(i.tool==='region')indices.forEach((cell,n)=>cells.set(cell,Math.max(cells.get(cell)??0,CARD_TIERS.find(t=>t.id===i.tiers?.[n])?.min??0)));}}
 let classified=0,tierBound=0;for(const t of CARD_TIERS){const n=counts.get(t.id)??0;classified+=n;tierBound+=n*t.min;}tierBound+=Math.max(0,count-classified)*42;
 let spatial=0;function search(at:number,mask:number,value:number){let bound=value;for(const [index,minimum] of cells)if(!(mask&(1<<index)))bound+=minimum;spatial=Math.max(spatial,bound);for(let n=at;n<regions.length;n++)if(!(mask&regions[n].mask))search(n+1,mask|regions[n].mask,value+regions[n].value);}search(0,0,0);
 const positive=[...cells.values()].filter(v=>v>0);const cellBound=positive.reduce((a,b)=>a+b,0)+Math.max(0,count-positive.length)*42;
 return Math.ceil(Math.max(count*42,tierBound,spatial,cellBound,highest?highest+(count-1)*42:0));
}
