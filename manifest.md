# ape-kingdom — Manifest

> Project charter / intent.

**Status: done** — all milestones implemented, merged, tested, and the live
POC demo is deployed. See `project-state.md` and `CHANGELOG.md` for details. This file is a living document maintained by the
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

### M6 — Hardening and demo readiness

**Goal:** Finalize the POC: end-to-end verification, full test coverage enforcement, and a polished live demo.

**Scope:**
  - [x] Add integration tests covering a full Human vs AI game through the UI
  - [x] Verify npm install && npm test && npm run build and 100% src/core coverage pass in CI
  - [x] Confirm the /guidelines folder is complete and referenced so all personas follow the rules
  - [x] Deploy the final build to GitHub Pages and verify the live demo
  - [x] Update manifest.md, project-state.md, and CHANGELOG.md to reflect the shipped POC
