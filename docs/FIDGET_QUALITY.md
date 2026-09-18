# Dependable interaction

The user-approved standard: an intentional touch responds immediately, continued engagement develops the sensation, and stopping at any point produces a complete resolution. The person controls timing, direction and intensity. The payoff is inherent in the interaction and never requires a score, correct technique or a rare event. A quick press deserves its own response; a long hold is a different experience, not the price of admission.

Predictable resolution does not require identical movement or a scripted animation. A thrown Jelly can land differently each time. Putty can settle into a changed shape. The material must remain coherent and ready to be handled again. Meaningful state transitions should be visible and audible when sound is enabled; play must still make sense silently. Cancelled gestures release safely, and keyboard and reduced-motion use preserve the same material promise.

## Collection audit

This is a source/design review, not a claim of user-tested satisfaction. Gel Cube has new implementation and automated checks; the other rows identify existing behavior and follow-up work without retuning those toys in this change. Physical-device evaluation remains necessary.

| Toy | Dependable loop | Finding / next refinement |
| --- | --- | --- |
| Gel Cube | Brief poke rebounds; held squeeze yields; any release restores the cube | Implemented with immediate elasticity and reversible delayed deformation. Check perceived resistance and visible local dents on phones. |
| Butter | Press or stretch, feel it yield, let the foam rise | Basic gestures have a complete response. Final peel still requires 94% stretch and half a second at that load: a narrow extra condition. Consider sustained reasonable tension converging on release while keeping short pulls rewarding. |
| Jelly | Squish, lift or toss, settle through a soft landing | Catching is optional. Compare restrained tosses and missed catches for equal enjoyment; a character bonus must remain extra. |
| Dumpling | Compress a heavier bundle, lift, land softly | Existing loop is coherent. Pleats are geometry rather than separately pinchable folds; sharper local detail needs more than profile tuning. |
| Cushion | Press, sink into softness, release and recover | Good loop structure. Compare subtle taps and partial releases to make sure the response is legible without sustained attention. |
| Loop | Stretch a ring, release its elastic tension | Ordinary pull already pays off. Its grounded fatigue/rupture temporarily disables grips during recovery; evaluate whether that interrupts repetition and whether the pop belongs in the core loop. |
| Star | Press a lobe, stretch and release | Good basic loop. Earn its place through local lobe bending and a distinct release, rather than silhouette alone. |
| Putty | Knead, let it settle into a changed shape, touch it again | Settling into a useful changed shape is a complete outcome. Local dents are broad; prioritize readable fingertip-scale changes before extra features. |
| Silk | Catch and lift, release into a ripple | Already a useful continuous loop. The procedural surface cannot supply arbitrary folded layers or self-contact. A dedicated constrained strip would be more appropriate for peeling. |
| Magnetic Dust | Gather or repel, move the field, release to relax | Broad interaction area suits low-attention play. Phone frame time is the main outstanding risk to dependable immediate response. |
| ASCII Tide | Stir, gather a vortex, release the wake | Clear immediate feedback and natural dissipation. Check small movements at narrow viewports and sustained holds. |
| Liquid Light | Tap a bloom or draw a ribbon, let it spread and fade | No success condition; broad touch area. Long-term color accumulation must keep fresh gestures visible. |
| Swirl | Turn the stars, release into drift | A visual companion more than a material fidget. Rotational weight and settling would deepen its hand-to-response relationship. |
| Shapes | Turn a flowing outline, release into drift | Same visual loop; drawing is an optional creative activity. Avoid requiring configuration before ordinary play feels worthwhile. |
| Rose Jelly | Poke locally, draw a groove, release and heal | [Direct contact and a bounded healing field](JELLY_SLICE.md) replace the wire and fragment limit. Short strokes leave real dents; deeper grooves remain connected underneath and close continuously. Evaluate the feel and visuals on a phone. |
| Mint Jelly | Tension or swipe through gel, separate the pieces | Still uses the earlier wire model: `MAX_PIECES = 48` disables input and asks for Reset. Evaluate the Rose Jelly replacement before extending it to Prism. |
| Dough (parked) | Fold and merge | Retained in source because its quality does not yet meet the collection standard. Do not restore it as a renamed soft body. |

The Rose Jelly follow-up implements continuous material recovery. Prism retains the earlier slicing behavior. Further follow-ups include evaluating Butter's final peel threshold.

## New fidgets worth prototyping

These are design recommendations, not validated demand or an instruction to implement the whole list.

1. **Magnetic slider.** Two compact plates slide through several stable magnetic positions. Even tiny movements load a visible spring; passing a detent gives a crisp snap. Releasing anywhere settles into the nearest stable position. Keep movement reversible, with no required sequence.
2. **Weighted detent wheel.** Slow rotation crosses distinct notches; a flick coasts with progressively slower clicks before settling. There is no target angle or spin score. This introduces rotary rhythm instead of another stretchy material.
3. **Peel-and-reseal strip.** Pull a broad tab to roll a flexible strip away from its surface. Release halfway or fully and watch the same strip reseal in a soft wave. Make both partial and complete peeling rewarding; no precision hit on a tiny corner.
4. **Snap dome.** A large silicone dome yields, snaps inward, then pops back on release. A short incomplete press gives a small elastic bounce. One broad target keeps the loop immediately understandable.

Mechanical formats are established physical examples: [Antsy Labs](https://www.antsylabs.com/products/fidget-cube-toy-limited-edition-collectible) describes click, glide, flip, roll and spin actions; [Project Ratchet](https://projectratchet.com/) describes audible ratcheting and bidirectional magnetic clicks. These manufacturer descriptions establish the formats, not clinical benefits or evidence that their digital versions will be satisfying. Fuppo's proposed mechanics and priorities are our design judgments.

## Engine assessment

The shared player is suitable: `ToyModule.mount()` and `ToyController` already allow a separate simulation per toy while preserving navigation, sound consent, pause, reduced motion and disposal. Existing fluid, slicing, cloth and free-body toys demonstrate that separation. A new fidget does not require rewriting the application.

The grounded soft-body solver is a 5 × 5 × 5 lattice, with fixed bottom nodes, tetrahedral volume constraints and a skinned display mesh. It supports broad compression, stretch, twist and material recovery efficiently. Gel Cube adds an optional viscoelastic response: immediate elastic travel, delayed yielding and reversible compression memory. This deliberately extends material behavior without changing other profiles.

Limits are real: the coarse cage spreads local dents; increasing render-mesh detail does not increase physical contact resolution. Fixed topology and the anchored base do not supply arbitrary folding, self-collision, torn edges, merged surfaces or freely rolling rigid objects. The current pressure map is an artistic volume-preserving approximation, not a measured constitutive model of a commercial gel toy.

Use a small purpose-built model for each mechanical fidget: a one-dimensional position/velocity with several stable wells for a slider, an angular model with friction and detents for a wheel, and a curved strip with a controlled contact front for peeling. That gives direct control over the sensation and guaranteed settling without an unnecessary universal physics engine. Revisit denser or adaptive soft-body simulation only when a specific contact-detail problem justifies its phone cost.
