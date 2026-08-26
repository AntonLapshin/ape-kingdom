# ape-kingdom — Project State

> Current state and progress. Updated by the auto-pi loop as work is done.

## Status

**M1–M19 COMPLETE and shipped; M20–M26 DONE; M27 DONE; M28 PLANNED (first slice).**
M26 (highlighting target cells, #168) is now DONE (M26-T1 #169, PR #170
merged). New post-ship issue #171 ("Additional scope") was split into M27
(section A, small/medium fixes) and M28 (section B, AI training).
M27 (issue #171 section A, small/medium fixes) is now DONE: M27-T1 #172
(circular map generator instead of diamond, PR #176 merged), M27-T2 #173 (fog
of war always shows owning cells, PR #177 merged), M27-T3 #174 (unit joining by
level addition, PR #178 merged) — all complete. Remaining M27-T4 (smaller
inter-hex gap) is still a future slice.
Issue #175 (AI player training subproject — #171 section B, M28) has been split:
parent #175 closed, and the first slice is planned as M28-T1a #179 (headless
full-game simulator in `src/core`) and M28-T1b #180 (`npm run simulate` CLI),
both `pi:ready`. Next slices: M28-T2 (self-play training harness + ML) and
M28-T3 (trained-AI file used by the deployed UI). Parent #171 closed.
The four already-implemented feedback issues (#136 End Turn, #139 gap,
#140 selected preview, #141 reachable-highlight) were closed as resolved
(M19-T2/#131, M18-T3/#125, M17-T3/#116, M10-T4/#63 respectively). New
terrain/movement feedback is split as milestone M20: M20-T1 #146 (no
water), M20-T2 #147 (no mountain), M20-T3 #148 (move up to 4 through own
land) — all `pi:ready`. The remaining feedback was then planned: M21-T1
#149 (comprehensive RULES.md, #143), M22-T1 #151 (core vision/fog-of-war,
#144), M23-T1 #150 (remove "Turn: you" indicator, #145) — all `pi:ready`.
New post-ship feedback issue #158 (three "still not working" items: fog-of-war
UI, persistent site-less territory, remove the bottom-left move list) is
split as milestone M24 — M24-T1 #159, M24-T2 #160, M24-T3 #161, all `pi:ready`.
New post-ship bug report #164 ("End Turn button isn't working — clicks
just go through") is planned as milestone M25: M25-T1 #166 (fix the End
Turn button so clicks register — the bottom-right `actions-overlay` is
`pointer-events-none` and, unlike the other floating panels, does not wrap
its `<EndTurnButton>` in `pointer-events-auto`, so the button inherits
`pointer-events: none` and clicks pass through), `pi:ready` — now DONE
(PR #167 merged). Parent #164 closed.
Next slices (documented in manifest): M21-T2 graves, M22-T2 fog UI,
M23-T2 analysis, M23-T3 smarter AI, M23-T4 circular map.
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
(9 items) is split as milestone M17: M17-T1 #114, M17-T2 #115, M17-T3 #116 — all
`pi:ready` (now complete, PRs #117/#118/#120 merged). The new post-ship UI
adjustments & fixes issue #122 (SVG hexagons, tighter gap, glass edges, a
recruit crash bug, and territory-ownership rules) is split as milestone M18:
M18-T1 #123, M18-T2 #124, M18-T3 #125 — all complete (PRs #126/#127/#128
merged). The new post-ship bug fixes & UI tweaks issue #129 (6 items:
territory-ownership display, End Turn does nothing, glass too contrast, no
way to create new units, remove Move action list, moved units not opaque) is
split as milestone M19. First slice (all `pi:ready`): M19-T1 #130 (territory
ownership display — cell stays owned after unit vacates), M19-T2 #131 (make
End Turn work anytime even if not all units moved), M19-T3 #132 (restore a way
to create new units at the Home Tree). Remaining #129 items (glass subtlety,
remove Move action list, moved-unit opacity) are the next PM slice.
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
  **Complete** (PRs #117, #118, #120, #121 merged).
  - [x] M17-T1 No text selection on map drag + hover highlight instead of move (#114 → PR #117) — **complete**
  - [x] M17-T2 Circular End Turn button & hide AI bananas (#115 → PR #118) — **complete**
  - [x] M17-T3 Cell & terrain visual overhaul (#116 → PR #120) — **complete**
- [x] M18 — UI adjustments & fixes (issue #122, planned 2026-08-24). Planned
  from unplanned issue #122: (1) SVG hexagon rendering, (2) tighter inter-hex
  gap, (3) glass edge/highlight on the hexagon, (bug) fix app crash when
  creating a new unit, (mechanics) confirm territory ownership rules.
  **Complete** (PRs #126, #127, #128 merged).
  - [x] M18-T1 Fix app crash when creating a new unit (#123 → PR #126) — **complete**
  - [x] M18-T2 Confirm & test territory ownership rules (#124 → PR #127) — **complete**
  - [x] M18-T3 Hexagon visual overhaul: SVG render, tighter gap, glass edges (#125 → PR #128) — **complete**
- [ ] M19 — New post-ship bug fixes & UI tweaks (issue #129, planned 2026-08-24). Planned
  from unplanned issue #129 (6 items): territory-ownership display bug, "Next Turn"
  does nothing, glass effect too contrast, no way to create new units, remove the
  Move {from} => {to} action list, and moved units not opaque. First slice
  (all `pi:ready`):
  - [ ] M19-T1 Fix territory ownership display: cell stays owned after unit vacates (#130)
  - [ ] M19-T2 Make End Turn work anytime, even if some units haven't moved (#131)
  - [ ] M19-T3 Restore a way to create new units at the Home Tree / buildable cell (#132)
  - [ ] M19-T4 (next slice) Glass edge effect made more subtle (#129-3)
  - [ ] M19-T5 (next slice) Remove the Move {from} => {to} action list (#129-5)
  - [ ] M19-T6 (next slice) Mark units that have moved as opaque (#129-6)
