/**
 * Pure core movement derivation (M10-T4).
 *
 * Derives, for a selected board hex, whether it holds a movable human-owned
 * unit and — when it does — every reachable target hex the current player may
 * legally move that unit onto (unoccupied hexes plus join-eligible adjacent
 * same-kingdom units, the grayish move-target circles) and every reachable
 * target hex that holds an enemy unit the unit may legally capture (the red
 * capture circles, M26-T1 #169). This is the single source of
 * the move-eligibility / reachable-target derivation so the UI needs no
 * business logic: the board highlights the reachable targets when a movable
 * unit is selected, and clicking one issues a `move`/`attack` action through
 * the existing `selectAction` flow.
 *
 * Reachable targets are drawn from the core legal `move` actions and attack
 * targets from the legal `attack` actions enumerated by `legalActions`
 * (M3-T1), limited to the current player's actions whose `unitHex` /
 * `attackerHex` matches the selected hex. Each returned action maps 1:1 to the
 * `move`/`attack` reducer, so clicking a highlighted target never throws.
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
   * Every reachable target hex the selected unit may legally move onto this
   * turn, derived from the current player's legal `move` actions: unoccupied
   * hexes (the grayish move-target circles) **and** join-eligible adjacent
   * same-kingdom units (joining adds levels, M27-T3 #174). Empty when the hex
   * is not a movable current-player unit.
   */
  reachable: Hex[];
  /**
   * Every reachable target hex that currently holds an enemy unit the
   * selected unit may legally capture this turn (an adjacent enemy), derived
   * from the current player's legal `attack` actions (M26-T1, #169). The UI
   * renders these in red (distinct from the grayish move-target circles) so
   * attacks/captures are visually distinct from plain moves. Empty when the
   * hex is not a movable current-player unit with any legal attack.
   */
  attackable: Hex[];
}

/**
 * Derive the movement info for one selected hex from the current game state.
 *
 * The reachable targets are the `move` actions in the legal set whose
 * `unitHex` matches the selected hex — i.e. every hex the current player may
 * legally move the unit at the selected hex onto this turn (unoccupied hexes
 * plus join-eligible adjacent same-kingdom units, M27-T3 #174). The
 * attackable targets are the `attack` actions whose `attackerHex` matches the
 * selected hex — i.e. every adjacent enemy-occupied hex the selected unit may
 * capture (M26-T1, #169). The hex is `movable` when the selected unit is
 * owned by the current player, has not acted, and has at least one such legal
 * move. `movable` is also true when the
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
    return {
      unit: null,
      movable: false,
      reachable: [],
      attackable: [],
    };
  }

  const unit =
    state.units.find((u) => sameHex(u.hex, selectedHex)) ?? null;
  if (!unit) {
    return {
      unit: null,
      movable: false,
      reachable: [],
      attackable: [],
    };
  }

  const me = state.currentPlayer;
  const owned = unit.owner === me && !unit.hasActed;

  // Collect the legal move targets and legal attack (enemy-capture) targets
  // for this unit from the legal action set. Move actions target unoccupied
  // hexes and join-eligible adjacent same-kingdom units (M27-T3 #174, the
  // grayish move-target circles); attack actions target adjacent enemy-occupied
  // hexes (the red capture circles).
  const reachable: Hex[] = [];
  const attackable: Hex[] = [];
  for (const action of legalActions(state)) {
    if (action.type === "move" && sameHex(action.unitHex, selectedHex)) {
      reachable.push(action.targetHex);
    } else if (
      action.type === "attack" &&
      sameHex(action.attackerHex, selectedHex)
    ) {
      attackable.push(action.targetHex);
    }
  }

  return {
    unit,
    movable: owned,
    reachable,
    attackable,
  };
}
