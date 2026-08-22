# Changelog

All notable changes to **ape-kingdom** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
