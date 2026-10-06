import assert from 'node:assert/strict';
import {MODULES,handleBatchAction,advanceBatch,batchView} from '../src/server/batch';
import {SECOND_DEFAULTS,type SecondGameType} from '../src/lib/secondTypes';
import {type BatchState,type BatchContext,podium} from '../src/server/batch/core';
import {damage,TYPE_COMBOS,inferTypes} from '../src/server/batch/typeBomb';
import hotspotData from '../data/gender-hotspots.json';
import {GENDER_POOL} from '../src/server/batch/gender';
function targetHit(annotation:(typeof hotspotData)[number],target:(typeof hotspotData)[number]['targets'][number]){for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(target.mask[y][x]==='1'&&annotation.targets.every(t=>t.id===target.id||t.mask[y][x]!=='1'))return {x:(x+.5)/128,y:(y+.5)/128};throw Error('No independently hittable target');}
import {berryRisk} from '../src/server/batch/berries';
import {combine,moveCar,validateMap} from '../src/lib/driving';
import {DRIVE_MAPS} from '../src/server/batch/driveGame';
import {moves,wallError,distanceToGoal,positions} from '../src/lib/quoridor';
import type {ServerRoom} from '../src/server/state';
let count=0;function check(value:unknown,label:string){assert.ok(value,label);count++;}
let seed=123;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const ctx:BatchContext={now:1000,random,online:['a','b','c'],hostId:'a',settings:{...SECOND_DEFAULTS},ms:{turn:120000,wallTurn:120000,feedback:1500,memoryReveal:2000,question:120000,questionReveal:3000,prepare:3000,bombRound:180000,offline:30000,relayMin:20000,relayMax:40000,driveSecond:1000}};
function state(kind:SecondGameType,n=3){const g:BatchState={kind,timers:[],matchId:'match',roundId:'round',turnId:'turn',phase:'',round:1,totalRounds:1,deadline:null,currentPlayerId:null,participants:['a','b','c'].slice(0,n),points:Object.fromEntries(['a','b','c'].slice(0,n).map(id=>[id,0])),ranks:null,gains:null,notice:null,pausedAt:null,onlineIds:[],processed:new Map(),awarded:false,completedRounds:0,data:null};MODULES[kind].create(g,{...ctx,settings:{...ctx.settings,wallRounds:n===3?3:1}});return g;}
for(const answer of TYPE_COMBOS)for(const guess of TYPE_COMBOS){const hit=damage(guess,answer);check([0,1,2].includes(hit),'damage range');const candidates=TYPE_COMBOS.filter(p=>damage(guess,p)===hit);const statuses=inferTypes(candidates,[{playerId:'a',pokemonId:1,types:guess,damage:hit,dead:false}]);for(const t of answer)check(statuses[t]!=='safe','inference never eliminates actual answer');for(const [t,s] of Object.entries(statuses))if(s==='dangerous')check(answer.includes(t),'red type is certain');}
check(berryRisk(12,1,1)===1/13||Math.abs(berryRisk(12,1,1)-1/13)<1e-12,'berry one risk');check(Math.abs(berryRisk(12,1,3)-3/13)<1e-12,'berry three risk');check(berryRisk(0,2,2)===1,'all bombs certain');
const memory=state('starter-memory'),m=memory.data as any;check((MODULES['starter-memory'].snapshot(memory,'a',ctx) as any).cards.every((c:any)=>!('pokemonId' in c)),'hidden card ids absent');const i=m.cards.findIndex((p:any)=>m.cards.filter((q:any)=>q.pokemonId===p.pokemonId).length===2),j=m.cards.findIndex((p:any,k:number)=>k!==i&&p.pokemonId===m.cards[i].pokemonId);MODULES['starter-memory'].action(memory,'a',{type:'flip',index:i},ctx);check((MODULES['starter-memory'].snapshot(memory,'b',ctx) as any).cards[i].pokemonId,'first flip visible to all');MODULES['starter-memory'].action(memory,'a',{type:'flip',index:j},ctx);check(memory.points.a===1,'pair awards raw point');MODULES['starter-memory'].advance(memory,{...ctx,now:3000});check(memory.currentPlayerId==='a','matching rewards another turn');
const berries=state('snorlax-berries');check(MODULES['snorlax-berries'].action(berries,'a',{type:'delivery'},ctx)===null,'delivery valid');check(berries.points.a===-2&&(berries.data as any).plates.filter((p:any)=>p.bomb).length===2,'delivery negative score and extra bomb');check(!!MODULES['snorlax-berries'].action(berries,'a',{type:'delivery'},ctx),'delivery once whole match');MODULES['snorlax-berries'].abort!(berries,ctx);check(berries.points.a===-2,'delivery cost retained after abort');
const relay=state('electrode-relay'),r=relay.data as any,holder=r.holder;check(!('explodeAt' in MODULES['electrode-relay'].snapshot(relay,holder,ctx)),'private explosion deadline');MODULES['electrode-relay'].action(relay,holder,{type:'press',possessionId:r.possessionId},ctx);MODULES['electrode-relay'].action(relay,holder,{type:'release',possessionId:r.possessionId},{...ctx,now:1499});check(r.holder===holder&&relay.points[holder]===0,'499ms no pass');MODULES['electrode-relay'].action(relay,holder,{type:'press',possessionId:r.possessionId},{...ctx,now:2000});const expiry=r.explodeAt;MODULES['electrode-relay'].action(relay,holder,{type:'release',possessionId:r.possessionId},{...ctx,now:4000});check(r.holder!==holder&&relay.points[holder]===1&&r.explodeAt===expiry,'2s pass scores without timer reset');MODULES['electrode-relay'].advance(relay,{...ctx,now:expiry,online:[]});check(relay.points[r.holder]===-3,'offline holder still explodes');
const pawn={id:'a',x:4,y:4,goal:'top' as const};check(moves(pawn,[pawn,{id:'b',x:4,y:3,goal:'bottom'}],[]).some(p=>p.x===4&&p.y===2),'straight jump');check(!moves(pawn,[pawn,{id:'b',x:4,y:3,goal:'bottom'},{id:'c',x:4,y:2,goal:'right'}],[]).some(p=>p.y===3&&(p.x===3||p.x===5)),'occupied behind blocks jump without diagonal');check(moves(pawn,[pawn,{id:'b',x:4,y:3,goal:'bottom'}],[{x:4,y:2,orientation:'H'}]).some(p=>p.x===5&&p.y===3),'blocked behind permits diagonal');check(!!wallError({x:1,y:1,orientation:'V'},[{x:1,y:1,orientation:'H'}],[pawn]),'crossing rejected');check(!!wallError({x:2,y:1,orientation:'H'},[{x:1,y:1,orientation:'H'}],[pawn]),'overlap rejected');check(!wallError({x:3,y:1,orientation:'H'},[{x:1,y:1,orientation:'H'}],[pawn]),'adjacent walls allowed');check(distanceToGoal(pawn,'top',[])===4,'BFS shortest route');check(new Set([1,2,3].map(round=>positions(['a','b','c'],round).find(p=>p.id==='a')!.goal)).size===3,'three-player rotation');
const wall=state('sudowoodo-quoridor',2);const wallFirst=wall.currentPlayerId!;MODULES['sudowoodo-quoridor'].advance(wall,{...ctx,now:wall.deadline!});check((wall.data as any).timeouts[wallFirst]===1,'wall timeout auto move');MODULES['sudowoodo-quoridor'].advance(wall,{...ctx,now:wall.deadline!});MODULES['sudowoodo-quoridor'].advance(wall,{...ctx,now:wall.deadline!});check((wall.data as any).pawns.some((p:any)=>p.id===wallFirst)&&(wall.data as any).timeouts[wallFirst]===2,'second timeout moves without forfeiting');
const v=combine(['up','up','right'],70);check(Math.abs(v.x/v.y+.5)<1e-12&&Math.abs(Math.hypot(v.x,v.y)-70)<1e-12,'vector angle and fixed speed');check(combine(['up','down'],70).x===0&&combine(['up','down'],70).y===0,'opposites stop');for(const map of DRIVE_MAPS)check(validateMap(map),'map reachable');const thin={...DRIVE_MAPS[0],walls:[{x:65,y:0,width:2,height:400}]};check(moveCar({x:50,y:200},{x:1000,y:0},1,thin).x<=55,'thin wall cannot tunnel, catchup capped');
const drive=state('drive-revavroom'),d=drive.data as any;for(const mapping of Object.values(d.maps))check(new Set(Object.values(mapping as object)).size===4,'mapping permutation');check(!('maps' in MODULES['drive-revavroom'].snapshot(drive,'a',ctx)),'mapping remains server only');check(MODULES['drive-revavroom'].action(drive,'a',{type:'input',key:'up',inputSeq:2},ctx)===null,'new input accepted');check(!!MODULES['drive-revavroom'].action(drive,'a',{type:'input',key:'down',inputSeq:1},ctx),'out of order input rejected');MODULES['drive-revavroom'].connections!(drive,{...ctx,online:['b','c']});check(d.inputs.a===null,'disconnect clears driving input');
const gender=state('gender-difference'),gd=gender.data as any,gv=MODULES['gender-difference'].snapshot(gender,'a',ctx) as any;check(!('regions' in gv)&&!('masks' in gv)&&gv.images.length===2&&gv.images.every((u:string)=>u.startsWith('/api/batch-image?token=')),'hotspots hidden and only two opaque images sent');for(const id of ctx.online)MODULES['gender-difference'].action(gender,id,{type:'assets-ready'},ctx);check(gender.phase==='question','assets ready begins timed question');gd.pair=0;const annotation=hotspotData[gd.pair],hit=targetHit(annotation,annotation.targets[0]);MODULES['gender-difference'].action(gender,'a',{type:'spot',side:0,x:0,y:0},ctx);check(!!MODULES['gender-difference'].action(gender,'a',{type:'spot',side:0,...hit},{...ctx,now:2999}),'wrong answer cooldown');MODULES['gender-difference'].action(gender,'a',{type:'spot',side:0,...hit},{...ctx,now:4000});check(gender.points.a===78,'120-second score minus error penalty');const room:ServerRoom={code:'TEST',hostId:'a',players:['a','b','c'].map(id=>({id,nickname:id,connected:true,ready:true,socketId:null})),selectedGame:'starter-memory',settings:{pixelRounds:1,matchRounds:1,dittoRounds:1,targetScore:0,second:SECOND_DEFAULTS},status:'PLAYING',scores:{a:0,b:0,c:0},game:state('starter-memory'),deleteTimer:null};const g=room.game as BatchState;g.deadline=Date.now()+20000;const payload={meta:{roomId:'TEST',matchId:g.matchId,roundId:g.roundId,turnId:g.turnId,actionId:'unique'},action:{type:'flip',index:0}};check(handleBatchAction(room,'a',payload,()=>{})===null,'envelope accepted');check(handleBatchAction(room,'a',payload,()=>{})===null&&(g.data as any).open.length===1,'duplicate idempotent');check(!!handleBatchAction(room,'a',{...payload,action:{type:'flip',index:1}},()=>{}),'same action id different payload rejected');check(!!handleBatchAction(room,'a',{...payload,meta:{...payload.meta,turnId:'stale',actionId:'other'}},()=>{}),'stale turn rejected');check(!!handleBatchAction(room,'spectator',{...payload,meta:{...payload.meta,actionId:'spectate'}},()=>{}),'spectator cannot play');
room.game=state('type-bomb');const bomb=room.game as BatchState;room.players[1].connected=false;room.players[2].connected=false;advanceBatch(room,1000);check(bomb.pausedAt===1000,'low online count pauses');room.players[1].connected=true;advanceBatch(room,5000);check(bomb.pausedAt===null&&bomb.deadline===125000,'resume shifts deadline');room.players[1].connected=false;advanceBatch(room,6000);advanceBatch(room,36000);check(bomb.phase==='final'&&room.status==='RESULT'&&Object.values(room.scores).every(n=>n===0),'abort empty match no awards');
check(podium({a:4,b:4,c:2}).ranks.c===3&&podium({a:4,b:4,c:2}).gains.c===25,'competition tie ranks');
room.players.forEach(p=>p.connected=true);room.status='PLAYING';room.game=state('starter-memory');const late=room.game as BatchState;late.deadline=Date.now()-1;const deadlinePacket={meta:{roomId:'TEST',matchId:late.matchId,roundId:late.roundId,turnId:late.turnId,actionId:'deadline-race'},action:{type:'flip',index:0}};check(!!handleBatchAction(room,'a',deadlinePacket,()=>{})&&(late.data as any).open.length===0&&late.currentPlayerId==='b','expired action advances deadline before accepting a flip');
function simulation(frame:number){seed=99;const g=state('drive-revavroom');const d=g.data as any;MODULES['drive-revavroom'].advance(g,{...ctx,now:g.deadline!});const started=d.startedAt;for(const id of g.participants){d.inputs[id]='right';d.maps[id]={up:'up',down:'down',left:'left',right:'right'};}for(let elapsed=frame;elapsed<=2000;elapsed+=frame)MODULES['drive-revavroom'].advance(g,{...ctx,now:started+elapsed});return d.position;}
assert.deepEqual(simulation(20),simulation(50));count++;check(simulation(50).x>150,'different render frame rates produce identical fixed-step movement');
room.game=state('type-bomb');const scored=room.game as BatchState;scored.phase='final';scored.completedRounds=1;scored.points={a:4,b:3,c:2};room.scores={a:0,b:0,c:0};advanceBatch(room);advanceBatch(room);check(room.scores.a===100&&room.scores.b===50&&room.scores.c===25,'final podium awarded only once');


// Every retained pair has independently hittable differences on either picture.
check(GENDER_POOL.length===82&&!GENDER_POOL.some(p=>[46,98].includes(p.pairIndex)),'invisible Torchic and broad Pyroar removed from playable pool');
for(const annotation of hotspotData.filter(a=>a.eligible))for(const side of [0,1] as const){
 const g=state('gender-difference'),d=g.data as any;d.pair=annotation.pairIndex;
 for(const id of ctx.online)MODULES[g.kind].action(g,id,{type:'assets-ready'},ctx);
 check(!!MODULES[g.kind].action(g,'a',{type:'spot',side,x:-1,y:NaN},ctx),'invalid coordinates rejected');
 for(const [i,target] of annotation.targets.entries()){
  const hit=targetHit(annotation,target);
  check(MODULES[g.kind].action(g,'a',{type:'spot',side,...hit},ctx)===null,'visible independent difference accepted');
  const own=MODULES[g.kind].snapshot(g,'a',ctx) as any;
  check(own.foundCount===i+1&&own.solved===(i+1===annotation.targets.length),'each target increments once; all targets required');
  check(own.foundTargets.length===i+1&&!('targets' in own)&&!JSON.stringify(own).includes('"mask"'),'unfound targets and masks remain private');
  check((MODULES[g.kind].snapshot(g,'b',ctx) as any).foundCount===0,'other player progress stays private');
  if(!own.solved){
   check(!!MODULES[g.kind].action(g,'a',{type:'spot',side:1-side,...hit},ctx),'same difference on opposite picture rejected');
   check(d.boards.a.found.length===i+1&&d.boards.a.errors===0&&g.points.a===0,'repeat cannot farm progress or incur error penalty');
  }
 }
 check(g.points.a===100,'complete puzzle scores once');
 MODULES[g.kind].advance(g,{...ctx,now:g.deadline!});
 const reveal=MODULES[g.kind].snapshot(g,'a',ctx) as any;
 check(reveal.targets.length===annotation.targets.length&&!JSON.stringify(reveal).includes('"mask"'),'reveal contains every precise outline but no hit mask');
}
const partial=state('gender-difference'),pd=partial.data as any;pd.pair=1;
for(const id of ctx.online)MODULES[partial.kind].action(partial,id,{type:'assets-ready'},ctx);
MODULES[partial.kind].action(partial,'a',{type:'spot',side:0,...targetHit(hotspotData[1],hotspotData[1].targets[0])},ctx);
MODULES[partial.kind].advance(partial,{...ctx,now:partial.deadline!});
check(partial.points.a===0&&!(MODULES[partial.kind].snapshot(partial,'a',ctx) as any).solved,'partial puzzle timeout gives zero points');
const precise=state('gender-difference'),preciseData=precise.data as any;preciseData.pair=5;
for(const id of ctx.online)MODULES[precise.kind].action(precise,id,{type:'assets-ready'},ctx);
MODULES[precise.kind].action(precise,'a',{type:'spot',side:0,x:.48,y:.55},ctx);
check(preciseData.boards.a.errors===1&&preciseData.boards.a.found.length===0,'Pikachu body outside actual tail-tip difference is rejected');
const timedBomb=state('type-bomb'),timedBombData=timedBomb.data as any;
MODULES[timedBomb.kind].advance(timedBomb,{...ctx,now:timedBomb.deadline!});
check(timedBombData.hearts.a===0&&timedBomb.phase==='roundResult','120-second bomb timeout removes both hearts');
const fixedBerries=state('snorlax-berries'),plateData=fixedBerries.data as any;
check(plateData.plates.length===12&&plateData.plates.filter((p:any)=>p.bomb).length===1,'12 fixed positions contain exactly one starting bomb');
plateData.plates.forEach((p:any,i:number)=>p.bomb=i===0);
MODULES[fixedBerries.kind].advance(fixedBerries,{...ctx,now:fixedBerries.deadline!});
check(fixedBerries.points.a===-2&&plateData.last.automatic&&plateData.last.indices[0]===0,'timeout genuinely picks first fruit and can explode');
check(fixedBerries.completedRounds===1&&fixedBerries.phase==='roundResult','automatic explosion settles current round');
const continued=state('starter-memory'),continuedData=continued.data as any;
const first=0,second=continuedData.cards.findIndex((p:any,i:number)=>i!==first&&p.pokemonId===continuedData.cards[first].pokemonId);
MODULES[continued.kind].action(continued,'a',{type:'flip',index:first},ctx);MODULES[continued.kind].action(continued,'a',{type:'flip',index:second},ctx);
MODULES[continued.kind].advance(continued,{...ctx,now:continued.deadline!});
check(continued.currentPlayerId==='a','successful pair grants continuation');
MODULES[continued.kind].advance(continued,{...ctx,now:continued.deadline!});
check(continued.currentPlayerId==='b','timeout after successful pair still passes to next player');


console.log(`BATCH PASS: ${count} checks`);
// Every seat can open a match; subsequent rounds rotate from that random seat.
for(const n of [2,3,4])for(let seat=0;seat<n;seat++){
 const g=state('sudowoodo-quoridor',2);g.participants=['a','b','c','d'].slice(0,n);g.round=1;
 const c={...ctx,random:()=> (seat+.5)/n,settings:{...ctx.settings,wallRounds:n===3?3:n}};
 MODULES['sudowoodo-quoridor'].create(g,c);
 check(g.currentPlayerId===g.participants[seat],'random wall opener can be any seat');
 for(let round=2;round<=n;round++){g.phase='roundResult';g.deadline=c.now;MODULES['sudowoodo-quoridor'].advance(g,c);check(g.currentPlayerId===g.participants[(seat+round-1)%n],'wall opener rotates without rerolling');}
}
console.log('WALL OPENERS PASS: every seat and round rotation for 2/3/4 players');
