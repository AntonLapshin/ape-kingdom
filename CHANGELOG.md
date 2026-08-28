# Changelog

All notable changes to **ape-kingdom** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Project status

- **Original milestones M1–M28 complete** (completed 2026-08-27) plus post-ship
  M29 (UI performance, #208) implemented (PRs #212/#213/#217). 861 tests pass,
  100% coverage on `src/core/**`, build succeeds, CI + GitHub Pages green at
  https://AntonLapshin.github.io/ape-kingdom/.
- **Three new post-ship feedback issues planned as M30–M32 (2026-08-28):** #216
  (Random neutral units) → M30, #215 (Enhance map generator) → M31, #214 (UI
  adjustments) → M32. First `pi:ready` slices created: M30-T1 #219, M31-T1
  #220, M32-T1 #221 (merged via PRs #222/#223/#224). Next batch `pi:ready`:
  M30-T2 #225 (random neutral unit placement) — merged; M31-T2 #226 (smaller
  circular default map) — merged; M32-T2 #227 (cell-info shows terrain) — merged.
- **Remaining M30 scope planned `pi:ready` (2026-08-28):** M30-T3 #235 (neutral
  unit protection rule, `priority:p2`), M30-T4 #233 (interaction with neutral
  units — attack/defeat, capture, cross-turn behaviour, `priority:p2`) and
  M30-T5 #234 (UI — render neutral units distinctly, `priority:p3`). M30-T4
  #233 and M30-T3 #235 are now **merged**. This covers most of
  the remaining M30 sub-issues; M30-T5 and M31-T3/T4 and M32-T3/T4 remain to
  plan on later PM turns.

### Added

- Neutralize the brownish text palette to neutral gray (M32-T4, #240). The four
  text role tokens in `src/theme.css` (`--color-text-primary/body/muted/faint`)
  move from the warm cocoa/mud cast to neutral achromatic grays, so UI text
  reads cleanly without the brownish tint, while preserving the same relative
  luminance hierarchy (primary > body > muted > faint) and readable contrast
  on the parchment panels/glass. `--color-text-on-accent` stays white,
  so on-accent/inverted text contrast is unchanged. A structural theme test
  asserts each role is an achromatic gray with the hierarchy intact and the
  on-accent role stays near-white. Pure presentational change to
  `src/theme.css` only; `src/core/**` untouched and still 100% covered.

- Render neutral units distinctly (M30-T5, #234). The dumb `Unit` badge now
  flags a neutral guardian (`owner === null`, selected by the pure
  `isNeutralUnitBadge` presentation helper) with a distinct ownership-neutral
  tint (`bg-owner-neutral`, a new `--color-owner-neutral` semantic token in
  the theme) plus an uppercase "Neutral" label (via `NEUTRAL_UNIT_LABEL`), so
  a neutral unit reads cleanly apart from p1/p2 units (which keep the plain
  glass badge) and from the neutral Groves/Nests site markers. A dedicated
  `NeutralGuardians` showcase demos the state. When a neutral guardian is
  defeated/captured (M30-T4 #233) the rendered board reflects it exactly —
  the neutral badge/label vanish as the winning unit occupies the cell,
  consistent with the core combat resolution (covered by a board-level
  integration test). UI stays thin/dumb; all logic is a read-only presentation
  map in `src/ui/presentation.ts`; `src/core/**` untouched and still 100%
  covered.

- Neutral unit protection rule (M30-T3, #235). Each neutral guardian unit
  placed during setup (M30-T2 #225) protects the cells surrounding it from
  player entry and attack, reusing the existing Protection / Safety Zones
  mechanic (`isCellProtected`, §174–185) so neutral-owned protection works
  exactly like the established kingdom protections: because a neutral unit's
  `owner` is `null` — an enemy to every player — it protects its adjacent
  cells from *any* player unit of the same rank. The rule is enforced by the
  core legality checks (a move/attack into a cell protected by a neutral is
  rejected with the same typed `MoveError`/`AttackError` `protected` error as
  kingdom guards) and is fully unit-tested in a dedicated
  `tests/core/neutralProtection.test.ts` (17 tests): protect-and-reject cases
  across ranks and both kingdoms, neutral protection does not over-block
  (never its own hex, never different-rank movers, multiple guardians act
  independently), co-existing kingdom (and neutral Home Tree) protection is
  unchanged — no regression to the p1/p2 safety-zone and #195 rules.
  `src/core/**` stays 100% covered. Core-only change; no UI/render work in
  this slice.

- Interaction with neutral units (M30-T4, #233). Defines and enforces how
  players engage the random neutral guardian units placed during setup (M30-T2
  #225): a player attacks and defeats a neutral unit with the existing combat
  rules (`attackUnit` — a neutral unit's `owner` is `null`, so it is an enemy
  to every player), and defeating it lifts its protection over its surrounding
  cells so those cells become legal to enter and capture
  (`moveUnit`/`isCellProtected`). Neutral units are **static guardians** across turns: `canNeutralUnitAct()`
  is always false, and the AI legal enumeration (`legalActions`) and turn
  reset/advance helpers (`gameLoop`, `gameSession`) now explicitly skip neutral
  units, so they never move, attack, or join of their own accord — a neutral
  unit's `hasActed` stays `true` across every turn. All interaction flows
  through the core reducers with typed errors (`AttackError`/`MoveError`),
  fully unit-tested in `tests/core/neutralInteraction.test.ts` (19 tests);
  `src/core/**` stays 100% covered. Core-only change; no UI/render work in this
  slice.

- Added missing `placeNeutralUnits` boundary tests (M30-T2, #229). Following the
  non-blocking review note on PR #228 (#discussion_r3880724527), two tests now
  cover the previously-untested boundaries of `placeNeutralUnits` in
  `src/core/gameSession.ts`: (1) when fewer free land cells remain than `count`,
  exactly the number that fit are placed (e.g. requesting 8 with only 3 free land
  cells returns exactly 3, each on a distinct unoccupied land cell); and (2) the
  `count: 0` → `[]` edge. Test-only change — no production code touched;
  `src/core/**` stays 100% covered.

- Smaller and clearly-round default map (M31-T2, #226). The default `MapConfig`
  is now a **17×17** grid (289 cells) instead of the old 20×20 (400 cells) —
  roughly **1.5× smaller** in cells and usable land (the default island yields
  ~192 land cells vs ~285 before), while still leaving ample room for a full
  p1-vs-p2 game (spawns, Home Trees, Groves, Nests, resources and the random
  neutral units — verified by the setup + simulation tests). 17 is the smallest
  odd dimension that keeps the generated island **robustly** circular under the
  coastal-waviness generator: unlike the parity-sensitive even 16×16 grid
  (where some seeds clip the circle against the square corners and push the
  sector-extent ratio past 1.5), a 17×17 board keeps the worst-case circularity
  ≤ ~1.43 across seeds — reading clearly round, not diamond, and even rounder
  than the old default's ~1.50. An explicit `MapConfig` (width/height/islandSize)
  still overrides the default for tests and reproduction; determinism under a
  fixed seed is unchanged. Core-only change (`src/core/mapGenerator.ts`
  defaults + updated docs); no UI/sizing work in this slice (that is M31-T4).
  `src/core/**` stays 100% covered.

- Hardened the `PlayableGame` UI tests against the smaller default map
  (review fix for #226). The smaller 17×17 board left the seed-dependent
  `PlayableGame` game-state tests (recruit placement, move-to-target, End Turn
  + AI reply) able to fail intermittently on random map seeds (~4 of 9 suite
  runs) because a fresh random board sometimes buried the buildable/reachable
  hex those tests assume. `PlayableGame` now forwards an optional `mapConfig`
  prop through to `useGameSession` (which already accepted one), and the
  whole test file renders each game against a fixed seed (`{ seed: 0 }`) so the
  board is deterministically reproducible — plus two new tests asserting the
  seed is genuinely forwarded (same seed → identical board; different seed →
  different spawn layout). No game rules changed; core coverage stays 100%.

- Blue inner border on the selected cell (M32-T1, #221). When a hexagon is
- Show the selected cell's terrain in the cell-info/bottom panel (M32-T2,
  #227). The bottom-left cell-info panel now renders a clear, consistent
  terrain label for whichever hex is selected: a mountain cell shows
  "Mountain", a water cell "Water", and a plain (no-mountain) cell reads as
  "Land" (no fake terrain). The label is owner-agnostic, so it stays
  consistent for player vs enemy vs neutral/empty cells and is driven purely
  by the map terrain (existing core `cellInfo.terrain`), independent of the
  hex's site/unit/owner. Implemented as a new pure `terrainLabel` +
  `TERRAIN_LABELS` presentation helper in `src/ui/presentation.ts` and a
  dedicated `cell-info-terrain` element in the dumb `CellInfoPanel`
  component (replacing the previous raw `capitalize`d terrain string).
  `src/core` untouched and still 100% covered; new tests cover the terrain
  label helper (mountain/water/plain + fallback) and the panel rendering for
  mountain, water, plain, enemy/neutral and selected-no-unit cells.

- Blue inner border on the selected cell (M32-T1, #221). When a hexagon is
  that surrounds the hexagon — now renders **blue** (`var(--color-selection)`)
  instead of the unselected white glass rim, so the selected hex reads clearly
  against the board. The rule is a descendant of the existing `hex-selected`
  shell, so selection logic/classes are unchanged (the outer blue selection
  ring, move-target circles and pointer affordances are preserved) and
  unselected cells keep their white glass edge. Pure presentational CSS change
  in `src/styles/index.css`; `src/core` untouched and still 100% covered;
  structural theme tests assert the new rule draws only from the blue selection
  token with no raw color.

- Random map + random spawn on each load (M31-T1, #220). `standardSetup(config?)`
  in `src/core/gameSession.ts` now draws a **fresh random seed** via the new pure
  `randomSeed()` helper whenever no explicit `MapConfig.seed` is supplied, so every
  fresh game starts on a **different generated map** instead of the fixed seed-0
  board, while an explicit `seed` still reproduces a deterministic map exactly.
  `chooseHomeHexes(map, seed)` now picks player spawn / Home-Tree hexes **at
  random** from the island's left and right halves (split around the mid-column)
  — driven by `mulberry32` (now exported from `src/core/mapGenerator.ts`) so the
  pick is reproducible under a fixed seed and varied under fresh generation —
  instead of always the leftmost/rightmost land cells. Legality is unchanged:
  Home Trees sit on land with an all-land starting-force neighbourhood, p1 stays
  strictly on the left half and p2 on the right half, and site placement logic is
  untouched; a degenerate all-one-side map still falls back to the extreme
  candidates. The deployed `PlayableGame` / `useGameSession` pass no map config,
  so each new game starts on a random map with random spawns. Core stays pure and
  100% covered; rendering tests pin a fixed map seed where they assert stable
  topology/unit counts.

- Core neutral-unit data model (M30-T1, #219). The `ApeUnit` type in
  `src/core/game.ts` now models a neutral unit — a unit that belongs to no
  kingdom — by widening `owner` from `PlayerId` to `PlayerId | null`, while
  existing player units keep their concrete owner with no runtime change. A new
  pure helper, `isNeutralUnit(unit)`, reports whether a unit has no owning
  kingdom (`owner === null`). The nullable owner is threaded through the derived
  unit summary types (`CellUnitInfo` in `src/core/cellInfo.ts` and `UnitView` in
  `src/ui/viewModels/useGameSession.ts`) and the dumb `Unit` component's `owner`
  prop, and `standardSetup` in `src/core/gameSession.ts` narrows the guard so
  starting-force units (always player-owned) claim territory as before. This is
  the first, smallest slice for random neutral units (#216): no placement,
  protection, or UI rendering wiring yet — those are later slices. Core stays
  pure and 100% covered (lines, functions, statements and branches). No UI
  behaviour change.

- Random neutral units on the map during setup (M30-T2, #225). New pure helper
  `placeNeutralUnits(map, occupiedKeys, count?, seed?)` in
  `src/core/gameSession.ts` places a small handful (default 8,
  `DEFAULT_NEUTRAL_UNIT_COUNT`) of neutral `Monkey` units (`owner` null) on
  random **plain-land** cells, drawn without replacement off a seeded
  Fisher–Yates shuffle so a fixed seed reproduces the exact layout and a fresh
  seed yields a fresh one. `standardSetup` now wires it in after the sites:
  neutral units land clear of both players' Home-Tree spawn hexes/**neighbourhoods**
  (the Home Tree hex plus all six adjacent hexes, so a neutral never sits right
  next to a Home Tree) and the neutral Groves/Nests (their hex keys are the
  `occupiedKeys`), so they
  never block or overlap spawns or sites. The neutral RNG seed is derived from
  the map/spawn seed via a fixed constant (`neutralSeedFor`), keeping placement
  **orthogonal** to the map/spawn randomness — an explicit `MapConfig.seed`
  reproduces the whole setup (map, spawns and neutrals) deterministically, while
  a fresh seed produces fresh neutrals. Core stays pure and 100% covered; the M12
  pointer-click UI test was made robust to the new neutral units (they can sit
  adjacent and be attack targets, so it now picks a non-enemy reachable target).

- Coalesce pan/zoom updates to one per animation frame (M29-T3, #210).
  Dragging the map and scrolling the wheel no longer fire one React state
  update (full board re-render) per pointer/wheel event. New pure,
  unit-testable rAF-coalescing accumulators — `createCoalescer` (with
  `sumNumbers` / `sumPanDeltas` merge helpers) in
  `src/ui/viewModels/coalesce.ts` — fold every pointer-move / wheel delta from
  the `usePan` / `useZoom` view models into a pending frame total with no
  commit, and a `requestAnimationFrame` loop in `PlayableGame` drains each
  accumulator once per frame and commits the frame's total as a single state
  update (`cancelAnimationFrame` on dispose). No events are lost: within a
  frame all deltas sum together and the final pan/zoom offset reflects the
  full accumulated total, so drag thresholds, click-vs-drag selection and zoom
  clamping behave exactly as before. The accumulators are pure (no browser
  APIs) and unit-tested; `PlayableGame` render tests drive a fake
  `requestAnimationFrame` frame-by-frame and assert that many wheel/drag
  deltas within one frame commit in a single state update equal to the sum of
  all the deltas, and that unmounting `PlayableGame` cancels the rAF loop
  (no further frames scheduled). No core changes; the view-model and
  component layers only.

- Hoist the board bounding-box computation into a memoized pure helper
  (M29-T2, #211). The O(n) `board.map` + `Math.min`/`Math.max` pass over all
  ~400 cells (plus padding) that the board wrapper needed to size and centre
  itself was running inline in `Board` on every render — and thus on every
  pan/zoom frame. It is now a standalone pure, unit-testable helper,
  `boardLayout(cells)` in `src/ui/presentation.ts` (with `BOARD_PAD`), that
  deterministically returns the wrapper width/height and the per-cell centring
  offset from a `BoardCell[]` with no React and no side effects. `Board` calls
  it through a `useMemo` keyed on the board array identity, so a pan/zoom
  re-render (which reuses the same `board` reference) reuses the memoized
  layout instead of re-running the O(n) pass, while a genuine game-state change
  recomputes it. Layout output is pixel-for-pixel identical to the old inline
  expression; cells are laid out in exactly the same positions and the map
  stays centred. Core is untouched; the pure helper is unit-tested (stable
  result for the same input, recomputed for a changed input, pure/deterministic)
  and a `Board` render test spies on `boardLayout` to assert it is not invoked
  again on a pan/zoom-only rerender.

- Memoize board cells so pan/zoom don't re-render every hex (M29-T1).
  Wrap the dumb `Cell` component in `React.memo` and stabilize the two
  per-cell props that would otherwise bust the memo cache on every pan/zoom
  re-render: the `onSelect` closure and the `children` element tree. `Board`
  now builds per-hex `onSelect` closures and `children` once per
  board/view-model-callback change (via `useMemo`, derived only from the
  pan-agnostic `board` cells and the already-stable `useCallback`-supplied
  `onSelectCell`) and reuses the same references across pan/zoom re-renders,
  so only the board wrapper (which holds the pan/zoom CSS transform)
  re-renders and the cells underneath are skipped. Clicking a cell still
  selects it, and derived per-cell state (`isSelected`, `isMoveTarget`,
  `isEnemyTarget`, fog, content) still updates when the underlying
  game/session state changes. Core is untouched; a render-counter test double
  asserts cells skip on a pan/zoom-only change and re-render on a data
  change.

- Use the trained-AI file for the deployed UI opponent, falling back
  gracefully to the rule-legal AI (M28-T3, #204). New pure
  `src/core/trainedOpponent.ts` bridges the M28-T2b fitted policy into the
  browser opponent: `isValidTrainedPolicy` validates an arbitrary parsed
  value (a missing / unparseable / malformed `public/trained-ai.json` is
  rejected rather than crashing), `rankWithPolicy` rank-orders the legal
  actions by trained score, and `chooseAiAction` selects the highest-scoring
  trained action at higher precedence than the base AI while falling back to
  the rule-legal `chooseFromActions` when the policy is absent or invalid.
  The trained policy is threaded through the AI turn (`aiTurnActions` /
  `runAiTurn` / `playTurn`) and the game session (`createGameSession` /
  `submitTurn`), and the `useGameSession` view model loads
  `trained-ai.json` from the app base URL and upgrades the session's opponent
  in place (progress is never reset; a missing/invalid file leaves the
  rule-legal fallback). This delivers the M23-T3 "smarter AI" opponent. All
  decision logic is pure and 100% covered by `trainedOpponent.test.ts` plus
  game-loop / session / view-model test extensions.

- Add a headless self-play training harness that emits a trained-AI
  file (M28-T2b, #203). New pure `src/core/training.ts` implements a
  dependency-light **win-weighted centroid policy**: `actionFeatures` turns a
  candidate `GameAction` + `GameState` into a fixed-length feature vector; a
  serializable `TrainedAiPolicy` (`weights`, `bias`, `gamesSeen`,
  `decisionsSeen`, `source`, `version`) is fitted by `fitPolicy` /
  `fitPolicyFromGames` from decisions labelled good/bad by whether the acting
  player won; and `scoreWithPolicy` / `chooseTrainedAction` select legal
  actions at runtime by the fitted weights (highest score wins, ties broken
  deterministically by a seed). A thin headless CLI (`scripts/train.ts` + `npm
  run train`) runs N seeded self-play games with the M28-T2a recorder,
  computes every game/fit in core, writes the serialized policy to
  `public/trained-ai.json` (deterministic for a given seed, loadable by the
  M28-T3 UI opponent), and prints auditable training metrics (games run,
  decisive games, decisions used, fitted weights). No external ML dependencies
  are added; all training logic is pure, in `src/core`, and 100% covered by
  `training.test.ts`.

- Record a self-play training dataset (state → action pairs) in core
  (M28-T2a, #202). New pure `src/core/trainingDataset.ts` defines the
  serializable `TrainingDecision` record (turn, acting player, full `GameState`
  at decision time, the ordered list of legal actions considered, and the
  single chosen `GameAction`) plus the ordered `TrainingDataset` and the
  observation-only `DecisionRecorder` callback. The headless self-play path
  now threads an optional recorder through `aiTurnActions` / `runAiTurn` /
  `playTurn`, and `playAiGame` gains a `recordDataset` option that returns the
  recorded dataset alongside the existing result. Recording defaults to off
  (so `npm run simulate` and existing callers are unaffected) and is purely
  observational: it never mutates state or influences action selection, so a
  recorded run produces the exact same trajectory, winner, and turn count as
  the same run with recording off. The dataset — the labelled (game-state →
  chosen-action) examples a policy can learn from — is JSON-serializable and
  feeds the subsequent M28-T2b training harness. New logic is pure, lives in
  `src/core`, and is 100% covered by tests in `trainingDataset.test.ts`.

### Added

- Implement the Protection / Safety Zones rule (M23-T2-G4, #195). A unit
  protects its surrounding (adjacent) cells from opposing units of the same
  rank, and a Home Tree protects its surrounding cells from opposing Monkeys
  (rank 1). `legalActions` / AI enumeration now exclude move and attack
  targets protected against the mover/attacker, and `moveUnit` / `attackUnit`
  reject such targets with a new typed `"protected"` `MoveError` /
  `AttackError` kind (matching the existing typed-error pattern). The new pure
  `isCellProtected(state, targetHex, mover)` helper in `src/core` implements
  the rule; higher- and lower-ranked enemy units may still enter protected
  cells per the rules, and protection never blocks an ally. Self-play/docs on
  the naive-AI pacing note that the new defensive standoffs intentionally slow
  the rush-to-capture, so some simulated games now hit the max-turns guard
  without a decisive winner (bounded, never an illegal move). Core logic is
  pure and 100% covered by tests across `game.test.ts`, `ai.test.ts`,
  `gameLoop.test.ts`, `gameSession.test.ts`, `selfPlay.test.ts`, and
  `useGameSession.test.ts`.

### Added

- Add an enjoyment-gap analysis of the rules and build (M23-T2, #192). The new
  `docs/analysis.md` reviews the core game loop, economy, combat, and win
  conditions against `guidelines/ape-kingdom-rules.md` for enjoyment gaps
  (stalemate risks, runaway economies, frustrating outcomes), grounded in
  headless self-play runs. It identifies seven gaps — a severe second-mover
  advantage (p2 wins ~87% of strategic-AI games), map scale vs. movement speed
  (early-game tedium), a runaway/avalanche economy with no comeback mechanic,
  the Protection/Safety Zones rule being unimplemented (rules↔build gap), a
  graves death-spiral risk, a redundant 2-player win condition, and slow
  naive-AI pacing — each with concrete, rule-consistent proposals and rough
  impact. Actionable findings are distilled into follow-up issues #195–#199
  with appropriate priorities. Docs-only; no `src/core` change, so tests and
  build are unaffected.

### Added

- Add the graves economics mechanic when a kingdom's money goes negative
  (M21-T2, #191). When a kingdom's banana balance drops below zero, all of its
  units die and a `Grave` marker (`src/core` `Grave` type) appears on each of
  their former cells. Each grave costs its owning kingdom -1 banana per turn,
  paid as upkeep against that turn's collected income (`graveUpkeep` inside
  `collectIncome`). A unit may harvest a grave by moving onto it: the grave is
  cleared and the harvester's kingdom gains +2 bananas (`moveUnit`). Because a
  grave cell holds no unit, the AI legal-action layer treats it as a plain
  legal move target (never illegal) and may harvest it per the rules — covered
  by a `legalActions` test. The rules are codified in
  `guidelines/ape-kingdom-rules.md` and `RULES.md`. The graves render on the
  board via a thin dumb `Grave` component wired through the view model's
  `BoardCell.grave`, shown only on cells that hold no unit. All logic is pure
  and in `src/core` with 100% coverage; tested across `game.test.ts`,
  `ai.test.ts`, `useGameSession.test.ts`, `Board.test.tsx` and a new
  `Grave.test.tsx`.

### Changed

- Halve the inter-hexagon gap (M27-T4, #187). The visible gap between
  adjacent board hexagons is halved from `HEX_GAP = 4` to `HEX_GAP = 2` in
  `src/ui/presentation.ts`, making `CELL_SIZE = HEX_SIZE * 2 - HEX_GAP` render
  the drawn hexagons ~2px smaller than their layout box (adjacent cells now
  ~2px apart instead of ~4px) so the map reads tighter and more connected. The
  board still renders cleanly: cells remain visually separated by the SVG
  glass-edge highlight and no cells overlap. Purely presentational — no
  `src/core` change; uses the existing sizing token in `presentation.ts` with
  no other hard-coded values. Covered by updated cell-geometry assertions in
  `tests/ui/presentation.test.ts`. `src/core` stays 100% covered.

### Added

- Mark units that have already moved/fought this turn as opaque (M19-T6,
  #190). Each rendered unit badge now dims (reduced opacity + slight
  desaturation via `opacity-40 grayscale`) when it has already acted this
  turn, so the human can tell at a glance which of their units have spent
  their action vs. which still have actions available. The acted state is
  derived entirely from existing core state (`ApeUnit.hasActed`, the flag the
  `movefight` step sets after a move/attack and resets at the start of each
  turn): the view model's `UnitView` now carries `hasActed` straight from the
  core unit, and the dumb `Unit` component applies the dimmed treatment from
  that prop (plus a `data-has-acted` attribute for legibility/testing).
  Unacted units render normally and stay legible; newly recruited apes are
  born `hasActed = true`, so they too dim until their next turn. No new core
  logic — `src/core` is unchanged. Covered by new assertions in
  `tests/ui/Unit.test.tsx`, `tests/ui/useGameSession.test.ts` and
  `tests/ui/Board.test.tsx`. `src/core` stays 100% covered.

- Apply a frosted-glass effect to the End Turn button (M29-T1, #186). The
  circular `end-turn-btn` disc now renders a clearly-visible token-backed
  frosted-glass surface consistent with the M14 glass design language: a
  translucent accent-tinted fill (via `color-mix` over the `--color-accent*`
  and `--color-glass-soft` tokens) layered over the `glass` backdrop blur, a
  subtle bordered rim (`--color-glass-line`), a soft inner highlight
  (`--color-glass-inner`) and an accented soft drop shadow
  (`--color-shadow-accent`) — so the map shows through blurred and it reads as
  a premium primary HUD action rather than plain glass alone. Purely
  presentational: the button keeps its `enabled`//`onSubmit` props, disabled
  state, `data-testid="submit-turn"` and `aria-label="End Turn"`; no game
  rules or behavior change. The `glass` backdrop-blur utility stays on the
  button so the translucency yields genuine glassmorphism. Uses only existing
  theme tokens — no raw hard-coded colours. No core/`src/core` change; covered
  by added theme assertions (tests/theme.test.ts) and component tests
  (tests/ui/EndTurnButton.test.tsx). `src/core` stays 100% covered.

- Headless simulate CLI (M28-T1b, #180). A new thin, headless Node script
  `scripts/simulate.ts` (run via `npm run simulate`) drives the pure core
  full-game simulator (`playAiGame` from `src/core/selfPlay.ts`, M28-T1a) to
  play **N configurable self-play AI-vs-AI games** and report aggregate win
  statistics — how many games each player won and how many were capped by the
  `maxTurns` iteration guard — with no UI or browser involved. The number of
  games and the base seed are configurable via CLI flags (`--games/-n`,
  `--seed/-s`, `--max-turns/-m`), environment variables (`SIMULATE_GAMES`,
  `SIMULATE_SEED`, `SIMULATE_MAX_TURNS`), or sensible defaults (10 games,
  seed 0); each game uses `seed + index` so runs are deterministic and
  reproducible. The script stays **thin and headless** — it only orchestrates
  the core simulator, containing no business logic and no React/browser code
  (it runs through the existing `vite-node` tooling with `@types/node`,
  consistent with the project's `scripts/` conventions). It is executed with
  `vite-node scripts/simulate.ts` and prints a compact results table (games
  played, p1/p2 win counts and percentages, capped runs, average turns). The
  script is a thin CLI whose logic is fully delegated to the already-100%-covered
  core; it is verified via the existing core tests plus a manual `npm run
  simulate` smoke run, and `src/core` stays 100% covered.

- Headless full-game self-play simulator in core (M28-T1a, #179). A new pure
  `src/core` function `playAiGame` (in `src/core/selfPlay.ts`) plays a complete
  **AI-vs-AI** Ape Kingdom game to completion with no UI and no browser: both
  sides are driven by the existing AI layer (`aiTurnActions`/`playTurn` from
  `src/core/gameLoop.ts`, drawing from `aiChooseMove`/`chooseFromActions`),
  alternating turns from a `standardSetup` map until a winner is produced.
  The function is configurable: a `seed` makes a given run
  deterministic/reproducible (same seed ⇒ same board, AI choices, winner and
  trajectory); a `maxTurns` maximum-iteration guard (`DEFAULT_MAX_TURNS = 300`)
  prevents infinite loops; a `mapConfig` lets callers trade board size for
  simulation speed; and `aiOptions` tunes both sides' AI behavior. By default
  it plays on a small 8×8 full-land `standardSetup` map (`DEFAULT_SELFPLAY_MAP`)
  with the AI layer's default (naive) behavior — a configuration where AI-vs-AI
  games reliably terminate with a winner in well under a second — which is the
  practical default for the upcoming self-play training harness (M28). The
  function returns the final `GameState` plus which player won and the turn
  count, with no React/browser/business-logic leakage (core stays pure and
  headless). New core tests cover a complete seeded run terminating with a
  winner, reproducibility for the same seed, the `maxTurns` guard, custom map
  config, and explicit AI options; `src/core` stays 100% covered.

- Unit joining by level addition (M27-T3, #174). Moving a unit onto a
  **same-kingdom** unit now joins them by **adding the levels** (ranks):
  1+1=2, 1+2/2+1=3, 2+2=4, 1+3/3+1=4 — the two units merge into one of the
  summed level on the target hex, and the joined unit has acted for the turn.
  A join is only legal while **both units are still movable** (neither has
  already acted) and the summed level stays **≤ the maximum rank (4)** — so
  2+3 (and anything summing over 4) can **never** combine; enemy-occupied
  hexes are still resolved by combat, never joined. The core `moveUnit`
  reducer (in `src/core/game.ts`) now handles friendly-target joins and throws
  a new typed `MoveError("cannot-join")` for an impossible join, and new pure
  helpers `canJoinUnits`, `kindForRank` and the `MAX_RANK` constant back the
  rule. The legal-action enumerator (`legalActions`) and the reachable-target
  derivation (`movementInfo`) now expose join-eligible adjacent friendly units
  as legal move targets, so the UI/AI can actually perform a join through the
  normal move flow. New core tests cover the 1+1, 2+1, 1+2, 2+2, 3+1, 1+3
  merges, the blocked 2+3/3+2/1+4/4+any cases, the already-acted blocker, and
  legal-action join enumeration. Updated `RULES.md` and
  `guidelines/ape-kingdom-rules.md` to document the joining/level-addition
  rule. `src/core` stays 100% covered.

- Always reveal a kingdom's owning cells in the fog of war (M27-T2, #173).
  The core fog derivation `visibleHexes` (in `src/core/vision.ts`) now, in
  addition to revealing cells from owned sight lines (Home Trees and units),
  always reveals every cell owned by the viewing kingdom's persistent
  site-less territory model (`territoryOwner`/`isOwnedBy`) — its Home Tree,
  captured Groves/Nests, and the site-less cells it claims — even when no
  unit stands on or near them. Owning cells are thus never hidden behind fog
  regardless of unit vision; neutral (unowned) and enemy-owned cells still
  obey normal vision/fog. The view model (`revealedHexKeys`/`boardCells`) and
  the dumb board/Cell components needed no change — they already derive the
  fogged set from `visibleHexes` — so the UI stays thin. New `visibleHexes`
  tests cover territory-owned cells outside unit vision, an owned Grove/Nest
  and Home Tree with no units, unit-vacated site-less territory, and that
  neutral/enemy cells and the opponent's territory remain hidden. Updated
  `guidelines/ape-kingdom-rules.md` so the source of truth documents that a
  kingdom's own territory is always visible. `src/core` stays 100% covered.

- Produce a circular map instead of a diamond (M27-T1, #172). The core map
  generator now measures a hex's distance from the board centre in
  **screen geometry** rather than raw axial (q, r) Euclidean space. Because the
  rendered pointy-top hex axes meet at 60° (a cell sits at pixel
  `x ∝ q + r/2`, `y ∝ √3/2·r`), the old raw (q, r) metric treated them as
  orthogonal and coloured a **diamond/rhombus** landmass; the new metric
  (`screenDist`/`screenOffset` in `src/core/mapGenerator.ts`) is the true
  rendered distance, so the island is now centered and roughly equidistant
  from every edge (a small deviation is allowed). The star-shaped island,
  seed-modulated wavy coastline (phase/amplitude/lobes), mountains/lakes and
  seeded determinism are all preserved unchanged, and the change stays purely
  in `src/core` (no UI or gameplay-rule change). New `buildIsland` tests assert
  circularity — an 8-sector screen-space land-extent max/min ratio ≤ 1.5
  across several seeds — and that the centre's land reaches every direction
  without a wedge collapsing. `src/core` stays 100% covered.

- Render move-target circles instead of the green ring (M26-T1, #169). When a
  unit is selected, every cell it can move to now shows an **opaque grayish
  circle** (replacing the old green/teal `hex-move-target` ring); a reachable
  cell that currently holds an **enemy unit** is rendered with a **red circle**
  so attacks/captures are visually distinct from plain moves. The pure core
  `movementInfo` derivation now also surfaces the selected unit's `attackable`
  enemy-capture targets (adjacent enemies) alongside its reachable `move`
  targets, both drawn from the legal actions — no new game rule. The view
  model unions them into `reachableHexes` and exposes `enemyTargetHexes` for
  the red circles; `selectCell` now issues an `attack` when the user clicks an
  enemy-held (red) target and a `move` for a grayish target. The dumb `Cell`
  renders a token-backed circle (`bg-move-target` / `bg-move-target-enemy`)
  via new theme tokens, and the circle is never shown on a fogged cell so move
  targets respect fog of war. Clicking a circled reachable cell still issues
  the move/capture as before: clicking a grayish target issues a `move`, and
  clicking an enemy-held (red) target issues an `attack` capturing the enemy.
  View-model tests cover both the plain-move click and the red-target
  capture-click paths. `src/core` stays 100% covered.

- Add persistent site-less territory (M24-T2, #160). A site-less cell a
  kingdom's unit stood on / claimed now **stays owned by that kingdom after
  the unit vacates** it — it no longer reverts to neutral the moment the unit
  leaves. A pure core model (`territory` on `GameState`, `territoryOwner`)
  tracks, per hex, the last kingdom that held a site-less cell: a site owner
  always wins on a cell that has a site; else a persistent site-less
  territory owner (retained until an **enemy captures** the cell by moving
  onto it or defeating a unit on it) colours the hex; else a unit currently
  standing on it. `isOwnedBy`, the owned-land 4-hex movement
  (`reachableForUnit` / `reachableHexes`) and `moveUnit` all resolve through
  `territoryOwner`, so movement and capture reflect the persistent
  territory; `standardSetup` seeds every starting unit cell as its kingdom's
  territory and off-map hexes are never recorded (territory cannot expand
  beyond the board). The UI (board `Cell` owner tint and the selector
  panel's hexagon preview via `cellOwner`) shows the persistent ownership
  after a unit leaves. The rules (`guidelines/ape-kingdom-rules.md` and
  `RULES.md`) codify persistent site-less territory as the single source of
  truth. `src/core` stays 100% covered.

- Add fog-of-war / map-exploration UI (M22-T2, #159). The board now renders
  fog of war: cells the human player cannot yet see are hidden (dark,
  `bg-fog` shroud, no site/unit/mountain content) and revealed cells show
  normally. The fog is derived entirely from the pure core vision model
  (`visibleHexes(state, "p1", true)`, M22-T1/#151) via a new `revealedHexKeys`
  view-model helper — no game logic is reinvented in the UI — so revealing is
  cumulative, monotonic, and per-player (the human always sees only from their
  own Home Tree/unit sight lines, never the opponent's). The `boardCells` view
  helper takes an optional revealed-hex set, the `Cell` component renders a
  `fogged` variant (data flag + fog background, content hidden), and a new
  `--color-fog` theme token backs the shroud. Core stays 100% covered.

- Add core vision / fog-of-war exploration model (M22-T1, #151). A new pure
  `src/core/vision.ts` module derives, from a `GameState`, the set of hexes a
  player can currently see (`visibleHexes(state, player, fog?)`), usable by
  both the human UI and the AI. Vision is cumulative and monotonic (a hex
  revealed by any owned sight line stays revealed) and per-player: a player
  sees only from the Home Trees and units they control, never an opponent's.
  A **Monkey** reveals 1 ring, a **Gibbon** 2 rings, a **Home Tree** and all
  other unit kinds (Chimpanzee, Gorilla) 3 rings — the radii are exposed as
  `UNIT_VISION`, `HOME_TREE_VISION` and the `unitVision` helper. The default
  `fog = false` returns every map cell so existing logic is unaffected until
  the UI slice (M22-T2) enables fog. The vision values are codified in a new
  "Vision / Exploration" rule in `guidelines/ape-kingdom-rules.md` (single
  source of truth). `src/core` stays 100% covered.

- Add comprehensive `RULES.md` (M21-T1, #149). A new player/developer-facing
  rules document describing the full game — economics (banana income from
  Groves, Nests, and the Home Tree), the four ape units (rank, cost,
  movement), movement (standard 1 hex, terrain rules, and the owned-land 4-hex
  range), capturing territory (site capture + ownership), and the winning
  condition. It mirrors the single source of truth
  `guidelines/ape-kingdom-rules.md` (no contradictory rules) and is now
  referenced from `README.md` so players/developers can find it. Doc-only
  change; `src/core` untouched (core stays 100% covered).

- Move up to 4 hexes through your own land (M20-T3, #148). A unit whose
  entire route stays within cells its own kingdom owns may move up to
  `OWN_LAND_RANGE` (4 hexes) instead of the standard 1. Ownership of a cell is
  derived in the pure core by `isOwnedBy` (a site owned by the kingdom always
  wins; a unit's owner only colours a site-less cell — the same model the UI
  territory display uses), and the shared BFS traversal `bfsReachable`
  (replacing the inline walk in `reachableHexes`) backs both the standard and
  the extended range so every legal enumerator agrees with `moveUnit`.
  `reachableHexes` (in `src/core/ai.ts`) gained an optional `ownedBy`
  predicate and `legalActions` now passes the mover's owned-land predicate, so
  the AI's legal set (and therefore its decisions) reflects the extended
  range; `moveUnit` (in `src/core/game.ts`) accepts a target on a route
  entirely through passable, unoccupied own-land cells up to `OWN_LAND_RANGE`,
  and `reachableForUnit` is the single-source derivation. Owned-land movement
  never enters enemy or neutral territory and never crosses water or mountain
  (M20-T1/T2 defences still apply), and any route with a non-owned step falls
  back to the standard 1-hex range. Because the UI's reachable-target
  highlight and click-to-move both derive from the core legal set
  (`movementInfo`/`legalMoves`), the extended cells are highlighted when the
  selected unit can traverse its own land. Codified in
  `guidelines/ape-kingdom-rules.md` and covered by core tests (full own-land
  route grants range 4, any off-own-land step caps at standard range, water and
  mountain still block, and the AI never exceeds the legal range). Pure core
  change (core stays 100% covered, no UI business logic).

- Remove the "Turn: you" indicator from the map (M23-T1, #150). The
  bottom-right "Turn: You (p1) / AI (p2)" label in `Board.tsx` is removed
  (post-ship feedback #145), since the player's turn is already clear from the
  active state and the circular End Turn flow. Thin UI-only change — `src/core`
  is untouched (core stays 100% covered); the Board render test that asserted
  the label now asserts it is not rendered.

### Changed

- Make movement interactive-only: remove the "Your actions" non-recruit
  move/attack/collect-income action-button list from the bottom-left
  `CellInfoPanel` (M24-T3, #161). Movement is now done purely by selecting a
  unit on the map and clicking a highlighted reachable destination (the
  interactive select-from/select-to flow) — the redundant button list (and its
  Clear button) is gone, so attack/collect are issued via the interactive map
  flow as before. The panel keeps its read-only cell info (terrain, site,
  unit) and the per-hex "Recruit here" options; no game-rule functionality is
  lost. This is a thin UI-only refactor — `src/core` is untouched and stays
  100% covered. The `CellInfoPanel` `onClear` prop is removed (the Clear
  button was part of the removed section) and the corresponding wiring is
  dropped from `PlayableGame`/the showcase; the view model's `clearActions`
  (reset-turn) remains a tested session API.

### Fixed

- Fix the circular "End Turn" button so clicks register (M25-T1). The
  bottom-right `actions-overlay` floating container is `pointer-events-none`
  (so the board stays interactive everywhere except on a panel), but the
  `<EndTurnButton>` placed directly inside it had no `pointer-events-auto`
  wrapper — unlike the status/cell-info overlay panel cards, each of which
  wraps its card in `pointer-events-auto`. Because `pointer-events: none` is
  inherited by the button (it does not opt back in), the button received no
  pointer events and clicks "went through" it, so the turn never ended
  (issue #164). The End Turn button is now wrapped in a `pointer-events-auto`
  container (matching the other floating panels), so a real pointer/mouse
  click on it fires `onSubmit`/`submitTurn` and ends the human's turn; its
  `enabled`/disabled state is untouched (it still disables when it is not the
  human's turn or the game has ended). Pure `src/ui` change — `src/core`
  unchanged and stays 100% covered.

- Prevent any unit from moving onto a mountain cell (M20-T2, #147). A unit may
  not step onto a mountain: `reachableHexes`/`legalActions` (in `src/core/ai.ts`)
  take the generated map and never enumerate mountain cells as move targets (and
  never move through one), `moveUnit` (in `src/core/game.ts`) rejects an
  in-range, unoccupied mountain target with a new typed `MoveError` of kind
  `mountain`, and the AI's legal set (and therefore its decisions) never targets
  a mountain. Because the UI's reachable-target highlight and click-to-move both
  derive from the core legal set (`movementInfo`/`legalMoves`), mountain cells
  are never shown as reachable nor submitted as a move. Adds core tests
  (mountain excluded from `reachableHexes`/`legalActions`, `moveUnit` rejects a
  mountain target with kind `mountain`, the AI never chooses a mountain move
  across many seeds) and hardens the pre-existing test helpers to stay
  terrain-aware: the Board territory test's `adjacentEmpty` now picks only
  passable land cells, and the game-session moved-unit test now asserts on the
  moved unit itself rather than a terrain-sensitive total move count. Pure core change (core stays 100% covered, no UI business logic).

- Prevent any unit from moving onto a water cell (M20-T1, #146). A unit may not
  step onto or across water: `reachableHexes`/`legalActions` (in
  `src/core/ai.ts`) now take the generated map and never enumerate water cells
  as move targets (and never move through one), `moveUnit` (in
  `src/core/game.ts`) rejects an in-range, unoccupied water target with a new
  typed `MoveError` of kind `water`, and the AI's legal set (and therefore its
  decisions) never targets water. Because the UI's reachable-target highlight
  and click-to-move both derive from the core legal set (`movementInfo`/
  `legalMoves`), water cells are never shown as reachable nor submitted as a
  move. `mapGenerator`'s `isWater`/`terrainAt` are already in `src/core`;
  `reachableHexes` was extended with an optional `map` argument (no map ⇒
  purely topological, preserving the raw occupancy helper). Adds core tests
  (water excluded from `reachableHexes`/`legalActions`, `moveUnit` rejects a
  water target with kind `water`, the AI never chooses a water move across many
  seeds) and keeps the loop-mechanics tests terrain-agnostic via an all-land
  test map. Pure core change (core stays 100% covered, no UI business logic).

- Restore a way to create new units at the Home Tree (M19-T3, #132). Selecting a
  controlled Home Tree now surfaces the available recruit option(s) arboreally:
  per the rules a new ape may be placed on a controlled Home Tree hex (if empty)
  or in an adjacent empty hex, so `cellInfo` (in `src/core/cellInfo.ts`) derives
  the recruit items for a selected controlled Home Tree from its own hex plus each
  legal adjacent placement hex (each ape kind listed at most once with its cost),
  restoring the missing "create new unit" flow — the player selects the Home Tree
  and sees the recruit buttons instead of having to hunt for an empty adjacent
  placement hex first. The recruit option still appears only while recruiting is
  legal: the panel's `legalRecruitActions` filter already drops Home-Tree-surfaced
  recruits once the player has moved/fought (the `movefight` step), so a mid-turn
  recruit remains impossible and can never crash the app via `selectAction` (the
  #123 fix is preserved). Pure core change (core stays 100% covered, no UI business
  logic); adds core `cellInfo` tests (controlled-Home-Tree actionability, opponent
  Home Tree excluded, kind dedup, end-to-end recruit through `selectAction`) plus
  `CellInfoPanel` and `PlayableGame` component/render tests that select the Home
  Tree, see the recruit options with cost, and recruit without crashing.

- Make the End Turn button work any time during the human's turn, even when
  some units haven't moved/fought (M19-T2, #131). The core session's
  `submitTurn` already ends the human's turn and runs the AI reply regardless
  of how many (if any) units acted — confirmed and locked in with regression
  tests — and the button's enabled state was previously an inline expression
  in the composition layer (`PlayableGame`). That rule (enabled whenever it is
  the human's turn and the game is not done; never gated on all units having
  acted) is now centralised in a single pure, tested presentation helper,
  `isEndTurnEnabled` in `src/ui/presentation.ts`, and the dumb End Turn button
  reads it from one source of truth. Adds `isEndTurnEnabled` unit tests plus
  core and render-level regression tests that verify End Turn submits from
  both the `recruit` step (before any move/fight) and the `movefight` step
  (after moving one unit while other p1 units stay unmoved), always advancing
  to the AI reply and the next human turn. Thin UI-layer change; no
  `src/core` business logic was touched (core stays 100% covered).

- Fix the territory-ownership *display* so an empty site stays owned after its
  unit vacates (M19-T1, #130). The core rule (captured sites stay owned until
  an enemy occupies them; ownership persists independently of which unit, if
  any, stands on the site) was already correct — confirmed by the milestone
  M18-T2 territory rules (#124) — but the board Cell and the selector panel's
  hexagon preview each derived the rendered owner with a duplicated inline
  `site?.owner ?? unit?.owner` expression. That logic is now centralised in a
  single pure presentation helper, `cellOwner(site, unit)` in
  `src/ui/presentation.ts` (site owner always wins so a vacated territory keeps
  its tint; a unit's owner only colours a site-less hex and reverts when the
  unit leaves), and both the board `Cell` and the `CellInfoPanel` hexagon
  preview use it, guaranteeing the UI reflects ownership persistence and that
  ownership flips only when an enemy occupies a cell. Adds `cellOwner` unit
  tests plus render-level regression tests that verify, via the core
  `moveUnit` / `attackUnit` reducers and the rendered `Board` /
  `CellInfoPanel`: a Home Tree and a captured Grove stay tinted after the unit
  walks off, ownership flips to an enemy that moves onto a site or defeats its
  defender, and an enemy merely moving adjacent does not revert it. Thin
  UI-layer change; no `src/core` business logic was touched (core stays 100%
  covered).

- Fix the app crash when creating/recruiting a new unit mid-turn (issue 123).
  The bottom-left `CellInfoPanel`'s "Recruit here" action list was derived from
  `cellInfo` → `legalActions(state)`, which contains recruit actions in every
  turn step, so after the player moved or fought (the `movefight` step) the
  panel still advertised recruit buttons for buildable hexes. Clicking one
  passed a recruit action that was no longer in the session's step-filtered
  `legalMoves`, so `selectAction` threw an uncaught `GameSessionError` and
  crashed the app. The panel now only offers the recruit items whose exact
  `recruit` action is present in the session's step-filtered legal set — a new
  pure `legalRecruitActions` presentation helper in `src/ui/presentation.ts`
  — so once the player has moved/fought the section is hidden and the cell is
  shown read-only. Thin UI-layer change with regression tests (incl. an
  integration test that a recruited unit renders on its board hex and stays
  selectable); no `src/core` business logic was touched (core stays 100%
  covered).

### Added

- Confirm & regression-test the territory ownership rules (M18-T2, #124).
  Codifies — with new `src/core/game.test.ts` coverage in a dedicated
  "territory ownership persistence & loss" block — the three rules from issue
  #122: (1) when a unit takes a cell/site that cell belongs to its kingdom;
  (2) when the unit moves off the cell, ownership persists (a site stays owned
  by the kingdom that captured it, independent of the unit's position); and
  (3) the only way to lose a cell is for an enemy unit to occupy it — either
  by moving onto it or by defeating a unit on it (attack flips the owner,
  while equal/losing combat or merely adjacent movement does not). Tests cover
  capture-then-vacate persistence, continued income from a vacated site, and
  ownership retention when the owning unit dies elsewhere. Pure test-only
  change; no `src/core` business logic was touched (core stays 100% covered).

### Changed

- Rework the hexagon presentation with an SVG render, a tighter inter-cell gap
  and a glass-edge highlight (M18-T3, #125). Board hexagons (both the board
  `Cell`s and the `Hexagon` atom used by the bottom-left selection preview) are
  now drawn with an **SVG approach**: an inline `<svg>` layer renders the
  pointy-top hexagon as a `<polygon>` (via the new pure `hexagonPoints`
  presentation helper) and the hexagon's clip-path references that SVG polygon
  (`clip-path: url(#…)`) instead of a literal CSS `clip-path` polygon string,
  so the shape no longer relies solely on `HEX_CLIP`. The inter-hexagon gap is
  tightened from the previous 8px to ~4px (`HEX_GAP = 4`, roughly half of
  before) so the board reads cleaner and tighter while staying visibly
  separated by the dark board. Each hexagon now also carries a token-driven
  **glass edge**: a new `.hex-glass-edge` rule draws a translucent
  fill-free outline stroke (referencing `--color-glass-line` with a soft
  `--color-glass-inner` drop-shadow glow) along the true hexagon edges inside
  the SVG layer, keeping the M17 glass treatment. Ownership tints and terrain
  colours are unchanged. Pure thin-component/theme/presentation change with
  added and updated component + presentation + theme tests; no `src/core`
  business logic was touched (core stays 100% covered).

- Overhaul the cell & terrain visuals (M17-T3, #116). Board hexagons are now
  rendered slightly smaller than their layout box (a new `HEX_GAP` of 8px,
  `CELL_SIZE = HEX_SIZE*2 − HEX_GAP`) so a few pixels of the dark board show
  between neighbouring cells, and each hexagon gets a glass treatment (the
  new `hex-glass` effect — a token-driven translucent fill + inner highlight)
  so cells read as polished glass chips on the map. Units no longer carry the
  "Kingdom" owner colour: the `Unit` badge is now a neutral glass chip and
  ownership is expressed solely by the host hexagon (via the existing
  `bg-owner-p1`/`bg-owner-p2` cell tint). The map canvas behind and around the
  surrounding ocean is now dark (a new `--color-board-dark` near-black token
  applied to the full-screen `board-layer`), and the default neutral land
  colour is a neutral green (`--color-terrain-land: #7f9d6b`). The bottom-left
  selection panel now leads with a hexagonal preview of the exact selected
  hexagon — its correct cell colour (owner tint / terrain) and, when occupied,
  the unit badge it hosts — instead of the previous "Water / Land" terrain
  pill; this is built on a new reusable `Hexagon` atom and shared
  `cellHexagonClass` / `TERRAIN_BG` / `OWNER_BG` presentation maps in
  `src/ui/presentation.ts`. Pure thin-component/theme change with added and
  updated component + presentation tests (incl. the new `Hexagon` atom and its
  Showcase); no `src/core` business logic was touched (core stays 100%
  covered).

- Replace the bottom-right `Step: Recruit / Act` indicator and its selectable
  action-list panel with a single circular "End Turn" button, and stop
  revealing the AI's banana count (M17-T2, #115). The old `ActionControls`
  component (and its Showcase) is removed; the bottom-right corner now hosts
  only the new token-backed circular `EndTurnButton` (a glass disc with an
  accent gradient, drop shadow and hover lift), which ends the human's turn
  and is disabled while it is not the human's turn or the game has ended. The
  turn's non-recruit legal actions (move / attack) and the Clear action — no
  longer reachable from the bottom-right — were relocated into the bottom-left
  `CellInfoPanel` so the game stays fully playable. The `StatusPanel` now shows
  the human player's banana balance but hides the AI's (the AI's footprint is
  no longer revealed). Pure thin-component/theme change with updated and added
  component tests; no `src/core` business logic was touched (core stays 100%
  covered).

- Forbid text selection on the map and replace hover-move with a brighten
  filter (M17-T1, #114). The full-screen board layer, the board container, and
  every hex cell now disable `user-select` (Tailwind `select-none` + CSS
  `user-select: none`), so dragging/panning the map never produces an HTML
  text-selection (blue highlight). Hovering a hex now brightens it with a CSS
  `filter` (brightness/saturate) instead of the previous translate/scale
  transform, so cells no longer move or shrink under the pointer — and the
  highlight applies consistently at the shell to units, sites, and empty
  terrain cells alike (the `hex-pop` mount transform is left untouched). Pure
  UI/UX change in the thin components and `src/styles/index.css`; no
  `src/core` business logic was touched (core stays 100% covered).

### Added

- Add a missing test for the `nonRecruitActions` recruit-exclusion filter in
  `src/ui/components/CellInfoPanel.tsx` (M17-T2 follow-up, #119). The new test
  renders the panel with a full `legalActions` set (which includes recruit,
  move and attack actions) and asserts that no recruit-labelled button appears
  in the relocated "Your actions" list — the recruit buttons are only offered
  per selected hex in the "Recruit here" section and must not be duplicated.
  Pure test-only change; no `src/core` or component logic was touched.

- Wire the 8 pixel-art game icons into the Atom components (M16-T2, #111).
  Updated the `Unit` atom to render each ape kind's matching pixel-art icon
  (Monkey/Gibbon/Chimpanzee/Gorilla) via the `gameIcons` barrel
  (`src/assets/icons`) inside its owner-coloured badge, showing the rank
  below the icon instead of the old `{kind} {rank}` text badge. The `Content`
  atom now renders the Home Tree and Monkey Nest pixel-art site icons via
  `gameIcons`, falling back to its text label for Grove (which has no asset in
  the 8-icon set). Added thin read-only presentation maps (`apeKindIcon` /
  `siteKindIcon` in `src/ui/presentation.ts`) mapping `ApeKind`/`SiteKind` →
  icon name so the dumb components hold no mapping logic. Addresses the review
  fix for the Mountain terrain: the `Cell` atom now renders the pixel-art
  Mountain icon via `gameIcons.mountain` on mountain terrain cells (Mountain
  is a `Terrain`, not a `SiteKind`). The Grave icon is intentionally not
  wired because `src/core` has no Grave/removed-unit entity to attach it to
  (AC #2 amended to scope the wired icons to implementable kinds). Updated the
  Unit and Content showcases to demo the new assets and adjusted the affected
  UI tests (PlayableGame home-cell lookups now match on `data-kind`). No
  `src/core` business logic was touched (core stays 100% covered).

- Extract the 8 pixel-art game icons from the image attached to issue #103
  (M16-T1, #106). Located each icon's content boundaries in the 4x2 grid
  (Home Tree, Monkey Nest, Monkey, Gibbon, Chimpanzee, Gorilla, Mountain,
  Grave), cropped each to its bounding box and removed the white background,
  committing clean RGBA (transparent) PNGs under `src/assets/icons/`. Added a
  thin type-safe barrel module (`src/assets/icons/index.ts`) exposing each
  asset URL for the UI wiring follow-up (M16-T2), a reproducible extraction
  script (`scripts/extract-icons.py`), an asset README, and structural
  regression tests (`tests/assets-icons.test.ts`) verifying all 8 icons exist,
  are RGBA PNGs, and export correctly. The icons are theme-independent brand
  assets (per `guidelines/GUIDELINES-WEB-THEME.md` §6 rule 3); no `src/core`
  business logic was touched (core stays 100% covered).

- Codify the protection / safety-zone mechanics (rules 3-4 of #102) in the
  game rules doc (#105, M15-T2). Added a dedicated **Protection / Safety
  Zones** section to `guidelines/ape-kingdom-rules.md` describing rule 3 (a
  unit protects its adjacent cells from enemy units of the same rank —
  Monkey protects from Monkeys, Gibbon from Gibbons, Chimpanzee from
  Chimpanzees, Gorilla from Gorillas) and rule 4 (a Home Tree protects its
  surrounding cells from enemy rank-1 / Monkey units). The section clarifies
  that protection only restricts entry by those listed opposing ranks does
  not prevent higher- or lower-ranked enemy units from entering, does not
  constrain the protecting unit's own movement/attacks, and does not change
  site ownership (kept consistent with the existing Combat/Movement/Capture
  rules). Documentation-only change: no `src/core` business logic was touched
  (core stays 100% covered).

- Verify & regression-test game-mechanics rules 1-2 of #102 in the core
  (#104). Confirmed that `src/core` already implements and fully covers both
  rules: (1) moving a unit onto an unoccupied Grove/Nest/Home Tree captures
  that cell for the mover (`moveUnit` flips the site owner, verified for all
  three site kinds), and (2) combat resolves strictly by rank comparison
  (`attackUnit` — higher-rank attacker wins and captures, equal ranks destroy
  both with no site ownership change, lower-rank attacker is destroyed and the
  defender remains). Added explicit regression tests: a rule-1 capture test
  across Grove/Nest/HomeTree and a rule-2 test that walks the complete rank
  comparison table across all 16 attacker/defender kind pairs, plus behavior
  checks for the nil/defender-action outcomes. This is a test-only change:
  no `src/core` business logic was touched (core stays 100% covered).

- Enhance the gradients and animation polish of the game background (M14-T2,
  #98). In `src/theme.css` a new token-backed set of subtle game-backdrop
  gradient stops is added — `--color-game-bg-top`, `--color-game-bg-mid`,
  `--color-game-bg-bottom` (a soft warm parchment→rose sunset ramp)
  — re-exposed to Tailwind via `@theme inline`. In `src/styles/index.css` the
  game route now renders on a dedicated `.game-bg` utility: a tasteful
  vertical gradient wash built from those token stops (plus a faint radial
  veil near the top to keep the board the focal point) with a smooth
  crossfade transition. Two new panel animation keyframes/classes —
  `menu-in` (smooth slide+fade entrance) and `menu-out` (exit) — extend the
  animation polish alongside the existing hover/focus transitions, and all
  are disabled under `prefers-reduced-motion`. `App.tsx` switches the game
  route from the showcase `login-bg` to the token-driven `game-bg` backdrop
  with no raw hex in components. This is a pure token/CSS change: no
  `src/core` business logic was touched (core stays 100% covered). Extended
  the structural tests in `tests/theme.test.ts` to assert the presence and
  `@theme inline` re-exposure of the new gradient stops, the token-driven
  `.game-bg` gradient utility + transition, the panel entrance/exit
  keyframes and classes, and that the app route/gradient CSS stay free of
  raw hex.

- Refine the design-token color palette and visual details for a more
  cohesive, beautiful look (M14-T3, #97). In `src/theme.css` the brand
  amber→rose→violet family is rebalanced into one warm "kingdom sunset" ramp
  (amber `#eda25c`, rose `#da838a`, rose-deep `#b25868`, violet-deep
  `#6d4da8`), the warm parchment semantics are harmonized (canvas `#fcd3a8`,
  warmer text-muted/faint mud neutrals), and the stage dark gradient stops
  track the refined brand ramp. Two new tokens drive the visual-detail polish
  — `--color-shadow-hover` (a deeper hover-elevation shadow) and `--color-ring`
  (a warm brand focus ring) — both re-exposed to Tailwind via `@theme inline`.
  In `src/styles/index.css` the action buttons now lift on hover with the
  `--color-shadow-hover` token plus an accent border, gain a `focus-visible`
  ring using `--color-ring`, and the primary `glass-panel` content sheet gets
  a layered (contact + ambient) token-driven shadow for a flatter, more
  polished float; keyboard-focussed hex cells share the same warm focus ring.
  This is a pure token/CSS change: no `src/core` business logic was touched
  (core stays 100% covered), no raw hex was added to components, and the
  semantic token roles stay intact. Extended the structural tests in
  `tests/theme.test.ts` to assert the refined palette values, the presence and
  `@theme inline` re-exposure of the new `--color-shadow-hover`/`--color-ring`
  tokens, the token-driven hover/focus button states, the layered glass-panel
  shadow, and that no raw hex leaks into components.

- Apply a translucent frosted-glass (glassmorphism) surface to the floating
  HUD panels so the glass-design polish (#94) reads over the map (M14-T1,
  #96). The status, cell-info and action panels in `src/ui/components/`
  (`PlayableGame.tsx`) now use the design-token `glass` surface — a genuinely
  translucent fill (`--color-glass`) with a `backdrop-filter` blur — instead
  of the near-opaque `glass-panel` content sheet, so the frosted-glass effect
  is clearly visible over the board while the token-backed text roles stay
  legible. This is a pure token/CSS surface change: no `src/core` business
  logic was touched (core stays 100% covered), no raw hex was added to
  components, and the panels still pop in with the `menu-pop` animation and
  stay `pointer-events-auto` so the board remains fully interactive outside
  them. Added structural tests in `tests/theme.test.ts` asserting the `glass`
  utility is backed by the `--color-glass*` token family and that the three
  HUD panels use it (not `glass-panel`), plus a component test asserting the
  floating panels render on the translucent glass surface.

- Collect banana income automatically at the start of each player's turn so the
  human no longer takes a manual "Collect Income" step (M13-T1, #91). The core
  session controller (`src/core/gameSession.ts`) no longer has an `income` turn
  step and never exposes `collectIncome` as a selectable legal action: a new
  session (and each subsequent human turn) begins directly on the `recruit`
  step with the turn's income from all controlled sites already applied to the
  projected `state` (per the rules "At the start of your turn, collect bananas
  from all sites you control"). `selectAction`/`submitTurn`/`resetTurn` were
  updated to drop the income step and the `income-not-collected` error; the
  game loop (`gameLoop.ts`) still applies income automatically via `playTurn`.
  The `TurnStep` type loses `income` and the `STEP_LABELS` table drops the
  "Income" label; the human's turn now begins on recruit/move actions. Core is
  unaffected in rule semantics (income is credited exactly once per turn) and
  stays 100% covered; all affected core/UI tests were updated to the
  recruit-step flow and the full-game simulation now drives the human's legal
  moves via the AI layer's own move generator (which reliably completes games
  once income accounting is exact).

- Change the selected-hex highlight from the amber brand ring to a blue
  selection border so the selected cell reads clearly apart from the brand
  (M13-T3, #90). The `.hex-cell.hex-selected` and the combined
  `.hex-cell.hex-current.hex-selected` rules in `src/styles/index.css` now
  draw their ring from a new semantic blue `--color-selection` /
  `--color-selection-soft` token family (added to `src/theme.css` and
  re-exposed via `@theme inline`) instead of the amber brand tokens — no raw
  hex colours introduced (all token-backed per GUIDELINES-WEB-THEME.md). The
  current-territory accent glow is unchanged (`hex-current` uses
  `--color-accent`). Pure CSS/token change: no core business logic altered
  (core stays pure and 100% covered) and the `data-selected` attribute is
  untouched, so all existing selection tests still pass. Added structural
  tests in `tests/theme.test.ts` asserting the selection tokens exist, are
  re-exposed, and that both selected-hex rules use the blue selection tokens
  (and no longer reference amber).

- Color each land cell by its owner (M13-T2, #89). A rendered board cell whose
  site or unit is owned by p1 or p2 now shows a distinct soft owner territory
  tint in addition to the existing owner-coloured unit badge and the
  `hex-current` glow, so territory is visually distinct at a glance; neutral
  land keeps its terrain colour. The owner→colour mapping lives in the view
  model (`ownerBackground` in `src/ui/viewModels/useGameSession.ts`) as a pure
  presentation helper — the dumb `Cell` stays presentational and receives the
  resolved tint (`ownerBg` prop) as a plain class string, with no raw
  owner→colour logic in the component. Two new theme tokens
  (`--color-owner-p1` soft rose / `--color-owner-p2` soft violet) were added to
  `src/theme.css` and re-exposed via `@theme inline` so the tinted land cells
  use token-backed `bg-owner-p1` / `bg-owner-p2` utilities (no raw palettes).
  The Cell Showcase gained `PlayerOneTint` / `PlayerTwoTint` demos. Added unit
  tests for the `ownerBackground` helper, the `Cell` `ownerBg` prop, and the
  `Board` owner-tint wiring. Thin UI-only change: no core business logic
  altered (core stays pure and 100% covered).

- Added a dedicated regression test suite for the click-vs-drag selection
  interaction on the full-screen board (M12-T2, #85). These tests reproduce
  the #83 selection bug through the real pointer event path (pointerdown →
  pointerup / pointermove → the viewport's `onPointerDown`/`setPointerCapture`
  wiring) rather than the synthetic `fireEvent.click` that bypasses it: a
  static pointer click on a hex selects/highlights it (`hex-selected` /
  `data-selected="true"`) and updates the info panel; selecting a movable
  human-owned unit via the pointer sequence highlights its reachable
  move-target cells and pointer-clicking a reachable target moves the unit
  through the `selectCell` flow; a genuine drag pans the board without
  selecting any cell or leaving selection artifacts; and a static click still
  selects after a previous drag (the drag's click suppression resets on the
  next pointer-down). Thin UI-only test change: no core business logic altered
  (core stays pure and 100% covered).

### Fixed

- Fixed click selection on the full-screen board (M12-T1, #84). The viewport
  no longer calls `setPointerCapture` on the full-screen div during every
  pointer-down. In a real browser, pointer capture retargeted the synthetic
  `click` (and the token `hex-selected` / `data-selected="true"` state) to the
  capturing viewport, so the board cell's `onSelectCell` never fired and
  clicking a hex showed no cell info or movement highlights (bug #83).
  `PlayableGame.tsx` now distinguishes a static click from a drag via a small
  drag-threshold helper (`exceedsDragThreshold` / `DRAG_THRESHOLD` in the new
  `src/ui/viewModels/usePointer.ts`): a static click (pointer never moving
  beyond 5px) is left uncaptured so the native `click` reaches the board cell
  and selects it; a genuine drag (beyond the threshold) claims the pointer for
  smooth panning and suppresses its follow-up synthetic click so a drag never
  accidentally selects a hex. Wheel zoom and the floating overlay panels are
  unchanged. Added regression tests that drive the real pointer-down →
  pointer-up → click event sequence (plus the pure threshold helper tests).
  Thin UI-only change: no core logic changed (core stays pure and 100%
  covered).

### Added

- Polished the floating full-screen game UI (M11-T3, #76). The floating
  HUD panels over the full-screen map in `PlayableGame.tsx` are now themed
  with the design-token system: each floating panel card uses the
  `glass-panel` HUD surface (token-backed backdrop blur + shadow) so it
  reads as a polished game HUD that stays readable over any terrain, and
  pops in on mount with the token `menu-pop` animation. The panels keep
  their existing corner positions and `pointer-events` behaviour (non-
  intrusive, non-occluding) so pan/zoom/selection/move stay fully
  interactive over the full-screen board. Added a new `PlayableGame`
  showcase (`FullScreenHud`) in `src/ui/showcases/` showing the full-screen
  board with the floating HUD, registered in `src/ui/showcases/index.ts`
  (and the Showcase registration test updated accordingly). Extended the
  `PlayableGame` component tests to assert each floating panel card is
  styled with the token `glass-panel` surface and `menu-pop` animation and
  that the full-screen board layer stays beneath the themed HUD. This is a
  thin UI/layout and showcase change only: no core logic changed (core
  stays pure and 100% covered).

- Added floating overlay UI panels positioned at sensible corners of the
  full-screen map (M11-T2, #75). `PlayableGame.tsx` no longer stacks the
  info panels in a single thin side column: `StatusPanel` (with the "Ape
  Kingdom" title), `CellInfoPanel`, and `ActionControls` are each rendered
  as a distinct floating (absolutely-positioned, `z-10` above the board)
  overlay element fixed at a corner — the status/score panel at the
  top-left, the cell-info inspector at the bottom-left, and the action
  controls at the bottom-right. Each floating overlay container is
  `pointer-events-none` while only the panel card itself is
  `pointer-events-auto`, so the surrounding gaps never intercept pointer
  input and the board's drag-to-pan, wheel zoom, click-to-select, and
  movement interactions stay fully interactive everywhere except on a panel
  itself (the panels are fixed, non-occluding corners). The panels keep
  their existing props and `useGameSession` view-model wiring and behaviour
  (info display, recruit actions, End Turn, Clear, status/stats) unchanged.
  This is a thin layout/composition change only: no core logic changed (the
  core stays pure and 100% covered); the `PlayableGame` tests were extended
  to assert each panel floats as a distinct corner overlay above the board,
  that only the panels intercept pointer input, and that pan/zoom/End Turn
  still work with the floating overlays present.

- Added a full-screen game board that fills the viewport (M11-T1, #74).
  The playable layout in `PlayableGame.tsx` was restructured so the map is
  no longer a contained UI element: the former `max-w-5xl` grid container
  and the `glass-panel` that wrapped the `Board` are removed, and the board
  now fills 100% of the viewport inside the existing `h-screen w-screen
  overflow-hidden` container. The status / cell-info / action panels are
  floated over the map as a thin absolute overlay on the right so they no
  longer constrain the board. This is a thin layout/composition change only:
  drag-to-pan (M10-T1), mouse-wheel zoom (M10-T2), cell selection (M10-T3),
  and movement (M10-T4) continue to work unchanged over the full-screen
  board. No core logic changed (core stays pure and 100% covered); the
  `PlayableGame` tests were extended to assert the board-layer fills the
  viewport and the legacy constrained grid/panel is gone.

- Added movement: highlight reachable cells + click a target to move
  (M10-T4, #70). Selecting a human-owned unit that has not yet acted now
  highlights every reachable, unoccupied target hex it may legally move onto
  this turn, and clicking a highlighted target issues a `move` action through
  the existing `selectAction` flow (ending in the core `moveUnit` reducer) so
  the board reflects the move; clicking a non-reachable cell (or elsewhere)
  simply selects that cell instead — no illegal move is issued. A pure core
  derivation `movementInfo` (`src/core/movement.ts`, 100% covered) builds the
  move-eligibility / reachable-target info from the current `GameState`, using
  the core `legalActions` enumeration limited to the current player's `move`
  actions whose `unitHex` matches the selected hex, so every highlighted
  target maps 1:1 to the `move` reducer and never throws. The thin
  `useGameSession` view model exposes `movement` / `reachableHexes` (via a
  pure `selectedMovement` / `isMoveTarget` binding) and drives `selectCell` to
  issue a legal `move` when a reachable target is clicked and otherwise just
  select the cell; the dumb `Board`/`Cell` atoms accept a `reachableHexes` /
  `isMoveTarget` prop that adds a green `hex-move-target` highlight ring. Core
  stays pure and 100% covered; new tests cover the core derivation (movable /
  not-yet-acted / opponent / no-moves cases), the view-model selection +
  reachable-click-move / non-reachable-no-move / income-step-no-move cases,
  and the Board/Cell move-target highlighting.

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
