import assert from 'node:assert/strict';
import {DITTO_PAIRS,pairKey,matchesDittoWord} from '../src/server/dittoPairs';
import {getPokemon} from '../src/server/pokedex';
import {startDitto,dittoView,handleDittoAction} from '../src/server/games/ditto';
import {clearGameTimers,type ServerRoom,type DittoState} from '../src/server/state';
let checks=0;const check=(v:unknown,l:string)=>{assert.ok(v,l);checks++;};
check(DITTO_PAIRS.length===2161,'all worksheet pairs imported');check(new Set(DITTO_PAIRS.map(pairKey)).size===2161,'unique unordered word pairs');
for(const pair of DITTO_PAIRS){check(pair[0].name!==pair[1].name,'two distinct labels');check(!matchesDittoWord(pair[0].name,pair[1])&&!matchesDittoWord(pair[1].name,pair[0]),'counterpart word cannot win comeback');for(const w of pair){check(!!getPokemon(w.pokemonId),'existing species reference');check(matchesDittoWord(w.name,w),'exact label accepted');if(w.name.includes('（')){check(!matchesDittoWord(getPokemon(w.pokemonId)!.nameZh,w),'form requires full name');check(matchesDittoWord(w.name.replace('（','(').replace('）',')'),w),'parentheses normalization');}}}
function make(mode:'blank'|'paired'='paired',count=4):ServerRoom{return {code:'WORD',hostId:'a',players:Array.from({length:count},(_,i)=>({id:String.fromCharCode(97+i),nickname:'玩家'+i,connected:true,ready:true,socketId:null})),selectedGame:'ditto',settings:{dittoMode:mode,dittoRounds:20,pixelRounds:1,matchRounds:1,targetScore:0},status:'LOBBY',scores:{},game:null,deleteTimer:null};}
const r=make(),broadcast=()=>{},act=(id:string,a:unknown)=>handleDittoAction(r,id,a,broadcast);
for(let round=1;round<=20;round++){
 startDitto(r,broadcast);const g=r.game as DittoState;check(g.mode==='paired'&&g.round===round&&g.usedPairKeys?.length===round,'nonrepeating paired rounds');
 const hidden=dittoView(r,g.dittoId);check(hidden.myWord===g.undercoverWord!.name&&!hidden.amDitto&&hidden.pokemon===null&&hidden.clue===null,'undercover sees word without role/answer');
 for(const id of g.participantIds){const v=dittoView(r,id);check(v.myWord===(id===g.dittoId?g.undercoverWord!.name:g.trainerWord!.name)&&!v.revealedWords&&!v.dittoId&&!v.amDitto,'private word only');check(act(id,{type:'confirm'})===null,'confirm');}
 const observer=dittoView(r,'observer');check(observer.myWord===null&&observer.pokemon===null&&!observer.amDitto&&!observer.revealedWords,'observer no word or role');
 for(const id of [...g.speakOrder])check(act(id,{type:'word',text:'小伙伴'})===null,'word');check(g.phase==='discuss','discuss');check(act('a',{type:'discussion-done'})===null,'host vote');
 for(const id of g.aliveIds)check(act(id,{type:'vote',targetId:id===g.dittoId?'abstain':g.dittoId})===null,'vote');
 check(g.phase==='dittoGuess'&&dittoView(r,g.dittoId).amDitto&&!dittoView(r,g.dittoId).revealedWords,'caught role exposed but opponent word hidden');
 check(!!act(g.dittoId,{type:'ditto-guess',pokemonId:g.pokemonId}),'species id cannot bypass full-word guess');
 check(act(g.dittoId,{type:'ditto-guess',word:round%2?g.trainerWord!.name:g.undercoverWord!.name})===null,'guess resolves');
 const ended=dittoView(r,'observer');check(ended.revealedWords?.trainers===g.trainerWord!.name&&ended.revealedWords?.ditto===g.undercoverWord!.name&&ended.dittoId===g.dittoId,'reveal both words and role');check(g.gains?.[g.dittoId]===(round%2?150:0),'comeback unchanged');
}
clearGameTimers(r);
const blank=make('blank');startDitto(blank,broadcast);const bg=blank.game as DittoState;check(dittoView(blank,bg.dittoId).amDitto&&!!dittoView(blank,bg.dittoId).clue&&dittoView(blank,bg.dittoId).pokemon===null,'blank mode unchanged');check(!dittoView(blank,'a').myWord&&!dittoView(blank,'a').revealedWords,'no paired data in blank');clearGameTimers(blank);
console.log(`DITTO PAIRED PASS: ${checks} checks`);

