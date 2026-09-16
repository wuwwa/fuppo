export const DEFAULT_AUDIO_VOLUME = 0.8;

/** Keep every audio backend on the same finite, conventional 0–1 scale. */
export function normalizeVolume(value: unknown, fallback = DEFAULT_AUDIO_VOLUME) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}
