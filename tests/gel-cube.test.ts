import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoftGeometry } from '../src/soft-body/geometry.ts';
import { gelCubeProfile } from '../src/soft-body/profiles.ts';
import { SoftBodyPhysics, FLOOR, STEP, type Point } from '../src/soft-body/physics.ts';

const advance = (body: SoftBodyPhysics, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) body.step();
};
const skinPoint = (body: SoftBodyPhysics, point: Point) => {
  const rest = new Float32Array([point.x, point.y, point.z]), output = new Float32Array(3);
  body.deform(rest, output, [body.bind(point.x, point.y, point.z)]);
  return { x: output[0], y: output[1], z: output[2] };
};
const top = { x: 0, y: 1.7, z: 0 }, front = { x: 0, y: 1.05, z: 0.8 };

test('gel cube responds within a few frames and a held squeeze visibly yields deeper', () => {
  const body = new SoftBodyPhysics(gelCubeProfile.feel);
  body.beginGrab(top);
  advance(body, 0.05);
  const initial = top.y - skinPoint(body, top).y;
  assert.ok(initial > 0.015, `Immediate surface travel: ${initial}`);
  advance(body, 0.05);
  const brief = top.y - skinPoint(body, top).y;
  advance(body, 1.8);
  const deep = top.y - skinPoint(body, top).y;
  assert.ok(deep > brief * 3, `${brief} → ${deep}`);
  assert.ok(deep < top.y - FLOOR && body.diagnostics().minVolumeRatio > 0.5);
});

test('brief pokes rebound sooner; deep holds retain a slow recovery with no release jump', () => {
  const poke = new SoftBodyPhysics(gelCubeProfile.feel), hold = new SoftBodyPhysics(gelCubeProfile.feel);
  for (const [body, seconds] of [[poke, 0.075], [hold, 2]] as const) {
    body.beginGrab(top); advance(body, seconds);
    const before = skinPoint(body, top);
    body.release(); assert.deepEqual(skinPoint(body, top), before);
  }
  advance(poke, 0.5); advance(hold, 0.5);
  assert.ok(poke.compressionAmount < 0.035, `Poke recovery: ${poke.compressionAmount}`);
  assert.ok(hold.compressionAmount > 0.12, `Held recovery: ${hold.compressionAmount}`);
  let previous = hold.compressionAmount;
  for (let i = 0; i < 10; i++) {
    advance(hold, 1);
    assert.ok(hold.compressionAmount >= 0 && hold.compressionAmount < previous, 'Deep recovery proceeds toward the original cube');
    previous = hold.compressionAmount;
  }
  assert.ok(hold.isAtRest() && poke.compressionAmount < 0.035);
});

test('equal-length fast and slow pulls take different paths to the same bounded stretch', () => {
  const pull = (seconds: number) => {
    const body = new SoftBodyPhysics(gelCubeProfile.feel);
    body.beginGrab(front, { x: 0, y: 0, z: 1 }); body.setPressure(0);
    const ticks = Math.round(seconds / STEP);
    for (let i = 1; i <= ticks; i++) {
      body.moveGrab({ x: 0.75 * i / ticks, y: 0, z: 0 }); body.step();
    }
    return body;
  };
  const fast = pull(0.1), slow = pull(1);
  const quickTravel = skinPoint(fast, front).x, slowTravel = skinPoint(slow, front).x;
  assert.ok(quickTravel > 0.08, `A quick tug still moves immediately: ${quickTravel}`);
  assert.ok(slowTravel > quickTravel * 1.6, `${quickTravel} vs ${slowTravel}`);
  advance(fast, 0.7);
  assert.ok(skinPoint(fast, front).x > quickTravel + 0.15, 'Steady tension yields without more movement events');
  advance(fast, 4); advance(slow, 4);
  assert.ok(Math.abs(skinPoint(fast, front).x - skinPoint(slow, front).x) < 0.015);
  fast.release(); advance(fast, 12);
  assert.ok(fast.isAtRest(), 'An arbitrarily released pull returns to rest');
});

test('a remaining side grip neither preserves a released top squeeze nor loses its own control', () => {
  const pair = new SoftBodyPhysics(gelCubeProfile.feel), single = new SoftBodyPhysics(gelCubeProfile.feel);
  for (const body of [pair, single]) { body.beginGrab(top, undefined, 1); advance(body, 1.5); }
  pair.beginGrab(front, { x: 0, y: 0, z: 1 }, 2);
  pair.release(1); single.release(1);
  advance(pair, 0.6); advance(single, 0.6);
  assert.ok(Math.abs(pair.compressionAmount - single.compressionAmount) < 1e-8);
  assert.equal(pair.diagnostics().contactCount, 1);
  pair.setPressure(0, 2); pair.moveGrab({ x: 0.7, y: 0.1, z: 0 }, 2); advance(pair, 0.7);
  assert.ok(skinPoint(pair, front).x > 0.25);
  pair.releaseAll(); advance(pair, 12); assert.ok(pair.isAtRest());
});

test('cube geometry is closed, rounded, finite and fits the deformation cage', () => {
  const geometry = createSoftGeometry('gel-cube');
  const position = geometry.getAttribute('position'), indices = geometry.index!;
  const edges = new Map<string, number>();
  for (let i = 0; i < indices.count; i += 3) {
    const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
    for (let edge = 0; edge < 3; edge++) {
      const a = ids[edge], b = ids[(edge + 1) % 3], key = `${Math.min(a, b)},${Math.max(a, b)}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  assert.ok([...edges.values()].every(count => count === 2), 'No cracks or open faces');
  assert.ok([...position.array, ...geometry.getAttribute('normal').array].every(Number.isFinite));
  geometry.computeBoundingBox(); const bounds = geometry.boundingBox!;
  assert.ok(bounds.min.y >= FLOOR && bounds.max.y < 2.04);
  assert.ok(bounds.min.x > -1.4 && bounds.max.x < 1.4 && bounds.min.z > -1.4 && bounds.max.z < 1.4);
  assert.ok(bounds.max.y - bounds.min.y > 1.6, 'The resting shape retains its cube height');
  geometry.dispose();
});

test('deep compression displaces gel sideways while preserving visible volume', () => {
  const body = new SoftBodyPhysics(gelCubeProfile.feel), geometry = createSoftGeometry('gel-cube', 16);
  const original = new Float32Array(geometry.getAttribute('position').array), output = new Float32Array(original.length);
  const bindings = Array.from({ length: original.length / 3 }, (_, i) => body.bind(original[i * 3], original[i * 3 + 1], original[i * 3 + 2]));
  const indices = geometry.index!;
  const measure = (vertices: Float32Array) => {
    let volume = 0;
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i) * 3, b = indices.getX(i + 1) * 3, c = indices.getX(i + 2) * 3;
      volume += vertices[a] * (vertices[b + 1] * vertices[c + 2] - vertices[b + 2] * vertices[c + 1])
        + vertices[a + 1] * (vertices[b + 2] * vertices[c] - vertices[b] * vertices[c + 2])
        + vertices[a + 2] * (vertices[b] * vertices[c + 1] - vertices[b + 1] * vertices[c]);
    }
    return Math.abs(volume / 6);
  };
  const volume = measure(original), width = (vertices: Float32Array) => {
    let low = Infinity, high = -Infinity;
    for (let i = 0; i < vertices.length; i += 3) { low = Math.min(low, vertices[i]); high = Math.max(high, vertices[i]); }
    return high - low;
  };
  body.beginGrab(top); advance(body, 2);
  body.deform(original, output, bindings);
  assert.ok(width(output) > width(original) * 1.15, 'A dense gel bulges instead of losing volume like foam');
  assert.ok(Math.abs(measure(output) / volume - 1) < 0.06, `Held volume: ${measure(output) / volume}`);
  body.release();
  for (let i = 0; i < 10; i++) {
    advance(body, 0.3); body.deform(original, output, bindings);
    assert.ok(Math.abs(measure(output) / volume - 1) < 0.06, 'Release keeps the same material volume');
  }
  body.reset(); body.deform(original, output, bindings); assert.deepEqual(output, original);
  geometry.dispose();
});

test('repeated opposing grips, interruptions and reduced motion remain finite and reset exactly', () => {
  for (const reduced of [false, true]) {
    const body = new SoftBodyPhysics(gelCubeProfile.feel); body.reducedMotion = reduced;
    for (let cycle = 0; cycle < 8; cycle++) {
      for (let id = 0; id < 5; id++) {
        const angle = id * Math.PI * 2 / 5;
        body.beginGrab({ x: Math.cos(angle) * 0.7, y: 1.2, z: Math.sin(angle) * 0.7 }, { x: Math.cos(angle), y: 0.3, z: Math.sin(angle) }, id);
        body.setPressure(cycle % 2 ? 0 : 1.3, id);
        body.moveGrab({ x: Math.cos(angle) * 20, y: cycle % 2 ? 20 : -20, z: Math.sin(angle) * 20 }, id);
      }
      advance(body, 0.3);
      assert.ok([...body.positions, ...body.velocities].every(Number.isFinite));
      assert.ok(body.diagnostics().minVolumeRatio > 0, 'Extreme gestures cannot turn cells inside out');
      body.releaseAll(); advance(body, 0.2);
    }
    body.reset(); assert.deepEqual(body.positions, body.rest); assert.ok(body.isAtRest());
    assert.equal(body.compressionAmount, 0);
  }
});
