# ape-kingdom — Project State

> Current state and progress. Updated by the auto-pi loop as work is done.

## Status

**M1 complete, M2 in progress** — Foundation (guidelines, core scaffold, CI, Pages) is done; the core game engine (full rules) is the current milestone.

## What's here

- Vite + React + TypeScript + Tailwind project scaffold.
- Core/UI split with `src/core` (business logic) and `src/ui` (thin views).
- Vitest with 100% coverage enforced on `src/core/**/*.ts`.
- `/guidelines` folder with the Ape Kingdom game rules and web implementation guidelines (theme, atomic design, context injection), referenced from README/manifest.
- Core entity model in `src/core/game.ts`: ape units (4 ranks), sites (Grove/Nest/Home Tree), players, hex map, static data tables (cost/rank/movement/income), and helpers (create unit/site/player, standard two-player setup). 100% core coverage.
- CI (lint + test:coverage + build) green on `main`.
- GitHub Pages enabled (build via GitHub Actions) and the live demo is deployed: https://AntonLapshin.github.io/ape-kingdom/

## Next steps

- [ ] M2 — implement the full rules engine in `src/core` as pure reducers (income, recruit, move/capture, combat, elimination, victory), 100% covered.
  - [x] M2-T1 Collect income reducer (#7)
  - [x] M2-T2 Recruit apes reducer (#8)
  - [x] M2-T3 Move and capture reducer (#9)
  - [ ] M2-T4 Combat (attack) reducer (#13)
  - [ ] M2-T5 Elimination reducer (#14)
  - [x] M2-T6 Victory detection reducer (#15)
- [ ] M3 — AI opponent and Human vs AI game loop.
- [ ] M4 — interactive playable client UI.
- [ ] M5 — beautiful animated Tailwind UI polish.
- [ ] M6 — hardening and demo readiness.
