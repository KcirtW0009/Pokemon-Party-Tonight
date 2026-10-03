'use client';
import { useEffect, useRef, useState } from 'react';
import type { PixelView, Pokemon, RoomView } from '@/lib/types';
import { PIXEL_SCORES, PIXEL_STAGES } from '@/lib/types';
import { getPokemon } from '@/lib/pokemon';
import type { RoomActions } from '@/lib/useRoom';
import { PokemonCard } from '../PokemonCard';
import { PokemonSelector } from '../PokemonSelector';
import { FinalRanking, GameRules } from '../Scoreboard';
import { Countdown, useNow } from '../Timer';

const STAGE_LABEL = ['8×8', '12×12', '20×20', '32×32', '64×64', '原图'];

/** Canvas 像素化：小尺寸绘制后关闭平滑放大，还原马赛克效果 */
function PixelImage({ src, stage }: { src: string; stage: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const canvas = ref.current;
    if (!canvas) return;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const S = 240;
      canvas.width = S;
      canvas.height = S;
      ctx.imageSmoothingEnabled = false;
      const small = PIXEL_STAGES[Math.min(stage, PIXEL_STAGES.length - 1)] as number;
      if (!small) {
        ctx.drawImage(img, 0, 0, S, S);
      } else {
        const off = document.createElement('canvas');
        off.width = small;
        off.height = small;
        const octx = off.getContext('2d');
        if (!octx) return;
        // 取正方形中央
        const side = Math.min(img.width, img.height);
        octx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, small, small);
        ctx.drawImage(off, 0, 0, S, S);
      }
      setReady(true);
    };
  }, [src, stage]);

  return (
    <div className="pixel-frame">
      {!ready && <span className="spin">🌀</span>}
      <canvas ref={ref} width={240} height={240} style={{ display: ready ? 'block' : 'none' }} />
    </div>
  );
}

function nameOf(view: RoomView, id: string): string {
  return view.players.find((p) => p.id === id)?.nickname ?? '???';
}

export function PixelGame({ view, game, actions }: { view: RoomView; game: PixelView; actions: RoomActions }) {
  const [err, setErr] = useState<string | null>(null);
  const now = useNow();
  const isHost = view.youId === view.hostId;
  const locked = game.myAttempted;
  useEffect(() => { setErr(null); }, [game.round, game.stage]);

  const guess = async (p: Pokemon) => {
    setErr(null);
    const e = await actions.gameAction({ pokemonId: p.id });
    if (e) setErr(e);
  };

  if (game.phase === 'final') {
    return (
      <div>
        <FinalRanking players={view.players} scores={view.scores} />
        <div className="card center">
          {isHost ? (
            <button className="btn btn-primary btn-block" onClick={actions.backToLobby}>
              🏠 返回大厅
            </button>
          ) : (
            <p className="muted">等待房主返回大厅…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card center">
        <span className="pill">
          第 {game.round} / {game.totalRounds} 轮
        </span>
        {game.phase === 'guess' && (
          <>
            <div className="stage-dots">
              {STAGE_LABEL.map((_, i) => (
                <span key={i} className={i <= game.stage ? 'on' : ''} />
              ))}
            </div>
            <div style={{ fontWeight: 900 }}>
              {STAGE_LABEL[game.stage]} · 猜中得 {PIXEL_SCORES[game.stage]} 分
            </div>
          </>
        )}
      </div>

      {game.phase === 'guess' && game.imageToken && (
        <div className="card">
          <PixelImage src={`/api/pokemon-image?token=${game.imageToken}`} stage={game.stage} />
          <div className="center muted mt">
            已猜中 {game.solvedCount}/{game.playerCount} · 图片越清晰分越少
          </div>
          <div className="muted center">本阶段剩余时间</div>
          <Countdown endsAt={game.endsAt} totalMs={15000} />
          <div className="muted center">本轮剩余 {Math.max(0, Math.ceil(((game.endsAt ?? now) - now + (5 - game.stage) * 15000) / 1000))} 秒 · 每轮最多 90 秒</div>
          <div className="mt">
            {game.mySolved ? (
              <p className="center">
                ✅ 你已猜中，本轮 +{game.myScore} 分，等待其他人…
              </p>
            ) : locked ? (
              <p className="center" style={{ color: 'var(--red)', fontWeight: 800 }}>
                🔒 {game.stage === 5 ? '本轮已没有猜测机会，等待揭晓' : '本档已猜过，图片进入下一档清晰度后可再猜'}
              </p>
            ) : (
              <PokemonSelector onSelect={guess} showImage={false} placeholder="输入宝可梦名字猜答案（无图片提示）" />
            )}
            {err && <p className="center" style={{ color: 'var(--red)' }}>⚠️ {err}</p>}
          </div>
        </div>
      )}

      {game.phase === 'reveal' && game.result && (
        <div className="card center">
          <h2>🎉 答案是…</h2>
          <div style={{ maxWidth: 220, margin: '0 auto' }}>
            <PokemonCard pokemon={game.result.pokemon} />
          </div>
          {game.result.winners.length === 0 && <p className="muted">本轮没人猜中…</p>}
          {game.result.winners.map((w) => (
            <div key={w.playerId} className="rank-row">
              <span style={{ flex: 1 }}>👏 {nameOf(view, w.playerId)}</span>
              <span className="pill">
                {STAGE_LABEL[w.stage]} 猜中
              </span>
              <span className="pill green">+{w.points}</span>
            </div>
          ))}
          <Countdown endsAt={game.revealEndsAt} totalMs={6000} />
        </div>
      )}

      <GameRules
        icon="👾"
        name="像素猜宝可梦"
        lines={['图片从 8×8 马赛克逐渐变清晰，共 6 档', '越早猜中分越高（1000→100）', '每档清晰度只能猜一次，猜错须等下一档；猜中后等待他人']}
      />
    </div>
  );
}
