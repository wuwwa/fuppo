# Butter and follow-up toys

Butter is an original digital interpretation of the slow-rise butter-stick squishy. Its rounded rectangular mesh has small portion marks molded into the top and navy SALTED BUTTER lettering, weight text, and tablespoon ticks. The print uses fixed material coordinates, so it deforms with the foam. Its texture is disposed when the player unmounts.

The first version only slowed the shared gel model. The revised version uses compressible volume constraints, much less lateral expansion, deeper compression, and exponential recovery of local dents. Foam does not receive release-flick impulses or surface ripples. A minimum cell-volume constraint prevents inverted cells during repeated pinches. Other toys retain their existing material parameters.

The opaque, matte finish and heavily damped recovery distinguish it from translucent Jelly. It is a solid toy with no burst mechanic. It uses the shared soft-body player, including touch, keyboard, rotation, sound, reset, reduced-motion, and lifecycle handling. A long upward or outward pull now stretches the sticky base and progressively peels it off the floor; releasing settles it back down. See [sticky floor peel](STICKY_PEEL.md) for the shared interaction and checks.

The reference is the printed slow-rise foam variant described by [Fidget World](https://www.fidgetworld.co.uk/products/butter-stick-squishy) and [ButterSquishy](https://buttersquishy.com/). These describe a pale yellow stick with blue print that compresses and slowly recovers. This implementation is a qualitative visual approximation, not a measured physical reproduction: real resistance, hand grip, free handling, and large folds are not replicated by this grounded touchscreen model. Recovery settings have not been calibrated to a physical sample. Other butter-shaped products may use different materials.

Open `?toy=butter` or select Butter in the collection. A sustained hold compresses the block; release preserves the compression momentarily and gradually restores its shape. No score or completion state interrupts repeat play.

## Gesture depth

Butter now separates an immediate, shallow touch from a deliberate deep hold. Press depth builds from time applying pressure, so time spent dragging does not make a subsequent press instantly deep. The top and side responses keep the existing slow recovery and bounded foam compression.

Stretching combines immediate elastic travel with a slower yielding component at each contact. Quick pulls visibly load the foam; slow pulls get farther during the gesture, and holding a quick pull lets the material ease toward the same final stretch. The response uses elapsed simulation time and the existing bounded material-space target. It preserves immediate movement, increasing resistance near the stretch limit, independent two-finger contacts, twisting, and the final sticky peel. Releasing one finger leaves the other contact's yielding history intact. Reset and cancellation discard contact history. The touch guide describes these gestures.

The timed physics checks sample the deformed skin: for the same lateral pull, a one-second stroke initially travels more than 1.6 times as far as a short flick, while both converge after holding. They also check immediate press response, deeper sustained holds, pressure history, two-finger separation versus translation, partial release, slow recovery, and reset. These comparisons establish the response difference; perceived resistance and comfort still need hands-on phone evaluation.

## What to try next

Research checked September 13, 2026. These are product directions, not forecasts of guaranteed popularity. Seller descriptions establish available formats, not independent proof of viral reach.

| Priority | Idea | Interaction for Fuppo | Evidence or hypothesis |
| --- | --- | --- | --- |
| 1 | Squishy ice cube | Translucent rounded cube, firm quick presses, yielding slow holds, gradual return | NeeDoh Nice Cube has documented social-media demand and sellouts; see [Tom's Guide, April 27, 2026](https://www.tomsguide.com/sales-events/where-to-still-buy-the-viral-needoh-nice-cube-plus-10-alternatives-worth-a-look). |
| 2 | Deepen the existing Dumpling | Pinch the pleated top, squash the belly, let the folds re-form | Squishy dumplings were among toys selling out ahead of Easter; see [Axios, April 4, 2026](https://www.axios.com/2026/04/04/needoh-squishy-toys-dumplings-easter). |
| 3 | Glitter raindrop | A clear droplet with particles displaced by each squeeze | An established physical format: [Schylling's Dream Drop](https://schylling.com/product/needoh-dream-drop/). This is evidence of a product, not a ranking of current popularity. |
| 4 | Mochi | Powdery soft skin, pinchable corners, deep palm compression | Design hypothesis: recognizable food plus visually exaggerated softness. Test against Butter before expanding the food collection. |
| 5 | Peelable orange | Catch an edge, peel a springy strip, release to re-wrap | Design hypothesis: gives the collection a new repeatable gesture rather than another shape with identical behavior. |

The first prototype should be the ice cube: it has the clearest demand signal and a distinct pressure response. Build the interaction in Fuppo's own visual style and naming.

## Verification

- Production TypeScript/Vite build.
- Existing unit suite plus Butter-specific closed-surface, cage-bound, compression, gradual recovery, stability, and reset tests in `tests/butter.test.ts`. Additional checks cover volume loss with limited lateral expansion, inverse picking, side-dent retention, idle settling, and repeated two-finger squeeze/twist stability.
- Collection preview generated with `qa/capture-previews.mjs --toy=butter`.
- Browser QA passed in WebGPU and WebGL: desktop keyboard hold/release, emulated mobile touch at 390 × 844, reset, collection switching, no mobile overflow, and no captured browser errors. Screenshots were visually inspected. Physical-device feel still needs hands-on evaluation.

For the gesture-depth pass, run `node qa/turn-smoke.mjs --butter` and repeat with `--webgl` against the development server. Set `QA_ORIGIN` and `CHROME_PATH` for the local environment. This checks trusted touches, long holds, two-finger stretching, partial release, resize cancellation, keyboard input with reduced motion, sound consent and muting, reset, and stable graphics resources. `node qa/turn-smoke.mjs --peel` covers the complete peel cycle.
