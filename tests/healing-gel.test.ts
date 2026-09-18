import test from 'node:test';
import assert from 'node:assert/strict';
import { HealingGel } from '../src/slicing/healing.ts';
import { BatchedGel } from '../src/slicing/gel.ts';
import { SliceModel } from '../src/slicing/model.ts';
import { TouchSurface } from '../src/slicing/touch-surface.ts';

function step(field: HealingGel, seconds: number, reduced = false, rate = 120) {
  for (let i = 0; i < Math.round(seconds * rate); i++) field.step(1 / rate, reduced);
}

test('a short poke is local, a stationary hold sinks deeper without cutting, and both recover exactly', () => {
  const field = new HealingGel();
  field.begin(1, { x: 0, z: 0 }); step(field, .08);
  const tap = field.sample(0, 0); assert.ok(tap > .055 && tap < .18);
  assert.ok(Math.abs(field.sample(.85, 0)) < .01, 'Touch should not dent a whole line through the block');
  step(field, 2); assert.ok(field.sample(0, 0) > tap * 2); assert.ok(field.sample(0, 0) < .36);
  field.end(1); step(field, 8);
  assert.equal(field.moving, false); assert.equal(field.sample(0, 0), 0);
  assert.ok(field.height.every(n => n === 0));
});
test('partial, curved and endpoint-only strokes all leave bounded grooves without a crossing requirement', () => {
  const field = new HealingGel(); field.begin(1, { x: -.65, z: 0 });
  field.move(1, { x: 0, z: 0 }, .1); field.move(1, { x: 0, z: .6 }, .1); field.end(1); step(field, .2);
  assert.ok(field.sample(-.35, 0) > .1); assert.ok(field.sample(0, .3) > .2);
  assert.ok(Math.abs(field.sample(-.4, .45)) < .025, 'The groove follows the curve, not a chord joining the endpoints');
  step(field, 8); assert.equal(field.moving, false);
});
test('a new touch does not stop older regions healing and partial multi-touch release preserves the other contact', () => {
  const field = new HealingGel(); field.begin(1, { x: -.65, z: 0 }); step(field, .6);
  field.begin(2, { x: .65, z: 0 }); field.end(1); step(field, 2);
  assert.equal(field.contacts.size, 1); assert.ok(field.sample(-.65, 0) < .02);
  assert.ok(field.sample(.65, 0) > .3);
  field.releaseAll(); step(field, 8); assert.equal(field.moving, false);
});
test('gestures stay available after hundreds of strokes with fixed storage and finite deformation', () => {
  const field = new HealingGel(), storage = field.height;
  for (let i = 0; i < 220; i++) {
    const z = Math.sin(i) * .8;
    assert.ok(field.begin(1, { x: -1.2, z })); field.move(1, { x: 1.2, z: -z }, .1); field.end(1); field.step(.05, false);
    assert.equal(field.height, storage); assert.ok(field.maxDent < .66);
  }
  assert.ok(field.height.every(n => Number.isFinite(n) && n > -.05 && n < .66));
  step(field, 8); assert.equal(field.moving, false);
  assert.ok(field.begin(2, { x: 0, z: 0 })); step(field, .1); assert.ok(field.sample(0, 0) > .05);
});
test('invalid input, five-contact bound, reduced motion, frame rate and reset remain safe', () => {
  for (const reduced of [false, true]) {
    const results: number[] = [];
    for (const rate of [30, 60, 120]) {
      const field = new HealingGel(); assert.equal(field.begin(1, { x: NaN, z: 0 }), false);
      field.begin(1, { x: 0, z: 0 }); step(field, 1, reduced, rate); results.push(field.sample(0, 0));
      field.move(1, { x: Infinity, z: 0 }); field.step(NaN, reduced); assert.ok(Number.isFinite(field.sample(0, 0)));
      for (let id = 2; id <= 6; id++) assert.equal(field.begin(id, { x: 0, z: 0 }), id <= 5);
      field.reset(); assert.equal(field.contacts.size, 0); assert.equal(field.moving, false); assert.equal(field.sample(0, 0), 0);
    }
    assert.ok(Math.max(...results) - Math.min(...results) < .008);
  }
});
test('empty space has no material response and cancellation retains an already made dent for recovery', () => {
  const field = new HealingGel(); field.begin(1, { x: 4, z: 4 }); step(field, .2); assert.equal(field.maxDent, 0);
  field.move(1, { x: 0, z: 0 }); step(field, .2); const dent = field.sample(0, 0);
  field.releaseAll(); assert.equal(field.sample(0, 0), dent); step(field, 8); assert.equal(field.moving, false);
});
test('the actual skinned mesh dents locally, stays closed above the floor and restores its original vertices', () => {
  const gel = new BatchedGel(1.02, false), field = new HealingGel(); gel.rebuild(new SliceModel('slab').pieces, .1);
  const surface = new TouchSurface(gel, field), positions = gel.geometry.attributes.position, normals = gel.geometry.attributes.normal;
  const original = positions.array.slice(), resources = gel.geometry;
  field.begin(1, { x: -.8, z: 0 }); field.move(1, { x: .8, z: 0 }); step(field, .25); surface.update();
  let deepest = 0;
  for (let i = 0; i < gel.vertices; i++) {
    assert.ok(positions.getY(i) >= .0149); deepest = Math.max(deepest, original[i * 3 + 1] - positions.getY(i));
    assert.ok(Math.abs(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)) - 1) < 1e-5);
    assert.equal(positions.getX(i), original[i * 3]); assert.equal(positions.getZ(i), original[i * 3 + 2]);
  }
  assert.ok(deepest > .35 && deepest < .66); assert.equal(gel.geometry, resources);
  field.releaseAll(); step(field, 8); surface.update(); assert.deepEqual(positions.array, original); gel.dispose();
});
