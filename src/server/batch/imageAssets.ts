import {uid} from '../util';
interface Asset {path:string;expires:number}
const assets=new Map<string,Asset>();
export function batchImage(path:string):string {
  const token=uid();assets.set(token,{path,expires:Date.now()+6*60*60*1000});
  if(assets.size>10000)for(const [id,a] of assets)if(a.expires<Date.now())assets.delete(id);
  return `/api/batch-image?token=${token}`;
}
export function resolveBatchImage(token:string|null):string|null {
  const a=token?assets.get(token):undefined;if(!a||a.expires<Date.now())return null;return a.path;
}
