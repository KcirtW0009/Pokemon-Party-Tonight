'use client';
import {useEffect,useState} from 'react';
import type {BatchView} from '@/lib/secondTypes';
import type {RoomView} from '@/lib/types';
import {Blast,usePartySound} from './PartyEffects';
export function BerryTable({view,g,send,enabled}:{view:RoomView;g:BatchView;send:(a:Record<string,unknown>)=>Promise<void>;enabled:boolean}){
 const d=g.data as {plates:string[];total:number;deliveryUsed:string[];last:{eventId:string;playerId:string;type:string;indices:number[];amount:number;gain:number;automatic:boolean}|null;exploded:boolean};
 const [selected,setSelected]=useState<number[]>([]),[delivery,setDelivery]=useState(false);useEffect(()=>{setSelected([]);setDelivery(false);},[g.turnId,g.roundId]);
 const event=d.last?d.last.eventId:null;usePartySound(event,d.last?.type==='bomb'?'explode':d.last?.type==='delivery'?'bell':'take');
 const player=d.last?view.players.find(p=>p.id===d.last!.playerId)?.nickname??'离线玩家':'';
 return <div className={`center berry-scene${d.exploded?' exploded':''}`}><img src="/pokemon/official-artwork/143.png" width={115} height={115} alt="卡比兽"/><h3>卡比兽的树果桌</h3><p>每次选择 1–3 颗树果，再确认拿取。还剩 {d.total} 颗。</p>
 <div className="berry-table">{d.plates.map((status,i)=><button key={i} className={`berry-plate ${status}${selected.includes(i)?' selected':''}${d.last?.indices.includes(i)?' just-taken':''}`} disabled={!enabled||status!=='full'} aria-pressed={selected.includes(i)} aria-label={`第 ${i+1} 个盘子${status==='full'?'，树果':status==='bomb'?'，炸弹':'，空盘'}`} onClick={()=>setSelected(old=>old.includes(i)?old.filter(p=>p!==i):old.length<3?[...old,i]:old)}><span className="plate-dish"/>{status==='full'?<img src="/batch/sitrus-berry.png" alt="树果" draggable={false}/>:status==='bomb'?<span className="berry-bomb">💣</span>:null}<small>{i+1}</small></button>)}</div>
 <button className="btn btn-primary mt" disabled={!enabled||!selected.length} onClick={()=>send({type:'take',indices:selected})}>确认拿取 {selected.length||'…'} 颗</button>
 <div className="delivery-bell"><img src="/pokemon/official-artwork/225.png" width={70} height={70} alt="信使鸟"/><button className="btn" disabled={!enabled||d.deliveryUsed.includes(view.youId)} onClick={()=>setDelivery(true)}>🛎️ 外卖铃{d.deliveryUsed.includes(view.youId)?'（已用）':''}</button></div>
 {delivery&&<div className="third-result"><p>叫外卖扣 2 分，补满 12 个盘子，并多藏一颗炸弹。整场每人限一次。</p><div className="row"><button className="btn btn-primary" disabled={!enabled} onClick={()=>{void send({type:'delivery'});setDelivery(false);setSelected([]);}}>确认叫外卖（−2 分）</button><button className="btn" onClick={()=>setDelivery(false)}>取消</button></div></div>}
 <p className="muted">起始 12 个位置，其中 1 个藏炸弹。拿到炸弹本次 −2 分，本局结束；超时自动拿最前面的一颗。</p>
 {d.last&&<p>{player}{d.last.automatic?' 超时自动':''}{d.last.type==='delivery'?'叫了外卖':`拿了 ${d.last.amount} 颗`}，{d.last.gain>0?'+':''}{d.last.gain} 分</p>}
 {d.exploded&&<Blast key={g.roundId} label={`${player} 抽中炸弹 · −2 分`}/>}
 </div>;
}
