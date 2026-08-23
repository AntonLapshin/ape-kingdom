/**
 * Pure core movement-target derivation (M10-T4).
 *
 * Derives the set of reachable, unoccupied target hexes a selected unit can
 * move to this turn, from the core legal-action enumeration (`legalActions` /
 * the session's step-filtered `legalMoves`). This is the single source of
 * truth for the UI's "highlight reachable cells" feature: the board highlights
 * exactly the target hexes this helper returns, and clicking one issues the
 * matching `move` action through the existing `selectAction` flow.
 *
 * The helper takes the enumerated legal moves (the current player's
 * step-filtered action set, e.g. `GameSession.legalMoves`) rather than the raw
 * `GameState`, so the derivation is automatically limited to the current
 * player's own, not-yet-acted units and to the movement actions the human may
 * actually select at the current turn step. This guarantees that any highlighted
 * target corresponds to a legal `move` action that `selectAction` will accept.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic operating on plain `GameAction` descriptors and hexes.
 */

import type { Hex } from "./game";
import { sameHex } from "./game";
import type { GameAction } from "./ai";

/**
 * Every reachable, unoccupied target hex for the unit at `unitHex`, derived
 * from the given enumerated legal moves.
 *
 * Each `move` action in `moves` describes `{ type: "move"; unitHex; targetHex }`;
 * the helper collects every `targetHex` whose action's `unitHex` matches
 * `unitHex`. Because the caller passes the current player's (step-filtered)
 * legal moves, the result automatically:
 *  - only includes moves for human-owned, not-yet-acted units (the AI's units
 *    and already-acted units never appear in the current player's legal moves),
 *  - only includes moves legal at the current turn step (e.g. none on the
 *    income step, so no reachable targets are highlighted before income is
 *    collected),
 *  - excludes occupied/OOB hexes (the core `reachableHexes` BFS already limits
 *    the move actions to unoccupied, in-bounds target hexes).
 *
 * Returns an empty array when the unit at `unitHex` cannot move this turn (no
 * matching legal `move` action) or when `moves` contains no move for it. This
 * is pure derivation — no React, no browser APIs, no mutation.
 */
export function moveTargets(moves: GameAction[], unitHex: Hex): Hex[] {
  return moves
    .filter(
      (action): action is { type: "move"; unitHex: Hex; targetHex: Hex } =>
        action.type === "move" && sameHex(action.unitHex, unitHex),
    )
    .map((action) => action.targetHex);
}
