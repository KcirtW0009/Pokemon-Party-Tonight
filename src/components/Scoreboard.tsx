'use client';
import type { PlayerInfo } from '@/lib/types';
import { avatarColor } from './Timer';

const MEDALS = ['🥇', '🥈', '🥉'];

interface Props {
  players: PlayerInfo[];
  scores: Record<string, number>;
  title?: string;
  gains?: Record<string, number> | null;
}

export function FinalRanking({ players, scores, title = '🏆 最终排名', gains }: Props) {
  const order = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  return (
    <div className="card">
      <h2>{title}</h2>
      {order.map((p, i) => (
        <div key={p.id} className={`rank-row${i === 0 ? ' first' : ''}`}>
          <span style={{ fontSize: 22 }}>{MEDALS[i] ?? `${i + 1}`}</span>
          <span className="avatar" style={{ background: avatarColor(p.id) }}>
            {p.nickname.slice(0, 1)}
          </span>
          <span style={{ flex: 1 }}>{p.nickname}</span>
          {gains && (gains[p.id] ?? 0) > 0 && <span className="pill green">+{gains[p.id]}</span>}
          <b>{scores[p.id] ?? 0} 分</b>
        </div>
      ))}
    </div>
  );
}

export function GameRules({ icon, name, lines }: { icon: string; name: string; lines: string[] }) {
  return (
    <div className="card">
      <h3>
        {icon} {name} · 玩法
      </h3>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
