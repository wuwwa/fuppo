import type { ToyController, ToyDefinition, ToyPreferences, TransformationState, BonusRoundSnapshot } from '../toys/types';
import { normalizeVolume } from '../audio/volume';

export interface SessionEvents {
  onReady(supportsSound: boolean): void;
  onInteractionChange(active: boolean): void;
  onError(message: string): void;
  onSoundError(message: string): void;
  onTransformationChange?(state: TransformationState): void;
  onBonusRoundChange?(state: BonusRoundSnapshot): void;
}

/** Owns one mounted toy and prevents callbacks from retired sessions. */
export class ToySession {
  private readonly abort = new AbortController();
  private controller: ToyController | null = null;
  private disposed = false;
  private failed = false;
  private started = false;
  private soundRevision = 0;
  private preferences: ToyPreferences;

  constructor(
    private readonly definition: ToyDefinition,
    private readonly host: HTMLElement,
    private readonly events: SessionEvents,
    preferences: ToyPreferences,
  ) { this.preferences = { ...preferences, volume: normalizeVolume(preferences.volume) }; }

  private get active() { return !this.disposed && !this.failed; }

  async start(): Promise<void> {
    if (this.started || !this.active) return;
    this.started = true;
    try {
      const module = await this.definition.load();
      if (!this.active) return;
      const controller = await module.mount(this.host, {
        signal: this.abort.signal,
        theme: this.definition.theme,
        preferences: { ...this.preferences },
        onInteractionChange: active => { if (this.active) this.events.onInteractionChange(active); },
        onTransformationChange: state => { if (this.active) this.events.onTransformationChange?.(state); },
        onBonusRoundChange: state => { if (this.active) this.events.onBonusRoundChange?.(state); },
        onError: message => this.fail(message),
      });
      if (!this.active) { this.destroy(controller); return; }
      if (!controller) throw new Error('This toy could not start. Please try again.');
      this.controller = controller;
      controller.setVolume?.(this.preferences.volume);
      controller.setReducedMotion?.(this.preferences.reducedMotion);
      controller.setPaused?.(this.preferences.paused);
      this.events.onReady(typeof controller.setSound === 'function');
      // Restoring audio must not delay the first usable frame.
      if (this.preferences.sound) void this.setSound(true);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'This toy could not start. Please try again.');
    }
  }

  reset() {
    if (!this.active) return;
    try { this.controller?.reset(); }
    catch (error) { this.fail(error instanceof Error ? error.message : 'Could not reset this toy.'); }
  }

  setPaused(paused: boolean) {
    this.preferences.paused = paused;
    if (!this.active) return;
    try { this.controller?.setPaused?.(paused); }
    catch { this.fail('This toy could not pause safely. Please try again.'); }
  }

  setReducedMotion(reduced: boolean) {
    this.preferences.reducedMotion = reduced;
    if (!this.active) return;
    try { this.controller?.setReducedMotion?.(reduced); }
    catch { this.fail('This toy could not update its motion settings. Please try again.'); }
  }

  setVolume(volume: number) {
    this.preferences.volume = normalizeVolume(volume);
    if (!this.active) return;
    try { this.controller?.setVolume?.(this.preferences.volume); }
    catch { this.fail('This toy could not update its sound level. Please try again.'); }
  }

  setTransformation(enabled: boolean) {
    if (!this.active) return;
    try { this.controller?.setTransformation?.(enabled); }
    catch { this.fail('This toy could not change its material. Try again to restart it.'); }
  }

  startBonusRound() {
    if (!this.active) return;
    try { this.controller?.startBonusRound?.(); }
    catch { this.fail('The bonus could not start. Try again to restart Jelly.'); }
  }

  finishBonusRound() {
    if (!this.active) return;
    try { this.controller?.finishBonusRound?.(); }
    catch { this.fail('The bonus could not finish. Try again to restart Jelly.'); }
  }

  async setSound(enabled: boolean): Promise<void> {
    this.preferences.sound = enabled;
    const revision = ++this.soundRevision;
    if (!this.active || !this.controller?.setSound) return;
    // Never queue behind resume(): autoplay can leave it pending until another
    // gesture. Both mute and retry must reach the backend in this call stack.
    try { await this.controller.setSound(enabled); }
    catch {
      if (this.active && revision === this.soundRevision) {
        this.preferences.sound = false;
        this.events.onSoundError('Sound couldn’t start. Tap to try again.');
      }
    }
  }

  private fail(message: string) {
    if (!this.active) return;
    this.failed = true;
    this.abort.abort();
    const controller = this.controller;
    this.controller = null;
    this.destroy(controller);
    this.events.onError(message);
  }

  private destroy(controller: ToyController | null) {
    // A broken cleanup must not prevent the next toy from mounting.
    try { controller?.dispose(); }
    catch (error) { console.error(`Could not finish cleaning up ${this.definition.id}`, error); }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    const controller = this.controller;
    this.controller = null;
    this.destroy(controller);
  }
}
