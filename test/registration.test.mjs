import test from 'node:test';
import assert from 'node:assert/strict';
import { serialFor } from '../docs/registration.js';

// Expected values come from running the original program's own check (AboutBox1.IsValid, copied from the
// recovered source) under .NET: each serial below is accepted for its name, and its lowercase form is not.
const CASES = [
  ['Dedric Mauriac', 'E47A891C08EB08B9'],
  ['Lewie Nabob', '0B385472E217005A'],
  ['dedric mauriac', 'A9B5B3351C5ACD28'],
  ['Zoë Résident', 'AC8EFD1126C63D5F'],
];

test('serials match the Windows program', async () => {
  for (const [name, serial] of CASES) assert.equal(await serialFor(name), serial, name);
});

test('names are case-sensitive and untrimmed, like the program', async () => {
  assert.notEqual(await serialFor('Dedric Mauriac '), await serialFor('Dedric Mauriac'));
  assert.notEqual(await serialFor('dedric mauriac'), await serialFor('Dedric Mauriac'));
});

test('an empty name gives no serial', async () => {
  assert.equal(await serialFor(''), '');
});
