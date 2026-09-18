import type { Point } from './model';

export const FIELD_WIDTH = 97, FIELD_HEIGHT = 89;
export const FIELD_X = 1.65, FIELD_Z = 1.5;
const DX = 2 * FIELD_X / (FIELD_WIDTH - 1), DZ = 2 * FIELD_Z / (FIELD_HEIGHT - 1);
const COUNT = FIELD_WIDTH * FIELD_HEIGHT;
const valid = (p: Point) => Number.isFinite(p.x + p.z) && Math.abs(p.x) <= 6 && Math.abs(p.z) <= 6;
type Contact = { point: Point; held: number; distance: number; speed: number };

/** A bounded material field: every dent and seam recovers independently.
 * The bottom stays connected, so healing never swaps or resets the object. */
export class HealingGel {
  readonly height = new Float32Array(COUNT);
  readonly slopeX = new Float32Array(COUNT);
  readonly slopeZ = new Float32Array(COUNT);
  private readonly smoothed = new Float32Array(COUNT);
  private readonly smoothing = new Float32Array(COUNT);
  private readonly memory = new Float32Array(COUNT);
  private readonly age = new Float32Array(COUNT);
  private readonly velocity = new Float32Array(COUNT);
  readonly contacts = new Map<number, Contact>();
  moving = false;
  maxDent = 0;
  revision = 0;

  contains(p: Point) {
    if (!valid(p)) return false;
    const x = Math.max(0, Math.abs(p.x) - 1.03), z = Math.max(0, Math.abs(p.z) - .87);
    return x * x + z * z <= .38 ** 2;
  }
  begin(id: number, p: Point) {
    if (!valid(p) || this.contacts.has(id) || this.contacts.size >= 5) return false;
    this.contacts.set(id, { point: { ...p }, held: 0, distance: 0, speed: 0 });
    this.stamp(p, .095, .24, true); this.moving = true;
    return true;
  }
  move(id: number, p: Point, elapsed = 1 / 60) {
    const contact = this.contacts.get(id);
    if (!contact || !valid(p)) return;
    const start = contact.point, dx = p.x - start.x, dz = p.z - start.z, length = Math.hypot(dx, dz);
    if (length < .0001) return;
    contact.speed = Math.min(4, length / Math.max(.008, Number.isFinite(elapsed) ? elapsed : .016));
    // Sample the complete endpoint segment, including pointerup. Event rate
    // changes neither the groove spacing nor whether a quick stroke responds.
    const steps = Math.min(180, Math.max(1, Math.ceil(length / .035)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, point = { x: start.x + dx * t, z: start.z + dz * t };
      if (this.contains(point)) contact.distance = Math.min(8, contact.distance + length / steps);
      const depth = .12 + .52 * (1 - Math.exp(-contact.distance * 1.1));
      this.stamp(point, depth, .135 + .018 * Math.min(1, contact.distance), true);
    }
    contact.point = { ...p }; this.moving = true;
  }
  end(id: number) { this.contacts.delete(id); }
  releaseAll() { this.contacts.clear(); }
  reset() {
    this.contacts.clear(); this.height.fill(0); this.memory.fill(0); this.velocity.fill(0);
    this.age.fill(0); this.slopeX.fill(0); this.slopeZ.fill(0);
    this.smoothed.fill(0); this.smoothing.fill(0);
    this.maxDent = 0; this.moving = false; this.revision++;
  }
  private stamp(point: Point, depth: number, radius: number, immediate: boolean) {
    if (!this.contains(point)) return;
    const reach = radius * 3.8;
    const minX = Math.max(0, Math.floor((point.x - reach + FIELD_X) / DX));
    const maxX = Math.min(FIELD_WIDTH - 1, Math.ceil((point.x + reach + FIELD_X) / DX));
    const minZ = Math.max(0, Math.floor((point.z - reach + FIELD_Z) / DZ));
    const maxZ = Math.min(FIELD_HEIGHT - 1, Math.ceil((point.z + reach + FIELD_Z) / DZ));
    for (let z = minZ; z <= maxZ; z++) for (let x = minX; x <= maxX; x++) {
      const px = x * DX - FIELD_X - point.x, pz = z * DZ - FIELD_Z - point.z;
      const q = (px * px + pz * pz) / (radius * radius);
      // A shallow raised lip surrounds the depression, with a smooth falloff.
      const weight = Math.exp(-q * .5) * (1 - .28 * q);
      const i = z * FIELD_WIDTH + x, value = depth * weight;
      if (Math.abs(value) > Math.abs(this.memory[i])) this.memory[i] = value;
      // Only refresh the loaded patch. Old grooves elsewhere keep healing.
      if (Math.abs(value) >= Math.abs(this.memory[i]) * .98) this.age[i] = 0;
      const initial = Math.min(.055, depth) * weight;
      if (immediate && Math.abs(initial) > Math.abs(this.height[i])) this.height[i] = initial;
    }
  }
  step(elapsed: number, reduced: boolean) {
    if (!Number.isFinite(elapsed) || elapsed <= 0) return;
    const dt = Math.min(.05, elapsed);
    for (const contact of this.contacts.values()) {
      contact.held = Math.min(30, contact.held + dt);
      contact.speed *= Math.exp(-dt * 15);
      this.stamp(contact.point, .095 + .255 * (1 - Math.exp(-contact.held * 2.4)), .24, false);
    }
    const omega = reduced ? 22 : 19, decay = Math.exp(-omega * dt);
    let moving = false, maxDent = 0;
    for (let i = 0; i < COUNT; i++) {
      this.age[i] += dt;
      if (this.age[i] > .22) this.memory[i] *= Math.exp(-dt * (reduced ? 2.9 : 2.1));
      if (Math.abs(this.memory[i]) < .00015) this.memory[i] = 0;
      const displacement = this.height[i] - this.memory[i], c = this.velocity[i] + omega * displacement;
      this.height[i] = this.memory[i] + (displacement + c * dt) * decay;
      this.velocity[i] = (this.velocity[i] - omega * c * dt) * decay;
      if (!this.memory[i] && Math.abs(this.height[i]) < .00015 && Math.abs(this.velocity[i]) < .002) {
        this.height[i] = this.velocity[i] = 0;
      }
      maxDent = Math.max(maxDent, this.height[i]);
      if (Math.abs(this.velocity[i]) > .0005 || Math.abs(this.height[i] - this.memory[i]) > .0001 || (this.memory[i] !== 0 && this.age[i] > .05)) moving = true;
    }
    // Blend overlapping contact patches before deriving their normals. The
    // fixed kernel removes stamp scallops without blurring away a small poke.
    for (let z = 0; z < FIELD_HEIGHT; z++) for (let x = 0; x < FIELD_WIDTH; x++) {
      const i = z * FIELD_WIDTH + x;
      this.smoothing[i] = (this.height[z * FIELD_WIDTH + Math.max(0, x - 1)] + 2 * this.height[i] + this.height[z * FIELD_WIDTH + Math.min(FIELD_WIDTH - 1, x + 1)]) * .25;
    }
    for (let z = 0; z < FIELD_HEIGHT; z++) for (let x = 0; x < FIELD_WIDTH; x++) {
      const i = z * FIELD_WIDTH + x;
      this.smoothed[i] = (this.smoothing[Math.max(0, z - 1) * FIELD_WIDTH + x] + 2 * this.smoothing[i] + this.smoothing[Math.min(FIELD_HEIGHT - 1, z + 1) * FIELD_WIDTH + x]) * .25;
    }
    for (let z = 1; z < FIELD_HEIGHT - 1; z++) for (let x = 1; x < FIELD_WIDTH - 1; x++) {
      const i = z * FIELD_WIDTH + x;
      this.slopeX[i] = (this.smoothed[i + 1] - this.smoothed[i - 1]) / (2 * DX);
      this.slopeZ[i] = (this.smoothed[i + FIELD_WIDTH] - this.smoothed[i - FIELD_WIDTH]) / (2 * DZ);
    }
    this.maxDent = maxDent; this.moving = moving || this.contacts.size > 0; this.revision++;
  }
  sample(x: number, z: number, data = this.smoothed) {
    if (!Number.isFinite(x + z) || Math.abs(x) >= FIELD_X || Math.abs(z) >= FIELD_Z) return 0;
    const px = (x + FIELD_X) / DX, pz = (z + FIELD_Z) / DZ, ix = Math.floor(px), iz = Math.floor(pz);
    const u = px - ix, v = pz - iz, i = iz * FIELD_WIDTH + ix;
    return (data[i] * (1 - u) + data[i + 1] * u) * (1 - v) + (data[i + FIELD_WIDTH] * (1 - u) + data[i + FIELD_WIDTH + 1] * u) * v;
  }
  get motion() { return Math.max(0, ...Array.from(this.contacts.values(), contact => contact.speed)); }
}
