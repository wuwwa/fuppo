# Rose Jelly: direct touch and healing

Rose Jelly (formerly Jelly Slice) and Mint Jelly (formerly Jelly Prism) sit beside Jelly near the top of the collection. Their existing `jelly-slice` and `jelly-prism` IDs remain stable for bookmarks and saved favorites.

The persistent cutting wire and angle readout made the material feel like a tool to operate. A stationary hold also drove that wire across the whole block, so simply hiding it would have retained an invisible cutter. Rose Jelly now has a separate direct-touch entry point. Mint Jelly retains its earlier wire interaction pending evaluation of this version.

Touching anywhere on the slab makes a small local dent. Holding deepens it gradually; moving draws a groove along the contact path, including short and curved strokes. The surrounding surface raises slightly. Each patch relaxes independently, so a new touch does not postpone older marks healing. There are no targets, required crossing strokes, gesture modes, angle controls, piece counters or exhausted states. Space holds a keyboard contact; arrows position it or draw while Space is held. A small focus ring appears only for keyboard positioning.

Grooves form deep, rounded seams in a continuous closed skin. The base remains connected: this is an elastic material model, not disjoint pieces with arbitrary fracture and fusion. Keeping that connection lets the same geometry heal smoothly, with no replacement slab or topology jump. It does not implement a full volume-conserving soft-body simulation. Physical-phone feel still requires hands-on evaluation.

The rose material retains tint along short optical paths, so fresh grooves remain pink. Softer reflections follow the actual displaced skin. The same geometry supplies picking, the back-face thickness pass and the visible surface; embedded bubbles compress with the local material. A fixed material field and a shared indexed skin bound per-frame work and GPU resources. A local Node benchmark for one held contact measured about 1.3 ms median for a field step and skin update after indexing, compared with 8.2 ms before; this is not a phone frame-rate claim.

Up to five independent contacts work at once. Cancel, blur, resize, visibility changes and collection pause release contacts safely; pause retains deformation and freezes recovery. Reset restores the exact rest surface. Reduced motion uses smooth, faster recovery without a rebound or spread animation. Audio uses existing local gel recordings, respects consent and volume, and becomes quiet under a stationary hold.

`tests/healing-gel.test.ts` covers local taps and holds, partial/curved/endpoint strokes, independent recovery, five-contact limits, hundreds of repeated gestures, invalid input, reduced motion, frame-rate consistency, finite actual mesh deformation and exact restoration. The production smoke check verifies the clean controls and eventual idle drawing. The wire-specific `qa/slice-smoke.mjs` now targets Prism.

The development-only page `/qa/healing-preview.html` mounts the same toy for visual review and exports its actual 240 × 180 collection thumbnail. Its hold control uses synthetic keyboard events for a sustained-poke inspection; ordinary mouse interaction on that page remains available. It is not part of the production build.

Design review rule: a brief, unplanned touch should feel complete and leave the toy ready for another. Challenge an added mode, control, success condition or irreversible state when it makes that loop harder to understand or repeat. Visual consistency and direct contact belong to the core interaction, not a later polish stage.
