import { describe, it, expect } from "vitest";
import { playAiGame, DEFAULT_SELFPLAY_MAP } from "../../src/core/selfPlay";
import { aiTurnActions } from "../../src/core/gameLoop";
import { standardSetup } from "../../src/core/gameSession";
import type { TrainingDecision } from "../../src/core/trainingDataset";

/* ================================================================== */
/* Training dataset recording (M28-T2a, #202)                          */
/* ================================================================== */

describe("playAiGame dataset recording", () => {
  it("returns no dataset by default (recording off, unaffected callers)", () => {
    const result = playAiGame({ seed: 1 });
    expect(result.dataset).toBeUndefined();
  });

  it("records a non-empty ordered dataset when enabled", () => {
    const result = playAiGame({ seed: 1, recordDataset: true });
    expect(result.dataset).toBeDefined();
    const dataset = result.dataset as TrainingDecision[];
    expect(dataset.length).toBeGreaterThan(0);

    // The winner still resolves to a player (recording is observational).
    expect(result.winner).toMatch(/^p[12]$/);

    // Decisions come in chronological order (turn never decreases).
    for (let i = 1; i < dataset.length; i++) {
      expect(dataset[i].turn).toBeGreaterThanOrEqual(dataset[i - 1].turn);
    }
  });

  it("recording does not change the game trajectory or outcome", () => {
    const unrecorded = playAiGame({ seed: 42 });
    const recorded = playAiGame({ seed: 42, recordDataset: true });
    // Identical outcome, trajectory (final state), and turn count.
    expect(recorded.winner).toBe(unrecorded.winner);
    expect(recorded.turns).toBe(unrecorded.turns);
    expect(recorded.state).toEqual(unrecorded.state);
  });

  it("every recorded decision carries a serializable state, legal set and chosen action", () => {
    const result = playAiGame({ seed: 3, recordDataset: true });
    const dataset = result.dataset as TrainingDecision[];
    for (const d of dataset) {
      // The actor is always the acting (current) player of the recorded state.
      expect(d.state.currentPlayer).toBe(d.player);
      expect(d.player).toMatch(/^p[12]$/);
      // The legal set is non-empty and contains the chosen action.
      expect(Array.isArray(d.legalActions)).toBe(true);
      expect(d.legalActions.length).toBeGreaterThan(0);
      expect(d.legalActions).toContainEqual(d.chosenAction);
      // The dataset is fully JSON-serializable (no functions/classes/cycles).
      expect(() => JSON.stringify(d)).not.toThrow();
    }
  });

  it("records decisions from both the current player and the AI reply", () => {
    // Recording spans the whole game: at minimum one decision runs on each
    // full turn (both sides act each full turn - the current player whose
    // moves `playAiGame` generates, and the AI reply inside `playTurn`).
    const result = playAiGame({ seed: 0, recordDataset: true });
    const dataset = result.dataset as TrainingDecision[];
    expect(dataset.length).toBeGreaterThan(result.turns);
  });

  it("records a deterministic dataset for the same seed", () => {
    const a = playAiGame({ seed: 11, recordDataset: true }).dataset;
    const b = playAiGame({ seed: 11, recordDataset: true }).dataset;
    expect(a).toEqual(b);
    // And datasets from different seeds differ (rich enough to distinguish
    // trajectories for the training harness).
    const c = playAiGame({ seed: 12, recordDataset: true }).dataset;
    expect(c).not.toEqual(a);
  });

  it("records an empty dataset for a 0-turn (guard) run", () => {
    const result = playAiGame({ seed: 7, maxTurns: 0, recordDataset: true });
    expect(result.dataset).toEqual([]);
    expect(result.winner).toBeNull();
  });

  it("records decisions even when the run is bounded by the maxTurns guard", () => {
    const result = playAiGame({ seed: 5, maxTurns: 1, recordDataset: true });
    const dataset = result.dataset as TrainingDecision[];
    expect(result.turns).toBe(1);
    // At least one full turn of decisions was recorded while the game ran.
    expect(dataset.length).toBeGreaterThan(0);
    for (const d of dataset) expect(d.turn).toBeLessThanOrEqual(1);
  });
});

/* ================================================================== */
/* aiTurnActions decision recording (the low-level recording hook)     */
/* ================================================================== */

describe("aiTurnActions recording hook", () => {
  it("records each decision with the state at decision time and the chosen action", () => {
    const state = standardSetup(DEFAULT_SELFPLAY_MAP);
    const decisions: TrainingDecision[] = [];
    const actions = aiTurnActions(
      state,
      5,
      {},
      (d) => decisions.push(d),
      0,
    );
    // The same number of decisions as actions produced, in order.
    expect(decisions.length).toBe(actions.length);
    for (let i = 0; i < actions.length; i++) {
      expect(decisions[i].chosenAction).toEqual(actions[i]);
      // The state at decision time reflects the pre-action state: the chosen
      // action has not yet been applied to it (e.g. the recorded state is a
      // snapshot of the decision context, available to the training harness
      // as the labelled input).
      expect(decisions[i].state.currentPlayer).toBe(state.currentPlayer);
    }
    // Every recorded chosen action appears in its legal set.
    for (const d of decisions) {
      expect(d.legalActions).toContainEqual(d.chosenAction);
    }
  });

  it("does not change the produced actions relative to an unrecorded call", () => {
    const state = standardSetup(DEFAULT_SELFPLAY_MAP);
    const unrecorded = aiTurnActions(state, 5);
    const decisions: TrainingDecision[] = [];
    const recorded = aiTurnActions(state, 5, {}, (d) => decisions.push(d), 0);
    expect(recorded).toEqual(unrecorded);
    expect(decisions.length).toBe(unrecorded.length);
  });
});
