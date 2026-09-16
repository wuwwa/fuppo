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
  description: 'Press it flat. Stretch it to its limit to peel it free.',
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
    touchGuide: softBodyControls.touchGuide.map(step=>step.gesture==='Peel it free'
      ? {gesture:'Stretch to its limit',description:'Pull up and away. The butter stretches while its base stays stuck. Keep tension at the very end of the stretch to peel the last strip free.'}
      : step),
  },
  load: () => import('../butter/entry'),
};
