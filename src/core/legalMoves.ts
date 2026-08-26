/**
 * Pure core legal-move enumeration (M3-T1).
 *
 * Provides a first-class, public entry point for querying every legal action
 * available to the current player from a given game state, so the UI and the
 * AI can both enumerate legal moves. The enumeration logic itself lives in
 * `src/core/ai.ts` (`legalActions`) and is shared with the AI decision layer;
 * this module re-exposes it as the documented M3-T1 API.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic operating on the `GameState` from `src/core/game.ts`.
 */

import { legalActions } from "./ai";
import type { GameAction } from "./ai";
import type { GameState } from "./game";

/**
 * Enumerate every legal action available to the current player from `state`,
 * covering each turn step per the rules:
 *
 *  - collect income (always legal — the reducer never rejects);
 *  - recruit: every affordable ape kind at every legal placement hex (a
 *    controlled Home Tree hex or an adjacent empty hex);
 *  - move: every unit that has not acted to every reachable, unoccupied hex,
 *    plus every join-eligible adjacent same-kingdom unit (joining adds levels, #174);
 *  - attack: every unit that has not acted against every adjacent enemy unit.
 *
 * Actions are returned in turn-step order (income, recruit, move, attack).
 * Every returned action is a plain, serializable `GameAction` descriptor that
 * can be fed back into the existing reducers (`collectIncome`, `recruitUnit`,
 * `moveUnit`, `attackUnit`) — applying it never throws a typed error.
 *
 * The active player's turn-step ordering is respected: the caller must perform
 * income before recruit before move/fight, matching the order in which the
 * actions are returned.
 */
export function legalMoves(state: GameState): GameAction[] {
  return legalActions(state);
}

export type { GameAction };
