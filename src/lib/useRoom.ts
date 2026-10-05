'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { syncClock } from './clock';
import {isSecondGame} from './secondTypes';
import type {
  ClientToServerEvents,
  GameType,
  RoomSettings,
  RoomView,
  ServerToClientEvents,
} from './types';

type IoSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let shared: IoSocket | null = null;
function getSharedSocket(): IoSocket {
  if (!shared) {
    shared = io({ autoConnect: false });
  }
  return shared;
}

export const lsNickname = () => {
  try {
    return localStorage.getItem('ppt-nickname') ?? '';
  } catch {
    return '';
  }
};
export const saveNickname = (n: string) => {
  try {
    localStorage.setItem('ppt-nickname', n);
  } catch {
    /* ignore */
  }
};
const lsPlayerKey = (code: string) => `ppt-player-${code.toUpperCase()}`;
const tokenKey = (code: string) => `ppt-token-${code.toUpperCase()}`;
const readToken = (code: string) => { try { return sessionStorage.getItem(tokenKey(code)) ?? undefined; } catch { return undefined; } };
const saveToken = (code: string, token: string) => { try { sessionStorage.setItem(tokenKey(code), token); } catch {} };
export const lsPlayerId = (code: string) => {
  try {
    return localStorage.getItem(lsPlayerKey(code)) ?? undefined;
  } catch {
    return undefined;
  }
};
export const savePlayerId = (code: string, id: string) => {
  try {
    localStorage.setItem(lsPlayerKey(code), id);
  } catch {
    /* ignore */
  }
};

export interface RoomActions {
  toggleReady: () => void;
  selectGame: (game: GameType) => void;
  updateSettings: (s: Partial<RoomSettings>) => void;
  startGame: () => void;
  kickPlayer: (playerId: string) => void;
  gameAction: (action: unknown) => Promise<string | null>;
  backToLobby: () => void;
  leaveRoom: () => void;
  joinAs: (nickname: string) => void;
  renamePlayer: (nickname: string) => Promise<string|null>;
}

export function useRoom(code: string): {
  view: RoomView | null;
  status: 'need-nickname' | 'connecting' | 'in-room' | 'error';
  error: string | null;
  notice: string | null;
  actions: RoomActions;
} {
  const [view, setView] = useState<RoomView | null>(null);
  const viewRef=useRef<RoomView|null>(null);
  const [status, setStatus] = useState<'need-nickname' | 'connecting' | 'in-room' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const joinedRef = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  const doJoin = useCallback(
    (nickname: string) => {
      const socket = getSharedSocket();
      const doEmit = () => {
        setStatus('connecting');
        setError(null);
        socket.emit(
          'join-room',
          { code: code.toUpperCase(), nickname, sessionToken: readToken(code) },
          (res) => {
            if (!res.ok) {
              setError(res.error ?? '加入房间失败');
              setStatus('error');
              return;
            }
            if (res.playerId) savePlayerId(code, res.playerId);
            if (res.sessionToken) saveToken(code, res.sessionToken);
            saveNickname(nickname);
            joinedRef.current = true;
          },
        );
      };
      if (socket.connected) doEmit();
      else {
        socket.connect();
        socket.once('connect', doEmit);
      }
    },
    [code],
  );

  useEffect(() => {
    const socket = getSharedSocket();
    joinedRef.current = false;
    setView(null);
    setError(null);

    const onState = (v: RoomView) => {
      if(viewRef.current?.code===v.code&&(v.revision??0)<(viewRef.current.revision??0))return;
      viewRef.current=v;
      if (v.code.toUpperCase() !== code.toUpperCase()) return;
      syncClock(v.serverTime);
      setView(v);
      setStatus('in-room');
    };
    const onErr = (p: { message: string }) => {
      showNotice(p.message);
      // 被踢出后回首页状态
      if (p.message.includes('移出')) {
        setStatus('error');
        setError(p.message);
      }
    };
    const onDisconnect = () => {
      if (joinedRef.current) { showNotice('连接断开，正在重连…'); setStatus('connecting'); }
    };
    const onConnect = () => { if (joinedRef.current) doJoin(lsNickname()); };
    const onConnectError = () => { setStatus('error'); setError('无法连接服务器，请刷新重试'); };
    socket.on('room-state', onState);
    socket.on('room-error', onErr);
    socket.on('disconnect', onDisconnect);
    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);

    const nickname = lsNickname();
    if (nickname) doJoin(nickname);
    else setStatus('need-nickname');

    return () => {
      socket.off('room-state', onState);
      socket.off('room-error', onErr);
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      if (joinedRef.current) {
        socket.emit('leave-room');
        joinedRef.current = false;
      }
    };
  }, [code, doJoin, showNotice]);

  const gameAction = useCallback(
    (action: unknown): Promise<string | null> =>
      new Promise((resolve) => {
        const v=viewRef.current,g=v?.game;
        const meta=g&&'matchId' in g?{roomId:v!.code,matchId:g.matchId,roundId:g.roundId,turnId:g.turnId,actionId:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`} : undefined;
        const timer=setTimeout(()=>resolve('连接超时，请检查最新画面'),7000);
        getSharedSocket().emit('game-action', { action,meta }, (res) => {
          clearTimeout(timer);
          if (!res) return resolve(null);
          resolve(res.ok ? null : (res.error ?? '操作失败'));
        });
      }),
    [],
  );

  const startGame = useCallback(() => {
    getSharedSocket().emit('start-game', (res) => {
      if (!res.ok) showNotice(res.error ?? '开始游戏失败');
    });
  }, [showNotice]);

  const actions: RoomActions = {
    toggleReady: () => getSharedSocket().emit('toggle-ready'),
    selectGame: (game) => getSharedSocket().emit('select-game', { game }),
    updateSettings: (s) => getSharedSocket().emit('update-settings', s),
    startGame,
    kickPlayer: (playerId) => getSharedSocket().emit('kick-player', { playerId }),
    gameAction,
    backToLobby: () => getSharedSocket().emit('back-to-lobby'),
    leaveRoom: () => {
      joinedRef.current = false;
      getSharedSocket().emit('leave-room');
    },
    renamePlayer: nickname=>new Promise(resolve=>{
      const timer=setTimeout(()=>resolve('连接超时，请重试'),7000);
      getSharedSocket().emit('rename-player',{nickname},res=>{clearTimeout(timer);if(res.ok){saveNickname(res.nickname??nickname.trim());resolve(null);}else resolve(res.error??'修改失败');});
    }),
    joinAs: (nickname: string) => {
      const n = nickname.trim();
      if (!n) return;
      doJoin(n);
    },
  };

  return { view, status, error, notice, actions };
}

export async function createRoom(nickname: string): Promise<{ code?: string; error?: string }> {
  const socket = getSharedSocket();
  if (!socket.connected) {
    await new Promise<void>((resolve) => {
      socket.connect();
      if (socket.connected) resolve();
      else socket.once('connect', () => resolve());
    });
  }
  return new Promise((resolve) => {
    socket.emit('create-room', { nickname }, (res) => {
      if (!res.ok) return resolve({ error: res.error ?? '创建房间失败' });
      if (res.playerId && res.code) savePlayerId(res.code, res.playerId);
      if (res.sessionToken && res.code) saveToken(res.code, res.sessionToken);
      saveNickname(nickname);
      resolve({ code: res.code });
    });
  });
}
