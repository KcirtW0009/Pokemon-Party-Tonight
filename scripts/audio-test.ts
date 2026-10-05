import assert from 'node:assert/strict';
import type {RoomView} from '../src/lib/types';
import {gameSound} from '../src/lib/gameSounds';
import {startMusic,pauseMusic,setMusicVolume} from '../src/lib/partyMusic';
import {setAudioEnabled,setEffectsVolume,playPartySound,audioEnabled,type PartySound} from '../src/lib/partyAudio';
let checks=0;const check=(v:unknown,label:string)=>{assert.ok(v,label);checks++;};
const view=(game:any)=>({code:'TEST',youId:'a',scores:{a:0},serverTime:0,hostId:'a',players:[],selectedGame:'match',settings:{pixelRounds:1,matchRounds:1,dittoRounds:1,targetScore:0},status:'PLAYING',game}) as RoomView;
const original={game:'pixel',round:1,phase:'guess',mySolved:false,myAttempted:false,stage:0};
check(gameSound(null,view(original))===null,'joining does not replay sounds');
check(gameSound(view(original),view({...original}))===null,'duplicate snapshot stays silent');
check(gameSound(view(original),view({...original,myAttempted:true}))==='wrong','pixel wrong guess');
check(gameSound(view(original),view({...original,myAttempted:true,mySolved:true}))==='correct','pixel success overrides attempt');
check(gameSound(view(original),view({...original,stage:1}))==='reveal','pixel new clarity cue');
for(const kind of ['match','battle']){const g={game:kind,round:1,phase:'pick',myPick:null};check(gameSound(view(g),view({...g,myPick:25}))==='submit','own selection acknowledged');check(gameSound(view(g),view({...g,phase:'reveal',result:{gains:{a:100}}}))==='correct','matched/winning reveal');}
const ditto={game:'ditto',round:1,phase:'vote',words:[],iVoted:false};check(gameSound(view(ditto),view({...ditto,iVoted:true}))==='vote','own vote cue');
function batch(kind:string,a:object,b:object,expected:PartySound){const g={game:kind,round:1,phase:'turn',currentPlayerId:'a',data:a};check(gameSound(view(g),view({...g,data:b}))===expected,kind+' cue');check(gameSound(view({...g,data:b}),view({...g,data:b}))===null,kind+' no duplicate cue');}
batch('gender-difference',{foundCount:0,errors:0},{foundCount:1,errors:0},'correct');
batch('gender-difference',{foundCount:0,errors:0},{foundCount:0,errors:1},'wrong');
batch('type-bomb',{history:[]},{history:[{damage:1}]},'damage');
batch('starter-memory',{cards:[{status:'open'}]},{cards:[{status:'matched'}]},'pair');
batch('sudowoodo-quoridor',{walls:[],pawns:[]},{walls:[{}],pawns:[]},'wall');
batch('drive-revavroom',{results:[],inputs:{a:null}},{results:[],inputs:{a:'up'}},'select');
batch('rocket-secret',{myGuess:null,clues:[]},{myGuess:[25],clues:[]},'submit');
batch('pokemon-auction',{myInventory:[],myUsedThisRound:false,myBid:null},{myInventory:[],myUsedThisRound:false,myBid:12},'bid');
batch('pokemon-liars-dice',{history:[],hand:1},{history:[{}],hand:1},'draw');
batch('surround-meloetta',{last:null},{last:{outcome:'capture',placed:{q:1,r:0}}},'correct');
batch('pokemon-push-your-luck',{history:[],players:{a:{status:'active'}}},{history:[{}],players:{a:{status:'bust'}}},'wrong');
for(const kind of ['snorlax-berries','electrode-relay']){const g={game:kind,round:1,phase:'turn',data:{}};check(gameSound(view(g),view({...g}))===null,'existing explosive hooks do not duplicate');}
const hidden={game:'rocket-secret',round:1,phase:'turn',data:{myGuess:null,clues:[],answer:[1]}};
check(gameSound(view(hidden),view({...hidden,data:{...hidden.data,answer:[25]}}))===null,'answer changes do not create a covert sound cue');
const storage=new Map<string,string>();(globalThis as any).localStorage={getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,v:string)=>storage.set(key,v)};(globalThis as any).window={dispatchEvent:()=>{}};
let oscillators=0;const contexts:any[]=[];const parameter=()=>({value:0,setValueAtTime:()=>{},linearRampToValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{},setTargetAtTime:()=>{},cancelScheduledValues:()=>{}});
class FakeContext {state='suspended';currentTime=0;sampleRate=8000;destination={};constructor(){contexts.push(this);}async resume(){this.state='running';}async suspend(){this.state='suspended';}createGain(){return {gain:parameter(),connect:(target:any)=>target,disconnect:()=>{}};}createBiquadFilter(){return {frequency:parameter(),connect:(target:any)=>target,disconnect:()=>{}};}createOscillator(){oscillators++;return {frequency:parameter(),connect:(target:any)=>target,start:()=>{},stop:()=>{},disconnect:()=>{},onended:null};}createBuffer(_n:number,length:number){return {getChannelData:()=>new Float32Array(length)};}createBufferSource(){return {connect:(target:any)=>target,start:()=>{},stop:()=>{},disconnect:()=>{},onended:null};}}
(globalThis as any).AudioContext=FakeContext;
async function main(){
 check(!audioEnabled()&&contexts.length===0,'default audio does not create a context');
 await startMusic();check(contexts[0].state==='running'&&oscillators>0,'user starts scheduled music');const before=oscillators;
 contexts[0].currentTime=5;await new Promise(r=>setTimeout(r,80));check(oscillators-before<15,'late scheduler skips missed notes rather than bursting');
 pauseMusic();await new Promise(r=>setTimeout(r,130));check(contexts[0].state==='suspended','pause releases scheduler and suspends music');
 await startMusic();check(contexts.length===1,'resume reuses one music context');setMusicVolume(0);pauseMusic();await new Promise(r=>setTimeout(r,130));
 await setAudioEnabled(true);check(audioEnabled()&&contexts.length===2,'effects use separate controllable context');
 const sounds:PartySound[]=['take','bell','flip','charge','pulse','explode','select','submit','correct','wrong','pair','vote','move','wall','draw','bid','reveal','win','finish','turn','start','damage'];
 for(const sound of sounds){const n=oscillators;playPartySound(sound);check(oscillators>n,sound+' synthesizes');}
 setEffectsVolume(0);await setAudioEnabled(false);const silent=oscillators;playPartySound('explode');check(oscillators===silent&&!audioEnabled(),'muted effects schedule no sound');
 console.log(`AUDIO PASS: ${checks} checks`);
}
void main().catch(error=>{pauseMusic();console.error(error);process.exitCode=1;});
