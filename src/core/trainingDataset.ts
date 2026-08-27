/**
 * Self-play training dataset recording (M28-T2a, #202).
 *
 * The headless self-play simulator (`playAiGame` in `src/core/selfPlay.ts`)
 * plays complete AI-vs-AI games. This module defines the pure, serializable
 * record type used to capture a usable training dataset from those games: for
 * every AI-chosen action, a snapshot of the game state at the moment of the
 * decision, the list of legal actions the AI considered, and the single action
 * it actually chose.
 *
 * Each recorded decision is a labelled example — (state-at-decision, legal
 * set, chosen action) — which is exactly the shape a subsequent ML / policy
 * training harness (M28-T2b) needs to learn a stronger opponent move policy
 * from real gameplay:
 *
 *   - `state` is the full serializable `GameState` at decision time. It is a
 *     plain data object (no functions, no classes, no React/browser objects),
 *     so it can be serialized to JSON without loss.
 *   - `legalActions` is the ordered, non-empty list of rule-legal actions the
 *     AI considered at that decision.
 *   - `chosenAction` is the single `GameAction` the AI selected.
 *   - `turn` records which full turn (0-based) the decision happened on, and
 *     `player` records which kingdom was acting, so a training harness can
 *     reason about turn order and per-player behaviour.
 *
 * Recording is purely observational: the recording callbacks never mutate the
 * state or influence which action the AI chooses, so enabling a recorder
 * produces exactly the same game trajectory and outcome as an unobserved run.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic operating on types from `src/core/game.ts` and
 * `src/core/ai.ts`.
 */

import type { GameState, PlayerId } from "./game";
import type { GameAction } from "./ai";

/**
 * A single recorded AI decision during a self-play game: the game state at
 * decision time, the legal actions the AI considered, and the action it
 * chose — the labelled (state → action) example a training harness learns
 * from.
 *
 * All fields are plain, JSON-serializable data (no functions or classes), so
 * a recorded `TrainingDataset` can be written out and reloaded by the
 * subsequent training harness (M28-T2b).
 */
export interface TrainingDecision {
  /** The turn (0-based full turn) on which this decision was made. */
  turn: number;
  /** The kingdom that was acting when this decision was made. */
  player: PlayerId;
  /**
   * The full game state at the moment of the decision. Plain serializable
   * data — the state the training harness relates the chosen action to.
   */
  state: GameState;
  /**
   * The ordered list of legal actions the AI considered at this decision
   * (non-empty). This is the set the chosen action was drawn from.
   */
  legalActions: GameAction[];
  /**
   * The single action the AI actually chose from `legalActions`.
   */
  chosenAction: GameAction;
}

/**
 * An ordered list of every AI decision recorded across a self-play game,
 * in the order they were made. Each element is one labelled (state → action)
 * example suitable for training a stronger opponent policy.
 */
export type TrainingDataset = TrainingDecision[];

/**
 * A callback that observes a single AI decision during a self-play run.
 *
 * It is invoked purely to record the decision (`state`,
 * `legalActions`, `chosenAction`) and must return nothing, so it can never
 * influence the game outcome — enabling a recorder is observationally
 * transparent (the trajectory and winner are identical to an unobserved run).
 *
 * The recorder is passed through the self-play path
 * (`playAiGame` → `aiTurnActions` / `playTurn` → `runAiTurn`) as an optional
 * parameter. When a caller does not supply a recorder, the game plays exactly
 * as before.
 */
export type DecisionRecorder = (decision: TrainingDecision) => void;
