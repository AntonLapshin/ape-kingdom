# ape-kingdom — Project State

> Current state and progress. Updated by the auto-pi loop as work is done.

## Status

**M1–M16 COMPLETE and shipped; M17 (UI adjustments, #113) PLANNED (pi:ready).**
Foundation (guidelines, core scaffold, CI, Pages), the full core game engine
(all rules reducers), the AI opponent / Human vs AI game loop, the interactive
playable client UI, the beautiful animated Tailwind UI polish,
hardening/demo readiness, the Showcase component browser (M7), the Atom
component breakdown (M8), the map generator (M9), M10 (viewport navigation +
cell info/action panel + movement), and M11 (full-screen game UI with floating
elements from issue #72) are all implemented, merged, tested, and deployed.
The live demo is green at
https://AntonLapshin.github.io/ape-kingdom/. Post-ship issue #88 requested
further UI adjustments, now planned as milestone M13 (planned 2026-08-23:
T1 automatic income, T2 land-ownership colors, T3 blue selection border are
`pi:ready`; T4 dark background, T5 hide AI money, T6 right-bottom End Turn only
are the next PM slice). A new open-ended design-polish issue #94 (more
beautiful, better palette, gradients, animation, glass design) was planned as
milestone M14 (M14-T1 frosted-glass panels #96, M14-T2 gradients + animation
polish #98, M14-T3 palette/visual-detail refinement #97 — all done). M15 (game
mechanics rules, #102) and M16 (game image assets, #103) are also complete
(M15-T1/T2, M16-T1/T2 merged). The new post-ship UI adjustments issue #113
(9 items) is split as milestone M17: M17-T1 #114, M17-T2 #115, M17-T3 #116 —
all `pi:ready`.
`npm test` (471 tests), `npm run test:coverage` (100%
on `src/core/**`) and `npm run build` pass, CI + Pages deployment green.

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
- [x] M10 — Enhanced UI & gameplay (issue #63): make the game view
  viewport-filling (100% width/height, no page scroll) with drag-to-pan and
  mouse-wheel zoom, and add cell selection with an info/action panel (read-only
  info for non-actionable cells, actionable items with cost for buildable cells)
  plus movement (selecting a movable unit highlights reachable cells and lets
  the human click a target to move). **Complete** (PRs #67, #68, #69, #71 merged).
  - [x] M10-T1 Full-viewport drag-to-pan board navigation (#64 → PR #67, merged)
  - [x] M10-T2 Mouse-wheel zoom in/out on the board (#65 → PR #68, merged)
  - [x] M10-T3 Cell selection + info/action panel (#66 → PR #69, merged)
  - [x] M10-T4 Movement: highlight reachable cells + click target to move (#70 → PR #71) — **complete**
- [x] M11 — Full-screen game UI with floating elements (issue #72):
  **Complete** (PRs #77, #79, #81 merged).
  - [x] M11-T1 Full-screen game board fills viewport (#74 → PR #77, merged)
  - [x] M11-T2 Floating overlay UI panels over the full-screen map (#75 → PR #79, merged)
  - [x] M11-T3 Polish floating full-screen UI: theme, demos, tests (#76 → PR #81, merged)
- [x] M13 — UI adjustments and fixes (issue #88, planned 2026-08-23). Post-ship
  polish of the full-screen playable UI per #88: automatic income (no manual
  step), land-ownership colors, blue selection border, dark non-gradient
  background, hide AI's banana count, and right-bottom panel reduced to End
  Turn only (all other actions via interactive board clicking). Slices merged:
  M13-T1 automatic income (#91 → PR #95), M13-T2 land-ownership colors (#89),
  M13-T3 blue selection border (#90 → PR #93). Remaining slices (M13-T4/T5/T6)
  are minor UI tweaks still tracked.
  - [x] M13-T1 Automatic income collection at turn start (core) (#91 → PR #95)
  - [x] M13-T2 Color land cells by owner (UI) (#89)
  - [x] M13-T3 Blue border for the selected cell (UI) (#90 → PR #93)
  - [ ] M13-T4 Dark non-gradient background (UI) — planned next slice
  - [ ] M13-T5 Hide the AI's banana count (UI) — planned next slice
  - [ ] M13-T6 Right-bottom panel → only End Turn (UI) — planned next slice
- [x] M14 — UI design polish (issue #94, planned 2026-08-24). Follow-on broad
  design-polish of the shipped full-screen UI per #94: more beautiful look,
  better color palette, gradients, animation, glass design. Purely
  visual/theme work on the existing token system (`src/theme.css` +
  `src/styles/index.css`), core stays pure and 100% covered, no new game
  features.
  - [x] M14-T1 Add frosted-glass styling to floating UI panels (#96 → PR #99)
  - [x] M14-T2 Enhance gradients and animation polish on the game background (#98 → PR #101)
  - [x] M14-T3 Refine color palette and visual details for a more beautiful look (#97 → PR #100)
- [x] M15 — Game mechanics rules (issue #102). Rules 1 & 2 (move-onto-unoccupied-site
  captures; same/higher-rank enemy cannot be beaten) verified under M15-T1. Rule
  3-4 protection/safety zones codified in the rules doc under M15-T2. **Complete**
  (PRs #108, #109 merged).
  - [x] M15-T1 Verify & test rules 1-2 of #102 in the core (#104 → PR #108)
  - [x] M15-T2 Codify protection-zone mechanics (rules 3-4) in the rules doc (#105 → PR #109)
- [x] M16 — Game image assets (issue #103). Extracted the 8 pixel-art icons from
  the uploaded image (#103), removed white background, saved as clean PNGs, and
  wired them into the Atom components as a theme-independent brand asset set.
  **Complete** (PRs #110, #112 merged).
  - [x] M16-T1 Extract pixel-art game icons from uploaded image (#106 → PR #110)
  - [x] M16-T2 Wire pixel-art icons into the Atom components (#111 → PR #112)
- [ ] M17 — UI adjustments follow-ups (issue #113, planned 2026-08-24). Pure
  UI/visual changes (no `src/core` change): no text selection on map drag,
  hover-highlight instead of move, circular End Turn button, hide AI bananas,
  cell gap + glass effect, remove Kingdom color from units, dark map canvas
  background, neutral green land, and bottom-left selected-hexagon display.
  - [ ] M17-T1 No text selection on map drag + hover highlight instead of move (#114) — `pi:ready`
  - [ ] M17-T2 Circular End Turn button & hide AI bananas (#115) — `pi:ready`
  - [ ] M17-T3 Cell & terrain visual overhaul (#116) — `pi:ready`
