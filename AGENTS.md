# Fiddy project guidance

Fiddy is a browser-based collection of tactile fidget toys built with React, TypeScript, Three.js, and Vite.

## Working conventions

- Do not use the Sites plugin for this project.
- Use `npm ci` for a clean dependency install.
- Run `npm test` and `npm run build` before considering implementation work complete.
- Do not deploy, push, or change production infrastructure unless the user explicitly asks.
- Keep generated output and local runtime state out of Git: `node_modules/`, `dist/`, `build/`, `.local/`, `qa/artifacts/`, and `*.tsbuildinfo`.
- Preserve touch and keyboard controls, reduced-motion behavior, sound consent, cleanup/disposal behavior, and finite bounded physics when changing toys.
- Keep audio local to the project and retain source/provenance documentation for shipped recordings.

## Useful commands

```sh
npm ci
npm test
npm run build
npm run dev
```

See `README.md` for local review, browser QA, and Fly.io deployment details. See the documents in `docs/` for product direction and feature-specific design decisions.
