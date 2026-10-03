'use client';
import type { BattleStat, Pokemon } from '@/lib/types';
import { BATTLE_STATS } from '@/lib/types';

const STAT_LABEL: Record<BattleStat, string> = Object.fromEntries(
  BATTLE_STATS.map((s) => [s.key, s.label]),
) as Record<BattleStat, string>;

interface Props {
  pokemon: Pokemon;
  showStats?: boolean | BattleStat[];
  highlightStat?: BattleStat | null;
  onClick?: () => void;
  picked?: boolean;
  used?: boolean;
  value?: number | null;
  sub?: string | null;
}

export function PokemonCard({ pokemon: p, showStats, highlightStat, onClick, picked, used, value, sub }: Props) {
  const stats: BattleStat[] =
    showStats === true
      ? ['hp', 'attack', 'defense', 'speed']
      : Array.isArray(showStats)
        ? showStats
        : [];
  return (
    <div
      className={`pkm${onClick ? ' clickable' : ''}${picked ? ' picked' : ''}${used ? ' used' : ''}`}
      onClick={used ? undefined : onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !used ? 0 : undefined}
      aria-disabled={used || undefined}
      aria-pressed={onClick ? !!picked : undefined}
      onKeyDown={e => { if (onClick && !used && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
    >
      <img src={p.image} alt={p.nameZh} loading="lazy" />
      <div className="nm">
        {p.nameZh} <span className="en">#{p.id}</span>
      </div>
      {sub && <div className="en">{sub}</div>}
      {value !== undefined && value !== null && (
        <div style={{ fontWeight: 900, fontSize: 18 }}>⚡ {value}</div>
      )}
      {stats.length > 0 && (
        <div className="stats">
          {stats.map((k) => (
            <span key={k} style={k === highlightStat ? { color: 'var(--red)', fontWeight: 900 } : undefined}>
              {STAT_LABEL[k]}
              <b>{Math.round(p[k] * 10) / 10}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
