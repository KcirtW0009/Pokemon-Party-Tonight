import type {RoomView} from './types';
import type {PartySound} from './partyAudio';
// Presentation only: derive sound cues from information already visible to this player.
export function gameSound(previous:RoomView|null,next:RoomView):PartySound|null{
 const p=previous?.game,g=next.game;if(!p||!g||previous?.code!==next.code)return null;
 if(p.game!==g.game||p.round!==g.round)return 'start';
 if(p.phase!=='final'&&g.phase==='final')return (next.scores[next.youId]??0)>(previous!.scores[next.youId]??0)?'win':'finish';
 if(g.game==='pixel'&&p.game==='pixel'){if(!p.mySolved&&g.mySolved)return 'correct';if(!p.myAttempted&&g.myAttempted&&!g.mySolved)return 'wrong';if(p.stage!==g.stage)return 'reveal';}
 if(g.game==='match'&&p.game==='match'||g.game==='battle'&&p.game==='battle'){
  if(p.myPick===null&&g.myPick!==null)return 'submit';
  if(p.phase!==g.phase&&g.phase==='reveal')return (g.result?.gains[next.youId]??0)>0?'correct':'reveal';
 }
 if(g.game==='ditto'&&p.game==='ditto'){if(p.words.length<g.words.length)return 'submit';if(!p.iVoted&&g.iVoted)return 'vote';if(p.phase!==g.phase&&g.phase==='dittoGuess')return 'damage';if(p.phase!==g.phase&&g.phase==='roundResult')return 'finish';}
 if('data' in p&&'data' in g){const a=p.data as any,b=g.data as any;
  if(g.game==='gender-difference'){if(b.foundCount>a.foundCount)return 'correct';if(b.errors>a.errors)return 'wrong';}
  if(g.game==='type-bomb'&&b.history.length>a.history.length)return b.history.at(-1)?.damage===2?'explode':b.history.at(-1)?.damage>0?'damage':'correct';
  if(g.game==='starter-memory'&&p.phase!==g.phase&&g.phase==='feedback'&&b.last?.matched===false)return 'wrong';
  if(g.game==='starter-memory'&&b.cards.filter((c:any)=>c.status==='matched').length>a.cards.filter((c:any)=>c.status==='matched').length)return 'pair';
  if(g.game==='sudowoodo-quoridor'){if(b.walls.length>a.walls.length)return 'wall';if(JSON.stringify(b.pawns)!==JSON.stringify(a.pawns))return 'move';}
  if(g.game==='drive-revavroom'){if(b.results.length>a.results.length)return b.results.at(-1)?.success?'correct':'wrong';if(b.inputs[next.youId]!==a.inputs[next.youId])return 'select';}
  if(g.game==='rocket-secret'){if(a.myGuess===null&&b.myGuess!==null)return 'submit';if(b.clues.length>a.clues.length)return 'bell';}
  if(g.game==='pokemon-auction'){if(b.myInventory.length>a.myInventory.length)return 'take';if(!a.myUsedThisRound&&b.myUsedThisRound)return 'reveal';if(a.myBid===null&&b.myBid!==null)return 'bid';}
  if(g.game==='pokemon-liars-dice'){if(p.phase!==g.phase&&b.result)return b.result.loser===next.youId?'wrong':'reveal';if(b.history.length>a.history.length||b.hand!==a.hand)return 'draw';}
  if(g.game==='surround-meloetta'&&b.last&&JSON.stringify(a.last)!==JSON.stringify(b.last))return b.last.outcome==='capture'?'correct':b.last.outcome==='escape'?'wrong':b.last.outcome==='break'?'damage':'move';
  if(g.game==='pokemon-push-your-luck'&&b.history.length>a.history.length)return b.players[next.youId]?.status==='bust'&&a.players[next.youId]?.status!=='bust'?'wrong':'draw';
  if(p.currentPlayerId!==g.currentPlayerId&&g.currentPlayerId===next.youId&&g.game!=='electrode-relay')return 'turn';
 }
 if(p.phase!==g.phase&&g.phase==='reveal')return 'reveal';
 return null;
}
