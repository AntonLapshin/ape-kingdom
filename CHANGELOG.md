# Changelog

All notable changes to **ape-kingdom** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Project complete (M1–M6).** All milestones implemented, merged, and
tested; the POC is shipped and demoable. Final verification (M6): `npm test`
(266 tests), `npm run test:coverage` (100% on `src/core/**/*.ts`), and
`npm run build` all pass; CI is green on `main`; the live demo is deployed at
https://AntonLapshin.github.io/ape-kingdom/. The `/guidelines` folder is
complete and referenced from README/manifest, and manifest.md +
project-state.md + this changelog reflect the shipped POC.

### Added

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
