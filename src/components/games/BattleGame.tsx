'use client';
import { useState } from 'react';
import type { BattleView, RoomView } from '@/lib/types';
import { getPokemon } from '@/lib/pokemon';
import type { RoomActions } from '@/lib/useRoom';
import { PokemonCard } from '../PokemonCard';
import { FinalRanking, GameRules } from '../Scoreboard';
import { Countdown } from '../Timer';

function nameOf(view: RoomView, id: string): string {
  return view.players.find((p) => p.id === id)?.nickname ?? '???';
}

export function BattleGame({ view, game, actions }: { view: RoomView; game: BattleView; actions: RoomActions }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const isHost = view.youId === view.hostId;

  const play = async () => {
    if (!selected) return;
    setErr(null);
    const e = await actions.gameAction({ pokemonId: selected });
    if (e) setErr(e);
    else setSelected(null);
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
        <h2 className="mt">⚔️ 本轮比：{game.statLabel}</h2>
        <div className="muted">已出牌 {game.submittedCount}/{game.playerCount} · 一牌只能用一次</div>
      </div>

      {game.phase === 'pick' && (
        <div className="card battle-hand-card">
          <Countdown endsAt={game.endsAt} totalMs={60000} />
          {game.myPick ? (
            <div className="center mt">
              <p>
                ✅ 已出 <b>{getPokemon(game.myPick)?.nameZh}</b>，等待其他玩家…
              </p>
              <span className="spin">🌀</span>
            </div>
          ) : (
            <>
              <h3 className="mt">👆 点选手牌，再按出牌</h3>
              <div className="hand-grid">
                {game.myHand.map((id) => {
                  const p = getPokemon(id);
                  if (!p) return null;
                  return (
                    <PokemonCard
                      key={id}
                      pokemon={p}
                      picked={selected === id}
                      onClick={() => setSelected(id)}
                      showStats={['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed', 'height', 'weight']}
                      value={game.stat ? p[game.stat] : null}
                      sub={game.stat ? `${statShort(game.stat)}` : undefined}
                    />
                  );
                })}
              </div>
              {game.myUsed.length > 0 && <details className="mt"><summary>已使用的手牌（{game.myUsed.length}）</summary><div className="hand-grid mt">{game.myUsed.map(id => { const p = getPokemon(id); return p ? <PokemonCard key={id} pokemon={p} used sub="已使用" /> : null; })}</div></details>}
              <button className="btn btn-danger btn-block mt battle-play" disabled={!selected || !game.myHand.includes(selected)} onClick={play}>
                ⚔️ 出牌{selected ? `：${getPokemon(selected)?.nameZh}` : ''}
              </button>
              {err && <p className="center" style={{ color: 'var(--red)' }}>⚠️ {err}</p>}
            </>
          )}
        </div>
      )}

      {game.phase === 'countdown' && <div className="card center"><h2>准备揭晓！</h2><Countdown endsAt={game.endsAt} totalMs={3000} /></div>}

      {game.phase === 'reveal' && game.result && (
        <div className="card">
          <h2 className="center">🎉 同时揭晓！</h2>
          <div className="hand-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))' }}>
            {Object.entries(game.result.plays).sort(([a], [b]) => game.result!.ranks[a] - game.result!.ranks[b]).map(([pid, pokeId]) => {
              const p = getPokemon(pokeId);
              if (!p) return null;
              const win = game.result!.winners.includes(pid);
              return (
                <div key={pid}>
                  <PokemonCard
                    pokemon={p}
                    picked={win}
                    value={game.result!.values[pid]}
                    sub={nameOf(view, pid)}
                  />
                  <div className="center">{win ? '👑 ' : ''}第 {game.result!.ranks[pid]} 名 · +{game.result!.gains[pid] ?? 0} 分</div>
                </div>
              );
            })}
          </div>
          <Countdown endsAt={game.revealEndsAt} totalMs={6000} />
        </div>
      )}

      <GameRules
        icon="⚔️"
        name="宝可梦猜拳"
        lines={['每人 5 只随机手牌，共 5 轮，至少两轮比最高、两轮比最低', '每轮按随机属性和高低方向排名，一牌只能用一次', '第 1 / 2 / 3 名分别 +100 / 50 / 25 分，其余 0 分', '同数值并列同名次、同分，并列占用后续名次（如 1、1、3）']}
      />
    </div>
  );
}

function statShort(stat: string): string {
  const map: Record<string, string> = {
    hp: 'HP',
    attack: '攻',
    defense: '防',
    spAttack: '特攻',
    spDefense: '特防',
    speed: '速',
    height: '高',
    weight: '重',
  };
  return map[stat] ?? stat;
}
