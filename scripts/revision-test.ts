import assert from 'node:assert/strict';
import { startDitto, handleDittoAction, dittoView, syncDittoConnections } from '../src/server/games/ditto';
import { matchCandidates, startMatch, handleMatchAction } from '../src/server/games/match';
import { startPixel } from '../src/server/games/pixel';
import { startBattle } from '../src/server/games/battle';
import { ALL_POKEMON } from '../src/server/pokedex';
import { clueOptions, tier, WEIGHT_BOUNDS, HEIGHT_BOUNDS, STAT_BOUNDS } from '../src/server/clues';
import { clearGameTimers, type ServerRoom, type DittoState, type MatchState } from '../src/server/state';
import { T } from '../src/server/config';
let checks = 0;
function check(v: unknown, label: string) { assert.ok(v, label); checks++; }
const rooms: ServerRoom[] = [];
const noop = () => {};
function fixture(n=5) {
 const ids=Array.from({length:n},(_,i)=>String(i));
 const room:ServerRoom={code:'TEST',hostId:'0',players:ids.map(id=>({id,nickname:id,connected:true,ready:true,socketId:null})),selectedGame:'ditto',settings:{matchRounds:7,pixelRounds:9,dittoRounds:2,targetScore:0},status:'LOBBY',scores:Object.fromEntries(ids.map(id=>[id,0])),game:null,deleteTimer:null};
 rooms.push(room);startDitto(room,noop); const g=room.game as DittoState;g.dittoId=ids[n-1]; return {room,g};
}
function act(room:ServerRoom,id:string,a:unknown){assert.equal(handleDittoAction(room,id,a,noop),null);}
function words(room:ServerRoom){const g=room.game as DittoState; if(g.phase==='confirm') for(const id of g.aliveIds)act(room,id,{type:'confirm'});while(g.phase==='speak')act(room,g.speakOrder[g.speakerIndex],{type:'word',text:'软绵绵'});check(g.phase==='discuss'&&g.endsAt===null,'discussion unlimited');}
function vote(room:ServerRoom,targets:string[]){const g=room.game as DittoState;for(const [i,id] of g.aliveIds.entries())act(room,id,{type:'vote',targetId:targets[i]});}
try {
 for(const p of ALL_POKEMON){const clues=clueOptions(p);check(clues.length>0,`#${p.id} has clues`);check(clues.every(c=>c.matchingCount>=30),`#${p.id} clues hide amongst >=30 species`);}
 for(const [v,expected] of [[9.9,0],[10,1],[25,2],[50,3],[100,4],[200,5]])check(tier(v,WEIGHT_BOUNDS)===expected,'weight boundary');
 check(tier(0.5,HEIGHT_BOUNDS)===1&&tier(3,HEIGHT_BOUNDS)===5,'height boundaries');check(tier(50,STAT_BOUNDS)===1&&tier(110,STAT_BOUNDS)===3,'stat boundaries');
 for(const type of ['flying','water','electric','ice'])for(let i=0;i<10;i++){const pool=matchCandidates({id:1,text:'test',category:'test',requiredType:type});check(pool.length===10&&new Set(pool).size===10&&pool.every(id=>ALL_POKEMON[id-1].types.includes(type)),'filtered unique ten candidates');}
 {
 const {room,g}=fixture();check(dittoView(room,'4').clue!==null&&dittoView(room,'0').clue===null,'private clue');check(dittoView(room,'4').pokemon===null,'secret stays private');
 for(const id of g.aliveIds)act(room,id,{type:'confirm'});
 check(handleDittoAction(room,g.speakOrder[g.speakerIndex],{type:'word',text:'长'.repeat(13)},noop)!==null,'13 chars rejected');
 check(handleDittoAction(room,g.speakOrder[g.speakerIndex],{type:'word',text:''},noop)!==null,'empty word rejected');words(room);
 act(room,'1',{type:'remind'});check(g.reminders.length===1,'public reminder');check(handleDittoAction(room,'1',{type:'remind'},noop)!==null,'repeat reminder rejected');check(handleDittoAction(room,'1',{type:'discussion-done'},noop)!==null,'only host ends discussion');
 act(room,'0',{type:'discussion-done'});act(room,'0',{type:'vote',targetId:'1'});check(dittoView(room,'2').tally===null&&!('votes' in dittoView(room,'2')),'secret incomplete vote');
 for(const id of ['1','2','3','4'])act(room,id,{type:'vote',targetId:id==='1'?'2':'1'});
 check(g.eliminatedIds.includes('1')&&g.aliveIds.length===4&&g.phase==='speak','wrong target eliminated, game continues');check(g.notice?.includes('不是百变怪'),'public non-Ditto notice');check(dittoView(room,'2').dittoId===null,'Ditto still private');
 for(const type of ['word','remind','vote'])check(handleDittoAction(room,'1',{type,text:'可爱',targetId:'4'},noop)!==null,'spectator cannot act');
 words(room);act(room,'0',{type:'discussion-done'});vote(room,['2','3','2','2']);check(g.aliveIds.length===3&&g.eliminatedIds.includes('2'),'second elimination');
 words(room);act(room,'0',{type:'discussion-done'});vote(room,['3','4','3']);check(g.phase==='roundResult'&&room.scores['4']===200,'survives to two wins 200');
 check(dittoView(room,'0').pokemon!==null,'answer revealed after round');act(room,'0',{type:'next-round'});const next=room.game as DittoState;check(next.round===2&&next.aliveIds.length===5&&next.words.length===0&&room.scores['4']===200,'next round resets roles/alive/history, retains scores');
 }
 {
 const {room,g}=fixture(3);words(room);act(room,'0',{type:'discussion-done'});vote(room,['abstain','abstain','0']);check(g.phase==='speak'&&g.cycle===2,'three players two abstentions continue');
 words(room);act(room,'0',{type:'discussion-done'});vote(room,['2','2','abstain']);check(g.phase==='dittoGuess'&&dittoView(room,'2').pokemon===null,'caught Ditto secret during comeback');
 act(room,'2',{type:'ditto-guess',pokemonId:g.pokemonId});check(room.scores['2']===150,'comeback 150');
 }
 {
 const {room,g}=fixture(4);words(room);act(room,'0',{type:'discussion-done'});vote(room,['abstain','abstain','0','0']);check(g.eliminatedIds.includes('0'),'exact half abstain does not prevent elimination');
 words(room);act(room,'0',{type:'discussion-done'});vote(room,['3','3','abstain']);act(room,'3',{type:'ditto-guess',pokemonId:g.pokemonId===1?2:1});check(room.scores['0']===100&&room.scores['1']===100&&room.scores['2']===100,'eliminated trainers get team win points');
 }
 {
 const {room,g}=fixture(4);words(room);act(room,'0',{type:'discussion-done'});vote(room,['1','0','3','2']);check(g.phase==='revote','first tie revotes');vote(room,['1','0','3','2']);check(g.phase==='speak'&&g.cycle===2,'second tie continues words');
 const deadline=g.endsAt!;room.players.forEach(p=>p.connected=false);syncDittoConnections(room,noop);check(g.paused&&g.endsAt===null&&g.timers.length===0,'all survivors offline pause timers');room.players[2].connected=true;syncDittoConnections(room,noop);check(!g.paused&&g.endsAt!==null&&g.endsAt>=deadline,'reconnect restores remaining deadline');
 }
 {
 const {room,g}=fixture(3);room.settings.targetScore=500;room.scores['2']=400;words(room);act(room,'0',{type:'discussion-done'});vote(room,['2','2','abstain']);act(room,'2',{type:'ditto-guess',pokemonId:g.pokemonId});check(g.phase==='final'&&room.scores['2']===550,'target ends Ditto series');
 }
 {
 const {room}=fixture(2);startMatch(room,noop);const g=room.game as MatchState;check(g.totalRounds===7&&g.candidateIds.length===10,'custom match rounds');check(handleMatchAction(room,'0',{pokemonId:ALL_POKEMON.find(p=>!g.candidateIds.includes(p.id))!.id},noop)!==null,'out of pool denied');startPixel(room,noop);check(room.game?.kind==='pixel'&&room.game.totalRounds===9,'custom pixel rounds');startBattle(room,noop);check(room.game?.kind==='battle'&&room.game.totalRounds===5,'battle always five');
 }
 check(T.pixelStageMs*6===90000&&T.battlePickMs===60000&&T.dittoVoteMs===45000,'normal timings 90s/60s/45s');
 console.log(`REVISION PASS: ${checks} checks`);
} finally {rooms.forEach(clearGameTimers);}
