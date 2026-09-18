const gestures = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const;

/** Retry browser-blocked audio only while the user has opted into sound. */
export class AudioActivation {
  private enabled = false;
  private disposed = false;

  constructor(
    private readonly context: AudioContext,
    private readonly onInterrupted: () => void,
    private readonly target: EventTarget | undefined = globalThis.document,
  ) {
    context.addEventListener('statechange', this.stateChanged);
  }

  private stateChanged = () => {
    if (this.enabled && this.context.state !== 'running') this.onInterrupted();
  };

  private interact = (event: Event) => {
    if (!event.isTrusted) return;
    // Do not reuse a pending resume promise: a fresh call inside a gesture can
    // unlock a context whose earlier automatic restoration is still blocked.
    void this.resume().catch(() => { /* A later gesture can retry. */ });
  };

  private async resume() {
    if (!this.enabled || this.disposed || this.context.state === 'running') return;
    await this.context.resume();
  }

  setEnabled(enabled: boolean): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      for (const type of gestures) {
        if (enabled) this.target?.addEventListener(type, this.interact, { capture: true, passive: true });
        else this.target?.removeEventListener(type, this.interact, true);
      }
    }
    return this.resume();
  }

  dispose() {
    void this.setEnabled(false);
    this.disposed = true;
    this.context.removeEventListener('statechange', this.stateChanged);
  }
}
