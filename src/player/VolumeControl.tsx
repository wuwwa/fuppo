import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

/** A vertical fader that leaves room for the toy when it is not being adjusted. */
export function VolumeControl({ volume, onChange, disabled, paused, sound }: {
  volume: number;
  onChange(volume: number): void;
  disabled: boolean;
  paused: boolean;
  sound: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const id = useId();
  const percent = Math.round(volume * 100);

  useEffect(() => {
    if (disabled || paused) setOpen(false);
  }, [disabled, paused]);

  useEffect(() => {
    if (!open) return;
    slider.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return <div className="volume-control" ref={root}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus();
      }
    }}>
    <button ref={trigger} className="volume-trigger" disabled={disabled}
      aria-label={`Adjust volume, ${percent}%`} aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(value => !value)} title="Adjust volume">
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M3 13v2M7 10v5M11 6v9M15 3v12" />
      </svg>
      <span className="volume-value" aria-hidden="true">{percent}%</span>
    </button>
    <div id={id} className="volume-panel floating-surface" hidden={!open} role="group" aria-label="Volume">
      <label htmlFor={`${id}-slider`}>Volume</label>
      <output aria-hidden="true">{percent}%</output>
      <input ref={slider} id={`${id}-slider`} className="volume-slider" type="range" min="0" max="100" step="0.1"
        value={volume * 100} disabled={disabled} aria-orientation="vertical" aria-valuetext={`${percent}%`}
        onChange={event => onChange(Number(event.currentTarget.value) / 100)}
        onKeyDown={event => {
          // Pointer motion is continuous; keys make deliberate one-percent changes.
          const direction = ['ArrowUp', 'ArrowRight'].includes(event.key) ? 1 : ['ArrowDown', 'ArrowLeft'].includes(event.key) ? -1 : 0;
          if (direction) { event.preventDefault(); onChange(Math.max(0, Math.min(1, volume + direction * .01))); }
        }}
        style={{ '--volume-level': `${volume * 100}%` } as CSSProperties} />
      <span className="volume-hint">{!sound ? 'Muted' : percent === 0 ? 'Silent' : 'Sound on'}</span>
    </div>
  </div>;
}
