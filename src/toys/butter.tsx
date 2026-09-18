import type { ToyDefinition } from './types';
import { softBodyControls } from './soft-body-copy';

function ButterIcon() {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="m3 13 7-6 20 5v10l-7 5-20-5Z" fill="currentColor" />
    <path d="m3 13 20 5 7-6M23 18v9M10 10l-4 4m10-2-4 4m10-3-4 4" stroke="var(--toy-surface)" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>;
}

export const butter: ToyDefinition = {
  id: 'butter', preview: '/previews/butter.webp', name: 'Butter',
  description: 'Hold to sink in. Pull slowly to stretch the dense foam.',
  icon: ButterIcon,
  theme: {
    background: '#f3ecdb', foreground: '#57462d', accent: '#987233',
    muted: '#82735b', surface: '#fffaf0', border: '#d9ccb1',
  },
  copy: {
    loading: 'Unwrapping butter',
    instructions: ['Hold to squish', 'Stretch to its limit to peel'],
    touchInstructions: ['Hold to squish', 'Stretch to its limit to peel'],
    ...softBodyControls,
    touchGuide: [
      {gesture:'Hold to sink in',description:'Touch for a shallow squish. Keep holding to sink deeper, then lift your finger and watch the foam rise.'},
      {gesture:'Feel it yield',description:'A quick pull stretches the foam partway. Pull slowly or hold the stretch to let it ease farther.'},
      {gesture:'Use two fingers',description:'Hold two spots and draw them apart. Let one finger go while the other keeps its grip.'},
      {gesture:'Stretch to its limit',description:'Pull up and away. The butter stretches while its base stays stuck. Keep tension at the very end of the stretch to peel the last strip free.'},
      ...softBodyControls.touchGuide.filter(step=>step.gesture==='Turn it around'),
    ],
  },
  load: () => import('../butter/entry'),
};
