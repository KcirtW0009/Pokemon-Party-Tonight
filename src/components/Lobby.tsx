'use client';
import type { GameType, RoomView } from '@/lib/types';
import { useEffect, useState, useRef } from 'react';
import { GAME_META } from '@/lib/types';
import type { RoomActions } from '@/lib/useRoom';
import { PlayerList } from './PlayerList';
import { TARGET_SCORE_OPTIONS } from '@/lib/constants';
import {SECOND_GAMES,SECOND_DEFAULTS,isSecondGame} from '@/lib/secondTypes';
import {copyText} from '@/lib/clipboard';

const ORDER: GameType[] = ['ditto', 'pixel', 'match', 'battle',...SECOND_GAMES];
function RoundInput({ label, value, disabled, update }: { label: string; value: number; disabled: boolean; update: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <input className="select" type="number" min={1} max={20} aria-label={label} value={draft} disabled={disabled} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} onBlur={() => { const n = Number(draft); if (Number.isInteger(n) && n >= 1 && n <= 20) update(n); else setDraft(String(value)); }} />;
}

export function Lobby({ view, actions }: { view: RoomView; actions: RoomActions }) {
  const [copyStatus,setCopyStatus]=useState<'idle'|'copied'|'failed'>('idle');
  useEffect(()=>setCopyStatus('idle'),[view.code]);
  const dock=useRef<HTMLDivElement>(null),layout=useRef<HTMLDivElement>(null);
  useEffect(()=>{const el=dock.current;if(!el)return;const resize=()=>layout.current?.style.setProperty('--lobby-dock-space',`${el.getBoundingClientRect().height+36}px`);resize();const observer=new ResizeObserver(resize);observer.observe(el);return()=>observer.disconnect();},[]);
  const isHost = view.youId === view.hostId;
  const me = view.players.find((p) => p.id === view.youId);
  const online = view.players.filter((p) => p.connected);
  const meta = GAME_META[view.selectedGame];
  const notReady = online.filter((p) => p.id !== view.hostId && !p.ready).length;
  const enough = online.length >= meta.minPlayers && online.length <= meta.maxPlayers;
  const canStart = isHost && enough && notReady === 0;

  const copyCode = async () => {
    setCopyStatus(await copyText(view.code)?'copied':'failed');
  };

  return (
    <div className="lobby-layout" ref={layout}>
      <div className="card room-invite">
        <div>
        <div className="muted">房间码（发给朋友）</div>
        <div className="big-code">{view.code}</div>
        </div><div className="invite-copy">
        <button className="btn btn-sm mt" onClick={copyCode}>
          {copyStatus==='copied'?'✓ 已复制房间码':'📋 复制房间码'}
        </button>
        <p role="status" aria-live="polite">{copyStatus==='copied'?'房间码已复制，可以粘贴发给朋友。':copyStatus==='failed'?'浏览器限制了自动复制，请长按下方房间码，或选中后按 Ctrl+C / ⌘C。':''}</p>
        {copyStatus==='failed'&&<input className="input" aria-label="手动复制房间码" readOnly value={view.code} onFocus={e=>e.currentTarget.select()} onClick={e=>e.currentTarget.select()}/>}
        </div>
      </div>

      <div className="card">
        <h2>
          玩家 {online.length}/8 {isHost && '（你是房主 👑）'}
        </h2>
        <PlayerList
          players={view.players}
          hostId={view.hostId}
          youId={view.youId}
          scores={view.scores}
          showReady
          onKick={isHost ? actions.kickPlayer : undefined}
        />
      </div>

      <div className="card">
        <h2>选择游戏 {isHost ? '' : '（房主选择）'}</h2>
        <div className="game-grid game-scroll" tabIndex={0} role="region" aria-label="游戏选择，可上下滚动">
          {ORDER.map((g) => (
            <button
              key={g}
              className={`game-opt${view.selectedGame === g ? ' sel' : ''}`}
              disabled={!isHost}
              onClick={() => actions.selectGame(g)}
            >
              <span className="icon">{GAME_META[g].icon}</span>
              {GAME_META[g].name}
              <div className="muted">
                {GAME_META[g].minPlayers}–{GAME_META[g].maxPlayers} 人
              </div>
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          {meta.icon} {meta.name}：{meta.desc}
        </p>
      </div>

      {(
        <div className="card lobby-settings">
          <h2>游戏设置 {isHost ? '' : '（房主设置）'}</h2>
          {view.selectedGame === 'pixel' && (
            <div className="row">
              <span style={{ fontWeight: 800 }}>轮数</span>
              <RoundInput label="像素轮数"
                value={view.settings.pixelRounds}
                disabled={!isHost}
                update={n => actions.updateSettings({ pixelRounds: n })}
              />
            </div>
          )}
          {view.selectedGame === 'match' && (
            <div className="row">
              <span style={{ fontWeight: 800 }}>轮数</span>
              <RoundInput label="默契轮数"
                value={view.settings.matchRounds}
                disabled={!isHost}
                update={n => actions.updateSettings({ matchRounds: n })}
              />
            </div>
          )}
          {view.selectedGame === 'ditto' && <div className="row"><span>局数</span><RoundInput label="百变怪局数" value={view.settings.dittoRounds} disabled={!isHost} update={n => actions.updateSettings({ dittoRounds: n })} /></div>}
          {view.selectedGame === 'battle' && <p>固定一场，5 张手牌比拼 5 次，每次选牌限时 60 秒。</p>}
          {!isSecondGame(view.selectedGame)&&view.selectedGame !== 'battle' && <p className="muted">可自定义 1–20 {view.selectedGame === 'ditto' ? '局' : '轮'}。</p>}
          {isSecondGame(view.selectedGame)&&<SecondOptions view={view} actions={actions} disabled={!isHost}/>}
          <label className="row mt"><span>房间目标积分</span><select className="select" aria-label="房间目标积分" value={view.settings.targetScore} disabled={!isHost} onChange={e => actions.updateSettings({ targetScore: Number(e.target.value) })}>{TARGET_SCORE_OPTIONS.map(n => <option key={n} value={n}>{n ? `${n} 分` : '关闭（每场独立计分）'}</option>)}</select></label>
          <p className="muted">{view.settings.targetScore ? '跨游戏累计积分，达到目标后本场结束；猜拳完整打完五次。下一场自动开启新的积分赛。' : '开启目标积分后，可以在同一房间切换游戏并累计得分。'}</p>
        </div>
      )}

      <div className="lobby-dock" ref={dock} role="region" aria-label="准备与开始游戏">
        <div><strong>{meta.name}</strong><p className="muted">{!enough?`需要 ${meta.minPlayers}–${meta.maxPlayers} 名玩家，当前 ${online.length} 人`:notReady>0?`还有 ${notReady} 名玩家未准备`:'所有人已准备，可以开局'}</p></div>
        {!isHost&&<button className={`btn ${me?.ready?'btn-green':'btn-primary'}`} aria-pressed={!!me?.ready} onClick={actions.toggleReady}>{me?.ready?'已准备 · 点击取消':'准备好了'}</button>}
        {isHost&&<button className="btn btn-primary" disabled={!canStart} onClick={actions.startGame}>开始游戏</button>}
      </div>
    </div>
  );
}
function SecondOptions({view,actions,disabled}:{view:RoomView;actions:RoomActions;disabled:boolean}){
 const s={...SECOND_DEFAULTS,...view.settings.second},g=view.selectedGame;
 const config=g==='type-bomb'?{key:'bombRounds' as const,min:1,max:Number.MAX_SAFE_INTEGER,label:'局数'}:g==='gender-difference'?{key:'genderRounds' as const,min:1,max:view.genderPoolSize??103,label:'题数'}:g==='snorlax-berries'?{key:'berryRounds' as const,min:3,max:10,label:'轮数'}:g==='electrode-relay'?{key:'relayRounds' as const,min:4,max:12,label:'轮数'}:g==='sudowoodo-quoridor'?{key:'wallRounds' as const,min:1,max:Number.MAX_SAFE_INTEGER,label:'局数'}:g==='pokemon-auction'?{key:'auctionBoxes' as const,min:1,max:15,label:'最多箱数'}:g==='pokemon-liars-dice'?{key:'diceMatches' as const,min:1,max:20,label:'淘汰赛场数'}:g==='surround-meloetta'?{key:'trapRounds' as const,min:1,max:Number.MAX_SAFE_INTEGER,label:'轮数'}:g==='pokemon-push-your-luck'?{key:'luckRounds' as const,min:1,max:Number.MAX_SAFE_INTEGER,label:'轮数'}:null;
 const [draft,setDraft]=useState('');useEffect(()=>{setDraft(config?String(s[config.key]):'');},[g,config?s[config.key]:0]);
 const update=(value:object)=>actions.updateSettings({second:{...s,...value}});
 if(g==='rocket-secret')return <><label className="row">完整轮换周期<select className="select" disabled={disabled} value={s.rocketCycles||(view.players.filter(p=>p.connected).length===3?2:1)} onChange={e=>update({rocketCycles:Number(e.target.value)})}>{[1,2,3].map(n=><option key={n} value={n}>{n} 个周期（{view.players.filter(p=>p.connected).length*n} 题）</option>)}</select></label><label className="row">私人排除干扰项<select className="select" disabled={disabled} value={s.rocketExcluded} onChange={e=>update({rocketExcluded:Number(e.target.value)})}>{[0,1,2,3,4].map(n=><option key={n} value={n}>{n} 只</option>)}</select></label><p className="muted">每题揭晓后不限时讨论，房主手动进入下一题。</p></>;
 return <>{config&&<label className="row">{config.label}<input className="input" type="number" min={config.min} max={config.max===Number.MAX_SAFE_INTEGER?undefined:config.max} value={draft} disabled={disabled} onChange={e=>setDraft(e.target.value)} onBlur={()=>{const n=Number(draft);if(Number.isSafeInteger(n)&&n>=config.min&&n<=config.max)update({[config.key]:n});else setDraft(String(s[config.key]));}}/></label>}{g==='sudowoodo-quoridor'&&<p className="muted">三人局数须为 3 的倍数；两人和四人可设任意正整数。</p>}{g==='gender-difference'&&<p className="muted">每场随机抽题不重复，题数不能超过已核验素材库（{view.genderPoolSize??103} 组）。</p>}{g==='starter-memory'&&<label className="row">牌组<select className="select" disabled={disabled} value={s.memoryPairs} onChange={e=>update({memoryPairs:Number(e.target.value)})}>{[6,9,27].map(n=><option key={n} value={n}>{n*2} 张 / {n} 对</option>)}</select></label>}{g==='drive-revavroom'&&<label className="row">固定三张地图，每张时限<select className="select" disabled={disabled} value={s.driveSeconds} onChange={e=>update({driveSeconds:Number(e.target.value)})}>{[60,90,120,180].map(n=><option key={n} value={n}>{n} 秒</option>)}</select></label>}</>;
}

