import type { Point } from './physics';

export interface AdhesionFeel { onset: number; distance: number; rate: number }
export interface PeelContact { id: number; anchor: Point; offset: Point; pressure: number }
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** A moving contact line beneath the elastic skin. The vertical shear preserves
 * volume and has an exact inverse for picking; material dents remain independent
 * of lifting the whole toy, so putty never learns an airborne resting shape. */
export class FloorAdhesion {
  progress = 0;
  detached = false;
  releases = 0;
  motion = 0;
  private owner: number | null = null;
  private direction = { x: 1, z: 0 };
  private lift = 0;
  private x = 0;
  private z = 0;
  private previous = { progress: 0, lift: 0, x: 0, z: 0 };
  private returnAge = 0;

  constructor(readonly feel: AdhesionFeel) {}
  get active() { return this.progress > 0 || this.lift > 0; }

  step(dt: number, contacts: readonly PeelContact[], reducedMotion: boolean) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > .05) return;
    this.previous.progress=this.progress;this.previous.lift=this.lift;
    this.previous.x=this.x;this.previous.z=this.z;
    // One contact owns the peel until it is released. Additional fingers cannot
    // multiply progress, or alternate the hinge direction every solver tick.
    let contact = contacts.find(c => c.id === this.owner);
    const load = (c: PeelContact) => Math.hypot(c.offset.x, Math.max(0, c.offset.y), c.offset.z)
      * (1 - clamp(c.pressure)) * (c.offset.y < -.12 ||
        c.offset.y < .18 && c.offset.x*c.anchor.x+c.offset.z*c.anchor.z < -.1 ? 0 : 1);
    if (!contact) contact = contacts.reduce<PeelContact | undefined>((best, c) =>
      !best || load(c) > load(best) ? c : best, undefined);
    const effort = contact ? load(contact) : 0;
    if(contact && this.detached && this.owner===null && effort>this.feel.onset) this.detached=false;
    if (contact && (effort > this.feel.onset || this.detached && this.owner!==null)) {
      this.returnAge = 0;
      if (!this.active) {
        const x = contact.anchor.x || contact.offset.x;
        const z = contact.anchor.z || contact.offset.z;
        const length = Math.hypot(x, z);
        this.direction = length > .15 ? { x: x / length, z: z / length } : { x: 1, z: 0 };
      }
      this.owner = contact.id;
      if (!this.detached) {
        const target = clamp((effort - this.feel.onset) / this.feel.distance);
        // Small bands catch, then yield as the contact line crosses them. Even
        // an extreme pointer jump must pull through the full resistant peel.
        const catchBand = .46 + .54 * (1 - Math.cos(this.progress * Math.PI * 10)) / 2;
        this.progress += Math.max(0, Math.min(target - this.progress, dt * this.feel.rate * catchBand));
        if (this.progress >= .999) { this.progress = 1; this.detached = true; this.releases++; }
      }
      const free = smooth((this.progress - .82) / .18);
      const targetLift = free * (.48 + .28 * Math.tanh(Math.max(0, contact.offset.y)));
      const follow = 1 - Math.exp(-dt * (reducedMotion ? 11 : 18));
      this.lift += (targetLift - this.lift) * follow;
      this.x += (free * .48 * Math.tanh(contact.offset.x) - this.x) * follow;
      this.z += (free * .48 * Math.tanh(contact.offset.z) - this.z) * follow;
    } else {
      this.owner = null;
      this.returnAge += dt;
      const decay = Math.exp(-dt * (this.detached ? 5 : 7));
      this.lift *= decay; this.x *= decay; this.z *= decay;
      this.progress *= decay;
      if (this.returnAge > 1.8 || this.progress < .0001) {
        this.progress = this.lift = this.x = this.z = 0; this.detached = false;
      }
    }
    this.motion = Math.min(1, Math.abs(this.progress - this.previous.progress) / dt);
  }

  offset(x: number, z: number, output: Point, alpha = 1) {
    const progress = this.previous.progress+(this.progress-this.previous.progress)*alpha;
    const along = (x * this.direction.x + z * this.direction.z) / 1.7;
    const front = smooth((progress * 2.4 - 1.2 + along) / .65);
    output.x = this.previous.x+(this.x-this.previous.x)*alpha;
    output.z = this.previous.z+(this.z-this.previous.z)*alpha;
    output.y = this.previous.lift+(this.lift-this.previous.lift)*alpha
      + .42 * front * smooth(progress/.3) * (1-smooth((progress-.82)/.18));
    return output;
  }

  unmap(point: Point): Point {
    const x = point.x - this.x, z = point.z - this.z;
    const offset = this.offset(x, z, { x: 0, y: 0, z: 0 });
    return { x, y: point.y - offset.y, z };
  }

  reset() {
    this.progress = this.lift = this.x = this.z = this.motion = this.releases = this.returnAge = 0;
    this.detached = false; this.owner = null;
    this.previous = { progress: 0, lift: 0, x: 0, z: 0 };
  }

  diagnostics() { return { progress: this.progress, detached: this.detached, releases: this.releases,
    lift: this.lift, motion: this.motion }; }
}
