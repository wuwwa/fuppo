import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioActivation } from '../src/audio/activation';

class Gestures extends EventTarget {
  fire(type: string, trusted = true) {
    const event = new Event(type);
    Object.defineProperty(event, 'isTrusted', { value: trusted });
    this.dispatchEvent(event);
  }
}

class Context extends EventTarget {
  state = 'suspended';
  calls = 0;
  blocked = true;
  reject = false;
  pending: (() => void)[] = [];
  resume() {
    this.calls++;
    if (this.reject) return Promise.reject(new Error('temporarily unavailable'));
    const promise = new Promise<void>(resolve => this.pending.push(resolve));
    if (!this.blocked) {
      this.state = 'running';
      this.pending.splice(0).forEach(resolve => resolve());
      this.dispatchEvent(new Event('statechange'));
    }
    return promise;
  }
}

test('a trusted gesture retries resume while automatic restoration is still pending', async () => {
  const context = new Context(), gestures = new Gestures();
  const activation = new AudioActivation(context as unknown as AudioContext, () => {}, gestures);
  const starting = activation.setEnabled(true);
  assert.equal(context.calls, 1);
  gestures.fire('pointerdown', false);
  assert.equal(context.calls, 1, 'Synthetic input must not trigger recovery');
  context.blocked = false;
  gestures.fire('pointerdown');
  assert.equal(context.calls, 2, 'Retry must run synchronously inside the gesture');
  await starting;
  gestures.fire('pointerup'); gestures.fire('touchend'); gestures.fire('keydown');
  assert.equal(context.calls, 2, 'Running audio needs no extra resumes');
  activation.dispose();
});

test('suspended and Safari interrupted contexts recover with pointer, touch, or keyboard input', async () => {
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
    const context = new Context(), gestures = new Gestures();
    let interruptions = 0;
    context.blocked = false;
    const activation = new AudioActivation(context as unknown as AudioContext, () => { interruptions++; }, gestures);
    await activation.setEnabled(true);
    for (const state of ['suspended', 'interrupted']) {
      context.state = state; context.dispatchEvent(new Event('statechange'));
      gestures.fire(type);
      assert.equal(context.state, 'running');
    }
    assert.equal(context.calls, 3); assert.equal(interruptions, 2);
    activation.dispose();
  }
});

test('mute and disposal remove recovery listeners, even with a pending resume', async () => {
  for (const action of ['mute', 'dispose']) {
    const context = new Context(), gestures = new Gestures();
    let interruptions = 0;
    const activation = new AudioActivation(context as unknown as AudioContext, () => { interruptions++; }, gestures);
    gestures.fire('pointerdown'); assert.equal(context.calls, 0);
    const starting = activation.setEnabled(true);
    if (action === 'mute') await activation.setEnabled(false); else activation.dispose();
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) gestures.fire(type);
    context.dispatchEvent(new Event('statechange'));
    assert.equal(context.calls, 1); assert.equal(interruptions, 0);
    context.pending.splice(0).forEach(resolve => resolve()); await starting;
    gestures.fire('keydown'); assert.equal(context.calls, 1);
    activation.dispose();
    await activation.setEnabled(true); assert.equal(context.calls, 1);
  }
});

test('a failed recovery can retry on the next gesture without an unhandled rejection', async () => {
  const context = new Context(), gestures = new Gestures();
  context.blocked = false;
  const activation = new AudioActivation(context as unknown as AudioContext, () => {}, gestures);
  await activation.setEnabled(true);
  context.state = 'suspended'; context.reject = true;
  gestures.fire('keydown');
  await new Promise(resolve => setImmediate(resolve));
  context.reject = false; gestures.fire('touchend');
  assert.equal(context.state, 'running'); assert.equal(context.calls, 3);
  activation.dispose();
});
