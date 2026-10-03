'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState,useEffect } from 'react';
import { BattleGame } from '@/components/games/BattleGame';
import { DittoGame } from '@/components/games/DittoGame';
import { MatchGame } from '@/components/games/MatchGame';
import { PixelGame } from '@/components/games/PixelGame';
import {BatchGame} from '@/components/games/BatchGame';
import { Lobby } from '@/components/Lobby';
import { useRoom } from '@/lib/useRoom';

export default function RoomPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const { view, status, error, notice, actions } = useRoom(code);
  const router = useRouter();
  const [nick, setNick] = useState('');
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant' as ScrollBehavior});},[view?.status]);

  const goHome = () => {
    actions.leaveRoom();
    router.push('/');
  };

  return (
    <main className="page">
      <div className="room-head">
        <button className="btn btn-sm" onClick={goHome}>
          ← 首页
        </button>
        <span className="pill">房间 {code}</span>
      </div>

      {view && view.settings.targetScore > 0 && <div className="card center"><span className="pill">🏆 房间目标 {view.settings.targetScore} 分</span><p className="muted">{Math.max(0, ...Object.values(view.scores)) >= view.settings.targetScore ? `目标已达成！${view.players.filter(p => (view.scores[p.id] ?? 0) >= view.settings.targetScore).map(p => p.nickname).join('、')} 达到目标，下一场重新计分。` : `当前最高 ${Math.max(0, ...Object.values(view.scores))} 分，跨游戏累计。`}</p></div>}

      {status === 'need-nickname' && (
        <div className="card center">
          <h2>👋 你是谁？</h2>
          <p className="muted">输入昵称加入房间 {code}</p>
          <div className="row">
            <input
              className="input"
              placeholder="比如：小霞"
              value={nick}
              maxLength={16}
              onChange={(e) => setNick(e.target.value)}
            />
            <button className="btn btn-primary" disabled={!nick.trim()} onClick={() => actions.joinAs(nick)}>
              加入
            </button>
          </div>
        </div>
      )}

      {status === 'connecting' && (
        <div className="card center">
          <span className="spin">🌀</span>
          <p className="muted">正在进入房间…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="card center">
          <h2>😢 进不去</h2>
          <p>{error}</p>
          <Link className="btn btn-primary" href="/" onClick={() => actions.leaveRoom()}>
            返回首页
          </Link>
        </div>
      )}

      {status === 'in-room' && view && view.status === 'LOBBY' && (
        <Lobby view={view} actions={actions} />
      )}

      {status === 'in-room' && view && view.status !== 'LOBBY' && view.game?.game === 'match' && (
        <MatchGame view={view} game={view.game} actions={actions} />
      )}
      {status === 'in-room' && view && view.status !== 'LOBBY' && view.game?.game === 'battle' && (
        <BattleGame view={view} game={view.game} actions={actions} />
      )}
      {status === 'in-room' && view && view.status !== 'LOBBY' && view.game?.game === 'pixel' && (
        <PixelGame view={view} game={view.game} actions={actions} />
      )}
      {status === 'in-room' && view && view.status !== 'LOBBY' && view.game?.game === 'ditto' && (
        <DittoGame view={view} game={view.game} actions={actions} />
      )}
      {status==='in-room'&&view&&view.status!=='LOBBY'&&view.game&&'matchId' in view.game&&<BatchGame view={view} game={view.game} actions={actions}/>}

      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
