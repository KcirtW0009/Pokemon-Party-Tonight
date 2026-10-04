'use client';
export type PartySound='take'|'bell'|'flip'|'charge'|'pulse'|'explode';
let audio:AudioContext|null=null;
export function audioEnabled(){try{return typeof window!=='undefined'&&localStorage.getItem('ppt-audio')==='on';}catch{return false;}}
export async function unlockPartyAudio(){if(audioEnabled()){audio??=new AudioContext();await audio.resume();}}
export async function setAudioEnabled(enabled:boolean){localStorage.setItem('ppt-audio',enabled?'on':'off');if(enabled){audio??=new AudioContext();await audio.resume();}window.dispatchEvent(new Event('ppt-audio-change'));}
export function playPartySound(kind:PartySound){if(!audioEnabled()||!audio||audio.state!=='running')return;const t=audio.currentTime;
 const tone=(from:number,to:number,seconds:number,volume:number,type:OscillatorType='sine')=>{const oscillator=audio!.createOscillator(),gain=audio!.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(from,t);oscillator.frequency.exponentialRampToValueAtTime(to,t+seconds);gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+seconds);oscillator.connect(gain).connect(audio!.destination);oscillator.start(t);oscillator.stop(t+seconds);};
 if(kind==='explode'){tone(95,30,.9,.14);const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.65),audio.sampleRate),values=buffer.getChannelData(0);for(let i=0;i<values.length;i++)values[i]=(Math.random()*2-1);const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=700;gain.gain.setValueAtTime(.09,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.65);noise.connect(filter).connect(gain).connect(audio.destination);noise.start(t);noise.stop(t+.65);}
 else if(kind==='bell'){tone(880,880,.6,.05);tone(1320,1320,.4,.025);}
 else if(kind==='pulse')tone(160,95,.12,.035);
 else if(kind==='charge')tone(220,500,.22,.03,'triangle');
 else if(kind==='flip')tone(350,650,.1,.025,'triangle');
 else tone(600,850,.12,.025);
}
