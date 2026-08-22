/**
 * Pure core game-session controller (M4-T1).
 *
 * Orchestrates the Human vs AI turn flow on top of the M2 reducers and the M3
 * game loop (`src/core/gameLoop.ts`) so the interactive UI can drive a full
 * game without containing any business logic.
 *
 * A `GameSession` is an immutable value describing one human turn:
 *
 *  - `baseState` is the game state at the start of the human's turn (before
 *    the human collects income or acts);
 *  - `moves` is the ordered list of actions the human has selected so far
 *    this turn (income -> recruit -> move/fight);
 *  - `state` is the projected state after those selections, so the UI can
 *    render the board as the human builds their turn;
 *  - `step` is the turn step the human is currently on (`income`, `recruit`,
 *    `movefight`, or `done` once the game has ended);
 *  - `legalMoves` is the set of actions the human may legally select next,
 *    already filtered to the current step so the ordering is enforced.
 *
 * The human selects one action at a time via `selectAction` (which validates
 * the action is in `legalMoves` and advances the turn step), then ends their
 * turn with `submitTurn`, which runs the AI's reply via `playTurn` from
 * `src/core/gameLoop.ts` (seeded and deterministic) and advances to the next
 * human turn — or marks the session `done` with a winner when the game ends.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic operating on the `GameState` from `src/core/game.ts`.
 */

import type { GameState, PlayerId } from "./game";
import {
  sameHex,
  createSite,
  startingForce,
  collectIncome,
} from "./game";
import { legalActions, type GameAction, type AiOptions } from "./ai";
import { applyHumanMoves, playTurn } from "./gameLoop";

/* ------------------------------------------------------------------ */
/* Turn steps                                                          */
/* ------------------------------------------------------------------ */

/**
 * The turn step the human is currently on, matching the rules' Turn Sequence
 * (income -> recruit -> move/fight).
 *
 *  - `income`    — the human must collect income (step A) before anything
 *                  else. The only legal action is `collectIncome`.
 *  - `recruit`   — the human may recruit apes (step B) and/or move/fight.
 *                  Recruiting stays legal until the human moves or fights.
 *  - `movefight` — the human may move and attack (step C). Recruiting is no
 *                  longer allowed once the human has moved or fought.
 *  - `done`      — the game has ended (a winner exists); no further actions.
 */
export type TurnStep = "income" | "recruit" | "movefight" | "done";

/* ------------------------------------------------------------------ */
/* Session errors                                                      */
/* ------------------------------------------------------------------ */

/** The reason a session operation was rejected. */
export type SessionErrorKind =
  /** The action is not in the session's current `legalMoves`. */
  | "not-a-legal-move"
  /** The action is not valid for the current turn step. */
  | "wrong-step"
  /** The game has already ended; no further actions may be selected. */
  | "turn-already-ended"
  /** The human tried to end their turn before collecting income (step A). */
  | "income-not-collected";

/** A typed error describing why a session operation was rejected. */
export class GameSessionError extends Error {
  readonly kind: SessionErrorKind;

  constructor(kind: SessionErrorKind, message: string) {
    super(message);
    this.name = "GameSessionError";
    this.kind = kind;
  }
}

/* ------------------------------------------------------------------ */
/* Session value                                                       */
/* ------------------------------------------------------------------ */

/** An immutable snapshot of one human turn in a Human vs AI game. */
export interface GameSession {
  /** The game state at the start of the human's turn (before income/actions). */
  baseState: GameState;
  /** The projected state after the human's selected actions so far this turn. */
  state: GameState;
  /** The human's selected actions this turn, in order. */
  moves: GameAction[];
  /** The turn step the human is currently on. */
  step: TurnStep;
  /** The legal actions the human may select next, filtered to the current step. */
  legalMoves: GameAction[];
  /** The AI seed used to run the AI's reply on submit (deterministic). */
  aiSeed: number;
  /** The AI options used to run the AI's reply on submit. */
  aiOptions: AiOptions;
  /** The winner, or null while the game is in progress. */
  winner: PlayerId | null;
}

/* ------------------------------------------------------------------ */
/* Standard two-player setup                                           */
/* ------------------------------------------------------------------ */

/**
 * Build the standard two-player setup from the rules: each player places one
 * Home Tree on opposite sides of the map with neutral Groves/Nests between
 * them, and each player starts with the standard `startingForce` (3 Monkeys,
 * 1 Gibbon, 2 bananas). Returns the initial `GameState` with `p1` as the
 * current player.
 */
export function standardSetup(): GameState {
  const p1 = startingForce("p1", { q: 0, r: 0 });
  const p2 = startingForce("p2", { q: 5, r: 0 });
  return {
    sites: [
      createSite("HomeTree", 0, 0, "p1"),
      createSite("HomeTree", 5, 0, "p2"),
      createSite("Grove", 1, 0),
      createSite("Grove", 2, 0),
      createSite("Grove", 3, 0),
      createSite("Grove", 4, 0),
      createSite("Grove", 1, -1),
      createSite("Grove", 4, -1),
      createSite("Nest", 2, -1),
      createSite("Nest", 3, -1),
      createSite("Nest", 2, 1),
      createSite("Nest", 3, 1),
    ],
    units: [...p1.units, ...p2.units],
    players: { p1: p1.player, p2: p2.player },
    currentPlayer: "p1",
    turnOrder: ["p1", "p2"],
    winner: null,
  };
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Reset `hasActed` to false for every unit owned by the given player, marking
 * them as able to act this turn (per the rules, "each ape that was under your
 * control at the start of your turn may act once"). Returns a new
 * `GameState`; does not mutate the input.
 */
function resetUnitsForTurn(state: GameState, playerId: PlayerId): GameState {
  return {
    ...state,
    units: state.units.map((u) =>
      u.owner === playerId ? { ...u, hasActed: false } : u,
    ),
  };
}

/**
 * Project the human's selected `moves` onto `baseState` to produce the state
 * the game would be in after those selections: reset the current player's
 * units so they may act, collect income (step A), then apply the selected
 * recruit / move / fight actions (steps B + C) in rule order via
 * `applyHumanMoves`. Returns a new `GameState`; does not mutate the input.
 */
function projectState(baseState: GameState, moves: GameAction[]): GameState {
  let s = resetUnitsForTurn(baseState, baseState.currentPlayer);
  s = collectIncome(s);
  return applyHumanMoves(s, moves);
}

/**
 * The legal actions available to the human at a given turn step for a state
 * that has already had income collected and the human's moves applied.
 *
 *  - `income`    — only `collectIncome` (step A must come first).
 *  - `recruit`   — every recruit / move / attack action (the full post-income
 *                  legal set, excluding the already-collected income).
 *  - `movefight` — only move / attack actions (recruiting is over).
 *  - `done`      — no actions (the game has ended).
 */
function legalMovesFor(state: GameState, step: TurnStep): GameAction[] {
  const all = legalActions(state);
  switch (step) {
    case "income":
      return [{ type: "collectIncome" }];
    case "recruit":
      return all.filter((a) => a.type !== "collectIncome");
    case "movefight":
      return all.filter((a) => a.type === "move" || a.type === "attack");
    case "done":
      return [];
  }
}

/**
 * Whether two `GameAction` descriptors are equal (same type and same target
 * hexes / kind). Used to check that a selected action is one of the session's
 * legal moves.
 */
function sameAction(a: GameAction, b: GameAction): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "collectIncome":
      return true;
    case "recruit":
      return b.type === "recruit" && a.kind === b.kind && sameHex(a.hex, b.hex);
    case "move":
      return (
        b.type === "move" &&
        sameHex(a.unitHex, b.unitHex) &&
        sameHex(a.targetHex, b.targetHex)
      );
    case "attack":
      return (
        b.type === "attack" &&
        sameHex(a.attackerHex, b.attackerHex) &&
        sameHex(a.targetHex, b.targetHex)
      );
  }
}

/* ------------------------------------------------------------------ */
/* Session API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Create a new game session from the standard two-player setup.
 *
 * The session starts with the human (the current player, `p1`) on the
 * `income` turn step, so the only legal move is `collectIncome`. The returned
 * session exposes the initial `GameState` (`state` / `baseState`) and the
 * current player's `legalMoves`.
 *
 * The AI's reply is driven by `aiSeed` (deterministic for a given seed) and
 * `aiOptions` (behavior knobs), both of which are carried through to
 * `submitTurn`.
 */
export function createGameSession(
  aiSeed = 0,
  aiOptions: AiOptions = {},
): GameSession {
  const baseState = standardSetup();
  const state = resetUnitsForTurn(baseState, baseState.currentPlayer);
  return {
    baseState,
    state,
    moves: [],
    step: "income",
    legalMoves: legalMovesFor(state, "income"),
    aiSeed,
    aiOptions,
    winner: null,
  };
}

/**
 * Select one legal action for the human's turn.
 *
 * The action must be in the session's current `legalMoves` (which are already
 * filtered to the current turn step). Selecting it appends it to `moves`,
 * advances the turn step (collecting income moves to `recruit`; moving or
 * fighting moves to `movefight`), and recomputes the projected `state` and the
 * next `legalMoves`, so the income -> recruit -> move/fight ordering is
 * enforced as the human builds their turn.
 *
 * Throws a typed `GameSessionError` when the action is not in `legalMoves`
 * (`not-a-legal-move`), is invalid for the current step (`wrong-step`), or the
 * game has already ended (`turn-already-ended`). Returns a new `GameSession`;
 * does not mutate the input.
 */
export function selectAction(
  session: GameSession,
  action: GameAction,
): GameSession {
  if (session.step === "done") {
    throw new GameSessionError(
      "turn-already-ended",
      "The game has already ended; no further actions may be selected",
    );
  }
  if (!session.legalMoves.some((legal) => sameAction(legal, action))) {
    throw new GameSessionError(
      "not-a-legal-move",
      `The action is not a legal move for the current turn step`,
    );
  }

  const moves = [...session.moves, action];
  let step = session.step;
  if (step === "income") step = "recruit";
  if (action.type === "move" || action.type === "attack") step = "movefight";

  const state = projectState(session.baseState, moves);
  return {
    ...session,
    moves,
    step,
    state,
    legalMoves: legalMovesFor(state, step),
  };
}

/**
 * End the human's turn and run the AI's reply.
 *
 * The human must have collected income (step A) before ending their turn. The
 * selected `moves` are passed to `playTurn` from `src/core/gameLoop.ts`, which
 * applies the human's actions in rule order (enforcing the ordering), runs the
 * AI's full turn via the seeded/deterministic AI layer, advances the turn, and
 * resolves victory.
 *
 * If a winner is produced, the returned session is marked `done` with the
 * winner set and no further `legalMoves`. Otherwise a fresh session for the
 * next human turn is returned (income step, empty moves, the resulting state).
 *
 * Throws a typed `GameSessionError` when the human tries to end the turn
 * before collecting income (`income-not-collected`) or after the game has
 * already ended (`turn-already-ended`). If the submitted moves violate the
 * turn-step ordering, the underlying `TurnOrderError` from `gameLoop` is
 * propagated. Returns a new `GameSession`; does not mutate the input.
 */
export function submitTurn(session: GameSession): GameSession {
  if (session.step === "income") {
    throw new GameSessionError(
      "income-not-collected",
      "The human must collect income (step A) before ending the turn",
    );
  }
  if (session.step === "done") {
    throw new GameSessionError(
      "turn-already-ended",
      "The game has already ended",
    );
  }

  const result = playTurn(
    session.baseState,
    session.moves,
    session.aiSeed,
    session.aiOptions,
  );

  if (result.winner) {
    return {
      ...session,
      baseState: result,
      state: result,
      moves: [],
      step: "done",
      legalMoves: legalMovesFor(result, "done"),
      winner: result.winner,
    };
  }

  return {
    ...session,
    baseState: result,
    state: result,
    moves: [],
    step: "income",
    legalMoves: [{ type: "collectIncome" }],
    winner: null,
  };
}
