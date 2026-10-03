'use client';
import type { PlayerInfo } from '@/lib/types';
import { avatarColor } from './Timer';

interface Props {
  players: PlayerInfo[];
  hostId: string;
  youId: string;
  scores?: Record<string, number> | null;
  onKick?: (playerId: string) => void;
  showReady?: boolean;
}

export function PlayerList({ players, hostId, youId, scores, onKick, showReady }: Props) {
  return (
    <ul className="plist">
      {players.map((p) => (
        <li key={p.id} className={`prow${p.connected ? '' : ' off'}`}>
          <span className="avatar" style={{ background: avatarColor(p.id) }}>
            {p.nickname.slice(0, 1)}
          </span>
          <span style={{ flex: 1 }}>
            {p.nickname}
            {p.id === youId && '（你）'}
            {!p.connected && ' 📴'}
          </span>
          {onKick && p.id !== hostId && (
            <button className="btn btn-sm" onClick={() => onKick(p.id)}>
              踢出
            </button>
          )}
          <div className="player-badges">
            {p.id === hostId && <span className="pill">👑 房主</span>}
            {scores && <span className="pill blue">{scores[p.id] ?? 0} 分</span>}
            {showReady && p.connected && <span className={`pill ${p.ready ? 'green' : 'gray'}`}>{p.ready ? '已准备' : '未准备'}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
