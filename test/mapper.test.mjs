import test from 'node:test';
import assert from 'node:assert/strict';
import { valuesFromSelection, selectionFromValues, findAction, applyDrag, lslSnippet, fmt, MAPPING } from '../docs/mapper.js';

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('a centered third of the image is repeats 0.333 and offset 0 (as in the 2010 screenshot)', () => {
  const v = valuesFromSelection({ x: 1 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 });
  assert.equal(fmt(v.repeatsU), '0.333');
  assert.equal(fmt(v.repeatsV), '0.333');
  assert.equal(fmt(v.offsetU), '0.000');
  assert.equal(fmt(v.offsetV), '0.000');
});

test('offsets follow the original formulas: U to the right, V upward', () => {
  // Top-right quarter: center (0.75, 0.25) -> offset (+0.25, +0.25)
  const v = valuesFromSelection({ x: 0.5, y: 0, w: 0.5, h: 0.5 });
  close(v.offsetU, 0.25, 'U'); close(v.offsetV, 0.25, 'V');
  close(v.repeatsU, 0.5, 'rU'); close(v.repeatsV, 0.5, 'rV');
  // Bottom-left quarter
  const b = valuesFromSelection({ x: 0, y: 0.5, w: 0.5, h: 0.5 });
  close(b.offsetU, -0.25, 'U'); close(b.offsetV, -0.25, 'V');
});

test('offsets clamp to -1..1 like the program', () => {
  const v = valuesFromSelection({ x: 3, y: -3, w: 0.1, h: 0.1 });
  assert.equal(v.offsetU, 1);
  assert.equal(v.offsetV, 1);
});

test('planar mapping doubles the repeats, and converts back', () => {
  const sel = { x: 0.25, y: 0.1, w: 0.3, h: 0.2 };
  const v = valuesFromSelection(sel, MAPPING.PLANAR);
  close(v.repeatsU, 0.6, 'rU'); close(v.repeatsV, 0.4, 'rV');
  const back = selectionFromValues(v, MAPPING.PLANAR);
  for (const k of ['x', 'y', 'w', 'h']) close(back[k], sel[k], k);
});

test('values and selection round-trip in default mapping', () => {
  for (const sel of [{ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, { x: 0, y: 0, w: 1, h: 1 }, { x: 0.6, y: 0.7, w: 0.25, h: 0.125 }]) {
    const back = selectionFromValues(valuesFromSelection(sel));
    for (const k of ['x', 'y', 'w', 'h']) close(back[k], sel[k], k);
  }
});

test('findAction: corners, edges, inside, outside', () => {
  const r = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
  const g = 0.02;
  assert.equal(findAction({ x: 0.2, y: 0.2 }, r, g), 'scale-top-left');
  assert.equal(findAction({ x: 0.6, y: 0.6 }, r, g), 'scale-bottom-right');
  assert.equal(findAction({ x: 0.6, y: 0.4 }, r, g), 'scale-right');
  assert.equal(findAction({ x: 0.4, y: 0.2 }, r, g), 'scale-top');
  assert.equal(findAction({ x: 0.4, y: 0.4 }, r, g), 'move');
  assert.equal(findAction({ x: 0.9, y: 0.9 }, r, g), 'select');
  assert.equal(findAction({ x: 0.5, y: 0.5 }, { x: 0, y: 0, w: 0, h: 0 }, g), 'select');
});

test('applyDrag: select, move, resize, and flipping past the opposite edge', () => {
  const r = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
  assert.deepEqual(applyDrag('select', r, { x: 0.5, y: 0.5 }, { x: 0.3, y: 0.1 }), { x: 0.3, y: 0.1, w: 0.2, h: 0.4 });
  const m = applyDrag('move', r, { x: 0.4, y: 0.4 }, { x: 0.5, y: 0.3 });
  close(m.x, 0.3, 'x'); close(m.y, 0.1, 'y'); close(m.w, 0.4, 'w');
  const s = applyDrag('scale-right', r, { x: 0.6, y: 0.4 }, { x: 0.7, y: 0.4 });
  close(s.w, 0.5, 'w'); close(s.x, 0.2, 'x');
  const f = applyDrag('scale-right', r, { x: 0.6, y: 0.4 }, { x: 0.1, y: 0.4 });
  close(f.x, 0.1, 'flipped x'); close(f.w, 0.1, 'flipped w');
});

test('LSL line: flips are negative repeats, planar adds PRIM_TEXGEN', () => {
  const v = { repeatsU: 0.5, repeatsV: 0.25, offsetU: 0.25, offsetV: -0.125 };
  assert.equal(lslSnippet(v), 'llSetPrimitiveParams([PRIM_TEXTURE, ALL_SIDES, \"texture name or UUID\", <0.500, 0.250, 0.0>, <0.250, -0.125, 0.0>, 0.0]);');
  assert.match(lslSnippet(v, { flipU: true, mapping: MAPPING.PLANAR }), /<-0\.500, 0\.250, 0\.0>.*PRIM_TEXGEN, ALL_SIDES, PRIM_TEXGEN_PLANAR/);
});
