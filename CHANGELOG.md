# Changelog

All notable changes to **ape-kingdom** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

### Fixed

- Committed `package-lock.json` so CI's `npm ci` step passes (#1).
- Fixed invalid JSON in `package.json` `description` (unescaped quotes) that blocked `npm install`/`npm ci`.
- Fixed unescaped-quote parse error in `src/App.tsx` description prop that broke lint/build.
