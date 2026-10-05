'use client';
// Original four-bar tabletop theme, synthesized locally; no remote media.
let context:AudioContext|null=null,master:GainNode|null=null,timer:ReturnType<typeof setInterval>|null=null;
let stopTimer:ReturnType<typeof setTimeout>|null=null,nextTime=0,step=0,volume=25;
const voices=new Set<OscillatorNode>();
const notes=[74,0,78,81,0,78,76,0,74,0,73,76,0,78,0,73,71,0,74,78,0,74,73,0,69,0,73,76,0,73,71,0];
const chords=[[50,57,61,66],[47,54,57,62],[43,50,54,59],[45,52,59,61]];
const frequency=(midi:number)=>440*2**((midi-69)/12);
function tone(midi:number,at:number,duration:number,level:number,type:OscillatorType='sine'){
 if(!context||!master)return;const oscillator=context.createOscillator(),gain=context.createGain();
 oscillator.type=type;oscillator.frequency.value=frequency(midi);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.035);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
 voices.add(oscillator);oscillator.connect(gain).connect(master);oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+duration+.02);
}
function schedule(){if(!context||context.state!=='running')return;if(nextTime<context.currentTime-.2){step+=Math.floor((context.currentTime-nextTime)/.375);nextTime=context.currentTime+.03;}while(nextTime<context.currentTime+.15){const index=step%32,chord=chords[Math.floor(index/8)];if(index%8===0)for(const note of chord)tone(note+12,nextTime,2.5,.026);if(index%4===0)tone(chord[0],nextTime,.65,.10);if(notes[index])tone(notes[index],nextTime,1.05,.12,'triangle');nextTime+=.375;step++;}}
export function setMusicVolume(value:number){volume=Math.max(0,Math.min(100,value));if(context&&master)master.gain.setTargetAtTime(volume/100*.45,context.currentTime,.04);}
export async function startMusic(){
 if(stopTimer){clearTimeout(stopTimer);stopTimer=null;}
 context??=new AudioContext();if(!master){master=context.createGain();const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2400;master.connect(filter).connect(context.destination);}
 await context.resume();if(context.state!=='running')throw Error('音乐暂时无法播放，请再次点击开启');
 master.gain.cancelScheduledValues(context.currentTime);master.gain.setValueAtTime(0,context.currentTime);master.gain.linearRampToValueAtTime(volume/100*.45,context.currentTime+.12);
 if(timer)return;nextTime=context.currentTime+.03;step=0;schedule();timer=setInterval(schedule,60);
}
export function pauseMusic(){if(timer){clearInterval(timer);timer=null;}if(context&&master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(0,context.currentTime,.025);for(const voice of voices){try{voice.stop(context.currentTime+.08);}catch{}}voices.clear();stopTimer=setTimeout(()=>{void context?.suspend();stopTimer=null;},100);}}
