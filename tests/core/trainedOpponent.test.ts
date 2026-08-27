import { describe, it, expect } from "vitest";
import type { GameState, ApeUnit, Site, Player } from "../../src/core/game";
import { createUnit, createSite, createPlayer } from "../../src/core/game";
import { generateMap } from "../../src/core/mapGenerator";
import type { GameAction } from "../../src/core/ai";
import type { TrainedAiPolicy } from "../../src/core/training";
import { TRAINED_AI_SOURCE, TRAINED_AI_VERSION } from "../../src/core/training";
import {
  isValidTrainedPolicy,
  rankWithPolicy,
  chooseAiAction,
} from "../../src/core/trainedOpponent";

/* ================================================================== */
/* Test helpers                                                        */
/* ================================================================== */

/** A valid trained policy (all weights zero → all actions tie). */
function validPolicy(weights = [0, 0, 0, 0, 0, 0]): TrainedAiPolicy {
  return {
    weights,
    bias: 0,
    gamesSeen: 1,
    decisionsSeen: 1,
    source: TRAINED_AI_SOURCE,
    version: TRAINED_AI_VERSION,
  };
}

/** Build a minimal game state for trained-opponent tests (all-land map). */
function gameState(opts: {
  sites?: Site[];
  units?: ApeUnit[];
  players?: Record<string, Player>;
  currentPlayer?: string;
} = {}): GameState {
  return {
    sites: opts.sites ?? [],
    units: opts.units ?? [],
    players: opts.players ?? { p1: createPlayer("p1"), p2: createPlayer("p2") },
    currentPlayer: opts.currentPlayer ?? "p1",
    turnOrder: ["p1", "p2"],
    winner: null,
    map: generateMap({ width: 8, height: 8, islandSize: 1, mountainDensity: 0, lakeDensity: 0, seed: 0 }),
  };
}

/** A capture move action (onto a p2-owned Grove) — the trained-preferred one. */
function captureAction(): GameAction {
  return { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 2, r: 0 } };
}

/** A plain (non-capture) move action scoring zero under any capture weight. */
function plainMoveAction(): GameAction {
  return { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 0, r: 1 } };
}

/* ================================================================== */
/* isValidTrainedPolicy                                                */
/* ================================================================== */

describe("isValidTrainedPolicy", () => {
  it("accepts a structurally valid policy", () => {
    expect(isValidTrainedPolicy(validPolicy())).toBe(true);
  });

  it("accepts arbitrary extra properties (forward-compatible)", () => {
    expect(isValidTrainedPolicy({ ...validPolicy(), foo: "bar" })).toBe(true);
  });

  it("rejects null and undefined (absent policy)", () => {
    expect(isValidTrainedPolicy(null)).toBe(false);
    expect(isValidTrainedPolicy(undefined)).toBe(false);
  });

  it("rejects non-object values (e.g. a JSON scalar)", () => {
    expect(isValidTrainedPolicy(42)).toBe(false);
    expect(isValidTrainedPolicy("weights")).toBe(false);
    expect(isValidTrainedPolicy([1, 2, 3])).toBe(false);
  });

  it("rejects missing / wrong-length weights", () => {
    expect(isValidTrainedPolicy({})).toBe(false);
    expect(isValidTrainedPolicy(validPolicy([0, 0, 0]))).toBe(false); // too short
    expect(isValidTrainedPolicy(validPolicy([0, 0, 0, 0, 0, 0, 0]))).toBe(false); // too long
  });

  it("rejects non-numeric or non-finite weights", () => {
    const bad = validPolicy();
    expect(
      isValidTrainedPolicy({ ...bad, weights: [0, 0, 0, 0, 0, "x"] }),
    ).toBe(false);
    expect(
      isValidTrainedPolicy({ ...bad, weights: [0, 0, 0, 0, 0, NaN] }),
    ).toBe(false);
    expect(
      isValidTrainedPolicy({ ...bad, weights: [0, 0, 0, 0, 0, Infinity] }),
    ).toBe(false);
  });

  it("rejects a non-finite or missing bias", () => {
    expect(isValidTrainedPolicy({ ...validPolicy(), bias: NaN })).toBe(false);
    expect(isValidTrainedPolicy({ ...validPolicy(), bias: undefined })).toBe(false);
  });
});

/* ================================================================== */
/* rankWithPolicy                                                      */
/* ================================================================== */

describe("rankWithPolicy", () => {
  it("ranks actions by trained-policy score, highest first", () => {
    const s = gameState({
      sites: [createSite("Grove", 2, 0, "p2")],
      units: [createUnit("Monkey", "p1", { q: 0, r: 0 })],
    });
    // Strong capture weight: the capture action scores highest, then all zeros.
    const policy = validPolicy([0, 0, 5, 0, 0, 0]);
    const ranked = rankWithPolicy(policy, [plainMoveAction(), captureAction()], s);
    expect(ranked[0]).toEqual(captureAction());
    expect(ranked[1]).toEqual(plainMoveAction());
  });

  it("is deterministic and preserves input order for equal scores", () => {
    const s = gameState({ units: [createUnit("Monkey", "p1", { q: 0, r: 0 })] });
    const policy = validPolicy(); // all-zero weights → every action ties
    const actions = [plainMoveAction(), captureAction()];
    expect(rankWithPolicy(policy, actions, s)).toEqual(actions);
    expect(rankWithPolicy(policy, actions, s)).toEqual(rankWithPolicy(policy, actions, s));
  });
});

/* ================================================================== */
/* chooseAiAction                                                      */
/* ================================================================== */

describe("chooseAiAction", () => {
  it("uses the trained policy when valid (higher precedence than base AI)", () => {
    const s = gameState({
      sites: [createSite("Grove", 2, 0, "p2")],
      units: [createUnit("Monkey", "p1", { q: 0, r: 0 })],
    });
    // A capture weight of 5 makes the trained policy always pick the capture
    // action, even though the base AI would otherwise (difficulty 0) pick
    // uniformly at random. `chooseAiAction` must therefore return the capture.
    const policy = validPolicy([0, 0, 5, 0, 0, 0]);
    const actions = [plainMoveAction(), captureAction()];
    expect(chooseAiAction(policy, actions, s, 3)).toEqual(captureAction());
  });

  it("falls back to the base AI when the policy is absent", () => {
    const s = gameState({ units: [createUnit("Monkey", "p1", { q: 0, r: 0 })] });
    const actions = [plainMoveAction(), captureAction()];
    for (const missing of [undefined, null]) {
      // With no policy, `chooseAiAction` delegates to `chooseFromActions`
      // (difficulty 0 → uniform random, deterministic by seed). It must return
      // one of the supplied actions and never throw.
      const chosen = chooseAiAction(missing, actions, s, 7);
      expect(actions).toContainEqual(chosen);
      expect(chooseAiAction(missing, actions, s, 7)).toEqual(
        chooseAiAction(missing, actions, s, 7),
      );
    }
  });

  it("falls back to the base AI when the policy is malformed", () => {
    const s = gameState({ units: [createUnit("Monkey", "p1", { q: 0, r: 0 })] });
    const actions = [plainMoveAction(), captureAction()];
    const malformed = { ...validPolicy(), weights: [0, 0, 0] };
    const chosen = chooseAiAction(malformed, actions, s, 7);
    expect(actions).toContainEqual(chosen);
  });

  it("falls back to the base AI when the action list is empty", () => {
    // The meaningful legal set for an active player is never empty in practice
    // (legalActions always includes collectIncome), but an empty list must not
    // be treated as a trained selection: `chooseAiAction` delegates to the
    // base AI, mirroring `chooseFromActions` exactly (which returns undefined
    // for an empty list rather than crashing or inventing an action).
    const s = gameState({ units: [createUnit("Monkey", "p1", { q: 0, r: 0 })] });
    expect(chooseAiAction(validPolicy(), [], s, 1)).toBeUndefined();
    expect(chooseAiAction(null, [], s, 1)).toBeUndefined();
  });

  it("is deterministic for the same policy, actions, state, and seed", () => {
    const s = gameState({
      sites: [createSite("Grove", 2, 0, "p2")],
      units: [createUnit("Monkey", "p1", { q: 0, r: 0 })],
    });
    const policy = validPolicy([0, 0, 5, 0, 0, 0]);
    const actions = [plainMoveAction(), captureAction()];
    expect(chooseAiAction(policy, actions, s, 42)).toEqual(
      chooseAiAction(policy, actions, s, 42),
    );
  });
});
