'use client';
import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/clock';

const AVATAR_COLORS = ['#FF5A5F', '#4D96FF', '#5FBF6E', '#9B5DE5', '#FF9F1C', '#00BBF9', '#F15BB5', '#8338EC'];

export function avatarColor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** endsAt 倒计时：数字 + 进度条 */
export function Countdown({ endsAt, totalMs }: { endsAt: number | null; totalMs?: number }) {
  const now = useNow();
  if (!endsAt) return null;
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const frac = totalMs ? Math.max(0, Math.min(1, (endsAt - now) / totalMs)) : 1;
  return (
    <div className={`countdown${left<=10?' countdown-urgent':''}`} role="timer" aria-label={`剩余 ${left} 秒`}>
      <div className="countdown-number"><span className="countdown-caption">剩余时间</span><strong>{left}</strong><span>秒</span></div>
      {totalMs&&<div className="timerbar mt">
        <div style={{ width: `${frac * 100}%` }} />
      </div>}
    </div>
  );
}
