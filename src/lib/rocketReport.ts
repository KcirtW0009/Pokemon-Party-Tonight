export interface RocketAttempt {attempt:number;texts:string[];missed:boolean;failed:boolean}
export interface RocketReport {round:number;sender:string;contact:string;participants:string[];answer:number[];clues:RocketAttempt[];history:Record<string,{attempt:number;picks:number[]}[]>;gains:Record<string,number>}
export function rocketGuess(report:RocketReport,id:string,attempt:number){return report.history[id]?.find(h=>h.attempt===attempt)?.picks??null;}
export function rocketReportText(room:string,reports:RocketReport[],playerName:(id:string)=>string,pokemonName:(id:number)=>string){
 const lines=['火箭队秘密行动 · 战报',`房间：${room}`,`已完成 ${reports.length} 题`];
 for(const report of reports){lines.push('',`【第 ${report.round} 题】`,`发报员：${playerName(report.sender)}｜接头员：${playerName(report.contact)}`,`正确序列：${report.answer.map(pokemonName).join(' → ')}`);
  for(const clue of report.clues){lines.push(`第 ${clue.attempt} 次发报：${clue.missed?'未成功发报，沿用此前暗号':clue.texts.map((t,i)=>`${i+1}. ${t}`).join('｜')}`);for(const id of report.participants.filter(id=>id!==report.sender)){const picks=rocketGuess(report,id,clue.attempt),matches=picks?.filter((p,i)=>p===report.answer[i]).length??0;lines.push(`  ${playerName(id)}（${id===report.contact?'接头员':'截获者'}）：${picks?`${picks.map(pokemonName).join(' → ')}｜${matches===4?'完全正确':`位置正确 ${matches}/4`}`:'未提交（超时或断线）'}`);}}
  lines.push('本题得分：'+report.participants.map(id=>`${playerName(id)} +${report.gains[id]??0}`).join('｜'));
 }
 if(reports.length>1){const totals:Record<string,number>={};for(const r of reports)for(const [id,n] of Object.entries(r.gains))totals[id]=(totals[id]??0)+n;lines.push('','战报累计得分：'+Object.entries(totals).map(([id,n])=>`${playerName(id)} ${n}`).join('｜'));}
 lines.push('','Pokémon Party Tonight');return lines.join('\n');
}
