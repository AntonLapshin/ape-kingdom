# ape-kingdom — Project State

> Current state and progress. Updated by the auto-pi loop as work is done.

## Status

**M1–M7 complete (POC shipped); M8 (break down UI elements into Atom
components) and M9 (map generator) in progress.** Foundation (guidelines,
core scaffold, CI, Pages), the full core game engine (all rules reducers),
the AI opponent / Human vs AI game loop, the interactive playable client UI,
the beautiful animated Tailwind UI polish, hardening/demo readiness, and the
Showcase component browser (M7) are all implemented, merged, tested, and
deployed. The live demo is green at
https://AntonLapshin.github.io/ape-kingdom/. New unplanned work — issue #47
(break down UI elements into Atom components, planned as milestone M8) and
issue #48 (map generator, planned as milestone M9) — was added and split into
small `pi:ready` sub-issues.

## What's here

- Vite + React + TypeScript + Tailwind project scaffold.
- Core/UI split with `src/core` (business logic) and `src/ui` (thin views).
- Vitest with 100% coverage enforced on `src/core/**/*.ts`.
- `/guidelines` folder with the Ape Kingdom game rules and web implementation guidelines (theme, atomic design, context injection), referenced from README/manifest.
- Core entity model in `src/core/game.ts`: ape units (4 ranks), sites (Grove/Nest/Home Tree), players, hex map, static data tables (cost/rank/movement/income), and helpers (create unit/site/player, standard two-player setup). 100% core coverage.
- Full rules engine implemented as pure reducers in `src/core/game.ts`: `collectIncome` (M2-T1), `recruitUnit` (M2-T2), `moveUnit` (M2-T3), `attackUnit` (M2-T4), `eliminatePlayers` (M2-T5), `resolveVictory`/`checkVictory` (M2-T6). All reject illegal actions with typed errors and are 100% core covered.
- AI opponent and game loop in `src/core`: `ai.ts` (M3-T2) enumerates legal actions and selects a deterministic, rule-legal move; `gameLoop.ts` (M3-T3) wires the full Human vs AI turn cycle via `playTurn` (human moves -> AI reply -> turn advance), enforcing turn-step ordering and skipping eliminated players, with full-game simulation tests proving games complete with a winner and the AI never makes an illegal move. 100% core covered.
- CI (lint + test:coverage + build) green on `main`.
- GitHub Pages enabled (build via GitHub Actions) and the live demo is deployed: https://AntonLapshin.github.io/ape-kingdom/
- Playable M4 UI wired into the app (`PlayableGame` composing thin `Board`, `ActionControls`, `StatusPanel` components through the `useGameSession` view model and the core `gameSession` controller); all UI components covered by Vitest + Testing Library, core stays 100% covered.

## Next steps

- [x] M1 — Foundation: rules, guidelines, core scaffold, CI, Pages.
- [x] M2 — full rules engine in `src/core` as pure reducers (income, recruit, move/capture, combat, elimination, victory), 100% covered.
  - [x] M2-T1 Collect income reducer (#7)
  - [x] M2-T2 Recruit apes reducer (#8)
  - [x] M2-T3 Move and capture reducer (#9)
  - [x] M2-T4 Combat (attack) reducer (#13)
  - [x] M2-T5 Elimination reducer (#14)
  - [x] M2-T6 Victory detection reducer (#15)
- [x] M3 — AI opponent and Human vs AI game loop.
  - [x] M3-T1 Legal-move enumeration for the current player (#21)
  - [x] M3-T2 AI decision layer (deterministic, rule-legal) (#19)
  - [x] M3-T3 Core game loop (human move -> AI reply -> turn advance) with full-game tests (#20)
- [x] M4 — interactive playable client UI.
  - [x] M4-T1 Core game-session controller for the playable UI (#25)
  - [x] M4-T2 useGameSession view model for the playable UI (#26)
  - [x] M4-T3 Playable board UI wired into the app (#27)
- [x] M5 — beautiful animated Tailwind UI polish.
  - [x] M5-T1 Design-token theme system for the client (#31)
  - [x] M5-T2 Refactor M4 UI to semantic theme tokens (#32)
  - [x] M5-T3 Animations and interaction polish for the playable UI (#33)
- [x] M6 — hardening and demo readiness. All verification gates green:
  full Human vs AI game integration tests, `npm test` (266 tests) +
  `npm run test:coverage` (100% src/core) + `npm run build` pass, CI green on
  `main`, Pages deployed and live demo verified, /guidelines complete and
  referenced, and docs (manifest/project-state/CHANGELOG) current. **POC
  complete.**
- [x] M7 — Showcase for atom components (issue #38): adopt the hand-rolled
  Showcase component browser so every atom component is demoed, exposed via a
  `/showcase` route. **Complete** (PRs #42, #43, #44, #46 merged).
  - [x] M7-T1 Showcase core engine in `src/core` (#39 → PR #42)
  - [x] M7-T2 `useShowcase` view model + `Showcase` component (#40 → PR #43)
  - [x] M7-T3 Showcase demos for every atom component + registration (#41 → PR #44)
  - [x] M7-T4 `/showcase` route in the app + top-right link + README update (#45 → PR #46)
- [ ] M8 — Break down UI elements into Atom components (issue #47): extract the
  inline cell/unit/content rendering from `Board.tsx` into reusable Atom
  components (`Cell`, `Unit`, `Content`) each with a registered Showcase demo.
  - [x] #47 split into M8-T1..T3 (closed)
  - [ ] M8-T1 `Cell` atom component + showcase (#51, `pi:ready`)
  - [ ] M8-T2 `Unit` atom component + showcase (#49, `pi:ready`)
  - [ ] M8-T3 `Content` atom component + showcase (#50, `pi:ready`)
  - [ ] M8-T4 Refactor `Board` to compose atoms — planned next slice
- [ ] M9 — Map generator (issue #48): a configurable core map generator (single
  island surrounded by water, with mountains and lakes) and a fresh generated
  map per game (default 20×20). #48 split into M9-T1..T3 (closed).
  - [ ] M9-T1 Terrain model + pure `generateMap` engine in `src/core` (#54, `pi:ready`)
  - [ ] M9-T2 New generated map per game (default 20×20) wired into setup (#53, `pi:ready`)
  - [ ] M9-T3 Render generated terrain in the UI `Board` (#52, `pi:blocked` until #54/#53 merge; sequence T1->T2->T3)
