'use client';
import { useState } from 'react';
import type { DittoView, RoomView } from '@/lib/types';
import type { RoomActions } from '@/lib/useRoom';
import { PokemonCard } from '../PokemonCard';
import { PokemonSelector } from '../PokemonSelector';
import { FinalRanking, GameRules } from '../Scoreboard';
import { Countdown } from '../Timer';
export function DittoGame({ view, game, actions }: { view: RoomView; game: DittoView; actions: RoomActions }) {
  const [err, setErr] = useState<string | null>(null);
  const [word, setWord] = useState('');
  const host = view.youId === view.hostId;
  const alive = game.aliveIds.includes(view.youId);
  const ended = game.phase === 'final' || game.phase === 'roundResult';
  const name = (id: string) => id === 'abstain' ? '弃权' : view.players.find(p => p.id === id)?.nickname ?? '玩家';
  const act = async (action: unknown) => { setErr(null); const e = await actions.gameAction(action); if(e) setErr(e); else setWord(''); };
  const voteIds = (game.phase === 'revote' ? game.candidates ?? [] : game.aliveIds).filter(id => id !== view.youId);
  return <div>
    <div className="card center"><span className="pill">第 {game.round}/{game.totalRounds} 局 · 第 {game.cycle || 1} 轮报词</span><h2>🎭 谁是百变怪</h2><p className="muted">存活 {game.aliveIds.length} 人 · 出局 {game.eliminatedIds.length} 人</p>{!alive && !ended && <span className="pill gray">你已出局，正在观战</span>}{game.paused && <p role="status">⏸ 所有存活玩家已离线，等待重连后继续。</p>}{game.notice && <p role="status">{game.notice}</p>}</div>
    {game.phase === 'confirm' && <div className="card center">
      {game.amDitto ? <><h2>你是百变怪！</h2><p>根据线索和大家的报词隐藏自己。</p><div className="clue-box">🔎 私人线索：{game.clue}</div></> : game.pokemon && <><h2>你的宝可梦是：</h2><div style={{maxWidth:220,margin:'auto'}}><PokemonCard pokemon={game.pokemon}/></div><p>记住它，报词时不要直接说名字。</p></>}
      <Countdown endsAt={game.endsAt} totalMs={30000}/>{game.iConfirmed ? <p>✅ 已确认 {game.confirmedCount}/{game.playerCount}</p> : <button className="btn btn-primary btn-block mt" disabled={game.paused} onClick={()=>act({type:'confirm'})}>我记住了</button>}
    </div>}
    {!ended && game.phase !== 'confirm' && game.amDitto && <div className="card clue-box">🔎 你的私人线索：{game.clue}</div>}
    {game.phase === 'speak' && <div className="card">
      <h2 className="center">✍️ 轮到 {name(game.speakOrder[game.speakerIndex])} 报词</h2>
      <p className="muted center">每人一个 1–12 字的短语，提交后公示；报词结束后一起讨论。</p>
      <Countdown endsAt={game.endsAt} totalMs={60000}/>
      {alive && view.youId === game.speakOrder[game.speakerIndex] && <form className="mt" onSubmit={e=>{e.preventDefault();act({type:'word',text:word});}}><input className="input" aria-label="报词短语" placeholder="输入 1–12 字短语" value={word} onChange={e=>setWord(e.target.value)} disabled={game.paused}/><button className="btn btn-primary btn-block mt" disabled={game.paused || !word.trim() || [...word.trim()].length>12}>提交并结束报词</button></form>}
    </div>}
    {game.phase === 'discuss' && <div className="card center"><h2>🎙️ 自由讨论</h2><p>通过电话、语音或当面沟通，结合公屏词语盘逻辑。讨论不限时。</p>{host ? <button className="btn btn-primary btn-block" disabled={game.paused} onClick={()=>act({type:'discussion-done'})}>所有人发言完毕，开始投票</button> : alive && <button className="btn btn-block" disabled={game.paused || game.reminders.includes(view.youId)} onClick={()=>act({type:'remind'})}>{game.reminders.includes(view.youId) ? '已提醒房主' : '提醒房主：发言完毕'}</button>}{game.reminders.map(id=><p role="status" className="muted" key={id}>🔔 {name(id)} 提醒房主：发言完毕，可以投票了。</p>)}</div>}
    {(game.phase === 'vote' || game.phase === 'revote') && <div className="card center"><h2>🗳️ {game.phase==='revote' ? '平票复投' : '秘密投票'}</h2><p>已投票 {game.votedCount}/{game.playerCount} · 超时算弃权</p><Countdown endsAt={game.endsAt} totalMs={45000}/>{alive && (game.iVoted ? <p>✅ 已投票，等待结算</p> : <div className="vote-grid mt">{voteIds.map(id=><button className="game-opt" key={id} disabled={game.paused} onClick={()=>act({type:'vote',targetId:id})}>{name(id)}</button>)}<button className="game-opt" disabled={game.paused} onClick={()=>act({type:'vote',targetId:'abstain'})}>弃权 · 再讨论一轮</button></div>)}</div>}
    {game.phase === 'dittoGuess' && <div className="card center"><h2>百变怪被抓！最后一次翻盘机会</h2><Countdown endsAt={game.endsAt} totalMs={30000}/>{game.amDitto ? <PokemonSelector showImage onSelect={p=>act({type:'ditto-guess',pokemonId:p.id})} confirmLabel="猜它翻盘"/> : <p>等待百变怪猜宝可梦…</p>}</div>}
    {err && <div className="card center" role="alert">⚠️ {err}</div>}
    {game.words.length>0 && <div className="card"><h2>📋 报词公屏</h2>{Array.from(new Set(game.words.map(w=>w.cycle))).map(c=><div key={c} className="mt"><h3>第 {c} 轮</h3>{game.words.filter(w=>w.cycle===c).map(w=><div className="word-row" key={`${c}-${w.playerId}`}><span>{name(w.playerId)}{game.eliminatedIds.includes(w.playerId) && '（出局）'}</span><b>{w.text}</b></div>)}</div>)}</div>}
    {game.tally && <div className="card"><h3>最近一次投票结果</h3>{game.tally.map(t=><div className="word-row" key={t.targetId}><span>{name(t.targetId)}</span><b>{t.count} 票</b></div>)}</div>}
    {ended && <><div className="card center"><h2>{game.resultTitle}</h2>{game.pokemon && <div style={{maxWidth:220,margin:'auto'}}><PokemonCard pokemon={game.pokemon} sub={`百变怪：${name(game.dittoId!)}`}/></div>}</div><FinalRanking players={view.players} scores={view.scores} gains={game.gains} title={game.phase==='roundResult' ? '🏆 本局后累计积分' : '🏆 最终排名'}/><div className="card center">{host ? game.phase==='roundResult' ? <button className="btn btn-primary btn-block" onClick={()=>act({type:'next-round'})}>下一局 · 重新抽取身份与宝可梦</button> : <button className="btn btn-primary btn-block" onClick={actions.backToLobby}>返回大厅</button> : <p className="muted">等待房主{game.phase==='roundResult' ? '开始下一局' : '返回大厅'}…</p>}</div></>}
    <GameRules icon="🎭" name="谁是百变怪" lines={['每轮每位存活玩家报词一次，然后不限时讨论，由房主进入 45 秒秘密投票', '弃权严格超过存活人数一半：继续报词；平票复投一次，再平票继续报词', '最高票者出局；训练家出局可观战，百变怪存活到最后两人获胜', '百变怪被抓仍可猜答案翻盘；训练家胜各 +100，百变怪翻盘 +150、存活获胜 +200']}/>
  </div>;
}
