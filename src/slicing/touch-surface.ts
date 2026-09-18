import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BatchedGel } from './gel';
import { crown } from './surface';
import { HealingGel } from './healing';

/** Deform the actual closed mesh, so picking, refraction and highlights agree. */
export class TouchSurface {
  private readonly rest: Float32Array;
  private readonly normals: Float32Array;
  constructor(private readonly gel: BatchedGel, readonly field: HealingGel) {
    // This slab keeps one topology for its entire session. Share its display
    // vertices once, so each fingertip update uploads only the unique skin.
    const source = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'gelPart']) {
      const attribute = gel.geometry.attributes[name];
      source.setAttribute(name, new THREE.BufferAttribute(attribute.array.slice(0, gel.vertices * attribute.itemSize), attribute.itemSize));
    }
    const indexed = mergeVertices(source, 1e-5);
    gel.geometry.copy(indexed); gel.geometry.setDrawRange(0, indexed.index!.count);
    gel.vertices = indexed.attributes.position.count;
    source.dispose(); indexed.dispose();
    (gel.geometry.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    (gel.geometry.attributes.normal as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    const count = gel.vertices * 3;
    this.rest = new Float32Array(gel.geometry.attributes.position.array.slice(0, count));
    this.normals = new Float32Array(gel.geometry.attributes.normal.array.slice(0, count));
  }
  scaleAt = (x: number, z: number) => 1 - this.field.sample(x, z) / (this.gel.height + crown(x, z));
  update() {
    const positions = this.gel.geometry.attributes.position as THREE.BufferAttribute;
    const normals = this.gel.geometry.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < this.gel.vertices; i++) {
      const j = i * 3, x = this.rest[j], y = this.rest[j + 1], z = this.rest[j + 2];
      const c = crown(x, z), top = this.gel.height + c, dent = this.field.sample(x, z);
      const scale = 1 - dent / top;
      const sx = -this.field.sample(x, z, this.field.slopeX) / top - dent * 1.7 * x * c / (top * top);
      const sz = -this.field.sample(x, z, this.field.slopeZ) / top - dent * 1.7 * z * c / (top * top);
      positions.setXYZ(i, x, .015 + (y - .015) * scale, z);
      const ny = this.normals[j + 1] / scale;
      const nx = this.normals[j] - ny * (y - .015) * sx, nz = this.normals[j + 2] - ny * (y - .015) * sz;
      const length = Math.hypot(nx, ny, nz) || 1;
      normals.setXYZ(i, nx / length, ny / length, nz / length);
    }
    for (const attribute of [positions, normals]) {
      attribute.clearUpdateRanges(); attribute.addUpdateRange(0, this.gel.vertices * 3); attribute.needsUpdate = true;
    }
    this.gel.geometry.computeBoundingSphere();
  }
}
