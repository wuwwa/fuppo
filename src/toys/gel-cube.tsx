import type { ToyDefinition } from './types';
import { softBodyControls } from './soft-body-copy';

function GelCubeIcon() {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="m5 9 10-5a3 3 0 0 1 2 0l10 5a3 3 0 0 1 2 3v12a3 3 0 0 1-2 3l-10 4-12-5a3 3 0 0 1-2-3V12a3 3 0 0 1 2-3Z" fill="currentColor" />
    <path d="m5 11 12 5 10-5M17 16v12M8 15v5" stroke="var(--toy-surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export const gelCube: ToyDefinition = {
  id: 'gel-cube', name: 'Gel Cube', preview: '/previews/gel-cube.webp', icon: GelCubeIcon,
  description: 'Quick pokes rebound. Slow squeezes sink into cool, dense gel.',
  theme: { background: '#edf2ef', foreground: '#254d54', accent: '#287c87', muted: '#668184', surface: '#f7fbf8', border: '#cbdcd8' },
  copy: {
    ...softBodyControls,
    loading: 'Setting down the gel',
    instructions: ['Poke for a quick rebound', 'Hold to sink deeper', 'Pull slowly to let it yield'],
    touchInstructions: ['Poke for a quick rebound', 'Hold to sink deeper', 'Pull slowly to let it yield'],
    keyboardHint: <><kbd>←</kbd> / <kbd>→</kbd> to rotate <span>·</span> hold <kbd>space</kbd> to squeeze <span>·</span> add arrows to stretch or <kbd>Q</kbd> / <kbd>E</kbd> to twist</>,
    touchGuide: [
      { gesture: 'Poke and release', description: 'A short touch makes a shallow dent that springs back.' },
      { gesture: 'Sink into it', description: 'Keep holding. The dense gel slowly yields, then rises gently when you let go.' },
      { gesture: 'Pull slowly', description: 'A quick tug meets resistance. Move slowly or hold the pull to let the gel stretch farther.' },
      { gesture: 'Use two fingers', description: 'Hold two spots to pinch or stretch. Each finger keeps its own grip when the other lets go.' },
      ...softBodyControls.touchGuide.filter(step => step.gesture === 'Turn it around'),
    ],
  },
  load: () => import('../gel-cube/entry'),
};
