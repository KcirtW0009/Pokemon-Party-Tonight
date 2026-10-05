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
    <main className="page home-page">
      <header className="home-nav"><div className="brand-lockup"><span className="brand-ball" aria-hidden="true"/>PARTY TONIGHT</div><span className="muted">宝可梦同好们的游戏桌</span></header>
      <div className="home-layout">
        <section className="home-hero">
          <p className="home-eyebrow">POKÉMON PARTY TONIGHT</p>
          <h1 className="home-title">今晚，一起玩。</h1>
          <p className="home-sub">叫上朋友，开一桌宝可梦派对。猜谜、默契、心机与一点运气，手机电脑都能加入。</p>
          <div className="home-facts"><div><b>16</b><span>款桌上小游戏</span></div><div><b>2–8</b><span>人一起玩</span></div><div><b>4 位</b><span>房间码即刻加入</span></div></div>

        </section>
        <section className="home-entry" aria-label="创建或加入房间">
          <div className="card">
            <div className="home-name"><h2><label htmlFor="nickname">先认识一下，你怎么称呼？</label></h2><input id="nickname" className="input" placeholder="比如：小智" value={nickname} maxLength={16} onChange={e=>setNickname(e.target.value)}/></div>
            <h2>开一桌新派对</h2><p className="muted">创建房间，把房间码发给朋友。</p><button className="btn btn-primary btn-block" disabled={busy||!name} onClick={onCreate}>{busy?'创建中…':'创建房间'}</button>
            <hr className="home-divider"/>
            <h2>朋友已经在等你？</h2><div className="row"><input className="input" aria-label="房间码" placeholder="4 位房间码" value={joinCode} maxLength={4} style={{textTransform:'uppercase',letterSpacing:4}} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==='Enter')onJoin();}}/><button className="btn btn-blue" disabled={busy||!name} onClick={onJoin}>加入</button></div>
          </div>
        </section>
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
