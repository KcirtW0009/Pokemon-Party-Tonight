'use client';
import { useState } from 'react';
import type { MatchView, Pokemon, RoomView } from '@/lib/types';
import { getPokemon } from '@/lib/pokemon';
import type { RoomActions } from '@/lib/useRoom';
import { PokemonCard } from '../PokemonCard';
import { PokemonSelector } from '../PokemonSelector';
import { FinalRanking, GameRules } from '../Scoreboard';
import { Countdown } from '../Timer';

function nameOf(view: RoomView, id: string): string {
  return view.players.find((p) => p.id === id)?.nickname ?? '???';
}

export function MatchGame({ view, game, actions }: { view: RoomView; game: MatchView; actions: RoomActions }) {
  const [err, setErr] = useState<string | null>(null);
  const isHost = view.youId === view.hostId;

  const submit = async (p: Pokemon) => {
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
        <h2 className="mt">🤝 {game.question?.text}</h2>
        <div className="muted">已提交 {game.submittedCount}/{game.playerCount}</div>
      </div>

      {game.phase === 'pick' && (
        <div className="card">
          <Countdown endsAt={game.endsAt} totalMs={45000} />
          {game.myPick ? (
            <div className="center mt">
              <p>
                ✅ 已提交：
                <b>{getPokemon(game.myPick)?.nameZh}</b>，等待其他玩家…
              </p>
              <span className="spin">🌀</span>
            </div>
          ) : (
            <div className="mt">
              <p className="muted center">从共同的 10 只候选中选择，猜你和朋友最有默契的一只。</p>
              <div className="candidate-grid">
                {game.candidateIds.map(id => {
                  const p = getPokemon(id);
                  return p && <button className="game-opt" key={`${game.round}-${id}`} onClick={() => submit(p)}><img src={p.image} alt="" width={88} height={88} /><div>{p.nameZh}</div></button>;
                })}
              </div>
              {err && <p className="center" style={{ color: 'var(--red)' }}>⚠️ {err}</p>}
            </div>
          )}
        </div>
      )}

      {game.phase === 'countdown' && <div className="card center"><h2>准备揭晓！</h2><Countdown endsAt={game.endsAt} totalMs={3000} /></div>}

      {game.phase === 'reveal' && game.result && (
        <div className="card">
          <h2 className="center">🎉 同时公布！</h2>
          {game.result.groups.map((g) => {
            const p = getPokemon(g.pokemonId);
            if (!p) return null;
            const gain = game.result!.gains[g.playerIds[0]] ?? 0;
            return (
              <div key={g.pokemonId} className="card mt">
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <div style={{ width: 110 }}>
                    <PokemonCard pokemon={p} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 900 }}>{g.playerIds.map((id) => nameOf(view, id)).join('、')}</div>
                    <div className="muted">{g.playerIds.length} 人相同</div>
                    {gain > 0 ? (
                      <span className="pill green">+{gain} 分</span>
                    ) : (
                      <span className="pill gray">+0 分</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <Countdown endsAt={game.revealEndsAt} totalMs={6000} />
        </div>
      )}

      <GameRules
        icon="🤝"
        name="训练家默契挑战"
        lines={['所有人从同一组 10 只候选中秘密选择，有限制的题目按属性过滤', 'N 个人选得相同，每人得 (N-1)×100 分', '一个人独享答案得 0 分；超时从候选中随机提交']}
      />
    </div>
  );
}
