# ape-kingdom — Manifest

> Project charter / intent.

**Status: in-progress (M13–M20 done/planned; M21–M22 upcoming)** — milestones M1–M11 are complete and the POC is
shipped (completed_at: 2026-08-23T21:41:10Z). New post-ship UI adjustments
(issue #88) are planned under milestone M13, the follow-on design-polish
request (issue #94) under milestone M14, the game-mechanics rules (issue #102)
under milestone M15, the game image assets (issue #103) under milestone M16,
the new post-ship UI adjustments (issue #113) under milestone M17, the new
UI adjustments & fixes (issue #122) under milestone M18, the new
post-ship bug fixes & UI tweaks (issue #129) under milestone M19, and the
terrain & movement legality issues (#137/#142/#138) under milestone M20
The remaining unplanned issues — #143 (game rules + graves economics),
#144 (map exploration / fog of war), #145 (through analysis + improvements) —
are slated for future milestones M21/M22.
See `project-state.md`
and `CHANGELOG.md` for details. This file is a living document maintained by the
> auto-pi PM persona as the project evolves. The milestones below are the
> backbone of the project: the PM plans issues against them.

## Purpose

Implement "Ape Kingdom", a fully local turn-based game (web app in the browser) with a well-tested TypeScript core and a React + TypeScript + TailwindCSS client running separately as the UI, playable Human vs AI. The game rules and implementation guidelines are defined in ws/temp/ape-kingdom-rules.md; those guidelines are kept in the project's /guidelines folder and all personas are instructed to follow them.

## Guidelines (all personas must follow)

All work in this project is governed by the rules and guidelines in the
[`/guidelines`](guidelines/) folder. Every PM plan, Engineer implementation,
and Review Engineer review must be checked against them:

- **Game rules** — [`guidelines/ape-kingdom-rules.md`](guidelines/ape-kingdom-rules.md)
  is the single source of truth for game behavior. No game feature outside these
  rules may be added.
- **Web theme** — [`guidelines/GUIDELINES-WEB-THEME.md`](guidelines/GUIDELINES-WEB-THEME.md)
  (design-token theming).
- **Atomic design** — [`guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md`](guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md)
  (component architecture + Showcase).
- **Context injection** — [`guidelines/GUIDELINES-WEB-CONTEXT-INJECTION.md`](guidelines/GUIDELINES-WEB-CONTEXT-INJECTION.md)
  (side-effect wiring).

## Goals

- Deliver a fully implemented, well-tested TypeScript core of the game as the single source of truth for rules and state, with 100% test coverage on src/core
- Provide a React + TypeScript + TailwindCSS web client running separately from the core as a thin, replaceable UI
- Support a complete Human vs AI game loop (player takes a turn, AI responds, win/loss resolved)
- Build a beautiful, polished UI with TailwindCSS gradients and animation, suited to a POC demo
- Keep the game rules and implementation guidelines from ws/temp in the project's /guidelines folder and ensure all personas follow them
- Keep everything fully local with pragmatic POC tradeoffs, demoable and testable at every milestone

## Non-goals

- Multiplayer / online networking — the game is fully local, Human vs AI only
- Persistence or backend services — no server-side state; the core runs headlessly and the client is a separate local app
- Mobile/native apps or non-browser clients
- Full production hardening, auth, or scalable deployment — this is a POC
- Any game features not described by the rules in ws/temp/ape-kingdom-rules.md

## Success criteria

- [ ] npm install && npm test && npm run build pass in CI with a green GitHub Pages demo deployed
- [ ] src/core/** holds 100% test coverage and the core is fully decoupled from the UI (no React/DOM imports)
- [ ] The complete Ape Kingdom rule set from ws/temp/ape-kingdom-rules.md is implemented and unit-tested in src/core
- [ ] A human can play a full game against the AI in the browser client, with the AI making valid moves and a clear win/loss outcome
- [ ] The /guidelines folder exists in the repo containing the implementation guidelines from ws/temp, and README/project docs reference them for all personas
- [ ] The UI is a polished, animated TailwindCSS experience featuring gradients and smooth transitions, running as a separate client from the core

## Milestones

### M1 — Foundation: rules, guidelines, and core scaffold

**Goal:** Stand up the project backbone: ingest the game rules and implementation guidelines into /guidelines, and lay the headless core/UI split with CI, Pages, and coverage gates green.

**Scope:**
  - Copy ws/temp/ape-kingdom-rules.md and the implementation guidelines into the project's /guidelines folder and reference them from README/manifest so all personas follow them
  - Model the core game entities (state, units/territories/resources, players) from the rules as pure TypeScript types in src/core with 100% coverage
  - Implement initial immutable game-state creation and turn-advance primitives in src/core with unit tests
  - Confirm the scaffolded React+TS+Tailwind client runs separately from the core and renders the game state
  - Land CI (npm install && npm test && npm run build) and GitHub Pages deployment green

### M2 — Core game engine: full rules implemented and tested

**Goal:** Fully implement the Ape Kingdom rules as a well-tested headless TypeScript engine in src/core, covering all legal moves and outcomes.

**Scope:**
  - Implement every rule from /guidelines/ape-kingdom-rules.md as pure reducer functions in src/core (moves, economy, combat, win/loss conditions)
  - Enforce legality checks that reject invalid actions with typed errors, with exhaustive unit tests
  - Model the complete game lifecycle from setup through endgame, all immutable and 100% covered
  - Add a deterministic replay/log of actions for testability and debugging
  - Keep the core free of React/DOM so it can run headlessly and be driven by any UI

### M3 — AI opponent: Human vs AI game loop

**Goal:** Add a functional AI opponent in the core so a human can play a complete game against it.

**Scope:**
  - Implement a rule-legal AI decision layer in src/core that selects valid moves from the game state
  - Support configurable AI difficulty/behavior with deterministic seeds for testable outcomes
  - Wire the core game loop (human move -> AI reply -> turn advance) with unit tests covering full games
  - Expose a clean core API for the UI to query legal moves and submit actions
  - Test that the AI never makes illegal moves across many simulated games

### M4 — Interactive client: playable game UI

**Goal:** Build the React + TypeScript + TailwindCSS client into an interactive, playable interface for a human to play the AI.

**Scope:**
  - Render the full game board/state from the core via thin view models (no business logic in the UI)
  - Let the human select and submit legal moves, with the AI responding and the turn advancing live
  - Show game status, scores/resources, current player, and win/loss feedback
  - Add the client as a separate app that runs locally against the headless core
  - Cover UI components with tests and keep src/core at 100% coverage

### M5 — Beautiful UI: gradients, animation, and polish

**Goal:** Polish the client into a beautiful, animated TailwindCSS experience that showcases the game as a compelling POC demo.

**Scope:**
  - Apply a cohesive TailwindCSS visual theme with gradients, theming, and responsive layout
  - Add smooth animations and transitions for moves, attacks, turn changes, and win/loss moments
  - Polish hover/active states, feedback, and empty/edge states for a finished feel
  - Ensure the animated UI remains thin and driven purely by core state (no logic leaks)
  - Run a final polish pass on accessibility, load time, and demo readiness

**Sub-issues:**
  - [x] M5-T1 Design-token theme system for the client (#31)
  - [x] M5-T2 Refactor M4 UI to semantic theme tokens (#32)
  - [x] M5-T3 Animations and interaction polish for the playable UI (#33)

### M7 — Showcase for atom components

**Goal:** Adopt the hand-rolled Showcase component browser (per
`guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md` §4–§5 and the referenced
`showcase` library) so every atom component is demoed, and expose it via a
`/showcase` route in the web app.

**Scope:**
  - Adopt the showcase library's pure core engine in `src/core` (registry,
    selection, expand/collapse, URL encode/decode) with 100% core coverage
  - Add a thin `useShowcase` view model (`src/ui/viewModels`) and a dumb
    `Showcase` component (`src/ui/components`) rendering sidebar + canvas with
    URL deep-linking
  - Create showcase demo files for every atom component in `src/ui/showcases/`
    and register them
  - Add a `/showcase` route to the app so the browser is accessible via the web
    app
  - Keep all logic in `src/core` (100% covered); UI stays thin and dumb

**Sub-issues:**
  - [x] M7-T1 Showcase core engine in `src/core` (#38 → PR #42)
  - [x] M7-T2 `useShowcase` view model + `Showcase` component (#38 → PR #43)
  - [x] M7-T3 Showcase demos for every atom component + registration (#38 → PR #44)
  - [x] M7-T4 `/showcase` route in the app (#38 → PR #46)

### M8 — Break down UI elements into Atom components

**Goal:** Extract the inline cell/unit/content rendering currently embedded in
`Board.tsx` into small, reusable **Atom** components (`Cell`, `Unit`, `Content`)
in `src/ui/components/`, each with a registered Showcase demo, per
`guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md` (rules 1, 7 and §2 Atom layer).
Planned from unplanned issue #47.

**Scope:**
  - `Cell` atom — the board hex cell (hex clip-path, owner/terrain background
    variants) as a pure presentational component in `src/ui/components/Cell.tsx`
  - `Unit` atom — the ape unit badge (kind + rank, owner colour) as a pure
    component in `src/ui/components/Unit.tsx`
  - `Content` atom — the site content marker (Home Tree, Nest, Grove) as a pure
    component in `src/ui/components/Content.tsx`
  - Each atom gets a showcase demo file in `src/ui/showcases/` registered in
    `src/ui/showcases/index.ts`
  - Refactor `Board.tsx` to compose the new atoms (behaviour unchanged)
  - Keep all atoms pure (no hooks/context/side effects); core stays 100% covered

**Sub-issues (first slice):**
  - [ ] M8-T1 `Cell` atom component + showcase (#47)
  - [ ] M8-T2 `Unit` atom component + showcase (#47)
  - [ ] M8-T3 `Content` atom component + showcase (#47)
  - [ ] M8-T4 Refactor `Board` to compose atoms (#47) — planned next slice

### M9 — Map generator

**Goal:** Add a configurable map generator in the core game engine that builds
a playable hex map (a single island surrounded by water, with some mountains
and lakes/water cells) from input dimensions, and generate a fresh map each
time a game starts (default 20×20 with default generation props). Planned from
unplanned issue #48.

**Scope:**
  - Add a terrain model (land / water / mountain) to the core and a pure
    `generateMap(width, height, config)` engine in `src/core/mapGenerator.ts`
    that produces a single island surrounded by water with mountains and lakes,
    driven by configurable generation props (island size, mountain/lake density,
    seed, etc.) — 100% core covered
  - Wire the generated map into game setup so a new map is generated per game
    (default 20×20 + default props), replacing/parametrizing the current fixed
    `standardSetup` board
  - Render the generated terrain in the UI `Board` via the `Cell` atom variants
  - Keep all generation logic in `src/core` (100% covered); UI stays thin

**Sub-issues (first slice) — complete:**
  - [x] M9-T1 Terrain model + pure `generateMap` engine in `src/core` (#48)
  - [x] M9-T2 New generated map per game (default 20×20) wired into setup (#48)
  - [x] M9-T3 Render generated terrain in the UI `Board` (#48)

### M10 — Enhanced UI & gameplay: viewport navigation + cell info/action panel

**Goal:** Enhance the playable UI and gameplay per unplanned issue #63:
(a) make the game view viewport-filling (100% width/height, no page scroll)
with drag-to-pan and mouse-wheel zoom; and (b) add cell selection with an
info/action panel (terrain/unit/cost/income for read-only cells, actionable
items with cost for buildable cells, and movement: selecting a movable unit
highlights its reachable cells and lets the human click a target to move).
All presentation derives from core logic (legal moves already come from
`src/core/legalMoves.ts`); core stays at 100% coverage.

**Scope:**
  - Viewport navigation: a full-viewport, non-scrollable game container in
    which the map is panned by dragging and zoomed via the mouse scroll wheel,
    with the transform state kept thin and testable
  - Cell selection: clicking a hex selects it and shows an info panel with
    read-only info (terrain, site, unit kind/rank, cost/income where relevant)
  - Actionable cells: when the selected cell supports actions (e.g. recruit a
    unit at a legal placement hex), show the available action items with their
    cost and wire them to the existing `selectAction` flow
  - Movement: selecting a human-owned movable unit highlights every reachable
    target cell (from core legal moves) and lets the human click a target cell
    to move onto it (via the existing `moveUnit` action through `selectAction`)
  - Keep presentation thin per `guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md`;
    new components in `src/ui/components` get Showcase demos; core stays 100%,
    `npm test`/`npm run build`/CI stay green

**Sub-issues (first slice):**
  - [x] M10-T1 Viewport navigation: full-viewport non-scrollable board + drag-to-pan (#63)
  - [x] M10-T2 Mouse-scroll zoom in/out on the board (#63)
  - [x] M10-T3 Cell selection + info/action panel (read-only info + actionable items with cost) (#63)
  - [x] M10-T4 Movement: highlight reachable cells for a selected unit + click target to move (#63)

### M11 — Full-screen game UI with floating elements

**Goal:** Make the game a full-screen (not container-bound) experience per
unplanned issue #72: the map/board fills the entire viewport and the UI panels
(status/money/stats, cell info, and action controls incl. End Turn) become
floating overlay elements on top of the map rather than a side column. All
derivation stays in `src/core` (100% covered); the UI stays thin per
`guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md`, and changed components get
Showcase demos.

**Scope:**
  - Full-screen board layout: remove the `max-w-5xl` container + glass-panel
    wrapper so the map fills `h-screen w-screen` (no page scroll), preserving
    drag-to-pan, zoom, and cell selection
  - Floating overlay panels: render `StatusPanel`, `CellInfoPanel`, and
    `ActionControls` as absolutely-positioned, `z-index`-layered floating
    elements at the screen corners/edges over the map, unchanged props/wiring
  - Polish + demos: apply design-token HUD styling (backdrop blur/shadow/
    animation), add Showcase demos for the full-screen board + floating HUD,
    and cover the new layout with component tests
  - Keep all logic in `src/core` (100% covered); `npm test`/`npm run build`/CI
    stay green

**Sub-issues (first slice) — complete:**
  - [x] M11-T1 Full-screen game board fills viewport (#72)
  - [x] M11-T2 Floating overlay UI panels over the full-screen map (#72)
  - [x] M11-T3 Polish floating full-screen UI: theme, demos, tests (#72)

### M6 — Hardening and demo readiness

**Goal:** Finalize the POC: end-to-end verification, full test coverage enforcement, and a polished live demo.

**Scope:**
  - [x] Add integration tests covering a full Human vs AI game through the UI
  - [x] Verify npm install && npm test && npm run build and 100% src/core coverage pass in CI
  - [x] Confirm the /guidelines folder is complete and referenced so all personas follow the rules
  - [x] Deploy the final build to GitHub Pages and verify the live demo
  - [x] Update manifest.md, project-state.md, and CHANGELOG.md to reflect the shipped POC

### M13 — UI adjustments and fixes (#88)

**Goal:** Apply the set of UI/gameplay adjustments requested in issue #88 to the
shipped full-screen playable UI: automatic income collection (no manual step), a
clear indication of land ownership (colored territory), a blue border for the
selected cell, a dark non-gradient background, hiding the AI's banana count,
and reducing the right-bottom floating panel to only an End Turn button (all
other actions done via interactive board clicking). All changes keep the
core/UI split intact; `src/core` stays pure and 100% covered.

**Scope:**
  - **Automatic income (core, #88 item 2):** Income applies automatically at the
    start of each player's turn per the rules ("collect bananas from all sites
    you control"), removing the manual `income` turn step and `collectIncome`
    legal action from `src/core/gameSession.ts` (and any `gameLoop` wiring).
    The core stays 100% covered; the UI no longer shows a Collect Income step.
  - **Land ownership coloring (UI, #88 item 3):** Color each land cell's
    background by its owner (player 1 / player 2 / neutral) so territory is
    visually distinct at a glance, in addition to the existing owner badges. The
    derived owner-colour mapping stays in the view model / core (no raw logic
    in dumb components).
  - **Selected-cell blue border (UI, #88 item 1):** Change the selected-hex
    highlight from the amber token to a blue token border in `src/styles`
    (`hex-selected`), keeping the rest of the selection styling intact.
  - **Dark non-gradient background (UI, #88 item 4):** Replace the gradient
    `.login-bg` backdrop on the game route with a plain dark background so the
    board reads clearly.
  - **Hide AI banana count (UI, #88 item 5):** The `StatusPanel` shows the
    human's banana count but not the AI's (per the rules, the human should not
    know the AI's resources).
  - **Right-bottom panel → only End Turn (UI, #88 item 6):** The floating
    right-bottom `ActionControls` panel is reduced to just the End Turn button;
    legal recruit/move/attack actions are performed entirely via interactive
    board clicking (cell info / movement), not buttons.

**Sub-issues (first slice):**
  - [ ] M13-T1 Automatic income collection at turn start (core) (#88 item 2)
  - [ ] M13-T2 Color land cells by owner (UI) (#88 item 3)
  - [ ] M13-T3 Blue border for the selected cell (UI) (#88 item 1)
  - [ ] M13-T4 Dark non-gradient background for the game viewport (UI) (#88 item 4) — planned next slice
  - [ ] M13-T5 Hide the AI's banana count (UI) (#88 item 5) — planned next slice
  - [ ] M13-T6 Right-bottom panel reduced to only End Turn (UI) (#88 item 6) — planned next slice

### M14 — UI design polish (#94)

**Goal:** Apply the broad design-polish request from issue #94 ("more beautiful,
better color palette, gradients, animation, glass design") to the shipped
full-screen UI. Purely visual/theme work built on the existing token system
(`src/theme.css` + `src/styles`), keeping the core/UI split intact and
`src/core` pure and 100% covered. No new game features (out of rules scope).

**Scope:**
  - **Frosted-glass surfaces (UI, #94):** Add a tokenized glassmorphism
    treatment (translucent surface + backdrop blur) to the floating UI panels,
    using the semantic `glass*` token family per GUIDELINES-WEB-THEME.md.
  - **Gradients & animation polish (UI, #94):** Refine the backdrop gradients
    and add smooth transition/animation polish via token-referencing utilities
    and keyframes in `src/styles`.
  - **Palette & visual detail polish (UI, #94):** Tune the brand/semantic
    palette and visual details (shadows, borders, hover transitions) for a more
    cohesive, beautiful look, all token-backed.

**Sub-issues (first slice):**
  - [x] M14-T1 Add frosted-glass styling to floating UI panels (#96)
  - [x] M14-T2 Enhance gradients and animation polish on the game background (#98)
  - [x] M14-T3 Refine color palette and visual details for a more beautiful look (#97)

### M15 — Game mechanics: combat/movement safety zones (#102)

**Goal:** Resolve the game-mechanics rules requested in issue #102. Rules 1 & 2
(move-onto-unoccupied-site captures it for the mover; a unit cannot beat an
enemy of the same or higher rank) are already implemented and covered in
`src/core` — verified under M15-T1. Rules 3 & 4 (protection/safety zones — a
unit protects its surrounding cells from same-rank enemy units; a Home Tree
protects its surrounding cells from rank-1 enemy units) are new mechanics that
must first be codified in `guidelines/ape-kingdom-rules.md` (the single source
of truth), then implemented and tested in the core.

**Scope:**
  - **Verify rules 1 & 2 (test, #102 items 1-2):** Confirm `src/core`
    capture-on-move and rank-combat already satisfy rules 1 & 2, adding
    regression tests for any uncovered branch.
  - **Rules-doc update (infra, #102 items 3-4):** Add a "Protection / Safety
    Zones" section to `guidelines/ape-kingdom-rules.md` describing units
    protecting adjacent cells from same-rank enemies and Home Trees protecting
    adjacent cells from rank-1 enemies, keeping it consistent with the existing
    Combat/Movement sections.
  - **Core implementation (core, #102 items 3-4, next slice):** Enforce the
    protection-zone rules in `src/core` movement/combat/legal-move + AI logic,
    100% core coverage.

**Sub-issues (first slice):**
  - [ ] M15-T1 Verify & test rules 1-2 of #102 in the core (#104)
  - [ ] M15-T2 Codify protection-zone mechanics (rules 3-4) in the rules doc (#105)

### M16 — Game image assets (#103)

**Goal:** Extract the 8 pixel-art game icons from the image attached to issue
#103 (Home Tree, Monkey Nest, Monkey, Gibbon, Chimpanzee, Gorilla, Mountain,
Grave; 4 rows x 2 on white), remove the white background, save as clean PNGs,
and wire them into the web client as a theme-independent brand asset set per
GUIDELINES-WEB-THEME.md.

**Scope:**
  - **Icon extraction (assets, #103):** Crop each icon by its boundaries,
    remove the white background, and commit the 8 PNGs under `src/assets/`.
  - **UI wiring (UI, #103, next slice):** Render units/sites with the extracted
    pixel-art icons in the thin UI components / view model, no core business
    logic change.

**Sub-issues (first slice):**
  - [ ] M16-T1 Extract pixel-art game icons from uploaded image (#106)

### M17 — UI adjustments follow-ups (#113)

**Goal:** Implement the 9 post-ship UI adjustments from issue #113: forbid
text selection on map drag, hover-highlight instead of move, a single circular
"End Turn" button replacing the Step indicator, hide AI bananas, cell gap +
glass effect on hexagons, remove Kingdom color from units (owner color only on
the hexagon), dark map canvas background, neutral green default land, and a
bottom-left selection panel showing the actual selected hexagon instead of
labels. These are pure UI/visual changes — no `src/core` business logic change.

**Sub-issues (first slice) — complete:**
  - [x] M17-T1 Forbid text selection on map drag + hover highlight instead of move (#114)
  - [x] M17-T2 Replace Step indicator with circular End Turn button & hide AI bananas (#115)
  - [x] M17-T3 Cell & terrain visual overhaul (#116)

### M18 — UI adjustments & fixes (#122)

**Goal:** Resolve the new UI adjustments & fixes from issue #122: (1) render
hexagons with an SVG approach instead of the clip-path, (2) reduce the
inter-hexagon padding so the gap is roughly twice smaller, (3) add a glass
glass edge/highlight effect on the hexagon itself, (bug) fix the app crash
when creating a new unit, and (mechanics) confirm the territory ownership
rules (a taken cell belongs to the taking kingdom and stays owned when the
unit moves off; it is lost only when an enemy occupies it). Split per
plan.md §16.3 — planned 2026-08-24.

**Sub-issues (first slice) — complete:**
  - [x] M18-T1 Fix app crash when creating a new unit (#123) — `pi:ready`
  - [x] M18-T2 Confirm & test territory ownership rules (#124) — `pi:ready`
  - [x] M18-T3 Hexagon visual overhaul: SVG render, tighter gap, glass edges (#125) — `pi:ready`

### M19 — New post-ship bug fixes & UI tweaks (#129)

**Goal:** Resolve the new post-ship bug fixes & UI tweaks from issue #129:
(1) territory-ownership display bug (a cell should stay owned by the kingdom
even when the unit vacates; only an enemy occupation flips it), (2) "Next
Turn" does nothing (End Turn should work anytime even if not all units have
moved), (3) glass edge effect is too contrast (make it more subtle), (4) no
way to create new units (Restore a Recruit option at the Home Tree), (5)
remove the "Move {from} => {to}" action list, and (6) units that have moved
should be opaque. Pure UI/bug-fix work; `src/core` stays pure and 100%
covered. Split per plan.md §16.3 — planned 2026-08-24.

**Sub-issues (first slice):**
  - [ ] M19-T1 Fix territory ownership display (#130) — `pi:ready`
  - [ ] M19-T2 Make End Turn work anytime (#131) — `pi:ready`
  - [ ] M19-T3 Restore a way to create new units (#132) — `pi:ready`
  - [ ] M19-T4 (next slice) Glass edge made more subtle (#129-3)
  - [ ] M19-T5 (next slice) Remove the Move {from} => {to} action list (#129-5)
  - [ ] M19-T6 (next slice) Mark moved units as opaque (#129-6)

### M20 — Terrain & movement legality (#137/#142/#138)

**Goal:** Make movement respect the map terrain per the user feedback: a unit
may never step onto a water cell (#142) or a mountain cell (#137), and a unit
whose whole route stays within its own kingdom's land may move up to 4 hexes
(default 1) (#138). Core legality (`reachableHexes`, `legalActions`,
`moveUnit`) currently only checks unit occupancy, not terrain — so water and
mountain cells are legal move targets today and must be blocked, and the
owned-land range rule must be codified in the rules then implemented in the
core. Pure core mechanic change; `src/core` stays pure and 100% covered.
Planned 2026-08-25.

**Sub-issues (first slice) — all `pi:ready`:**
  - [ ] M20-T1 No way to step on the water (#146) — `pi:ready`
  - [ ] M20-T2 No way to step on the mountain (#147) — `pi:ready`
  - [ ] M20-T3 Move up to 4 cells through your own land (#148) — `pi:ready`

### M21 — Game rules & graves economics (#143) — upcoming

**Goal:** Create a comprehensive `RULES.md` describing the full game (economics,
units, movement, capturing territory, winning condition), and add the new
"graves" mechanic: if a kingdom's money goes negative, all its units die and
graves appear in their place; each grave costs -1 to the kingdom per turn, a
unit can harvest a grave by moving onto it for +2 (clearing the grave). Docs +
core mechanic. Planned next PM slice.

### M22 — Map exploration / fog of war (#144) — upcoming

**Goal:** Add map exploration / fog of war: at start the map is hidden (black)
and is revealed by unit vision — Monkey vision 1 (reveals surrounding cells),
Gibbon +2 (2 levels), Home Tree +3, all other units +3. Large core + UI
feature; split into sub-issues when planned.
