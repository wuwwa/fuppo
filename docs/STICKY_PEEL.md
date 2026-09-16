# Sticky floor peel

Butter, Cushion, Loop, Star, Putty and Dough resist a long upward or outward pull, lift along a moving contact line, then release from the floor. Small stretches and presses keep their existing behavior. Pulling inward across Dough still folds it. Jelly and Dumpling retain their separate lift-and-toss simulation.

Hold the shape and pull up and away, maintaining tension for roughly two seconds once the pull is long enough. Several small catches slow the peel. A shorter pull holds a partial peel; letting go settles the shape back onto the stage so it can stick again. Mouse, touch and Space + Up use the same mechanism. The keyboard's travel range includes the full peel distance.

`FloorAdhesion` applies a bounded, volume-preserving vertical shear after the existing skin deformation, followed by a bounded translation as contact releases. Its exact inverse keeps picking and existing grabs in the same material frame. The elastic cage retains local dents independently of this movement; Putty does not learn an airborne resting position. Dough applies the mapping to its volume parcels before remeshing. Material profiles tune onset, travel and peeling rate. One contact owns the peel, so extra fingers do not multiply progress.

The shadow fades as contact lifts. Existing local material recordings follow movement of the contact line and play a release accent when the final contact yields, using the shared sound consent and volume controls. No new audio assets are shipped. Reduced motion retains the same effort and contact progression with a softer lift response. Release, cancellation, blur, resize and pause clear grabs; reset also clears peel state. Settling keeps the renderer awake until the floor contact is restored.

Validation: `npm test`, `npm run build`, and `QA_ORIGIN=http://127.0.0.1:5176 node qa/turn-smoke.mjs --peel` (also `--webgl`). The browser checks cover all six toys on emulated touch, Butter on mouse and keyboard, reduced motion, cancellation, resize and reset. Physical-device tactile satisfaction still needs hands-on tuning.
