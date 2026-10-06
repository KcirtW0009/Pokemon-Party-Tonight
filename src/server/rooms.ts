import {setManualPause} from './pause';
import type { Server as IOServer, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  GameType,
  RoomView,
  ServerToClientEvents,
} from '@/lib/types';
import { GAME_META } from '@/lib/types';
import { MATCH_ROUND_OPTIONS, PIXEL_ROUND_OPTIONS, T } from './config';
import { battleView, handleBattleAction, startBattle } from './games/battle';
import { dittoView, handleDittoAction, startDitto, syncDittoConnections } from './games/ditto';
import { TARGET_SCORE_OPTIONS } from '@/lib/constants';
import { targetReached } from './score';
import { handleMatchAction, matchView, startMatch } from './games/match';
import { handlePixelAction, pixelView, startPixel } from './games/pixel';
import {
  activePlayers,
  clearGameTimers,
  type Broadcast,
  type ServerRoom,
} from './state';
import { cleanNickname, roomCode, uid } from './util';
import {isSecondGame,SECOND_DEFAULTS} from '@/lib/secondTypes';
import {batchView,startBatch,handleBatchAction,advanceBatch} from './batch';
import {GENDER_POOL} from './batch/gender';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const rooms = new Map<string, ServerRoom>();

function getRoom(code: unknown): ServerRoom | null {
  if (typeof code !== 'string') return null;
  return rooms.get(code.trim().toUpperCase()) ?? null;
}

function buildView(room: ServerRoom, playerId: string): RoomView {
  let game: RoomView['game'] = null;
  if (room.game) {
    if (room.game.kind === 'match') game = matchView(room, playerId);
    else if (room.game.kind === 'battle') game = battleView(room, playerId);
    else if (room.game.kind === 'pixel') game = pixelView(room, playerId);
    else if (room.game.kind === 'ditto') game = dittoView(room, playerId);
    else game = batchView(room,playerId);
  }
  if(game&&room.manualPausedAt!=null&&('matchId' in game||game.game==='ditto'))game={...game,paused:true,...('matchId' in game?{pauseEndsAt:null}:{})};
  return {
    serverTime: Date.now(),
    manualPausedAt:room.manualPausedAt??null,
    revision: room.revision??0,
    genderPoolSize:GENDER_POOL.length,
    code: room.code,
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      connected: p.connected,
      ready: p.ready,
    })),
    selectedGame: room.selectedGame,
    settings: { ...room.settings },
    status: room.status,
    scores: { ...room.scores },
    game,
    youId: playerId,
  };
}

function socketOf(io: IOServer, socketId: string | null): TypedSocket | null {
  if (!socketId) return null;
  return (io.sockets.sockets.get(socketId) as TypedSocket | undefined) ?? null;
}

export function registerRoomHandlers(io: IOServer): void {
  const broadcast: Broadcast = (room) => {
    room.revision=(room.revision??0)+1;
    for (const p of room.players) {
      const s = socketOf(io, p.socketId);
      if (s && p.connected) s.emit('room-state', buildView(room, p.id));
    }
  };

  const migrateHostIfNeeded = (room: ServerRoom) => {
    const host = room.players.find((p) => p.id === room.hostId);
    if (!host || !host.connected) {
      const next = room.players.find((p) => p.connected) ?? room.players[0];
      if (next) room.hostId = next.id;
    }
  };

  const scheduleDeleteIfEmpty = (room: ServerRoom) => {
    if (room.game?.kind === 'ditto' && room.game.paused) return;
    if (room.players.some((p) => p.connected)) return;
    if (room.deleteTimer) return;
    room.deleteTimer = setTimeout(() => {
      const r = rooms.get(room.code);
      if (r && !r.players.some((p) => p.connected)) {
        clearGameTimers(r);
        rooms.delete(room.code);
      }
    }, T.emptyRoomDeleteMs);
  };

  /** Reconnection requires a private bearer token, never a public player ID. */
  function claimSeat(
    room: ServerRoom,
    socket: TypedSocket,
    nickname: string,
    sessionToken?: string,
  ): { id: string; sessionToken: string } | { error: string } {
    if (room.deleteTimer) {
      clearTimeout(room.deleteTimer);
      room.deleteTimer = null;
    }
    const seat = typeof sessionToken === 'string' ? room.players.find((p) => p.sessionToken === sessionToken) : undefined;
    if (seat) {
      if (seat.connected && seat.socketId !== socket.id) return { error: '该玩家已在另一个窗口连接' };
      if(room.players.some(p=>p.id!==seat.id&&p.nickname===nickname))return {error:`昵称「${nickname}」已被使用，换个名字吧`};
      seat.nickname=nickname;
      seat.connected = true;
      seat.socketId = socket.id;
      return { id: seat.id, sessionToken: seat.sessionToken! };
    }
    const existing = room.players.find(p => p.socketId === socket.id);
    if (existing) {
      if(room.players.some(p=>p.id!==existing.id&&p.nickname===nickname))return {error:`昵称「${nickname}」已被使用，换个名字吧`};
      existing.nickname=nickname;
      return { id: existing.id, sessionToken: existing.sessionToken! };
    }
    if (room.status !== 'LOBBY' && !isSecondGame(room.game?.kind)) return { error: '游戏进行中，请等朋友返回大厅再加入' };
    if (room.players.length >= 8) return { error: '房间已满（8 人）' };
    if (room.players.some((p) => p.nickname === nickname)) {
      return { error: `昵称「${nickname}」已被使用，换个名字吧` };
    }
    const id = uid();
    const token = uid();
    room.players.push({ id, sessionToken: token, nickname, connected: true, ready: false, socketId: socket.id });
    room.scores[id] = 0;
    return { id, sessionToken: token };
  }

  io.on('connection', (raw) => {
    const socket = raw as TypedSocket;
    let code: string | null = null;
    let myId: string | null = null;

    const myRoom = (): ServerRoom | null => {
      if (!code) return null;
      const r = rooms.get(code);
      if (!r) return null;
      return r;
    };

    socket.on('create-room', (payload, ack) => {
      if (typeof ack !== 'function') return;
      if (myRoom()) { ack({ ok: false, error: '请先离开当前房间' }); return; }
      const nickname = cleanNickname(payload?.nickname);
      if (!nickname) {
        ack({ ok: false, error: '请输入昵称' });
        return;
      }
      let c = roomCode();
      while (rooms.has(c)) c = roomCode();
      const id = uid();
      const token = uid();
      rooms.set(c, {
        code: c,
        hostId: id,
        players: [{ id, sessionToken: token, nickname, connected: true, ready: true, socketId: socket.id }],
        selectedGame: 'match',
        settings: { pixelRounds: 10, matchRounds: 8, dittoRounds: 1, targetScore: 0, second:{...SECOND_DEFAULTS} },
        status: 'LOBBY',
        scores: { [id]: 0 },
        game: null,
        deleteTimer: null,
      });
      code = c;
      myId = id;
      ack({ ok: true, code: c, playerId: id, sessionToken: token });
      broadcast(rooms.get(c)!);
    });

    socket.on('join-room', (payload, ack) => {
      if (typeof ack !== 'function') return;
      if (code && code !== String(payload?.code).trim().toUpperCase()) { ack({ ok: false, error: '请先离开当前房间' }); return; }
      const room = getRoom(payload?.code);
      if (!room) {
        ack({ ok: false, error: '房间不存在，请检查房间码' });
        return;
      }
      const nickname = cleanNickname(payload?.nickname);
      if (!nickname) {
        ack({ ok: false, error: '请输入昵称' });
        return;
      }
      const res = claimSeat(room, socket, nickname, payload?.sessionToken);
      if ('error' in res) {
        ack({ ok: false, error: res.error });
        return;
      }
      code = room.code;
      myId = res.id;
      migrateHostIfNeeded(room);
      syncDittoConnections(room, broadcast);advanceBatch(room);
      ack({ ok: true, playerId: res.id, sessionToken: res.sessionToken });
      broadcast(room);
    });

    const leaveSeat = () => {
      const room = myRoom();
      if (!room || !myId) return;
      const me = room.players.find((p) => p.id === myId);
      if (me && me.socketId === socket.id) {
        me.connected = false;
        me.socketId = null;
        me.ready = false;
      }
      migrateHostIfNeeded(room);
      syncDittoConnections(room, broadcast);advanceBatch(room);
      scheduleDeleteIfEmpty(room);
      broadcast(room);
      code = null;
      myId = null;
    };

    socket.on('leave-room', () => leaveSeat());
    socket.on('disconnect', () => leaveSeat());

    socket.on('rename-player',(payload,ack)=>{
      if(typeof ack!=='function')return;
      const room=myRoom(),me=room?.players.find(p=>p.id===myId&&p.connected&&p.socketId===socket.id);
      if(!room||!me){ack({ok:false,error:'请先加入房间'});return;}
      const nickname=cleanNickname(payload?.nickname);
      if(!nickname){ack({ok:false,error:'请输入昵称'});return;}
      if(room.players.some(p=>p.id!==me.id&&p.nickname===nickname)){ack({ok:false,error:`昵称「${nickname}」已被使用，换个名字吧`});return;}
      me.nickname=nickname;ack({ok:true,nickname});broadcast(room);
    });

    socket.on('toggle-ready', () => {
      const room = myRoom();
      if (!room || !myId || room.status !== 'LOBBY') return;
      const me = room.players.find((p) => p.id === myId);
      if (me) {
        me.ready = !me.ready;
        broadcast(room);
      }
    });

    socket.on('select-game', (payload) => {
      const room = myRoom();
      if (!room || !myId || myId !== room.hostId || room.status !== 'LOBBY') return;
      const g = (payload as { game?: unknown })?.game;
      if (g === 'ditto' || g === 'pixel' || g === 'match' || g === 'battle' || isSecondGame(g)) {
        room.selectedGame = g as GameType;
        if(g==='sudowoodo-quoridor'&&activePlayers(room).length===3){room.settings.second??={...SECOND_DEFAULTS};if(room.settings.second.wallRounds%3)room.settings.second.wallRounds=3;}
        broadcast(room);
      }
    });

    socket.on('update-settings', (payload) => {
      const room = myRoom();
      if (!room || !myId || myId !== room.hostId || room.status !== 'LOBBY') return;
      const p = payload as Partial<ServerRoom['settings']>;
      if(p?.second&&typeof p.second==='object'){
        const s=room.settings.second??={...SECOND_DEFAULTS};
        for(const key of ['bombRounds','genderRounds','berryRounds','relayRounds','wallRounds','auctionBoxes','diceMatches','trapRounds','luckRounds'] as const){const n=p.second[key];if(Number.isSafeInteger(n)&&n>0&&(key!=='genderRounds'||n<=GENDER_POOL.length)&&(key!=='berryRounds'||n>=3&&n<=10)&&(key!=='relayRounds'||n>=4&&n<=12)&&(key!=='auctionBoxes'||n<=15)&&(key!=='diceMatches'||n<=20))s[key]=n;}
        if(p.second.rocketMode==='random'||p.second.rocketMode==='sender')s.rocketMode=p.second.rocketMode;
        if([1,2,3].includes(p.second.rocketCycles))s.rocketCycles=p.second.rocketCycles;
        if([0,1,2,3,4].includes(p.second.rocketExcluded))s.rocketExcluded=p.second.rocketExcluded;
        if([6,9,27].includes(p.second.memoryPairs))s.memoryPairs=p.second.memoryPairs;
        if([60,90,120,180].includes(p.second.driveSeconds))s.driveSeconds=p.second.driveSeconds;
      }
      if (typeof p?.pixelRounds === 'number' && PIXEL_ROUND_OPTIONS.includes(p.pixelRounds)) {
        room.settings.pixelRounds = p.pixelRounds;
      }
      if (typeof p?.matchRounds === 'number' && MATCH_ROUND_OPTIONS.includes(p.matchRounds)) {
        room.settings.matchRounds = p.matchRounds;
      }
      if (typeof p?.dittoRounds === 'number' && MATCH_ROUND_OPTIONS.includes(p.dittoRounds)) room.settings.dittoRounds = p.dittoRounds;
      if (typeof p?.targetScore === 'number' && TARGET_SCORE_OPTIONS.includes(p.targetScore)) room.settings.targetScore = p.targetScore;
      broadcast(room);
    });

    socket.on('start-game', (ack) => {
      if (typeof ack !== 'function') return;
      const room = myRoom();
      if (!room || !myId) {
        ack({ ok: false, error: '房间不存在' });
        return;
      }
      if (myId !== room.hostId) {
        ack({ ok: false, error: '只有房主可以开始游戏' });
        return;
      }
      if (room.status !== 'LOBBY') {
        ack({ ok: false, error: '游戏已经开始' });
        return;
      }
      const online = activePlayers(room);
      const meta = GAME_META[room.selectedGame];
      if (online.length < meta.minPlayers || online.length > meta.maxPlayers) {
        ack({ ok: false, error: `「${meta.name}」至少需要 ${meta.minPlayers} 人` });
        return;
      }
      const notReady = online.filter((p) => p.id !== room.hostId && !p.ready);
      if (notReady.length > 0) {
        ack({ ok: false, error: `还有 ${notReady.length} 名玩家未准备` });
        return;
      }
      if(room.selectedGame==='sudowoodo-quoridor'&&online.length===3&&(room.settings.second?.wallRounds??1)%3){ack({ok:false,error:'三人墙棋局数须为 3 的倍数，请调整局数'});return;}
      try {
        if (!room.settings.targetScore || targetReached(room)) room.scores = Object.fromEntries(room.players.map(p => [p.id, 0]));
        if (room.selectedGame === 'match') startMatch(room, broadcast);
        else if (room.selectedGame === 'battle') startBattle(room, broadcast);
        else if (room.selectedGame === 'pixel') startPixel(room, broadcast);
        else if(room.selectedGame==='ditto') startDitto(room, broadcast);
        else startBatch(room,broadcast);
        ack({ ok: true });
      } catch (e) {
        ack({ ok: false, error: isSecondGame(room.selectedGame)&&e instanceof Error?e.message:'开始游戏失败，请重试' });
      }
    });

    socket.on('kick-player', (payload) => {
      const room = myRoom();
      if (!room || !myId || myId !== room.hostId || room.status !== 'LOBBY') return;
      const targetId = (payload as { playerId?: unknown })?.playerId;
      if (typeof targetId !== 'string' || targetId === room.hostId) return;
      const idx = room.players.findIndex((p) => p.id === targetId);
      if (idx < 0) return;
      const [kicked] = room.players.splice(idx, 1);
      delete room.scores[targetId];
      const s = socketOf(io, kicked.socketId);
      if (s) s.emit('room-error', { message: '你被房主移出了房间' });
      migrateHostIfNeeded(room);
      broadcast(room);
    });

    socket.on('game-action', (payload, ack) => {
      const respond = typeof ack === 'function' ? ack : () => {};
      const room = myRoom();
      if (!room || !myId) {
        respond({ ok: false, error: '房间不存在' });
        return;
      }
      if (room.status !== 'PLAYING' && room.status !== 'RESULT') {
        respond({ ok: false, error: '游戏未开始' });
        return;
      }
      if (!room.game) {
        respond({ ok: false, error: '游戏未开始' });
        return;
      }
      const me = room.players.find((p) => p.id === myId);
      if (!me || !me.connected || me.socketId !== socket.id) {
        respond({ ok: false, error: '你已断开连接' });
        return;
      }
      const action = (payload as { action?: unknown })?.action;
      if(action&&typeof action==='object'&&(action as {type?:unknown}).type==='set-paused'){const err=setManualPause(room,myId,(action as {paused?:unknown}).paused);if(!err){if(room.manualPausedAt==null)syncDittoConnections(room,broadcast);broadcast(room);}respond(err?{ok:false,error:err}:{ok:true});return;}
      if(room.manualPausedAt!=null){respond({ok:false,error:'游戏已暂停，等待房主恢复'});return;}
      let err: string | null = '未知游戏';
      try {
        if (room.game.kind === 'match') err = handleMatchAction(room, myId, action, broadcast);
        else if (room.game.kind === 'battle') err = handleBattleAction(room, myId, action, broadcast);
        else if (room.game.kind === 'pixel') err = handlePixelAction(room, myId, action, broadcast);
        else if (room.game.kind === 'ditto') err = handleDittoAction(room, myId, action, broadcast);
        else err=handleBatchAction(room,myId,payload,broadcast);
      } catch {
        err = '操作失败';
      }
      if (err) respond({ ok: false, error: err });
      else respond({ ok: true });
    });

    socket.on('back-to-lobby', () => {
      const room = myRoom();
      if (!room || !myId || myId !== room.hostId) return;
      clearGameTimers(room);
      room.game = null;
      room.manualPausedAt=null;
      room.status = 'LOBBY';
      for (const p of room.players) p.ready = p.id === room.hostId;
      broadcast(room);
    });
  });
}
