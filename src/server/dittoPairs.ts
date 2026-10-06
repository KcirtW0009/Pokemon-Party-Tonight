import raw from '../../data/ditto-pairs.json';
import type {DittoWord} from '@/lib/types';
import {getPokemon} from './pokedex';
export const DITTO_PAIRS=raw as [DittoWord,DittoWord][];
export const pairKey=(pair:DittoWord[])=>pair.map(w=>w.name).sort().join('|');
const norm=(name:string)=>name.normalize('NFKC').toLowerCase().replace(/\s/g,'');
export function matchesDittoWord(guess:string,target:DittoWord):boolean {
 const names=[target.name];if(!target.name.includes('（')&&!target.name.includes('(')){const p=getPokemon(target.pokemonId);if(p)names.push(p.nameZh,p.nameEn,...p.searchAliases??[]);}
 return names.some(name=>norm(name)===norm(guess));
}
