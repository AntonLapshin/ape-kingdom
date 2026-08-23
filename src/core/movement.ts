/**
 * Pure core movement derivation (M10-T4).
 *
 * Derives, for a selected board hex, whether it holds a movable human-owned
 * unit and — when it does — every reachable, unoccupied target hex the current
 * player may legally move that unit onto. This is the single source of the
 * move-eligibility / reachable-target derivation so the UI needs no business
 * logic: the board highlights the reachable targets when a movable unit is
 * selected, and clicking one issues a `move` action through the existing
 * `selectAction` flow.
 *
 * Reachable targets are drawn from the core legal `move` actions enumerated by
 * `legalActions` (M3-T1), limited to the current player's move actions whose
 * `unitHex` matches the selected hex. Each returned action maps 1:1 to the
 * `move` reducer, so clicking a highlighted target never throws.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic operating on the `GameState` from `src/core/game.ts`.
 */

import type { GameState, Hex, ApeUnit } from "./game";
import { sameHex } from "./game";
import { legalActions } from "./ai";

/** The derived movement info for a single selected hex. */
export interface MovementInfo {
  /**
   * The unit on the selected hex, or null when the hex is empty, holds an
   * opponent's unit, or is not owned by the current player.
   */
  unit: ApeUnit | null;
  /**
   * Whether the selected hex holds a unit the current player can move this
   * turn: a current-player-owned unit that has not yet acted (and has at
   * least one legal move action in the legal set).
   */
  movable: boolean;
  /**
   * Every reachable, unoccupied target hex the selected unit may legally move
   * onto this turn, derived from the current player's legal `move` actions.
   * Empty when the hex is not a movable current-player unit.
   */
  reachable: Hex[];
}

/**
 * Derive the movement info for one selected hex from the current game state.
 *
 * The reachable targets are the `move` actions in the legal set whose
 * `unitHex` matches the selected hex — i.e. every hex the current player may
 * legally move the unit at the selected hex onto this turn. The hex is
 * `movable` when the selected unit is owned by the current player, has not
 * acted, and has at least one such legal move. `movable` is also true when the
 * unit has no legal moves (so the UI can show the selection but no targets),
 * keeping the derivation honest to "a unit that has not yet acted".
 *
 * This is pure derivation — no React, no browser APIs, no mutation.
 */
export function movementInfo(
  state: GameState,
  selectedHex: Hex | null,
): MovementInfo {
  if (!selectedHex) {
    return { unit: null, movable: false, reachable: [] };
  }

  const unit =
    state.units.find((u) => sameHex(u.hex, selectedHex)) ?? null;
  if (!unit) {
    return { unit: null, movable: false, reachable: [] };
  }

  const me = state.currentPlayer;
  const owned = unit.owner === me && !unit.hasActed;

  // Collect the legal move targets for this unit from the legal action set.
  const reachable: Hex[] = [];
  for (const action of legalActions(state)) {
    if (action.type === "move" && sameHex(action.unitHex, selectedHex)) {
      reachable.push(action.targetHex);
    }
  }

  return {
    unit,
    movable: owned,
    reachable,
  };
}
