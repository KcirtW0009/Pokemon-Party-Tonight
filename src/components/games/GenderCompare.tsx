'use client';
import {useEffect,useRef,useState} from 'react';
import type {BatchView} from '@/lib/secondTypes';
import type {RoomView} from '@/lib/types';
import {useNow} from '../Timer';
interface Rect {x:number;y:number;width:number;height:number}
interface Target {id:string;label:string;outline:string;regions:{male:Rect[];female:Rect[]}}
export function GenderCompare({view,g,send,enabled}:{view:RoomView;g:BatchView;send:(a:Record<string,unknown>)=>Promise<void>;enabled:boolean}){
 const d=g.data as {images:string[];ready:boolean;cooldownEndsAt:number;solved:boolean;errors:number;score:number;targetCount:number;foundCount:number;foundTargets:Target[];targets?:Target[];detail?:string},
 now=useNow(),[zoom,setZoom]=useState(1),[point,setPoint]=useState<{side:number;x:number;y:number}|null>(null),sent=useRef(''),sender=useRef(send),panes=useRef<(HTMLDivElement|null)[]>([]),syncing=useRef(false),down=useRef<{x:number;y:number}|null>(null);sender.current=send;
 useEffect(()=>{setZoom(1);setPoint(null);panes.current.forEach(p=>{if(p){p.scrollTop=0;p.scrollLeft=0;}});},[g.roundId]);
 useEffect(()=>{
  if(g.phase!=='loading'||!g.participants.includes(view.youId)||sent.current===g.roundId)return;
  let cancelled=false;
  Promise.all(d.images.map(src=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject();img.src=src;})))
   .then(()=>{if(!cancelled){sent.current=g.roundId;void sender.current({type:'assets-ready'});}})
   .catch(()=>{if(!cancelled){sent.current=g.roundId;void sender.current({type:'asset-failed'});}});
  return()=>{cancelled=true;};
 },[g.roundId,g.phase,view.youId,d.images.join('|')]);
 const revealed=g.phase==='reveal',canPick=enabled&&g.phase==='question'&&!d.solved&&now>=d.cooldownEndsAt,markers=revealed?(d.targets??[]):d.foundTargets;
 const synchronize=(side:number)=>{if(syncing.current)return;const p=panes.current[side],other=panes.current[1-side];if(p&&other&&(Math.abs(other.scrollLeft-p.scrollLeft)>1||Math.abs(other.scrollTop-p.scrollTop)>1)){syncing.current=true;other.scrollLeft=p.scrollLeft;other.scrollTop=p.scrollTop;requestAnimationFrame(()=>syncing.current=false);}};
 const click=(side:number,x:number,y:number)=>{if(canPick){setPoint({side,x,y});void send({type:'spot',side,x,y});}};
 return <>
  <h3 className="center">{g.phase==='loading'?'正在加载两张图片…':d.solved?'已全部找齐 · '+d.score+' 分':'左右哪里不一样？'}</h3>
  <p className="center" role="status">已找到 {d.foundCount}/{d.targetCount} 处独立差异</p>
  <p className="muted">点击任意一侧的差异部位，找齐才完成本题。左右图同一处差异只计一次；形状缺少的部分也可以点。</p>
  <details className="compare-detail"><summary>细节查看（可选）</summary><label className="compare-zoom">同步放大 {zoom.toFixed(1)}×<input aria-label="同步放大" type="range" min={1} max={3} step={.25} value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><button className="btn btn-sm" disabled={zoom===1} onClick={()=>setZoom(1)}>恢复原图</button></label><p className="muted">放大后滚动图片，两边同步移动；滚动到边缘后可以继续滚动网页。</p></details>
  <div className="gender-comparison">{d.images.map((src,side)=><div key={src}><strong>{revealed?(side===0?'雄性':'雌性'):(side===0?'左图':'右图')}</strong><div className="compare-pane" ref={p=>{panes.current[side]=p;}} onScroll={()=>synchronize(side)}>
   <svg viewBox="0 0 512 512" className="compare-picture" style={{width:zoom*100+'%',maxWidth:'none'}} role="group" aria-label={side===0?'左侧宝可梦图片':'右侧宝可梦图片'} onPointerDown={e=>{down.current={x:e.clientX,y:e.clientY};}} onPointerCancel={()=>{down.current=null;}} onPointerUp={e=>{if(!down.current||Math.hypot(e.clientX-down.current.x,e.clientY-down.current.y)>7){down.current=null;return;}down.current=null;const rect=e.currentTarget.getBoundingClientRect();click(side,(e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height);}}>
    <image href={src} width={512} height={512} aria-label={side===0?'左图宝可梦':'右图宝可梦'}/>
    {markers.map((t,i)=>{const r=t.regions[side===0?'male':'female'][0],cx=Math.max(18,r.x*512),cy=Math.max(18,r.y*512);return <g key={t.id} pointerEvents="none"><path d={t.outline} fill="#21a56e" fillOpacity={.25} stroke="#168255" strokeWidth={1.4}/><circle cx={cx} cy={cy} r={17} fill="#168255"/><text x={cx} y={cy+10} textAnchor="middle" fill="white" fontSize={29} fontWeight="bold">{t.label.replace('差异 ','')}</text></g>;})}
    {!d.solved&&point?.side===side&&<circle cx={point.x*512} cy={point.y*512} r={8} fill="none" stroke="#df8333" strokeWidth={3} pointerEvents="none"/>}
   </svg>
  </div></div>)}</div>
  {d.foundTargets.length>0&&<div className="row mt">{d.foundTargets.map(t=><span className="pill" key={t.id}>✓ {t.label}</span>)}</div>}
  {now<d.cooldownEndsAt&&<p role="status">这里不是差异部位，{Math.ceil((d.cooldownEndsAt-now)/1000)} 秒后可再试</p>}
  <p className="muted">限时120秒。答错扣20分、冷却2秒；重复点击已找到的位置不加进度、不扣分。超时未找齐得0分，随后逐处标记揭晓。</p>
  {revealed&&<div className="third-result"><h3>差异揭晓 · 共 {d.targetCount} 处</h3><p>{d.detail}</p><p className="muted">绿色标记描出实际发生变化的位置，点击容错范围不会当作差异展示。</p></div>}
 </>;
}
