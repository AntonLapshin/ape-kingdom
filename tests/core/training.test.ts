import { describe, it, expect } from "vitest";
import type { GameState, ApeUnit, Site, Player } from "../../src/core/game";
import {
  createUnit,
  createSite,
  createPlayer,
} from "../../src/core/game";
import { generateMap, type GameMap } from "../../src/core/mapGenerator";
import type { GameAction } from "../../src/core/ai";
import type { TrainingDecision } from "../../src/core/trainingDataset";
import {
  actionFeatures,
  fitPolicy,
  fitPolicyFromGames,
  scoreWithPolicy,
  chooseTrainedAction,
  FEATURE_COUNT,
  FEATURE_COLLECT,
  FEATURE_RECRUIT_RANK,
  FEATURE_CAPTURE,
  FEATURE_JOIN,
  FEATURE_ATTACK_RANKDIFF,
  FEATURE_ATTACK_WINNING,
  TRAINED_AI_VERSION,
  TRAINED_AI_SOURCE,
  type TrainedAiPolicy,
  type LabeledDecision,
} from "../../src/core/training";
import { playAiGame } from "../../src/core/selfPlay";
import { legalActions } from "../../src/core/ai";

/* ================================================================== */
/* Test helpers                                                        */
/* ================================================================== */

/** Build a minimal game state for training tests (all-land map). */
function gameState(opts: {
  sites?: Site[];
  units?: ApeUnit[];
  players?: Record<string, Player>;
  currentPlayer?: string;
  winner?: string | null;
  map?: GameMap;
} = {}): GameState {
  return {
    sites: opts.sites ?? [],
    units: opts.units ?? [],
    players: opts.players ?? { p1: createPlayer("p1"), p2: createPlayer("p2") },
    currentPlayer: opts.currentPlayer ?? "p1",
    turnOrder: ["p1", "p2"],
    winner: opts.winner ?? null,
    map:
      opts.map ??
      generateMap({ width: 8, height: 8, islandSize: 1, mountainDensity: 0, lakeDensity: 0, seed: 0 }),
  };
}

/** A helper to build a legal `TrainingDecision` for a given action/state. */
function decision(
  state: GameState,
  action: GameAction,
  player = state.currentPlayer,
  turn = 0,
): TrainingDecision {
  return {
    turn,
    player,
    state,
    legalActions: [action],
    chosenAction: action,
  };
}

/* ================================================================== */
/* actionFeatures                                                      */
/* ================================================================== */

describe("actionFeatures", () => {
  it("returns a fixed-length vector of the right size", () => {
    const s = gameState();
    expect(actionFeatures({ type: "collectIncome" }, s)).toHaveLength(FEATURE_COUNT);
  });

  it("marks collectIncome via the collect feature only", () => {
    const s = gameState();
    const f = actionFeatures({ type: "collectIncome" }, s);
    expect(f[FEATURE_COLLECT]).toBe(1);
    expect(f[FEATURE_RECRUIT_RANK]).toBe(0);
    expect(f[FEATURE_CAPTURE]).toBe(0);
    expect(f[FEATURE_JOIN]).toBe(0);
    expect(f[FEATURE_ATTACK_RANKDIFF]).toBe(0);
    expect(f[FEATURE_ATTACK_WINNING]).toBe(0);
  });

  it("uses the recruited kind's rank for recruit", () => {
    const s = gameState();
    const f = actionFeatures({ type: "recruit", kind: "Gorilla", hex: { q: 0, r: 0 } }, s);
    expect(f[FEATURE_RECRUIT_RANK]).toBe(4); // Gorilla is rank 4
    expect(f[FEATURE_COLLECT]).toBe(0);
  });

  it("marks a move onto a site the player does not control as a capture", () => {
    const s = gameState({
      sites: [createSite("Grove", 2, 0, "p2")],
    });
    const f = actionFeatures(
      { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 2, r: 0 } },
      s,
    );
    expect(f[FEATURE_CAPTURE]).toBe(1);
  });

  it("does not mark a move onto an already-controlled site as a capture", () => {
    const s = gameState({
      sites: [createSite("Grove", 2, 0, "p1")],
      currentPlayer: "p1",
    });
    const f = actionFeatures(
      { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 2, r: 0 } },
      s,
    );
    expect(f[FEATURE_CAPTURE]).toBe(0);
  });

  it("marks a join move onto an adjacent friendly join-eligible unit", () => {
    // Two rank-1 Monkeys (1+1=2 ≤ MAX_RANK). Joining requires both units not
    // to have acted this turn, so create them with hasActed=false.
    const s = gameState({
      units: [
        createUnit("Monkey", "p1", { q: 0, r: 0 }, false),
        createUnit("Monkey", "p1", { q: 1, r: 0 }, false),
      ],
    });
    const f = actionFeatures(
      { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 1, r: 0 } },
      s,
    );
    expect(f[FEATURE_JOIN]).toBe(1);
  });

  it("compute attack features from rank difference and winning bias", () => {
    // Gorilla (rank 4) attacking Monkey (rank 1): +3 difference, winning.
    const s = gameState({
      units: [
        createUnit("Gorilla", "p1", { q: 0, r: 0 }),
        createUnit("Monkey", "p2", { q: 1, r: 0 }),
      ],
    });
    const f = actionFeatures(
      { type: "attack", attackerHex: { q: 0, r: 0 }, targetHex: { q: 1, r: 0 } },
      s,
    );
    expect(f[FEATURE_ATTACK_RANKDIFF]).toBe(3);
    expect(f[FEATURE_ATTACK_WINNING]).toBe(1);
  });

  it("does not mark a losing attack (lower rank attacker) as winning", () => {
    const s = gameState({
      units: [
        createUnit("Monkey", "p1", { q: 0, r: 0 }),
        createUnit("Gorilla", "p2", { q: 1, r: 0 }),
      ],
    });
    const f = actionFeatures(
      { type: "attack", attackerHex: { q: 0, r: 0 }, targetHex: { q: 1, r: 0 } },
      s,
    );
    expect(f[FEATURE_ATTACK_RANKDIFF]).toBe(-3);
    expect(f[FEATURE_ATTACK_WINNING]).toBe(0);
  });
});

/* ================================================================== */
/* fitPolicy                                                           */
/* ================================================================== */

describe("fitPolicy", () => {
  /** A labelled decision with a chosen action of the given type features algebraically simple to inspect. */
  function captureDecision(player: string, winner: string | null): LabeledDecision {
    const s = gameState({
      sites: [createSite("Grove", 2, 0, "p2")],
      currentPlayer: player,
    });
    return {
      decision: decision(
        s,
        { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 2, r: 0 } },
        player,
      ),
      winner,
    };
  }

  it("leams a positive capture weight when winners capture and losers do not", () => {
    const labelled: LabeledDecision[] = [
      // Good decisions (p1 won): all capture.
      captureDecision("p1", "p1"),
      captureDecision("p1", "p1"),
      // Bad decisions (from the LOSING player p2 — winner is p1): none
      // capture (generated below via collect).
      {
        decision: decision(
          gameState({ currentPlayer: "p2" }),
          { type: "collectIncome" },
          "p2",
        ),
        winner: "p1",
      },
      {
        decision: decision(
          gameState({ currentPlayer: "p2" }),
          { type: "collectIncome" },
          "p2",
        ),
        winner: "p1",
      },
    ];
    const policy = fitPolicy(labelled, 2);
    // Each good capture decision has capture=1, goodAvg=1; bad capture avg=0.
    expect(policy.weights[FEATURE_CAPTURE]).toBeCloseTo(1, 5);
    expect(policy.gamesSeen).toBe(2);
    expect(policy.decisionsSeen).toBe(4);
  });

  it("excludes decisions with no winner from the fit", () => {
    const labelled: LabeledDecision[] = [
      captureDecision("p1", "p1"),
      captureDecision("p1", null), // capped game: no signal, excluded
    ];
    const policy = fitPolicy(labelled, 1);
    expect(policy.decisionsSeen).toBe(1); // only the winner-labelled one
  });

  it("reports the source and version and a zero bias", () => {
    const policy = fitPolicy([], 0);
    expect(policy.source).toBe(TRAINED_AI_SOURCE);
    expect(policy.version).toBe(TRAINED_AI_VERSION);
    expect(policy.bias).toBe(0);
    expect(policy.weights).toHaveLength(FEATURE_COUNT);
    expect(policy.decisionsSeen).toBe(0);
  });

  it("is deterministic for the same labelled input", () => {
    const labelled: LabeledDecision[] = [
      captureDecision("p1", "p1"),
      { decision: decision(gameState({ currentPlayer: "p2" }), { type: "collectIncome" }, "p2"), winner: "p2" },
    ];
    expect(fitPolicy(labelled, 1)).toEqual(fitPolicy(labelled, 1));
  });
});

/* ================================================================== */
/* fitPolicyFromGames                                                  */
/* ================================================================== */

describe("fitPolicyFromGames", () => {
  it("fits a policy from recorded self-play games with a decisive winner", () => {
    // Seeds 0 and 6 both resolve to a decisive winner on the default small
    // map (many other seeds are capped by the Protection rule standoffs).
    const results = [
      playAiGame({ seed: 0, recordDataset: true }),
      playAiGame({ seed: 6, recordDataset: true }),
    ];
    const policy = fitPolicyFromGames(results);
    expect(policy.decisionsSeen).toBeGreaterThan(0);
    expect(policy.gamesSeen).toBe(2);
  });

  it("skips games with no dataset and capped games (no winner)", () => {
    const decisive = playAiGame({ seed: 0, recordDataset: true });
    const capped = playAiGame({ seed: 5, maxTurns: 1, recordDataset: true });
    const noDataset = playAiGame({ seed: 9 }); // recordDataset off
    const policy = fitPolicyFromGames([decisive, capped, noDataset]);
    expect(policy.gamesSeen).toBe(1);
  });

  it("is deterministic for the same game results", () => {
    const a = [playAiGame({ seed: 4, recordDataset: true })];
    expect(fitPolicyFromGames(a)).toEqual(fitPolicyFromGames(a));
  });
});

/* ================================================================== */
/* scoreWithPolicy / chooseTrainedAction                               */
/* ================================================================== */

describe("scoreWithPolicy and chooseTrainedAction", () => {
  it("scores an action as the affine combination of weights and features", () => {
    const s = gameState({
      sites: [createSite("Grove", 2, 0, "p2")],
    });
    const policy: TrainedAiPolicy = {
      weights: [0, 0, 2, 0, 0, 0], // capture weight 2
      bias: 0,
      gamesSeen: 1,
      decisionsSeen: 1,
      source: TRAINED_AI_SOURCE,
      version: TRAINED_AI_VERSION,
    };
    const capture = actionFeatures(
      { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 2, r: 0 } },
      s,
    );
    expect(scoreWithPolicy(policy, { type: "collectIncome" }, s)).toBe(0);
    expect(scoreWithPolicy(policy, { type: "collectIncome" }, s)).toBe(
      policy.bias + policy.weights[FEATURE_CAPTURE] * capture[FEATURE_CAPTURE] * 0,
    );
    // A capture move scores the positive capture weight.
    expect(
      scoreWithPolicy(
        policy,
        { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 2, r: 0 } },
        s,
      ),
    ).toBeCloseTo(2, 5);
  });

  it("chooseTrainedAction picks the highest-scoring action", () => {
    const s = gameState({
      sites: [createSite("Grove", 2, 0, "p2")],
      units: [createUnit("Monkey", "p1", { q: 0, r: 0 })],
    });
    const policy: TrainedAiPolicy = {
      weights: [0, 0, 5, 0, 0, 0], // strongly prefer captures
      bias: 0,
      gamesSeen: 1,
      decisionsSeen: 1,
      source: TRAINED_AI_SOURCE,
      version: TRAINED_AI_VERSION,
    };
    const actions: GameAction[] = [
      { type: "collectIncome" },
      { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 0, r: 1 } }, // plain move, score 0
    ];
    // The capture action (onto the p2-owned Grove) is the only capture target
    // and must outscore the income and plain move at weight 5.
    const captureAction: GameAction = {
      type: "move",
      unitHex: { q: 0, r: 0 },
      targetHex: { q: 2, r: 0 },
    };
    const chosen = chooseTrainedAction(policy, [captureAction, ...actions], s, 1);
    expect(chosen).toEqual(captureAction);
  });

  it("chooseTrainedAction is deterministic for a given seed", () => {
    const s = gameState({ units: [createUnit("Monkey", "p1", { q: 0, r: 0 })] });
    const policy: TrainedAiPolicy = {
      weights: [0, 0, 0, 0, 0, 0], // all equal → all actions tie
      bias: 0,
      gamesSeen: 1,
      decisionsSeen: 1,
      source: TRAINED_AI_SOURCE,
      version: TRAINED_AI_VERSION,
    };
    const actions: GameAction[] = [
      { type: "collectIncome" },
      { type: "collectIncome" },
    ];
    expect(chooseTrainedAction(policy, actions, s, 42)).toEqual(
      chooseTrainedAction(policy, actions, s, 42),
    );
  });

  it("integrated: a policy fitted from winning captures selects captures from legal actions", () => {
    // Fit a policy where the winner always preferred capture moves.
    const captureDecisions: LabeledDecision[] = [];
    for (let i = 0; i < 6; i++) {
      const s = gameState({ sites: [createSite("Grove", 2, 0, "p2")] });
      captureDecisions.push({
        decision: decision(
          s,
          { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 2, r: 0 } },
          "p1",
        ),
        winner: "p1",
      });
    }
    const policy = fitPolicy(captureDecisions, 6);
    // Build a state with a capturable site and a legal capture action present.
    const s = gameState({
      sites: [createSite("Grove", 2, 0, "p2")],
      units: [createUnit("Monkey", "p1", { q: 0, r: 0 })],
    });
    const legal = legalActions(s);
    const captureAction: GameAction = {
      type: "move",
      unitHex: { q: 0, r: 0 },
      targetHex: { q: 2, r: 0 },
    };
    const chosen = chooseTrainedAction(policy, [...legal, captureAction], s, 7);
    // The capture move should outscore income/others given the strong capture weight.
    expect(chosen.type).toBe("move");
  });
});
