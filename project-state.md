# ape-kingdom — Project State

> Current state and progress. Updated by the auto-pi loop as work is done.

## Status

**PROJECT COMPLETE — all original milestones M1–M28 done (completed_at
2026-08-27), plus post-ship M29 (UI performance, #208) implemented.** Every
planned sub-issue is implemented, tested, and merged; CI + Pages green;
861 tests pass; 100% coverage on `src/core/**`; build succeeds.

**Post-ship M29, M30 fully complete (ticked 2026-08-28).** M29-T1/T2/T3 (PRs
#212/#213/#217) and the remaining M30 slices M30-T3 #235 (neutral protection,
PR #237), M30-T4 #233 (neutral interaction, PR #236) and M30-T5 #234 (UI,
PR #238) are all merged — M30 is COMPLETE. The manifest boxes for these were
ticked in-place this turn.

**Next `pi:ready` batch planned 2026-08-28 (remaining M31/M32 scope):** M31-T3
#239 (verify randomized spawns stay legal & opposite-sided; harden
site/territory placement, `priority:p2`), M32-T3 #241 (brighten fog-of-war
cells to a grayish/silver tone, `priority:p2`) and M32-T4 #240 (neutralize the
brownish font color to neutral gray, `priority:p2`). M31-T4 (UI board
sizing/centring + demo/showcase adjust, `priority:p3`) is planned on a later
PM turn after M31-T3 lands.

**Post-ship M29 (UI performance) COMPLETE:** M29-T1 #209, M29-T2 #211 and
M29-T3 #210 merged via PRs #212/#213/#217 (2026-08-28). Board cells memoized,
bounding-box hoisted into a memoized pure helper, pan/zoom coalesced to one
update per animation frame.

**Three new post-ship feedback issues arrived after M29 and are being planned
as M30–M32 (2026-08-28):** #216 (Random neutral units) → M30; #215 (Enhance map
generator) → M31; #214 (UI adjustments) → M32. Parents closed; split into
milestone sub-issues in manifest.md. First batch of `pi:ready` slices created:
M30-T1 #219 (core neutral-unit data model, `priority:p1`), M31-T1 #220 (random
map on each load + random player spawn, `priority:p1`), M32-T1 #221 (blue inner
border on selected cell, `priority:p1`) — all merged (PRs #222/#223/#224).

**Next `pi:ready` batch planned 2026-08-28:** M30-T2 #225 (place random neutral
units during setup, `priority:p1`), M31-T2 #226 (smaller+clearly-circular
default map, `priority:p1`), M32-T2 #227 (cell-info shows terrain,
`priority:p1`). M30-T2 #225 shipped via PR #228, its boundary tests #229 via PR
#232, and M31-T2 #226 via PR #230 — all merged.

**M32-T2 #227 (cell-info shows terrain) is now MERGED (PR #231).** The
bottom-left cell-info panel renders a clear terrain label for the selected hex
(Mountain / Water / Land), driven purely by map terrain via a new pure
`terrainLabel` + `TERRAIN_LABELS` presentation helper in `src/ui/presentation.ts`
and a dedicated `cell-info-terrain` element in the dumb `CellInfoPanel`
component. `src/core` untouched and still 100% covered.

**Next `pi:ready` batch planned 2026-08-28 — M30 remaining scope:** M30-T3 #235
(neutral unit protection rule, `priority:p2`), M30-T4 #233 (interaction with
neutral units — attack/defeat, capture, cross-turn behaviour, `priority:p2`) and
M30-T5 #234 (UI — render neutral units distinctly, `priority:p3`). This fully
covers the remaining M30 sub-issues. Remaining slices of M31 (M31-T3/T4) and
M32 (M32-T3/T4) are planned on later PM turns.

Prior post-ship work — new post-ship issue #208 ("Improve UI performance" — UI
very slow when dragging the map, CPU spikes) was planned as milestone M29, split
2026-08-27 into three concise, testable slices; parent #208 closed. Root cause (from
repo reading): every `panBy`/`zoomBy` (React state in `usePan`/`useZoom`)
re-renders `Board`, which recomputes the bounding box with an O(n) map + min/max
over all ~400 cells and re-renders every `Cell` (each mounting an SVG `clipPath`)
— none memoized, `onSelect` a fresh inline closure each render. Slices: M29-T1
#209 (memoize board cells so pan/zoom don't re-render every hex, `priority:p1`),
M29-T2 #211 (hoist the bounding-box computation into a memoized pure helper,
`priority:p1`), M29-T3 #210 (coalesce pan/zoom updates to one per animation
frame, `priority:p2`). All are UI-layer rendering/performance changes — no game
rules touched, core coverage stays 100%.

History: **M1–M19 COMPLETE and shipped; M20–M27 DONE; M28 (AI training) DONE.**
M26 (highlighting target cells, #168) is DONE (M26-T1 #169, PR #170
merged). New post-ship issue #171 ("Additional scope") was split into M27
(section A, small/medium fixes) and M28 (section B, AI training).
M27 (issue #171 section A, small/medium fixes) is now DONE: M27-T1 #172
(circular map generator instead of diamond, PR #176 merged), M27-T2 #173 (fog
of war always shows owning cells, PR #177 merged), M27-T3 #174 (unit joining by
level addition, PR #178 merged), M27-T4 #187 (smaller inter-hex gap, PR #189
merged) — all complete. M27 is COMPLETE.
Issue #175 (AI player training subproject — #171 section B, M28) has been split:
parent #175 closed. M28-T1a #179 (headless full-game simulator in `src/core`)
and M28-T1b #180 (`npm run simulate` CLI) are DONE (PRs #181/#182 merged).
Next slice — M28 training subproject — planned 2026-08-27 as three `pi:ready`
issues: M28-T2a #202 (record a self-play training dataset, state→action pairs,
in core, `priority:p1`), M28-T2b #203 (headless training harness that fits a
small policy and emits a serialized trained-AI file, `priority:p1`), and
M28-T3 #204 (use the trained-AI file for the deployed UI opponent, with a
fallback to the rule-legal AI, `priority:p2`). M28-T3 also delivers the
M23-T3 "smarter AI" goal. Parent #171 closed.
M28-T2a #202 (record a self-play training dataset) is now DONE (PR #205
merged 2026-08-27): new pure `src/core/trainingDataset.ts` plus an optional
observational `DecisionRecorder` threaded through the self-play path, with
`playAiGame(..., { recordDataset })` defaulting to off. Remaining M28 slices:
M28-T2b #203 and M28-T3 #204 (`pi:ready`).
The enjoyment-gap analysis (M23-T2, #192/#200) was delivered with follow-up
issues #195–#199; #195 (Protection/Safety Zones rule) was implemented (PR
#201) and #196–#199 (balance tweaks) were closed as deferred.
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
Next slices (documented in manifest): M23-T3 smarter AI (delivered by M28), and
M28-T2a #202, M28-T2b #203, M28-T3 #204 (the AI-training subproject — all
`pi:ready`).
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
