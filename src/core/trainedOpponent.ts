/**
 * Trained-AI opponent driver for the deployed UI (M28-T3, #204).
 *
 * Bridges the trained opponent policy produced by the M28-T2b harness
 * (`src/core/training.ts`, serialized to `public/trained-ai.json`) into the
 * existing rule-legal AI layer so a human playing the AI in the browser gets
 * the stronger, trained opponent — while **falling back gracefully** to the
 * existing rule-legal AI whenever the trained policy is absent, malformed, or
 * otherwise unusable.
 *
 * This module is pure business logic, with no React, Tailwind, browser, or
 * fetch I/O:
 *
 *   - `isValidTrainedPolicy(policy)` validates an arbitrary parsed value
 *     (e.g. the result of `JSON.parse` on a freshly loaded file) and narrows
 *     it to a usable `TrainedAiPolicy`. A missing / unparseable / malformed
 *     policy is simply rejected (returns `false`), so the caller can fall
 *     back to the base AI without crashing.
 *   - `rankWithPolicy(policy, actions, state)` returns the legal actions
 *     rank-ordered by the trained policy's score (highest first), the
 *     rank-ordered selection the issue calls for.
 *   - `chooseAiAction(policy, actions, state, seed, options)` is the single
 *     decision entry point used by the game loop: when a valid policy is
 *     supplied it selects the highest-scoring trained action
 *     (`chooseTrainedAction`), otherwise it falls back to the base AI
 *     (`chooseFromActions`). The training policy always takes precedence over
 *     the base AI, and the fallback is exercised automatically whenever the
 *     policy is absent or unusable.
 *
 * The game loop (`src/core/gameLoop.ts`) and the game session
 * (`src/core/gameSession.ts`) thread an optional
 * `TrainedAiPolicy | null` through the AI turn so the deployed opponent can
 * use the trained file when it is available without ever breaking the game
 * when it is not.
 */

import type { GameState } from "./game";
import type { GameAction, AiOptions } from "./ai";
import { chooseFromActions } from "./ai";
import {
  chooseTrainedAction,
  scoreWithPolicy,
  FEATURE_COUNT,
  type TrainedAiPolicy,
} from "./training";

/**
 * Whether a candidate value is a usable `TrainedAiPolicy`.
 *
 * This validates an arbitrary parsed value (from `JSON.parse` on a freshly
 * loaded file, or from untrusted data) so a missing, unparseable, or
 * structurally malformed policy can never crash the game — the caller falls
 * back to the base AI instead. A policy is usable when it has a `weights`
 * array of exactly `FEATURE_COUNT` finite numbers, a finite numeric `bias`,
 * and numeric self-describing metadata (`gamesSeen`, `decisionsSeen`,
 * `version`). Extra properties are ignored; a missing policy (`null` /
 * `undefined`) is rejected.
 *
 * Deterministic and pure. Narrowing type predicate so callers get a typed
 * policy after the check.
 */
export function isValidTrainedPolicy(policy: unknown): policy is TrainedAiPolicy {
  if (policy === null || typeof policy !== "object") return false;
  const p = policy as Record<string, unknown>;
  if (!Array.isArray(p.weights) || p.weights.length !== FEATURE_COUNT) return false;
  if (!p.weights.every((w) => typeof w === "number" && Number.isFinite(w))) {
    return false;
  }
  if (typeof p.bias !== "number" || !Number.isFinite(p.bias)) return false;
  return true;
}

/**
 * Return the legal `actions` rank-ordered by the trained policy's score,
 * highest score first (ties keep their original relative order — the order
 * they appear in `actions`).
 *
 * Every action is scored with `scoreWithPolicy`, so actions exhibiting the
 * features the trained policy associated with winning sort to the top. The
 * result is a rank-ordered selection that a caller can use to pick the best
 * action (taking `result[0]`) or to present an ordered set. Deterministic.
 *
 * The caller is responsible for a non-empty rule-legal `actions` list (the
 * same contract as the AI layer).
 */
export function rankWithPolicy(
  policy: TrainedAiPolicy,
  actions: GameAction[],
  state: GameState,
): GameAction[] {
  const scored = actions.map((action) => ({
    action,
    score: scoreWithPolicy(policy, action, state),
  }));
  return scored
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.action);
}

/**
 * The single decision entry point for the AI turn when a trained policy is
 * available.
 *
 * When `policy` is a valid, usable `TrainedAiPolicy` the action is chosen with
 * `chooseTrainedAction` (highest trained score wins, ties broken
 * deterministically by `seed`) — a **higher-precedence** selection than the
 * base AI. When the policy is absent (`null` / `undefined`) or invalid
 * (malformed, wrong length, non-finite weights), or the action list is empty,
 * it falls back to the base AI (`chooseFromActions`) so the game is never
 * broken by a missing or unparseable trained file.
 *
 * The `actions` list is expected to be the rule-legal meaningful set for the
 * current turn; `options` (the base AI behavior knobs) are used only by the
 * fallback path. Deterministic for a given `policy`, `actions`, `state`,
 * `seed`, and `options`.
 */
export function chooseAiAction(
  policy: TrainedAiPolicy | null | undefined,
  actions: GameAction[],
  state: GameState,
  seed: number,
  options: AiOptions = {},
): GameAction {
  if (isValidTrainedPolicy(policy) && actions.length > 0) {
    return chooseTrainedAction(policy, actions, state, seed);
  }
  return chooseFromActions(actions, state, seed, options);
}
