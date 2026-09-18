import { mountTouchGel } from '../src/slicing/touch-scene';
import { jellySlice } from '../src/toys/slicing';

const host = document.querySelector<HTMLElement>('#stage')!, status = document.querySelector<HTMLOutputElement>('#status')!;
const abort = new AbortController();
const controller = mountTouchGel(host, {
  signal: abort.signal, theme: jellySlice.theme,
  preferences: { sound: false, volume: .8, paused: false, reducedMotion: false },
  onInteractionChange(active) { status.value = active ? 'Touching' : 'Ready'; },
  onError(message) { status.value = message; },
})!;
const canvas = host.querySelector('canvas')!;
// These explicit review controls exercise the same keyboard path as the app.
document.querySelector('#hold')!.addEventListener('click', () => {
  canvas.focus(); canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
});
document.querySelector('#release')!.addEventListener('click', () => {
  canvas.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
});
document.querySelector('#reset')!.addEventListener('click', () => controller.reset());
document.querySelector('#export')!.addEventListener('click', () => {
  controller.reset(); // Render synchronously before reading the drawing buffer.
  const thumbnail = document.createElement('canvas'); thumbnail.width = 240; thumbnail.height = 180;
  const ratio = canvas.width / 480;
  thumbnail.getContext('2d')!.drawImage(canvas, 0, 60 * ratio, canvas.width, 360 * ratio, 0, 0, 240, 180);
  const download = document.querySelector<HTMLAnchorElement>('#download')!;
  download.href = thumbnail.toDataURL('image/webp', .78); download.hidden = false;
  status.value = 'Thumbnail ready';
});
window.addEventListener('pagehide', () => abort.abort(), { once: true });
status.value = 'Ready';
