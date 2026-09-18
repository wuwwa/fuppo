import * as THREE from 'three';
import type { ToyContext, ToyController } from '../toys/types';
import { SoftBodyAudio } from '../soft-body/audio';
import { SliceModel, type Point } from './model';
import { SliceRenderer } from './render';
import { HealingGel } from './healing';
import { TouchSurface } from './touch-surface';
import { crown } from './surface';
import './style.css';

export function mountTouchGel(host: HTMLElement, context: ToyContext): ToyController | null {
  if (context.signal.aborted) return null;
  const canvas = document.createElement('canvas'); canvas.className = 'toy-canvas slice-canvas'; canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application'); canvas.setAttribute('aria-label', 'Rose Jelly');
  canvas.setAttribute('aria-describedby', 'toy-instructions keyboard-instructions');
  const focus = document.createElement('span'); focus.className = 'slice-touch-focus'; focus.hidden = true; focus.setAttribute('aria-hidden', 'true');
  host.append(canvas, focus);
  let view: SliceRenderer;
  try { view = new SliceRenderer(canvas, 'slab', context.theme); }
  catch (error) { canvas.remove(); focus.remove(); throw error; }
  const shape = new SliceModel('slab'), field = new HealingGel(), audio = new SoftBodyAudio(.9);
  let surface: TouchSurface;
  try {
    view.rebuild(shape, .1); surface = new TouchSurface(view.gel, field);
    view.gel.material.roughness = .18; view.gel.material.clearcoat = .24; view.gel.material.clearcoatRoughness = .2;
  }
  catch (error) { view.dispose(); audio.dispose(); canvas.remove(); focus.remove(); throw error; }
  let disposed = false, paused = context.preferences.paused, reduced = context.preferences.reducedMotion;
  let frame = 0, lastFrame = 0, accumulator = 0, frames = 0, soundTail = 0, keyboard = false;
  let aim: Point = { x: 0, z: 0 };
  const pointers = new Map<number, { time: number; touched: boolean }>(), keys = new Set<string>();
  const raycaster = new THREE.Raycaster(), target = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -view.height);
  const keyboardId = -1;
  function diagnostics() {
    if (import.meta.env.DEV) canvas.dataset.diagnostics = JSON.stringify({
      kind: 'slab', interaction: 'touch', frames, paused, reduced, contacts: field.contacts.size,
      pointers: pointers.size, keyboard: keys.has('Space'), moving: field.moving,
      maxDent: +field.maxDent.toFixed(4), aim, memory: view.diagnostics, audio: audio.diagnostics(),
    });
  }
  function draw(elapsed = 0) {
    surface.update(); view.update(shape, null, null, true, surface.scaleAt); view.render(elapsed);
    focus.hidden = !keyboard;
    if (keyboard) {
      const rect = canvas.getBoundingClientRect();
      target.set(aim.x, .025 + (view.height + crown(aim.x, aim.z)) * surface.scaleAt(aim.x, aim.z), aim.z).project(view.camera);
      focus.style.left = `${(target.x + 1) * rect.width / 2}px`;
      focus.style.top = `${(1 - target.y) * rect.height / 2}px`;
    }
    frames++; diagnostics();
  }
  function wake() { if (!disposed && !paused && !frame) { lastFrame = 0; frame = requestAnimationFrame(tick); } }
  function moveAim(right: number, down: number) {
    aim = { x: THREE.MathUtils.clamp(aim.x + right * .82 + down * .57, -1.3, 1.3), z: THREE.MathUtils.clamp(aim.z - right * .57 + down * .82, -1.13, 1.13) };
  }
  function tick(now: number) {
    frame = 0; if (disposed || paused) return;
    const elapsed = lastFrame ? Math.min(.05, (now - lastFrame) / 1000) : 1 / 60; lastFrame = now;
    try {
      accumulator = Math.min(.05, accumulator + elapsed);
      while (accumulator >= 1 / 120 - 1e-8) {
        if (keyboard) {
          const dx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
          const dz = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
          if (dx || dz) { moveAim(dx / 120, dz / 120); if (keys.has('Space')) field.move(keyboardId, aim, 1 / 120); }
        }
        field.step(1 / 120, reduced); accumulator -= 1 / 120;
      }
      const touching = [...field.contacts.values()].filter(contact => field.contains(contact.point)).length;
      audio.update({ contacts: touching, compression: field.maxDent / .8, stretch: 0, motion: Math.min(1, field.motion / 2), twist: 0 });
      soundTail = Math.max(0, soundTail - elapsed); draw(elapsed * 1000);
    } catch (error) { dispose(); context.onError(error instanceof Error ? error.message : 'The jelly stopped. Please try again.'); return; }
    if (field.moving || keys.size || soundTail > 0) frame = requestAnimationFrame(tick);
  }
  function point(event: PointerEvent): Point {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), view.camera);
    const hit = raycaster.intersectObject(view.gel.mesh, false)[0];
    if (hit) target.copy(hit.point);
    else if (!raycaster.ray.intersectPlane(plane, target)) return { x: 6, z: 6 };
    return { x: THREE.MathUtils.clamp(target.x, -5, 5), z: THREE.MathUtils.clamp(target.z, -5, 5) };
  }
  function pointerDown(event: PointerEvent) {
    if (disposed || paused || (event.pointerType !== 'touch' && event.button !== 0) || pointers.size >= 5) return;
    event.preventDefault(); keyboard = false; keys.clear(); field.end(keyboardId);
    const p = point(event);
    try { canvas.setPointerCapture(event.pointerId); } catch { return; }
    if (!field.begin(event.pointerId, p)) return;
    canvas.classList.add('is-pointer-focused'); canvas.focus({ preventScroll: true });
    const touched = field.contains(p); pointers.set(event.pointerId, { time: event.timeStamp, touched });
    if (touched) { audio.play('press', .35); soundTail = .6; }
    context.onInteractionChange(true); wake();
  }
  function movePointer(event: PointerEvent) {
    const pointer = pointers.get(event.pointerId); if (!pointer) return;
    const p = point(event), touched = field.contains(p);
    if (touched && !pointer.touched) { audio.play('press', .3); pointer.touched = true; }
    field.move(event.pointerId, p, Math.max(.008, (event.timeStamp - pointer.time) / 1000)); pointer.time = event.timeStamp;
  }
  function pointerMove(event: PointerEvent) {
    if (disposed || paused || !pointers.has(event.pointerId)) return;
    event.preventDefault(); movePointer(event); wake();
  }
  function finishPointer(event: PointerEvent, cancelled: boolean) {
    const pointer = pointers.get(event.pointerId); if (!pointer) return;
    if (!cancelled) movePointer(event);
    pointers.delete(event.pointerId); field.end(event.pointerId);
    try { if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); } catch { /* Already released. */ }
    if (cancelled) audio.stop();
    else if (pointer.touched) { audio.play('release', .25 + field.maxDent * .35); soundTail = .7; }
    context.onInteractionChange(field.contacts.size > 0); wake();
  }
  const pointerUp = (event: PointerEvent) => finishPointer(event, false);
  const pointerCancel = (event: PointerEvent) => finishPointer(event, true);
  function releaseAll() {
    const ids = [...pointers.keys()]; pointers.clear(); keys.clear(); field.releaseAll(); keyboard = false; focus.hidden = true;
    for (const id of ids) try { if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id); } catch { /* Already released. */ }
    audio.stop(); soundTail = 0; context.onInteractionChange(false); wake();
  }
  function keyDown(event: KeyboardEvent) {
    if (disposed || paused || pointers.size || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyR', 'Escape'].includes(event.code)) return;
    event.preventDefault(); keyboard = true; canvas.classList.remove('is-pointer-focused');
    if (event.code === 'KeyR') { reset(); return; }
    if (event.code === 'Escape') { releaseAll(); return; }
    if (event.code === 'Space' && !keys.has('Space')) {
      field.begin(keyboardId, aim); audio.play('press', .35); context.onInteractionChange(true); soundTail = .6;
    }
    keys.add(event.code); wake();
  }
  function keyUp(event: KeyboardEvent) {
    if (!keys.has(event.code)) return;
    keys.delete(event.code);
    if (event.code === 'Space') { field.end(keyboardId); audio.play('release', .35); context.onInteractionChange(false); soundTail = .7; }
    wake();
  }
  function reset() { if (disposed) return; releaseAll(); field.reset(); aim = { x: 0, z: 0 }; accumulator = 0; draw(); wake(); }
  function resize() {
    if (disposed) return; releaseAll(); const rect = host.getBoundingClientRect();
    view.resize(Math.max(1, rect.width), Math.max(1, rect.height)); accumulator = 0; draw(); wake();
  }
  const observer = new ResizeObserver(() => { try { resize(); } catch (error) { dispose(); context.onError(String(error)); } });
  function visibility() { if (document.hidden) releaseAll(); }
  function lost(event: Event) { event.preventDefault(); dispose(); context.onError('Graphics were interrupted. Try again to restore the jelly.'); }
  function dispose() {
    if (disposed) return; disposed = true; releaseAll(); cancelAnimationFrame(frame); observer.disconnect();
    canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerCancel); canvas.removeEventListener('lostpointercapture', pointerCancel);
    canvas.removeEventListener('keydown', keyDown); canvas.removeEventListener('keyup', keyUp); canvas.removeEventListener('blur', releaseAll);
    canvas.removeEventListener('webglcontextlost', lost); window.removeEventListener('blur', releaseAll); document.removeEventListener('visibilitychange', visibility);
    context.signal.removeEventListener('abort', dispose); audio.dispose(); view.dispose(); canvas.remove(); focus.remove();
  }
  try {
    resize(); canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerCancel); canvas.addEventListener('lostpointercapture', pointerCancel);
    canvas.addEventListener('keydown', keyDown); canvas.addEventListener('keyup', keyUp); canvas.addEventListener('blur', releaseAll);
    canvas.addEventListener('webglcontextlost', lost); window.addEventListener('blur', releaseAll); document.addEventListener('visibilitychange', visibility);
    context.signal.addEventListener('abort', dispose, { once: true }); observer.observe(host); wake();
  } catch (error) { dispose(); throw error; }
  return {
    reset, dispose,
    async setSound(enabled) { await audio.setEnabled(enabled); if (!disposed) { diagnostics(); wake(); } },
    setVolume(volume) { if (!disposed) audio.setVolume(volume); },
    setPaused(value) { if (disposed) return; paused = value; releaseAll(); accumulator = 0; if (value) { cancelAnimationFrame(frame); frame = 0; } else wake(); diagnostics(); },
    setReducedMotion(value) { if (!disposed) { reduced = value; wake(); } },
  };
}
