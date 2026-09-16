# Fiddy laptop handoff

Prepared on September 14, 2026 for moving development from the current Windows desktop to a laptop.

## Authoritative repository state

- Repository: `https://github.com/wuwwa/Fiddy.git`
- Branch: `main`
- Verified pushed commit: `d1c03baf8af9adea3a50719d8ff51ae465f2bd89`
- Commit subject: `changes. ios port`
- At preparation time, local `main` and `origin/main` were exactly synchronized (`0` ahead, `0` behind), before this handoff documentation was added.

`AGENTS.md` and this file were added during handoff preparation. They are included in the transfer ZIP but are not part of the verified pushed commit unless they are subsequently committed and pushed.

## Laptop setup

Preferred setup, preserving Git history:

```sh
git clone https://github.com/wuwwa/Fiddy.git
cd Fiddy
git switch main
git pull --ff-only
npm ci
npm test
npm run build
```

Then copy `AGENTS.md` and `HANDOFF.md` from the transfer ZIP into the clone if they have not been committed. Open the cloned `Fiddy` directory as the Codex project.

The transfer ZIP is a recovery copy of the portable working tree. It intentionally excludes `.git/`, installed dependencies, generated builds, test artifacts, TypeScript build metadata, and machine-local state. If using the ZIP instead of cloning, extract it, run `git init` only if you deliberately want a new repository, then run `npm ci`.

## Verified environment and checks

- Node.js used during handoff: `v25.8.2`
- npm used during handoff: `11.11.1`
- Supported versions documented by the project: Node.js `20.19+` or `22.12+`
- `npm test`: passed, 334 tests, 0 failures
- `npm run build`: passed with Vite 7.3.6

Generated directories can be recreated and do not need to move:

- `node_modules/` via `npm ci`
- `dist/` via `npm run build`
- `build/` via the relevant packaging command
- `qa/artifacts/` via browser QA scripts
- `.local/` is machine-local state

## Current product context

Fiddy is a tactile, adult-oriented browser fidget collection. Butter is the default toy. The project includes deformable soft bodies, free movement, slicing, local CC0 foley, persistent preferences, touch and keyboard controls, reduced-motion handling, and optional Jelly bonus experiences.

Important context lives in:

- `README.md` — setup, review, and deployment
- `docs/PRODUCT_STRATEGY.md` — product direction and iPhone feasibility
- `docs/DAILY_USE_REVIEW.md` — release evidence and remaining physical-device work
- `docs/MOVEMENT_MODES.md` — primary interaction behavior
- `docs/ASMR_AUDIO.md` — audio sources and preparation
- `docs/BONUS_ROUNDS.md` — Jelly bonus direction
- `docs/BUTTER.md` — Butter behavior and follow-up ideas

## Resume prompt for a new Codex task

> Continue the Fiddy project from `HANDOFF.md`. Read `AGENTS.md`, `README.md`, and the relevant documents under `docs/` before changing code. Confirm the checked-out commit and working-tree status, run the baseline tests, and preserve the established touch, accessibility, audio, and physics invariants. Do not deploy or push unless I explicitly ask.

## Secrets and external state

No `.env`, private key, credential, or certificate files were found in the portable project tree during preparation. Authentication for GitHub, Fly.io, Codex, browsers, and other services is machine/account state and must be configured separately on the laptop. Do not place those credentials in the repository or transfer ZIP.

The live Fly.io application named in the README is external infrastructure; copying this project does not copy its account credentials or deployment state.
