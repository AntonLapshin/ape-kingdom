/**
 * Pure core game loop orchestration (M3-T3).
 *
 * Wires the full Human vs AI turn cycle on top of the M2 reducers and the M3
 * AI decision layer:
 *
 *  1. the human's turn — the current player collects income (step A) and
 *     submits their sequence of recruit / move / fight actions (steps B + C),
 *     applied in rule order;
 *  2. the AI's turn — the opponent runs its full turn via the M3-T2 AI layer
 *     (`runAiTurn`), which never produces an illegal move;
 *  3. the turn advances to the next active (non-eliminated) player, resetting
 *     `hasActed` for that player's units so they may act.
 *
 * Victory is resolved after each side's turn via `resolveVictory`; once a
 * winner exists the loop stops and returns the finished state.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic operating on the `GameState` from `src/core/game.ts`.
 */

import type { GameState } from "./game";
import {
  sameHex,
  collectIncome,
  recruitUnit,
  moveUnit,
  attackUnit,
  MoveError,
  AttackError,
  eliminatePlayers,
  resolveVictory,
} from "./game";
import {
  legalActions,
  chooseFromActions,
  type GameAction,
  type AiOptions,
} from "./ai";
import type { DecisionRecorder, TrainingDecision } from "./trainingDataset";

/**
 * A hard safety cap on the number of actions applied during a single AI turn.
 * Each action (recruit/move/attack) consumes a resource (bananas or a unit's
 * `hasActed`), so the legal set shrinks monotonically and the AI's turn
 * terminates well before this cap; the cap only guards against an unexpected
 * infinite loop.
 */
export const MAX_ACTIONS_PER_TURN = 128;

/** The reason a human turn was rejected for violating step ordering. */
export type TurnOrderErrorKind =
  /** A recruit action was submitted after a move/fight action. */
  | "recruit-after-fight";

/**
 * A typed error describing why a submitted human move violated the turn-step
 * ordering (income -> recruit -> move/fight).
 */
export class TurnOrderError extends Error {
  readonly kind: TurnOrderErrorKind;

  constructor(kind: TurnOrderErrorKind, message: string) {
    super(message);
    this.name = "TurnOrderError";
    this.kind = kind;
  }
}

/* ------------------------------------------------------------------ */
/* Action application                                                  */
/* ------------------------------------------------------------------ */

/**
 * Apply a single `GameAction` to the state using the corresponding reducer,
 * exactly as the game loop and UI would. Returns the resulting state.
 *
 * The action's unit references are resolved from their current hex, keeping
 * the descriptor plain and serializable. If the action is not legal for the
 * current state, the underlying reducer throws its typed error.
 */
export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "collectIncome":
      return collectIncome(state);
    case "recruit":
      return recruitUnit(state, action.kind, action.hex);
    case "move": {
      const unit = state.units.find((u) => sameHex(u.hex, action.unitHex));
      if (!unit) {
        throw new MoveError(
          "already-acted",
          `move action references a missing unit at (${action.unitHex.q},${action.unitHex.r})`,
        );
      }
      return moveUnit(state, unit, action.targetHex);
    }
    case "attack": {
      const attacker = state.units.find(
        (u) => sameHex(u.hex, action.attackerHex),
      );
      if (!attacker) {
        throw new AttackError(
          "not-owner",
          `attack action references a missing attacker at (${action.attackerHex.q},${action.attackerHex.r})`,
        );
      }
      return attackUnit(state, attacker, action.targetHex);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Turn advancement                                                    */
/* ------------------------------------------------------------------ */

/**
 * Reset `hasActed` to false for every unit owned by `playerId`, marking them
 * as able to act this turn (per the rules, units under your control at the
 * start of your turn may act once). Returns a new `GameState`; does not
 * mutate the input.
 */
function resetUnitsForTurn(state: GameState, playerId: string): GameState {
  return {
    ...state,
    units: state.units.map((u) =>
      u.owner === playerId ? { ...u, hasActed: false } : u,
    ),
  };
}

/**
 * Advance the turn to the next active (non-eliminated) player.
 *
 * The next player is found by walking `turnOrder` forward from the current
 * player, skipping any eliminated players, so the turn always lands on a
 * player who can still act. If every other player is eliminated, the current
 * player keeps the turn (the game is effectively over; `resolveVictory` is
 * expected to have set a winner before this point).
 *
 * The new current player's units that were under their control at the start
 * of the turn are reset to `hasActed = false` so they may act this turn
 * (per the rules, "each ape that was under your control at the start of your
 * turn may act once"). Returns a new `GameState`; does not mutate the input.
 */
export function advanceTurn(state: GameState): GameState {
  const order = state.turnOrder;
  const start = order.indexOf(state.currentPlayer);
  let next = start;
  let guard = 0;
  while (guard < order.length) {
    next = (next + 1) % order.length;
    if (!state.players[order[next]].eliminated) break;
    guard++;
  }
  const nextPlayer = order[next];
  return resetUnitsForTurn({ ...state, currentPlayer: nextPlayer }, nextPlayer);
}

/* ------------------------------------------------------------------ */
/* Human turn                                                          */
/* ------------------------------------------------------------------ */

/**
 * Apply the human's submitted sequence of moves for their turn, enforcing the
 * rule turn-step ordering (income -> recruit -> move/fight).
 *
 * Income (step A) is collected before this function is called by `playTurn`,
 * so the submitted moves should be recruit (step B) and move/fight (step C)
 * actions. Ordering is enforced: a `recruit` action may not be submitted
 * after a `move`/`attack` action has already been played this turn (a player
 * must finish recruiting before moving/fighting). A redundant
 * `collectIncome` action is applied as a harmless no-op.
 *
 * Each action is applied via `applyAction`, so an illegal action (e.g. an
 * out-of-range move or an unaffordable recruit) throws the underlying
 * reducer's typed error. Returns a new `GameState`; does not mutate the input.
 */
export function applyHumanMoves(
  state: GameState,
  moves: GameAction[],
): GameState {
  let s = state;
  let fought = false;
  for (const action of moves) {
    if (action.type === "recruit" && fought) {
      throw new TurnOrderError(
        "recruit-after-fight",
        "Cannot recruit after moving/fighting: turn steps must be income -> recruit -> move/fight",
      );
    }
    if (action.type === "move" || action.type === "attack") {
      fought = true;
    }
    s = applyAction(s, action);
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* AI turn                                                             */
/* ------------------------------------------------------------------ */

/**
 * Generate the full sequence of meaningful actions (recruit / move / attack)
 * that the current player would take on their turn, deterministically for a
 * given seed.
 *
 * Income (step A) is collected separately by the caller; the returned actions
 * cover steps B (recruit) and C (move/fight). The AI repeatedly selects from
 * the current legal set (excluding the already-collected `collectIncome`)
 * via `chooseFromActions`, applying each selection to advance the state, until
 * no meaningful action remains (all affordable recruits spent and all
 * controllable units acted). Every returned action is rule-legal.
 */
export function aiTurnActions(
  state: GameState,
  seed: number,
  options: AiOptions = {},
  record?: DecisionRecorder,
  turn = 0,
): GameAction[] {
  const actions: GameAction[] = [];
  let s = state;
  let fought = false;
  let guard = 0;
  while (guard < MAX_ACTIONS_PER_TURN) {
    // Exclude the already-collected income, and once the AI has moved/fought
    // exclude further recruits so the recruit-before-fight ordering holds.
    const meaningful = legalActions(s).filter((a) => {
      if (a.type === "collectIncome") return false;
      if (fought && a.type === "recruit") return false;
      return true;
    });
    if (meaningful.length === 0) break;
    const action = chooseFromActions(meaningful, s, seed + guard, options);
    // Observational recording: expose the state at decision time, the legal
    // set considered, and the chosen action. The recorder never mutates `s`
    // or affects which action is chosen, so it cannot change the outcome.
    if (record) {
      const decision: TrainingDecision = {
        turn,
        player: s.currentPlayer,
        state: s,
        legalActions: meaningful,
        chosenAction: action,
      };
      record(decision);
    }
    s = applyAction(s, action);
    actions.push(action);
    if (action.type === "move" || action.type === "attack") fought = true;
    guard++;
  }
  return actions;
}

/**
 * Play a full turn for the current player (the AI): collect income (step A),
 * then apply the AI's generated recruit / move / fight actions (steps B + C).
 *
 * The AI's actions are drawn from the legal set and applied through the
 * reducers, so the AI never makes an illegal move. Returns a new `GameState`;
 * does not mutate the input.
 */
export function runAiTurn(
  state: GameState,
  seed: number,
  options: AiOptions = {},
  record?: DecisionRecorder,
  turn = 0,
): GameState {
  // Reset the AI's units so they may act this turn, then collect income
  // (step A) and apply the generated recruit / move / fight actions.
  let s = resetUnitsForTurn(state, state.currentPlayer);
  s = collectIncome(s);
  for (const action of aiTurnActions(s, seed, options, record, turn)) {
    s = applyAction(s, action);
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Full turn orchestration                                             */
/* ------------------------------------------------------------------ */

/**
 * Play one full round of Human vs AI: the human's turn, the AI's reply, and
 * the turn advance to the next active player.
 *
 * The human is the current player of `state`. On the human's turn, income is
 * collected (step A) and the submitted `humanMoves` (recruit / move / fight,
 * steps B + C) are applied in rule order via `applyHumanMoves`. Victory is
 * then resolved; if the human has won, the finished state is returned without
 * running the AI.
 *
 * Otherwise the turn advances to the AI (the next non-eliminated player),
 * whose full turn runs via `runAiTurn` (M3-T2, never illegal). Victory is
 * resolved again; if the AI has won, the finished state is returned. Finally
 * the turn advances back to the next active player for the following round.
 *
 * Elimination is reconciled after each side's turn so turn advancement skips
 * eliminated players. Returns a new `GameState`; does not mutate the input.
 */
export function playTurn(
  state: GameState,
  humanMoves: GameAction[],
  aiSeed: number,
  aiOptions: AiOptions = {},
  record?: DecisionRecorder,
  turn = 0,
): GameState {
  // Human's turn: reset the human's units so they may act, collect income
  // (step A), then apply steps B + C (recruit / move / fight).
  let s = resetUnitsForTurn(state, state.currentPlayer);
  s = collectIncome(s);
  s = applyHumanMoves(s, humanMoves);
  s = eliminatePlayers(s);
  s = resolveVictory(s);
  if (s.winner) return s;

  // AI's turn: advance to the AI, run its turn, then resolve.
  s = advanceTurn(s);
  s = runAiTurn(s, aiSeed, aiOptions, record, turn);
  s = eliminatePlayers(s);
  s = resolveVictory(s);
  if (s.winner) return s;

  // Advance back to the next active player for the following round.
  s = advanceTurn(s);
  return s;
}
