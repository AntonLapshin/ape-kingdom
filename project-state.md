# ape-kingdom — Project State

> Current state and progress. Updated by the auto-pi loop as work is done.

## Status

**M1–M10 complete (POC shipped); M11 (full-screen game UI with floating
elements, from issue #72) in progress.**
Foundation (guidelines, core scaffold, CI, Pages), the full core game engine
(all rules reducers), the AI opponent / Human vs AI game loop, the interactive
playable client UI, the beautiful animated Tailwind UI polish,
hardening/demo readiness, the Showcase component browser (M7), the Atom
component breakdown (M8), the map generator (M9), and M10 (viewport navigation
+ cell info/action panel + movement) are all implemented, merged, tested, and
deployed. The live demo is green at
https://AntonLapshin.github.io/ape-kingdom/. New unplanned work — issue #72
(improve the game UI: make the map full-screen with floating UI elements) — is
planned as milestone M11 and split into three small `pi:ready` sub-issues:
M11-T1 (full-screen game board fills viewport, #74), M11-T2 (floating overlay
UI panels over the full-screen map, #75), and M11-T3 (polish floating
full-screen UI: theme, demos, tests, #76).

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
- [x] M8 — Break down UI elements into Atom components (issue #47): extract the
  inline cell/unit/content rendering from `Board.tsx` into reusable Atom
  components (`Cell`, `Unit`, `Content`) each with a registered Showcase demo.
  **Complete** (PRs #55, #56, #58 merged).
  - [x] M8-T1 `Cell` atom component + showcase (#51 → PR #56)
  - [x] M8-T2 `Unit` atom component + showcase (#49 → PR #55)
  - [x] M8-T3 `Content` atom component + showcase (#50 → PR #58)
- [x] M9 — Map generator (issue #48): a configurable core map generator (single
  island surrounded by water, with mountains and lakes) and a fresh generated
  map per game (default 20×20). **Complete** (PRs #59, #61, #62 merged).
  - [x] M9-T1 Terrain model + pure `generateMap` engine in `src/core` (#54 → PR #59)
  - [x] M9-T2 New generated map per game (default 20×20) wired into setup (#53 → PR #61)
  - [x] M9-T3 Render generated terrain in the UI `Board` (#52 → PR #62)
- [ ] M10 — Enhanced UI & gameplay (issue #63): make the game view
  viewport-filling (100% width/height, no page scroll) with drag-to-pan and
  mouse-wheel zoom, and add cell selection with an info/action panel (read-only
  info for non-actionable cells, actionable items with cost for buildable cells)
  plus movement (selecting a movable unit highlights reachable cells and lets
  the human click a target to move). Splitting #63 into M10-T1..T4.
  - [x] M10-T1 Full-viewport drag-to-pan board navigation (#64 → PR #67, merged)
  - [x] M10-T2 Mouse-wheel zoom in/out on the board (#65 → PR #68, merged)
  - [x] M10-T3 Cell selection + info/action panel (#66 → PR #69, merged)
  - [x] M10-T4 Movement: highlight reachable cells + click target to move (#70 → PR #71) — **complete**
- [ ] M11 — Full-screen game UI with floating elements (issue #72): make the
  board fill the viewport and render the UI panels (status/money/stats, cell
  info, action controls incl. End Turn) as floating overlays over the map.
  Split into three small `pi:ready` sub-issues.
  - [ ] M11-T1 Full-screen game board fills viewport (#74, `pi:ready`)
  - [ ] M11-T2 Floating overlay UI panels over the full-screen map (#75, `pi:ready`)
  - [ ] M11-T3 Polish floating full-screen UI: theme, demos, tests (#76, `pi:ready`)
