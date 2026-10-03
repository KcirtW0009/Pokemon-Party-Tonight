import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const data = JSON.parse(await readFile('data/pokemon.json', 'utf8'));
assert.equal(data.length, 1025);
assert.equal(new Set(data.map(p => p.id)).size, 1025);
for (let id = 1; id <= 1025; id++) {
  const p = data.find(p => p.id === id);
  assert.ok(p, `Missing #${id}`);
  assert.match(p.nameZh, /[\u3400-\u9fff]/);
  assert.ok(p.nameEn && p.pinyin);
  assert.ok(Array.isArray(p.types) && p.types.length >= 1 && p.types.length <= 2, `Missing types #${id}`);
  for (const key of ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed', 'height', 'weight']) {
    assert.ok(Number.isFinite(p[key]) && p[key] > 0, `Invalid ${key} #${id}`);
  }
  assert.equal(p.image, `/pokemon/official-artwork/${id}.png`);
  const bytes = await readFile(path.join('public', p.image));
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `Invalid artwork #${id}`);
  assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
}
for (const id of [1,25,260,1025]) console.log(`#${id} ${data[id-1].nameZh} / ${data[id-1].nameEn}`);
const questions = JSON.parse(await readFile('data/questions.json', 'utf8'));
const tags = JSON.parse(await readFile('data/clue-tags.json', 'utf8'));
assert.equal(tags.length, 1025);
for (const [i, tag] of tags.entries()) {
  assert.equal(tag.id, i + 1);
  assert.ok(tag.shape && tag.color && tag.eggGroups.length);
  assert.equal(typeof tag.hasOtherForms, 'boolean');
  assert.equal(typeof tag.formsSwitchable, 'boolean');
  assert.ok(['base', 'middle', 'evolved', 'single'].includes(tag.evolution));
}
assert.ok(questions.length >= 50 && new Set(questions.map(q => q.id)).size === questions.length);
assert.ok(questions.every(q => !q.text.includes('左边') && !q.text.includes('右边')));
console.log('Validated 1,025 species and clue tags, local PNGs, stats, Chinese names, and 50 questions.');
