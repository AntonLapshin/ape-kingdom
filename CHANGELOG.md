# Changelog

All notable changes to **ape-kingdom** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
