# Changelog

All notable changes to **ape-kingdom** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added movement via click-to-move with reachable-cell highlighting (M10-T4,
  #70). Selecting a human-owned, not-yet-acted unit now highlights every
  reachable, unoccupied target hex it could move to this turn, and clicking
  one of those highlighted targets moves the unit there through the existing
  `selectAction` flow (ending in the core `moveUnit` reducer). A new pure core
  derivation `moveTargets` (`src/core/moveTargets.ts`, 100% covered) extracts
  every reachable target hex for a selected unit from the current player's
  step-filtered legal moves (so only the current player's own, not-yet-acted
  units ever highlight, and nothing is highlighted before income is collected).
  The thin `useGameSession` view model exposes `selectedMoveTargets` (via a
  pure `selectedMoveTargets` adapter) and enhances `selectCell` to issue the
  `move` action when a reachable target is clicked; clicking a non-reachable
  cell never issues an illegal move and simply reselects/clears the move
  highlight. The dumb `Board` accepts a `moveTargets` prop and the `Cell` atom
  gains an `isMoveTarget` state (`hex-move-target` token highlight in
  `index.css`, `data-move-target` flag), with `PlayableGame` wiring the view
  model to the board. `Cell`/`Board` Showcase demos were added per the atomic
  design guidelines. Core stays pure and 100% covered; new tests cover the
  core derivation, the view-model selection & move dispatch, the cell/board
  highlighting, the PlayableGame click-to-move wiring, and the Showcase
  registration.

- Added cell selection with an info/action panel (M10-T3, #66). Clicking any
  hex on the board now selects it: the matched `Cell` is visually highlighted
  (`hex-selected` state, composable with the existing `hex-current` ring) and
  `PlayableGame` shows a new thin `CellInfoPanel` component for the selected
  cell. A pure core derivation `cellInfo`
  (`src/core/cellInfo.ts`, 100% covered) builds the display info from the
  current `GameState` — the generated terrain (land/water/mountain), the site
  (Grove/Nest/Home Tree with its owner and banana income from the static
  `siteType` table), the unit (kind/rank/owner and its recruit cost from
  `APE_TYPES`), and the actionable recruit items. The selected hex is
  actionable when the current player has a legal `recruit` action targeting it
  this turn; for those hexes the panel lists each recruit item with its banana
  cost as a button wired through the existing `selectAction` flow, while
  read-only hexes show only read-only info (terrain/site/unit/cost/income)
  with no action buttons. The thin `useGameSession` view model exposes
  `selectedHex` / `selectedCell` / `selectCell` (via a pure `selectedCellInfo`
  helper) and the dumb `Board`/`Cell` atoms accept `selectedHex` /
  `onSelectCell` / `isSelected` props (clickable + keyboard-accessible with
  `role="button"`). A `CellInfoPanel` Showcase demo was added per the atomic
  design guidelines. Core stays pure and 100% covered; new UI tests cover the
  core derivation, the view-model selection, the panel's read-only and
  actionable states, cell highlighting/click wiring, and the Showcase
  registration.

- Added mouse-wheel zoom in/out on the board (M10-T2, #65). A new thin
  `useZoom` view model (`src/ui/viewModels/useZoom.ts`) tracks the board's
  zoom scale (default `1`, clamped to `[ZOOM_MIN, ZOOM_MAX]`) and exposes
  `zoomBy(delta)` / `setZoom(scale)`, with pure, unit-tested `clampZoom` /
  `zoomBy` helpers and a `boardTransform(zoom, pan)` summary helper that
  builds the combined CSS transform. `PlayableGame` mounts a `wheel` listener
  on the game viewport that converts each notch of the wheel into a zoom
  step and `preventDefault()`s, so scroll-wheel gestures zoom the map in/out
  instead of scrolling the page (which is already non-scrolling). The dumb
  `Board` component accepts an optional `zoom` prop and applies it as a
  `scale(...)` combined with the M10-T1 pan translate so zoom and pan combine
  correctly (scaled + translated around the board's centre) without losing
  the map. Core stays pure and 100% covered; new UI tests cover the view
  model, the board transform, the wheel gesture, default-scroll prevention,
  and the zoom bounds.

- Added full-viewport drag-to-pan board navigation (M10-T1, #64). The
  `PlayableGame` now mounts inside a full-viewport, non-scrolling container
  (`h-screen w-screen overflow-hidden`), and the `App` game route renders it
  without the page-scrolling wrapper so the game fills 100% of the viewport.
  A new thin `usePan` view model (`src/ui/viewModels/usePan.ts`) tracks the
  pan offset `{x, y}` and exposes `panBy(dx, dy)` / `setPan` (with a pure,
  unit-tested `offsetBy` helper that clamps the offset); dragging the board
  updates the offset via pointer events (pointer down → move → up, wired in
  `PlayableGame`). The dumb `Board` component accepts an optional `pan` prop
  and applies it as a CSS translate to the map/grid transform so the user can
  drag to reposition the map. Core stays pure and 100% covered; new UI tests
  cover the view model, the board transform, and the drag gesture.

- Rendered the generated map's terrain (land / water / mountain) in the UI
  `Board` component (M9-T3, #52). The `Cell` atom now accepts a `terrain` prop
  (defaulting to `land`) and styles each hex with a distinct semantic theme
  token — `bg-terrain-land` / `bg-terrain-water` / `bg-terrain-mountain` —
  defined in `src/theme.css` and re-exposed to Tailwind via `@theme inline`
  (per GUIDELINES-WEB-THEME.md, no raw Tailwind palettes). The `boardCells`
  view model now renders **every** hex of the generated `GameState.map` (one
  `BoardCell` per map cell, carrying its `terrain` from the core map data and
  attaching the site/unit where present) so the playable board reflects the
  generated map, and `Board.tsx` passes each cell's terrain through to `Cell`.
  Ownership stays visible via the `hex-current` highlight and the
  owner-coloured `Unit` / `Content` badges, and sites + units continue to
  render on their (land) cells. The `Cell` showcase now demos Land / Water /
  Mountain alongside the owner states. UI tests updated/added for terrain
  variants and full-map rendering; `src/core/**` stays at 100% coverage.

- Wired the map generator into game setup so each game starts on a freshly
  generated board (M9-T2, #53). `standardSetup` / `createGameSession` now use
  `generateMap` (M9-T1) to build a new 20×20 board by default (configurable via
  a `MapConfig`, e.g. a `seed`, for deterministic reproduction), instead of the
  fixed small board. Each player's Home Tree is placed on opposite sides of the
  generated island with the 6 neutral Groves and 4 Nests between them, all on
  land cells only, and no starting unit is placed in the sea. The generated
  board is carried on the new `GameState.map` field (a type-only import keeps
  the runtime dependency one-directional), so it flows through every reducer
  and is available to the UI later for terrain rendering (M9-T3). The
  `useGameSession` view model now accepts an optional `mapConfig`. A defensive
  `no-suitable-home` error guards against degenerate maps. Core stays decoupled
  and 100% covered.

- Added a `Board` component test asserting the unit badge renders the
  view-model-driven text `<kind> <rank>` (M9-T4, #57). The test verifies the
  starting Monkey at (0,0) renders as "Monkey 1", wiring the core `rankOf()`
  rank through the `boardCells` view model into the `Unit` atom badge
  (introduced in PR #55). Core stays 100% covered.

- Added the terrain model and pure map generator engine (M9-T1, #54).
  `src/core/mapGenerator.ts` is a new pure core module (no React/DOM)
  defining the `Terrain` type (`"land" | "water" | "mountain"`), the
  `GameMap` / `MapCell` model, and a `generateMap(width?, height?, config?)`
  function that produces a playable hex map: a single contiguous island of
  land (with mountain cells) surrounded by an all-water border, plus interior
  lakes (water cells fully enclosed by land). The generator is configurable
  via props (`width`, `height`, `islandSize`, `mountainDensity`, `lakeDensity`,
  `seed`) with sensible defaults (`DEFAULT_MAP_CONFIG`, default 20x20) and is
  fully deterministic — the same `seed` always yields the same map via a
  mulberry32 seeded RNG. It also exposes `resolveConfig`, `terrainAt`,
  `isWater`, `isMountain`, `landCellCount`, `isLandSurface`, the typed
  `MapError` (with kinds `invalid-dimension` / `invalid-island-size` /
  `invalid-density` / `invalid-seed`) for rejecting invalid dimensions/config,
  and `MIN_MAP_DIMENSION`. Fully covered by
  `tests/core/mapGenerator.test.ts` (28 tests: determinism, invariants,
  validation, and lookup helpers). Core stays 100% covered.

### Changed

- **Project complete (M1–M6).** All milestones implemented, merged, and
tested; the POC is shipped and demoable. Final verification (M6): `npm test`
(266 tests), `npm run test:coverage` (100% on `src/core/**/*.ts`), and
`npm run build` all pass; CI is green on `main`; the live demo is deployed at
https://AntonLapshin.github.io/ape-kingdom/. The `/guidelines` folder is
complete and referenced from README/manifest, and manifest.md +
project-state.md + this changelog reflect the shipped POC.

### Added

- Added the `Content` atom component and its showcase (M8-T3, #50).
  `src/ui/components/Content.tsx` is a pure, dumb atom that renders a site
  content marker (Home Tree, Nest, Grove) as a small labelled badge
  (`data-testid="board-site"` / `data-kind`, `text-[10px] font-semibold
  leading-none text-text-body`), extracted from the inline site label
  previously rendered in `Board.tsx` via `SITE_LABELS`. It exposes a `kind`
  prop (the `SiteKind`) and renders the matching human-readable label, keeping
  all presentation logic out of business logic. `Board.tsx` now composes
  `Content`. A showcase demo `src/ui/showcases/Content.tsx` demos the three
  site kinds (Grove, Nest, Home Tree) and is registered in
  `src/ui/showcases/index.ts` per rule 7 of
  `guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md`. Covered by
  `tests/ui/Content.test.tsx` (5 tests) and the extended showcase-registry
  test. Core stays 100% covered.
- Added the `Cell` atom component and its showcase (M8-T1, #51).
  `src/ui/components/Cell.tsx` is a pure, dumb atom that renders a pointy-top
  hexagon board cell (hex clip-path, `bg-brand-*` token colours,
  `hex-cell`/`hex-pop`/`hex-current` classes, `data-testid="board-cell"` /
  `data-hex` / `data-owner` attributes), extracted from the inline hex
  rendering previously in `Board.tsx`. It exposes props for the cell's hex
  coords, owner, current-territory highlight, pixel position, and animation
  delay, with a `children` slot for the site/unit content. `Board.tsx` now
  composes `Cell`; the `HEX_CLIP` constant moved to `src/ui/presentation.ts`
  so both can share it. A showcase demo `src/ui/showcases/Cell.tsx` demos the
  neutral/p1/p2/current variants and is registered in
  `src/ui/showcases/index.ts` per rule 7 of
  `guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md`. Covered by
  `tests/ui/Cell.test.tsx` (7 tests) and the extended showcase-registry test;
  the M5 polish test now asserts the hex classes on `Cell` (where they now
  live). Core stays 100% covered.
- Added the `Unit` atom component and its showcase (M8-T2, #49).
  `src/ui/components/Unit.tsx` is a pure, dumb atom that renders an ape unit
  badge (kind + rank) coloured by owner (`data-testid="board-unit"`,
  `data-owner`, `bg-brand-rose-deep` / `bg-brand-violet-deep`, `text-inverted`),
  extracted from the inline badge previously rendered in `Board.tsx`. It
  exposes `kind`, `rank`, and `owner` props so all presentation logic stays out
  of business logic. `Board.tsx` now composes `Unit`, and the `useGameSession`
  view model derives each unit's rank (via the pure core `rankOf`) into a
  `UnitView` so the dumb component needs no game-rule logic. A showcase demo
  `src/ui/showcases/Unit.tsx` demos the four ape kinds (Monkey, Gibbon,
  Chimpanzee, Gorilla) for each owner and is registered in
  `src/ui/showcases/index.ts` per rule 7 of
  `guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md`. Covered by
  `tests/ui/Unit.test.tsx` (4 tests) and the extended showcase-registry test;
  core stays 100% covered.

- Added the `/showcase` route, top-right link, and README documentation
  (M7-T4), completing M7 (#45). `src/App.tsx` is now a thin, router-agnostic
  page that derives its route from the pathname (`/showcase` → showcase,
  otherwise the playable game, which remains the default view), navigates via
  `window.history.pushState` (preserving the app's base path, e.g.
  `/ape-kingdom/` under GitHub Pages), and handles browser back/forward via
  `popstate`. It renders a fixed top-right **Showcase** link that opens the
  showcase and flips to **← Back to game** to return to the game. The
  showcase page composes the existing dumb `Showcase` component through the
  `useShowcase` view model, so deep links (`?file=..&showcase=..`) and browser
  back/forward still work. `README.md` documents the `/showcase` route and
  how to reach it. Covered by `tests/ui/App.test.tsx` (6 tests: default game
  view, link open/back, direct `/showcase` render, deep-link selection, and
  popstate navigation); core stays 100% covered.
- Added the pure Showcase core engine (M7-T1), per
  `guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md`. `src/core/showcase.ts`
  implements the hand-rolled component browser's pure engine with no
  React/DOM dependency: a `ShowcaseRegistry` of showcase files (each with a
  `name` and a map of named showcase render functions, which core treats as
  opaque), an immutable selection state (selected file + selected showcase +
  expanded sidebar set), `select(state, registry, file, showcase)` and
  `toggleFile` transitions, and URL deep-link helpers `encodeSelection` /
  `decodeSelection` for the `?file=..&showcase=..` query string.
  `validateRegistry` rejects malformed registries and `select`/`toggleFile`
  reject unknown file/showcase names with typed `ShowcaseError`s
  (`unknown-file` / `unknown-showcase` / `invalid-registry`) — no silent
  fallbacks. Covered by `tests/core/showcase.test.ts` (21 tests); core stays
  100% covered (#39).
- Added the `useShowcase` view model and dumb `Showcase` component (M7-T2),
  per `guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md` §4. `src/ui/viewModels/useShowcase.ts`
  is a thin view model binding the core showcase engine (`src/core/showcase.ts`)
  to React state and syncing the selection to the URL (`?file=..&showcase=..`)
  via `window.history` / `popstate` — router-agnostic, no react-router
  dependency. It reads the initial selection from the URL on mount, pushes the
  selection on change, and re-applies it on browser back/forward; a stale deep
  link naming an unknown file/showcase is ignored gracefully (the core still
  rejects it with a typed `ShowcaseError`). The pure presentation adaptation
  `toShowcaseView` is exported for direct testing. `src/ui/components/Showcase.tsx`
  is a dumb component rendering a collapsible sidebar (file list + expandable
  showcase entries) and a canvas that renders the selected showcase, reading
  the view-model `view` and calling its `onSelect` / `onToggleFile` callbacks —
  no business logic, no hooks, no side effects. Covered by
  `tests/ui/useShowcase.test.ts` and `tests/ui/Showcase.test.tsx`; core stays
  100% covered (#40).
- Added showcase demo files for every atom component and their registration
  (M7-T3), per `guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md` §5 and rule 7.
  `src/ui/showcases/` now contains one thin demo file per atom component —
  `ActionControls.tsx`, `Board.tsx`, `StatusPanel.tsx`, `DemoPanel.tsx` — each
  exporting a `name` constant (the sidebar display name) and one named render
  function per variant/state, with only imports + tiny scene-setting render
  functions (no component implementation, no business logic).
  `src/ui/showcases/index.ts` aggregates them into the `showcaseRegistry()`
  `ShowcaseRegistry` that the `useShowcase` view model / `Showcase` component
  consume, so every atom component in `src/ui/components/` has a registered
  showcase. Covered by `tests/ui/showcases.test.tsx` (validates the registry
  via the core `validateRegistry`, asserts every atom component is registered,
  and mounts every showcase render); core stays 100% covered (#41).
- Added animations and interaction polish to the playable UI (M5-T3),
  per `guidelines/GUIDELINES-WEB-THEME.md`. `src/styles/index.css` now
  defines token-driven animation classes (all referencing `var(--color-…)`,
  no raw colors): `hex-cell` (subtle gradient/glow plus smooth hover/active
  feedback on board hexes), `hex-current` (the current player's territory is
  visually distinct via an accent glow ring), `hex-pop` (hexes pop in on
  mount, staggered by index), `turn-fade` (the current-player highlight and
  turn-step label fade/slide on turn changes), `result-celebrate` (a springy
  pop-in celebrating win/loss when `isDone`/`winner` becomes set), and
  `btn-action` (clean pressed/disabled feedback on the action, Clear, and
  End Turn buttons). All new animations are disabled under
  `prefers-reduced-motion`. The thin components stay dumb — `Board` adds the
  `hex-cell`/`hex-pop`/`hex-current` classes keyed off the view-model
  `currentPlayer`, `StatusPanel` adds `turn-fade`/`result-celebrate`, and
  `ActionControls` adds `btn-action` — with no game logic added; all state
  still flows from core via `useGameSession`. Covered by a structural test
  (`tests/m5-ui-polish.test.ts`) guarding the keyframe/class presence in
  `index.css` and that the components stay thin (no core value imports);
  core stays 100% covered (#33).
- Added a structural test (`tests/m4-ui-theme.test.ts`) guarding acceptance
  criterion 1 of the M4 UI token refactor (#32 / #35): the five M4 UI files
  (`src/ui/components/Board.tsx`, `ActionControls.tsx`, `StatusPanel.tsx`,
  `PlayableGame.tsx`, `src/App.tsx`) must use only token-backed utilities —
  no raw hex, no `rgba(...)`, and no default Tailwind palette classes
  (`slate-*`, `indigo-*`, `rose-*`, `sky-*`, `emerald-*`, `amber-*` outside
  the allowed `brand-*` token names). Mirrors the structural approach of
  `tests/theme.test.ts`; core stays 100% covered (#36).
- Added the design-token theme system for the client (M5-T1), per
  `guidelines/GUIDELINES-WEB-THEME.md`. `src/theme.css` defines the two-layer
  token model — Layer 1 (theme-independent brand palette: amber→rose→violet
  gradient family, accent, success/danger/premium, pure neutrals) and Layer 2
  (semantic roles: `canvas`, `panel`, `line`, `text-primary`/`text-body`/
  `text-muted`/`text-faint`/`text-on-accent`, `shadow`/`shadow-accent`,
  `glass*`, `stage`, dark gradient stops) — and re-exposes every token to
  Tailwind via `@theme inline` so components can use `bg-panel`,
  `text-text-primary`, `border-line`, etc. `src/styles/index.css` defines
  reusable `@utility` surfaces (`glass`, `glass-strong`, `glass-soft`,
  `glass-dark`, `glass-panel`, `glass-input`, `surface`) plus animation
  keyframes/classes (`.login-bg`, `.orb`, `.btn-shine`, `.menu-pop`, custom
  scrollbars), all referencing tokens via `var(--color-…)` with no raw colors
  outside token definitions. No component code was changed — the token system
  is wired into the Tailwind entry. This required upgrading Tailwind CSS from
  v3 to v4 (`@tailwindcss/vite` plugin, CSS-first `@theme`/`@utility` config,
  `tailwind.config.ts` removed). Covered by structural tests
  (`tests/theme.test.ts`) verifying the two-layer token model and the
  Tailwind wiring; core stays 100% covered (#31).
- Added the playable board UI (M4-T3) replacing the scaffold `DemoPanel` in
  `App.tsx` with a full Human vs AI game screen. New thin, dumb components in
  `src/ui/components`: `Board` renders the hex map from the view-model
  `board` cells (site/unit owner colouring, ape badges, current-player
  footer); `ActionControls` renders one button per legal action plus Clear /
  End Turn, letting the human select recruit / move / fight / collect-income
  actions and submit their turn (the AI replies and the turn advances live);
  `StatusPanel` shows the current player, each player's banana score and
  elimination status, the turn step, and a clear win/loss message when the
  game ends. `PlayableGame` is the thin composition layer that wires the
  `useGameSession` view model to the three dumb components (the only
  stateful UI layer). Pure presentation helpers (`actionLabel`, `playerName`,
  `STEP_LABELS`, `SITE_LABELS`, `hexToPixel`) live in `src/ui/presentation.ts`
  so the components stay pure and dumb. Covered by UI tests (Vitest + Testing
  Library) for each component and the full `PlayableGame` wiring; core stays
  100% covered (#27).
- Added the thin `useGameSession` view model in
  `src/ui/viewModels/useGameSession.ts` (M4-T2) that adapts the core
  game-session controller (`src/core/gameSession.ts`) into a plain,
  serializable UI-state shape for the playable board: `board` cells (hex +
  site/unit), `players` with banana scores and elimination status, the
  `currentPlayer`, the human's selectable `legalActions`, the `step`, and the
  `winner`/`isDone` status. It exposes thin helpers `selectAction`, `clearActions`
  (which resets the current turn via the new core `resetTurn`), and `submitTurn`
  that delegate to the core controller only — no game rules or business logic
  live in the view layer. The pure presentation adaptations (`boardCells`,
  `playerViews`, `toGameSessionView`) are exported separately and covered by a
  UI test (Vitest + Testing Library); `resetTurn` added to the core session
  controller with 100% core coverage maintained (#26).
- Added the pure core game-session controller in
  `src/core/gameSession.ts` (M4-T1): `createGameSession(aiSeed?, aiOptions?)`
  builds a new session from the standard two-player setup (Home Trees,
  neutral Groves/Nests, `startingForce`) and returns the initial `GameState`
  plus the current player's `legalMoves`. The human selects one legal action
  at a time via `selectAction` (which validates the action against the
  session's `legalMoves`, enforces the income -> recruit -> move/fight turn
  ordering, and recomputes the projected `state` and next `legalMoves`), then
  ends the turn with `submitTurn`, which runs the AI's seeded/deterministic
  reply via `playTurn` from `src/core/gameLoop.ts` and advances to the next
  human turn — or marks the session `done` with the winner when the game
  ends. The session exposes `baseState`/`state`, the selected `moves`, the
  current `step` (`income`/`recruit`/`movefight`/`done`), the `legalMoves`,
  and the `winner`. Full-game simulation tests complete many seeded games
  through the session API with a winner and no illegal moves; 100% core
  coverage maintained (#25).
- Added the pure core legal-move enumeration entry point in
  `src/core/legalMoves.ts` (M3-T1): `legalMoves(state)` returns every legal
  action available to the current player across each turn step (collect
  income, recruit every affordable ape kind at every legal placement hex,
  move every not-acted unit to every reachable unoccupied hex, and attack
  every not-acted unit against every adjacent enemy unit), returned in
  turn-step order as plain serializable `GameAction` descriptors that can be
  fed back into the existing reducers. It shares the enumeration logic with
  the AI layer (`legalActions`), so the UI and AI see the same legal moves;
  100% core coverage maintained (#21).
- Added the pure core game loop orchestration in `src/core/gameLoop.ts` (M3-T3):
  `playTurn(state, humanMoves, aiSeed, aiOptions?)` wires the full Human vs AI
  turn cycle — it collects income for the human (step A), applies their
  submitted recruit / move / fight actions (steps B + C) in rule order via
  `applyHumanMoves` (which enforces the income -> recruit -> move/fight step
  ordering and throws a typed `TurnOrderError` on a recruit-after-fight),
  then runs the AI's full turn via `runAiTurn` (M3-T2, never illegal), then
  advances the turn to the next active (non-eliminated) player via
  `advanceTurn` (which resets `hasActed` for the new current player's units
  and skips eliminated players). Victory is resolved after each side's turn
  via `resolveVictory`; once a winner exists the loop stops. Also adds
  `applyAction` (a plain serializable `GameAction` -> reducer adapter the UI
  can call), `aiTurnActions` (the AI's full ordered turn as a move list),
  and `chooseFromActions` in `src/core/ai.ts` (the shared seeded/scoring
  selection engine behind `aiChooseMove` and the AI turn). Full-game
  simulation tests complete many seeded games with a winner and verify the
  AI never makes an illegal move; 100% core coverage maintained (#20).
- Added the pure core AI decision layer in `src/core/ai.ts` (M3-T2):
  `legalActions(state)` enumerates every legal action for the current player
  across each turn step (collect income, recruit every affordable ape kind at
  every legal placement hex, move every not-acted unit to every reachable
  unoccupied hex, and attack every not-acted unit against every adjacent enemy
  unit), returned as plain serializable `GameAction` descriptors that feed
  directly into the existing reducers. `aiChooseMove(state, seed, options?)`
  selects a single rule-legal action from that set, deterministically for a
  given seed via a seeded PRNG. With `difficulty: 0` (default) it picks
  uniformly at random from the legal set; at higher difficulty it scores each
  action and prefers the best, honouring the configurable `preferRecruit`,
  `preferCapture`, and `avoidLosingAttacks` behavior knobs. Every returned
  action is legal — applying it to the corresponding reducer never throws a
  typed error. Includes the `reachableHexes` helper and 100% core test
  coverage covering enumeration, determinism, legality across many seeds, and
  strategic preferences (#19).
- Added the victory detection reducer `resolveVictory(state)` in
  `src/core/game.ts`, which determines the game winner per the victory rules:
  the game ends immediately when one player either controls every Home Tree on
  the map, or is the only player not eliminated. `checkVictory(state)` returns
  the winning player id (or `null` while the game is still in progress), and
  `resolveVictory` returns a new immutable `GameState` with its `winner` field
  set to the winning player (or `null`). Combines with the elimination reducer
  (M2-T5): a player wins when all other players are eliminated. Adds a `winner`
  field to the `GameState` record and 100% core test coverage covering
  all-controls victory, sole-survivor victory, and no-winner in-progress cases
  (#15).
- Added the elimination reducer `eliminatePlayers(state)` in `src/core/game.ts`,
  which marks players as eliminated per the rules: a player is eliminated if
  they control no Home Tree and have no units, while a player who controls no
  Home Tree but still has units is NOT eliminated (they may recover by
  capturing another Home Tree). Eliminated players are marked `eliminated =
  true` on their player record and dropped from `turnOrder` (removed from
  active play), preserving site/unit ownership for survivors. Includes the
  `isEliminated` helper, an `eliminated` flag on the `Player` record, and 100%
  core test coverage (#14).
- Added the turn-sequence "Move and Fight" attack step as a pure reducer
  `attackUnit(state, attacker, targetHex)` in `src/core/game.ts`, which
  resolves a single attack against an adjacent enemy unit by comparing ranks
  per the rules: attacker rank higher → defender destroyed and the attacker
  moves into its hex; equal ranks → both units destroyed; attacker rank lower
  → attacker destroyed and defender remains. The attacker must be owned by
  the current player and must not have already acted this turn, and is marked
  `hasActed = true` after the attack. If the defender occupied a site and the
  attacker wins, the attacker captures that site; if both units are destroyed
  site ownership does not change. Returns a new immutable `GameState` and
  rejects with a typed `AttackError` for illegal attacks (not the owner's
  turn, already acted, non-adjacent target, or no enemy unit at the target).
  Includes 100% core test coverage (#13).
- Added the turn-sequence "Move and Capture" step (movement part) as a pure
  reducer `moveUnit(state, unit, targetHex)` in `src/core/game.ts`, which
  moves a unit up to its Movement value (standard 1 hex) toward a target hex,
  marks it `hasActed = true`, captures an unoccupied Grove, Nest, or Home Tree
  at the target for the moving unit's owner, and returns a new immutable
  `GameState`. Rejects with a typed `MoveError` when the unit has already
  acted this turn, the target is beyond the unit's movement value, or the
  target hex is occupied by another unit. Includes the `hexDistance` helper
  and 100% core test coverage (#9). Combat (attacking adjacent enemy units)
  is out of scope here and handled in a later task.
- Added the turn-sequence "Recruit Apes" step as a pure reducer
  `recruitUnit(state, kind, hex)` in `src/core/game.ts`, which lets the
  current player spend bananas to recruit an ape at a controlled Home Tree
  (on the Home Tree hex if empty, or an adjacent empty hex), deducts the cost
  per `APE_TYPES` (Monkey=2, Gibbon=4, Chimpanzee=8, Gorilla=16), marks newly
  recruited apes `hasActed = true`, and returns a new immutable `GameState`.
  Rejects with a typed `RecruitError` when the player cannot afford the ape,
  the hex is not a controlled Home Tree or adjacent empty hex, or the target
  hex is occupied. Includes hex helpers (`sameHex`, `adjacentHexes`,
  `areAdjacent`) and 100% core test coverage (#8).
- Added the turn-sequence "Collect Income" step as a pure reducer
  `collectIncome(state)` in `src/core/game.ts`, which credits the current
  player with the banana income of every site they control (Grove=1, Nest=2,
  Home Tree=3), ignores neutral sites, adds to the existing balance without
  limit, and returns a new immutable `GameState`. Includes the `incomeFor`
  helper and 100% core test coverage (#7).
- Modeled the core Ape Kingdom game entities as pure TypeScript in
  `src/core/game.ts` (hex map, sites, ape units, players, game state) with
  helper functions (rank/cost/movement lookup, site income, unit/site/player
  creation, standard two-player setup) and 100% core test coverage (#3).
- Initial React + Tailwind + TypeScript scaffold (Vite).
- Core/UI separation with `src/core` (business logic) and `src/ui` (thin views).
- Vitest setup enforcing 100% coverage on `src/core/**/*.ts`.
- Initial demo panel rendering project name / status / demo info.
- Added `/guidelines` folder with the Ape Kingdom game rules and the web
  implementation guidelines (theme, atomic design, context injection), and
  referenced them from `README.md` and `manifest.md` so all personas follow them (#2).

### Changed

- Refactored the M4 playable UI to use the semantic design tokens from
  `src/theme.css` (M5-T2) instead of raw Tailwind palettes, applying the brand
  gradient look per `guidelines/GUIDELINES-WEB-THEME.md`. `Board` maps
  player/site/unit colours to the brand tokens (`bg-brand-rose` /
  `bg-brand-violet` for the hex cells, `bg-brand-rose-deep` /
  `bg-brand-violet-deep` for the unit badges, `bg-brand-amber-soft` for
  neutral cells) and uses `border-line-strong` / `text-text-body` /
  `text-text-muted` / `text-inverted`; `ActionControls` buttons use
  `bg-panel`, `border-line-strong`, `text-text-primary`/`text-text-body`,
  `bg-accent`/`bg-accent-strong`/`bg-accent-soft`, and `text-inverted`;
  `StatusPanel` uses `text-text-primary`/`text-text-body`, `bg-accent-soft`
  + `ring-accent` for the current player, `bg-panel-strong`, and
  `bg-success-soft text-success` / `bg-danger-soft text-danger` for the
  win/loss result; `PlayableGame` panels use the `glass-panel` token surface;
  and `App` gets the brand gradient backdrop (`.login-bg`: canvas + brand
  gradient stops). No component logic changed — the components stay thin and
  dumb and all game state still flows through `useGameSession`. Existing UI
  tests still pass unchanged; core stays 100% covered (#32).

### Fixed

- Committed `package-lock.json` so CI's `npm ci` step passes (#1).
- Fixed invalid JSON in `package.json` `description` (unescaped quotes) that blocked `npm install`/`npm ci`.
- Fixed unescaped-quote parse error in `src/App.tsx` description prop that broke lint/build.
