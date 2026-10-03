import raw from '../../data/pokemon.json';
import type { Pokemon } from '@/lib/types';

const LIST = raw as Pokemon[];
export const ALL_POKEMON = LIST;
const BY_ID = new Map<number, Pokemon>(LIST.map((p) => [p.id, p]));

export const POKEDEX_COUNT = LIST.length;

export function getPokemon(id: number): Pokemon | null {
  return BY_ID.get(id) ?? null;
}

export function isValidPokemonId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id >= 1 && id <= POKEDEX_COUNT;
}
