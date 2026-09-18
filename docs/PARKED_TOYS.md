# Parked toys

## Dough

Parked September 17, 2026 because its feel does not meet the public collection's quality standard. Keep the work for future refinement. It is intentionally absent from `src/toys/registry.ts`; `?toy=dough` follows the normal unknown-toy fallback to Butter, and saved Dough favorites and last selection are filtered out by the existing preference validation.

The retained implementation includes:

- `src/toys/dough.tsx`: toy definition and lazy loader.
- `src/dough/`: entry, volume and fold implementation.
- `src/soft-body/`: Dough's profile, geometry, kneading, surface and shared physics support.
- `tests/dough*.test.ts` and the shared adhesion/foley checks: continuing regression coverage in `npm test`.
- `qa/dough-smoke.mjs`, `qa/dough-checks.mjs` and `qa/dough-surface-checks.mjs`: archived browser checks.
- `public/previews/dough.webp`, the local Dough audio bank and [audio provenance](ASMR_AUDIO.md): retained assets and source records.

To revisit locally, import `dough` from `./dough` in `src/toys/registry.ts` and add it back to the `toys` array. The archived browser checks require that temporary registration; run `qa/dough-smoke.mjs` against the development server with `QA_ORIGIN` and `CHROME_PATH` set for your machine. Add Dough back to the responsive and peel QA lists when evaluating it for a public return. Run `npm test` and `npm run build`, and compare its feel on physical phones before restoring it to the collection. Update the retired-route and preference fixtures if it returns.
