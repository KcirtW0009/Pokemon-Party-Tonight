// Reproducible offline tags from the same cached PokéAPI source as the dex.
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const species = await Promise.all(Array.from({ length: 1025 }, (_, i) => readFile(new URL(`data/source-cache/pokemon-species-${i + 1}.json`, root), 'utf8').then(JSON.parse)));
const parentId = p => p.evolves_from_species ? Number(p.evolves_from_species.url.split('/').filter(Boolean).at(-1)) : null;
const parents = new Set(species.map(parentId).filter(Boolean));
const tags = species.map(p => ({
  id: p.id, eggGroups: p.egg_groups.map(g => g.name), shape: p.shape?.name ?? null,
  color: p.color.name, hasOtherForms: p.varieties.length > 1, formsSwitchable: p.forms_switchable,
  evolution: parentId(p) ? (parents.has(p.id) ? 'middle' : 'evolved') : (parents.has(p.id) ? 'base' : 'single'),
}));
if (tags.some((p, i) => p.id !== i + 1 || !p.shape || !p.eggGroups.length)) throw new Error('Incomplete clue tags');
await writeFile(new URL('data/clue-tags.json', root), JSON.stringify(tags, null, 2) + '\n');
console.log(`Built ${tags.length} species clue tags from cached PokéAPI species data.`);
