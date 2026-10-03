export interface Vector { x:number; y:number }
export interface Rectangle extends Vector { width:number; height:number }
export interface DriveMap { id:string; name:string; bounds:Rectangle; spawn:Vector; goal:Rectangle; walls:Rectangle[]; speed:number; timeLimit:number }
export const INPUTS=['up','right','down','left'] as const;
export type DriveInput=typeof INPUTS[number];
export const VECTOR:Record<DriveInput,Vector>={up:{x:0,y:-1},right:{x:1,y:0},down:{x:0,y:1},left:{x:-1,y:0}};
export const CAR_RADIUS=10;
export function combine(inputs:DriveInput[],speed:number):Vector {
  const sum=inputs.reduce((a,k)=>({x:a.x+VECTOR[k].x,y:a.y+VECTOR[k].y}),{x:0,y:0});
  const length=Math.hypot(sum.x,sum.y);return length?{x:speed*sum.x/length,y:speed*sum.y/length}:{x:0,y:0};
}
export function circleHits(p:Vector,r:number,rect:Rectangle):boolean {
  const x=Math.max(rect.x,Math.min(rect.x+rect.width,p.x)),y=Math.max(rect.y,Math.min(rect.y+rect.height,p.y));
  return (p.x-x)**2+(p.y-y)**2<r*r;
}
export function canOccupy(p:Vector,map:DriveMap,r=CAR_RADIUS):boolean {
  const b=map.bounds;
  return p.x-r>=b.x&&p.y-r>=b.y&&p.x+r<=b.x+b.width&&p.y+r<=b.y+b.height&&!map.walls.some(w=>circleHits(p,r,w));
}
export function moveCar(position:Vector,velocity:Vector,seconds:number,map:DriveMap):Vector {
  // Substeps of <=2px cannot tunnel through thin walls; resolve axes to slide along walls.
  const dt=Math.max(0,Math.min(seconds,0.1));
  const steps=Math.max(1,Math.ceil(Math.hypot(velocity.x,velocity.y)*dt/2));
  let p={...position};
  for(let i=0;i<steps;i++){
    const x={x:p.x+velocity.x*dt/steps,y:p.y};if(canOccupy(x,map))p=x;
    const y={x:p.x,y:p.y+velocity.y*dt/steps};if(canOccupy(y,map))p=y;
  }
  return p;
}
export function validateMap(map:DriveMap):boolean {
  if(!canOccupy(map.spawn,map)||!Number.isFinite(map.speed)||map.speed<=0)return false;
  const step=5,key=(p:Vector)=>`${Math.round(p.x/step)},${Math.round(p.y/step)}`;
  const queue=[map.spawn],seen=new Set([key(map.spawn)]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(circleHits(p,CAR_RADIUS,map.goal))return true;
    for(const v of Object.values(VECTOR)){const n={x:p.x+v.x*step,y:p.y+v.y*step};
      if(!seen.has(key(n))&&canOccupy(n,map)){seen.add(key(n));queue.push(n);}}
  }
  return false;
}
