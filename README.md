# ape-kingdom

Implement a new project "Ape Kingdom" that is a turn-based game, the rules are described in ws/temp/ape-kingdom-rules.md and the guidelines for the implementation are described in the same folder. Keep those guidelines in /guidelines folder of the project and instruct all the personas to follow those guidelines

## Guidelines

All personas (PM, Engineer, Review Engineer) **must follow** the game rules and
implementation guidelines in the [`/guidelines`](guidelines/) folder:

- [`guidelines/ape-kingdom-rules.md`](guidelines/ape-kingdom-rules.md) — the complete
  Ape Kingdom game ruleset (the single source of truth for game behavior).
- [`guidelines/GUIDELINES-WEB-THEME.md`](guidelines/GUIDELINES-WEB-THEME.md) — design-token
  theming system for the React + Tailwind client.
- [`guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md`](guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md) —
  Atoms → Molecules → Pages component architecture and the Showcase component browser.
- [`guidelines/GUIDELINES-WEB-CONTEXT-INJECTION.md`](guidelines/GUIDELINES-WEB-CONTEXT-INJECTION.md) —
  wiring side effects through a single React context with real + mock twins.

Every issue must be planned, implemented, and reviewed against these rules and
guidelines.

> Generated and maintained by [auto-pi](https://github.com/AntonLapshin/auto-pi) — an
> autonomous engineering team harness for Pi.

## Demo

Live demo: **[https://AntonLapshin.github.io/ape-kingdom/](https://AntonLapshin.github.io/ape-kingdom/)**

## Showcase

The app includes a hand-rolled **Showcase** component browser (a Storybook-style
gallery, per `guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md`) that demos every atom
component in the UI.

- **Route:** open the app and click the **Showcase** link in the top-right
  corner, or go directly to
  [`/showcase`](https://AntonLapshin.github.io/ape-kingdom/showcase).
- **Deep links:** each showcase is deep-linkable via the `?file=..&showcase=..`
  query string, and the browser back/forward buttons step through your
  selections.
- **Back to the game:** click **← Back to game** (top-right) to return to the
  playable game, which remains the default view.

## Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vitest](https://vitest.dev/) for unit tests, with 100% coverage enforced on `src/core/**/*.ts`

## Getting started

```bash
npm install     # install dependencies
npm run dev     # start the dev server
```

## Scripts

| Script              | Purpose                                    |
|---------------------|--------------------------------------------|
| `npm run dev`       | Start the Vite dev server                  |
| `npm run build`     | Type-check (`tsc`) then build for production |
| `npm run preview`   | Preview the production build locally       |
| `npm run lint`      | Run ESLint                                 |
| `npm test`          | Run unit tests (Vitest)                    |
| `npm run test:coverage` | Run tests and enforce 100% core coverage |

## Architecture

The project enforces a strict **core / UI split** (plan.md §19.1):

- `src/core/**` — pure business logic, no React, no DOM. **100% test coverage is
  required here.**
- `src/ui/**` — thin, dumb view layer (components + view models). Contains no
  business logic; it only renders what `src/core` provides.

## Project documents

- [`RULES.md`](RULES.md) — the full game rules: economics, units, movement,
  combat, capturing territory, and the winning condition.
- [`manifest.md`](manifest.md) — project charter / intent (purpose, goals, milestones)
- [`project-state.md`](project-state.md) — current state and progress
- [`CHANGELOG.md`](CHANGELOG.md) — versioned change log


## Shaping decisions (from /loop-seed)


- **How should users primarily interact with the project?** — Web app (browser) *(assumed)*

- **What should the first version of "ape-kingdom" actually do?** — fully implemented core of the game in TypeScript, well tested and React + TypeScript + TailwindCSS web app as a client (running separately) as a UI. Human vs AI

- **Any constraints, preferences, or requirements for "ape-kingdom"? (framework, integrations, audience, deployment…)** — Fully local, can do tradeoffs, the goal is to build a POC. However, beautiful UI with TailwindCSS, gradients, and animation


