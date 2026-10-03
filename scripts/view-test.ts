import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MatchGame } from '../src/components/games/MatchGame';
import type { MatchView, RoomView } from '../src/lib/types';
import type { RoomActions } from '../src/lib/useRoom';
Object.assign(globalThis, { React });
const game: MatchView = { game: 'match', phase: 'pick', round: 1, totalRounds: 3,
  question: {id:41,text:'哪只宝可梦最像「火神蛾的主人」？',category:'损友'},
  candidateIds: [1,4,7,10,13,16,19,21,23,25], myPick: null, endsAt: Date.now()+45000,
  submittedCount: 0, playerCount: 2, result: null, revealEndsAt: null };
const view: RoomView = { code:'TEST', serverTime:Date.now(), hostId:'a', youId:'a',
  players:[{id:'a',nickname:'火神蛾的主人',connected:true,ready:true}], selectedGame:'match',
  settings:{matchRounds:3,pixelRounds:5,dittoRounds:1,targetScore:0}, status:'PLAYING',scores:{a:0},game };
function render() { return renderToStaticMarkup(React.createElement(MatchGame,{game,view,actions:{} as RoomActions})); }
const before=render();assert.equal((before.match(/class="game-opt"/g)??[]).length,10);
game.myPick=25;game.submittedCount=1;
for(const phase of ['pick','countdown'] as const){game.phase=phase;const html=render();
  assert.equal((html.match(/class="game-opt(?: sel)?"/g)??[]).length,10,'all candidates remain visible');
  assert.equal((html.match(/aria-pressed="true"/g)??[]).length,1,'exactly one choice highlighted');
  assert.equal((html.match(/disabled=""/g)??[]).length,10,'submission cannot be changed');
  assert.ok(html.includes('已选择')&&html.includes('皮卡丘')&&html.includes('火神蛾的主人'));
}
console.log('VIEW PASS: all ten candidates retained, own choice highlighted, inputs locked through reveal countdown.');
