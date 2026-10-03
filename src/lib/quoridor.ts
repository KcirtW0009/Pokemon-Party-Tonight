export interface Point { x: number; y: number }
export interface Wall extends Point { orientation: 'H' | 'V' }
export type GoalEdge = 'top' | 'right' | 'bottom' | 'left';
export interface Pawn extends Point { id: string; goal: GoalEdge }
export const DIRECTIONS: Point[] = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
export const inside = (p: Point) => Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<9&&p.y<9;
export const same = (a: Point,b: Point) => a.x===b.x&&a.y===b.y;
export function atGoal(p: Point,goal: GoalEdge): boolean {
  return goal==='top'?p.y===0:goal==='bottom'?p.y===8:goal==='left'?p.x===0:p.x===8;
}
export function blocked(a:Point,b:Point,walls:Wall[]):boolean {
  if(!inside(a)||!inside(b)||Math.abs(a.x-b.x)+Math.abs(a.y-b.y)!==1)return true;
  return walls.some(w=>w.orientation==='H'
    ? a.x===b.x&&Math.min(a.y,b.y)===w.y&&(a.x===w.x||a.x===w.x+1)
    : a.y===b.y&&Math.min(a.x,b.x)===w.x&&(a.y===w.y||a.y===w.y+1));
}
export function moves(pawn:Pawn,pawns:Pawn[],walls:Wall[]):Point[]{
  const result:Point[]=[];
  const occupied=(p:Point)=>pawns.some(q=>q.id!==pawn.id&&same(p,q));
  const add=(p:Point)=>{if(inside(p)&&!occupied(p)&&!result.some(q=>same(p,q)))result.push(p);};
  for(const d of DIRECTIONS){
    const next={x:pawn.x+d.x,y:pawn.y+d.y};
    if(blocked(pawn,next,walls))continue;
    if(!occupied(next)){add(next);continue;}
    const beyond={x:next.x+d.x,y:next.y+d.y};
    if(inside(beyond)&&!blocked(next,beyond,walls)){
      if(!occupied(beyond))add(beyond);
      // A pawn behind another pawn does not permit chained or diagonal jumping.
    }else{
      for(const side of DIRECTIONS.filter(s=>s.x*d.x+s.y*d.y===0)){
        const diagonal={x:next.x+side.x,y:next.y+side.y};
        if(!blocked(next,diagonal,walls))add(diagonal);
      }
    }
  }
  return result;
}
export function distanceToGoal(start:Point,goal:GoalEdge,walls:Wall[]):number {
  const queue=[{...start,d:0}],seen=new Set([`${start.x},${start.y}`]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(atGoal(p,goal))return p.d;
    for(const v of DIRECTIONS){const n={x:p.x+v.x,y:p.y+v.y};const key=`${n.x},${n.y}`;
      if(!blocked(p,n,walls)&&!seen.has(key)){seen.add(key);queue.push({...n,d:p.d+1});}}
  }
  return Infinity;
}
export function wallError(wall:Wall,walls:Wall[],pawns:Pawn[]):string|null {
  if(!Number.isInteger(wall.x)||!Number.isInteger(wall.y)||wall.x<0||wall.y<0||wall.x>7||wall.y>7||!['H','V'].includes(wall.orientation))return '墙位不合法';
  for(const w of walls){
    if(w.orientation!==wall.orientation&&same(w,wall))return '横竖墙不能交叉';
    if(w.orientation===wall.orientation&&(wall.orientation==='H'?w.y===wall.y&&Math.abs(w.x-wall.x)<=1:w.x===wall.x&&Math.abs(w.y-wall.y)<=1))return '墙不能重叠';
  }
  if(pawns.some(p=>!Number.isFinite(distanceToGoal(p,p.goal,[...walls,wall]))))return '不能封死任何玩家通往目标边的路径';
  return null;
}
export function automaticMove(pawn:Pawn,pawns:Pawn[],walls:Wall[]):Point|null {
  const legal=moves(pawn,pawns,walls);
  // moves has a fixed direction order; stable sort preserves deterministic tie breaking.
  return legal.sort((a,b)=>distanceToGoal(a,pawn.goal,walls)-distanceToGoal(b,pawn.goal,walls))[0]??null;
}
export function positions(ids:string[],round:number):Pawn[]{
  const slots=ids.length===3
    ? [{x:0,y:4,goal:'right'},{x:8,y:4,goal:'left'},{x:4,y:8,goal:'top'}]
    : ids.length===2 ? [{x:4,y:0,goal:'bottom'},{x:4,y:8,goal:'top'}]
    : [{x:4,y:0,goal:'bottom'},{x:8,y:4,goal:'left'},{x:4,y:8,goal:'top'},{x:0,y:4,goal:'right'}];
  return ids.map((id,i)=>({id,...slots[(i+round-1)%ids.length],goal:slots[(i+round-1)%ids.length].goal as GoalEdge}));
}
