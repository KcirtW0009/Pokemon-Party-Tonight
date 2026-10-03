'use client';
import type { GameType, RoomView } from '@/lib/types';
import { useEffect, useState } from 'react';
import { GAME_META } from '@/lib/types';
import type { RoomActions } from '@/lib/useRoom';
import { PlayerList } from './PlayerList';
import { TARGET_SCORE_OPTIONS } from '@/lib/constants';

const ORDER: GameType[] = ['ditto', 'pixel', 'match', 'battle'];
function RoundInput({ label, value, disabled, update }: { label: string; value: number; disabled: boolean; update: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <input className="select" type="number" min={1} max={20} aria-label={label} value={draft} disabled={disabled} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} onBlur={() => { const n = Number(draft); if (Number.isInteger(n) && n >= 1 && n <= 20) update(n); else setDraft(String(value)); }} />;
}

export function Lobby({ view, actions }: { view: RoomView; actions: RoomActions }) {
  const isHost = view.youId === view.hostId;
  const me = view.players.find((p) => p.id === view.youId);
  const online = view.players.filter((p) => p.connected);
  const meta = GAME_META[view.selectedGame];
  const notReady = online.filter((p) => p.id !== view.hostId && !p.ready).length;
  const enough = online.length >= meta.minPlayers;
  const canStart = isHost && enough && notReady === 0;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(view.code);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="lobby-layout">
      <div className="card center">
        <div className="muted">房间码（发给朋友）</div>
        <div className="big-code">{view.code}</div>
        <button className="btn btn-sm mt" onClick={copyCode}>
          📋 复制房间码
        </button>
      </div>

      <div className="card">
        <h2>
          👥 玩家 {online.length}/8 {isHost && '（你是房主 👑）'}
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
        <h2>🎮 选择游戏 {isHost ? '' : '（房主选择）'}</h2>
        <div className="game-grid">
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
        <div className="card">
          <h2>⚙️ 游戏设置 {isHost ? '' : '（房主设置）'}</h2>
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
          {view.selectedGame !== 'battle' && <p className="muted">可自定义 1–20 {view.selectedGame === 'ditto' ? '局' : '轮'}。</p>}
          <label className="row mt"><span>房间目标积分</span><select className="select" aria-label="房间目标积分" value={view.settings.targetScore} disabled={!isHost} onChange={e => actions.updateSettings({ targetScore: Number(e.target.value) })}>{TARGET_SCORE_OPTIONS.map(n => <option key={n} value={n}>{n ? `${n} 分` : '关闭（每场独立计分）'}</option>)}</select></label>
          <p className="muted">{view.settings.targetScore ? '跨游戏累计积分，达到目标后本场结束；猜拳完整打完五次。下一场自动开启新的积分赛。' : '开启目标积分后，可以在同一房间切换游戏并累计得分。'}</p>
        </div>
      )}

      <div className="card">
        {!isHost && (
          <button className="btn btn-block" onClick={actions.toggleReady}>
            {me?.ready ? '✅ 已准备（点我取消）' : '👆 点我准备'}
          </button>
        )}
        {isHost && (
          <button className="btn btn-primary btn-block" disabled={!canStart} onClick={actions.startGame}>
            🚀 开始游戏：{meta.name}
          </button>
        )}
        {!enough && (
          <p className="muted center">{meta.name}需要至少 {meta.minPlayers} 名玩家</p>
        )}
        {isHost && enough && notReady > 0 && (
          <p className="muted center">还有 {notReady} 名玩家未准备</p>
        )}
      </div>
    </div>
  );
}
