import {io} from 'socket.io-client';
const code=process.env.QA_ROOM;if(!code)throw Error('Set QA_ROOM');
for(let i=0;i<2;i++){
 const s=io('http://localhost:3100',{transports:['websocket']});let pending=false,loading='';
 s.on('connect',()=>s.emit('join-room',{code,nickname:`界面陪测${i}`},r=>console.log(r.ok?'joined':'join failed')));
 s.on('room-state',v=>{
  const me=v.players.find(p=>p.id===v.youId);if(me?.ready)pending=false;if(v.status==='LOBBY'&&!me?.ready&&!pending){pending=true;s.emit('toggle-ready');}
  const g=v.game;if(g?.game==='gender-difference'&&g.phase==='loading'&&loading!==g.roundId){loading=g.roundId;Promise.all(g.data.images.map(u=>fetch('http://localhost:3100'+u).then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();}))).then(()=>s.emit('game-action',{meta:{roomId:code,matchId:g.matchId,roundId:g.roundId,turnId:g.turnId,actionId:`ready-${loading}-${i}`},action:{type:'assets-ready'}}));}
 });
}
