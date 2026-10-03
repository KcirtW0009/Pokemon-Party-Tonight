'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createRoom, lsNickname } from '@/lib/useRoom';

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  useEffect(() => setNickname(lsNickname()), []);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const name = nickname.trim();

  const onCreate = async () => {
    if (!name) return setErr('请先输入昵称');
    setBusy(true);
    setErr(null);
    const res = await createRoom(name);
    setBusy(false);
    if (res.error || !res.code) return setErr(res.error ?? '创建房间失败');
    router.push(`/room/${res.code}`);
  };

  const onJoin = () => {
    if (!name) return setErr('请先输入昵称');
    const c = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(c)) return setErr('房间码是 4 位字母/数字');
    try {
      localStorage.setItem('ppt-nickname', name);
    } catch {
      /* ignore */
    }
    router.push(`/room/${c}`);
  };

  return (
    <main className="page" style={{ maxWidth: 520 }}>
      <div className="card center" style={{ marginTop: 24 }}>
        <div className="home-logo">⚡🎉</div>
        <div className="home-title">宝可梦派对</div>
        <div className="home-sub">和朋友一起玩 · 2–8 人 · 手机电脑都能玩</div>
        <div className="mt" style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="pill">🎭 谁是百变怪</span>
          <span className="pill blue">👾 像素猜宝可梦</span>
          <span className="pill green">🤝 默契挑战</span>
          <span className="pill red">⚔️ 宝可梦猜拳</span>
        </div>
      </div>

      <div className="card">
        <h2>👋 你的昵称</h2>
        <input
          className="input"
          placeholder="比如：小智"
          value={nickname}
          maxLength={16}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      <div className="card">
        <h2>🏠 创建房间</h2>
        <p className="muted" style={{ margin: '0 0 10px' }}>创建一个房间，把房间码发给朋友们。</p>
        <button className="btn btn-primary btn-block" disabled={busy || !name} onClick={onCreate}>
          {busy ? '创建中…' : '创建房间'}
        </button>
      </div>

      <div className="card">
        <h2>🚪 加入房间</h2>
        <div className="row">
          <input
            className="input"
            placeholder="房间码（4 位）"
            value={joinCode}
            maxLength={4}
            style={{ textTransform: 'uppercase', letterSpacing: 4, fontWeight: 900 }}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <button className="btn btn-blue" disabled={busy || !name} onClick={onJoin}>
            加入
          </button>
        </div>
      </div>

      {err && (
        <div className="card center" style={{ borderColor: 'var(--red)' }}>
          ⚠️ {err}
        </div>
      )}

      <div className="footer-note">
        V0.1 · 房间数据保存在服务器内存，服务器重启后房间会消失
        <br />
        Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc.（粉丝作品）
      </div>
    </main>
  );
}
