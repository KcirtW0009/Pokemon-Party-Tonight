'use client';
export type PartySound='take'|'bell'|'flip'|'charge'|'pulse'|'explode'|'select'|'submit'|'correct'|'wrong'|'pair'|'vote'|'move'|'wall'|'draw'|'bid'|'reveal'|'win'|'finish'|'turn'|'start'|'damage';
let audio:AudioContext|null=null,effects:GainNode|null=null,enabledFallback=false,volume=55;
export function audioEnabled(){try{return typeof window!=='undefined'&&localStorage.getItem('ppt-audio')==='on';}catch{return enabledFallback;}}
export function effectsVolume(){return volume;}
function initialize(){audio??=new AudioContext();if(!effects){effects=audio.createGain();effects.gain.value=volume/100;effects.connect(audio.destination);}}
export async function unlockPartyAudio(){if(audioEnabled()){initialize();await audio!.resume();}}
export async function setAudioEnabled(enabled:boolean){if(enabled){initialize();await audio!.resume();if(audio!.state!=='running')throw Error('Audio unavailable');}enabledFallback=enabled;if(audio&&effects)effects.gain.setTargetAtTime(enabled?volume/100:0,audio.currentTime,.03);try{localStorage.setItem('ppt-audio',enabled?'on':'off');}catch{}window.dispatchEvent(new Event('ppt-audio-change'));}
export function setEffectsVolume(value:number){volume=Math.max(0,Math.min(100,value));if(audio&&effects)effects.gain.setTargetAtTime(audioEnabled()?volume/100:0,audio.currentTime,.04);try{localStorage.setItem('ppt-effects-volume',String(volume));}catch{}window.dispatchEvent(new Event('ppt-audio-change'));}
export function playPartySound(kind:PartySound){if(typeof document!=='undefined'&&document.hidden)return;if(!audioEnabled()||!audio||audio.state!=='running')return;const t=audio.currentTime;
 const tone=(from:number,to:number,seconds:number,volume:number,type:OscillatorType='sine',delay=0)=>{const at=t+delay,oscillator=audio!.createOscillator(),gain=audio!.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(from,at);oscillator.frequency.exponentialRampToValueAtTime(to,at+seconds);gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.0001,at+seconds);oscillator.connect(gain).connect(effects!);oscillator.start(at);oscillator.stop(at+seconds);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};};
 if(kind==='explode'){tone(95,30,.9,.14);const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.65),audio.sampleRate),values=buffer.getChannelData(0);for(let i=0;i<values.length;i++)values[i]=(Math.random()*2-1);const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=700;gain.gain.setValueAtTime(.09,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.65);noise.connect(filter).connect(gain).connect(effects!);noise.start(t);noise.stop(t+.65);noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};}
 else if(['correct','pair','win','finish','start'].includes(kind)){const pitches=kind==='win'?[523,659,784,1047]:kind==='pair'?[523,659,784]:kind==='correct'?[659,880]:kind==='finish'?[523,659,784]:[392,523];pitches.forEach((hz,i)=>tone(hz,hz,i===pitches.length-1?.3:.14,.035,'sine',i*.09));}
 else if(kind==='wrong')tone(180,100,.18,.03,'triangle');
 else if(kind==='damage')tone(140,55,.3,.055,'triangle');
 else if(kind==='wall')tone(160,70,.13,.04,'triangle');
 else if(kind==='move')tone(250,150,.07,.025,'triangle');
 else if(kind==='vote')tone(310,220,.1,.03,'triangle');
 else if(kind==='draw'){[360,270,450].forEach((hz,i)=>tone(hz,hz*.7,.06,.02,'triangle',i*.055));}
 else if(kind==='bid'){tone(1047,1047,.18,.03);tone(1319,1319,.2,.02,'sine',.08);}
 else if(kind==='reveal'){tone(440,660,.17,.025,'triangle');tone(880,880,.22,.02,'sine',.1);}
 else if(kind==='submit')tone(520,700,.11,.025,'triangle');
 else if(kind==='select')tone(720,850,.06,.018,'sine');
 else if(kind==='turn'){tone(392,392,.14,.02);tone(523,523,.18,.025,'sine',.12);}
 else if(kind==='bell'){tone(880,880,.6,.05);tone(1320,1320,.4,.025);}
 else if(kind==='pulse')tone(160,95,.12,.035);
 else if(kind==='charge')tone(220,500,.22,.03,'triangle');
 else if(kind==='flip')tone(350,650,.1,.025,'triangle');
 else tone(600,850,.12,.025);
}
