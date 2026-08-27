import { describe, it, expect } from "vitest";
import type { GameState, ApeUnit, Site, Player } from "../../src/core/game";
import type { GameMap } from "../../src/core/mapGenerator";
import {
  createUnit,
  createSite,
  createPlayer,
  startingForce,
  sameHex,
} from "../../src/core/game";
import { legalActions } from "../../src/core/ai";
import {
  TRAINED_AI_SOURCE,
  TRAINED_AI_VERSION,
} from "../../src/core/training";
import {
  applyAction,
  advanceTurn,
  applyHumanMoves,
  aiTurnActions,
  runAiTurn,
  playTurn,
  TurnOrderError,
} from "../../src/core/gameLoop";

/**
 * Build an all-land rectangular map for the loop-mechanics tests.
 *
 * These tests exercise the turn loop, applyAction/applyHumanMoves/playTurn
 * orchestration and the full-game simulation — they are not about terrain.
 * Using a wholly land map (no water, no mountains) keeps every pre-existing
 * hex coordinate on walkable land so the loop behavior under the movement
 * legality rules (water cells are not move targets) is unchanged from before
 * terrain was enforced, and the full-game simulation can still resolve to a
 * winner. Water/mountain movement legality is covered in the dedicated
 * ai.test.ts / game.test.ts (see #146).
 */
function landMap(width: number, height: number): GameMap {
  const cells: GameMap["cells"] = [];
  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      cells.push({ hex: { q, r }, terrain: "land" });
    }
  }
  return { width, height, cells };
}

/** Build a minimal game state for game-loop tests. */
function gameState(opts: {
  sites?: Site[];
  units?: ApeUnit[];
  players?: Record<string, Player>;
  currentPlayer?: string;
  turnOrder?: string[];
  winner?: string | null;
} = {}): GameState {
  return {
    sites: opts.sites ?? [],
    units: opts.units ?? [],
    players: opts.players ?? { p1: createPlayer("p1"), p2: createPlayer("p2") },
    currentPlayer: opts.currentPlayer ?? "p1",
    turnOrder: opts.turnOrder ?? ["p1", "p2"],
    winner: opts.winner ?? null,
    map: landMap(7, 7),
  };
}

/**
 * Build the standard two-player setup with one Home Tree per player on
 * opposite sides and neutral Groves/Nests between them (per the rules).
 */
function standardSetup(): GameState {
  const p1 = startingForce("p1", { q: 0, r: 0 });
  const p2 = startingForce("p2", { q: 5, r: 0 });
  return gameState({
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
  });
}

/* ------------------------------------------------------------------ */
/* applyAction                                                         */
/* ------------------------------------------------------------------ */

describe("applyAction", () => {
  it("applies a collectIncome action", () => {
    const state = gameState({
      sites: [createSite("Grove", 0, 0, "p1")],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const next = applyAction(state, { type: "collectIncome" });
    expect(next.players.p1.bananas).toBe(1);
  });

  it("applies a recruit action at a controlled Home Tree", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      players: { p1: createPlayer("p1", 10), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const next = applyAction(state, { type: "recruit", kind: "Monkey", hex: { q: 0, r: 0 } });
    expect(next.players.p1.bananas).toBe(8);
    expect(next.units).toHaveLength(1);
  });

  it("applies a move action, resolving the unit by its hex", () => {
    const state = gameState({
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 }, false)],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const next = applyAction(state, {
      type: "move",
      unitHex: { q: 1, r: 0 },
      targetHex: { q: 2, r: 0 },
    });
    expect(sameHex(next.units[0].hex, { q: 2, r: 0 })).toBe(true);
    expect(next.units[0].hasActed).toBe(true);
  });

  it("applies an attack action, resolving the attacker by its hex", () => {
    const state = gameState({
      units: [
        createUnit("Gorilla", "p1", { q: 1, r: 0 }, false),
        createUnit("Monkey", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const next = applyAction(state, {
      type: "attack",
      attackerHex: { q: 1, r: 0 },
      targetHex: { q: 2, r: 0 },
    });
    // Gorilla wins, moves into the defender's hex; the Monkey is destroyed.
    expect(next.units).toHaveLength(1);
    expect(sameHex(next.units[0].hex, { q: 2, r: 0 })).toBe(true);
  });

  it("throws a MoveError when a move references a missing unit", () => {
    const state = gameState({
      units: [],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    expect(() =>
      applyAction(state, {
        type: "move",
        unitHex: { q: 9, r: 9 },
        targetHex: { q: 1, r: 0 },
      }),
    ).toThrow(/missing unit/);
  });

  it("throws an AttackError when an attack references a missing attacker", () => {
    const state = gameState({
      units: [],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    expect(() =>
      applyAction(state, {
        type: "attack",
        attackerHex: { q: 9, r: 9 },
        targetHex: { q: 1, r: 0 },
      }),
    ).toThrow(/missing attacker/);
  });
});

/* ------------------------------------------------------------------ */
/* advanceTurn                                                         */
/* ------------------------------------------------------------------ */

describe("advanceTurn", () => {
  it("advances to the next player in turn order", () => {
    const state = gameState({
      units: [
        createUnit("Monkey", "p1", { q: 0, r: 0 }, true),
        createUnit("Monkey", "p2", { q: 5, r: 0 }, true),
      ],
      currentPlayer: "p1",
      turnOrder: ["p1", "p2"],
    });
    const next = advanceTurn(state);
    expect(next.currentPlayer).toBe("p2");
  });

  it("resets hasActed for the new current player's units so they may act", () => {
    const state = gameState({
      units: [
        createUnit("Monkey", "p1", { q: 0, r: 0 }, true),
        createUnit("Monkey", "p2", { q: 5, r: 0 }, true),
      ],
      currentPlayer: "p1",
      turnOrder: ["p1", "p2"],
    });
    const next = advanceTurn(state);
    const p2Unit = next.units.find((u) => u.owner === "p2");
    expect(p2Unit?.hasActed).toBe(false);
    // The previous player's units keep their acted state.
    const p1Unit = next.units.find((u) => u.owner === "p1");
    expect(p1Unit?.hasActed).toBe(true);
  });

  it("wraps around to the first player after the last", () => {
    const state = gameState({
      currentPlayer: "p2",
      turnOrder: ["p1", "p2"],
    });
    const next = advanceTurn(state);
    expect(next.currentPlayer).toBe("p1");
  });

  it("skips eliminated players and lands on the next active player", () => {
    const state = gameState({
      players: {
        p1: { ...createPlayer("p1", 0), eliminated: false },
        p2: { ...createPlayer("p2", 0), eliminated: true },
        p3: { ...createPlayer("p3", 0), eliminated: false },
      },
      currentPlayer: "p1",
      turnOrder: ["p1", "p2", "p3"],
    });
    const next = advanceTurn(state);
    expect(next.currentPlayer).toBe("p3");
  });

  it("keeps the current player when every other player is eliminated", () => {
    const state = gameState({
      players: {
        p1: { ...createPlayer("p1", 0), eliminated: false },
        p2: { ...createPlayer("p2", 0), eliminated: true },
      },
      currentPlayer: "p1",
      turnOrder: ["p1", "p2"],
    });
    const next = advanceTurn(state);
    expect(next.currentPlayer).toBe("p1");
  });
});

/* ------------------------------------------------------------------ */
/* applyHumanMoves                                                     */
/* ------------------------------------------------------------------ */

describe("applyHumanMoves", () => {
  it("applies recruit then move/fight actions in order", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 }, false)],
      players: { p1: createPlayer("p1", 10), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const next = applyHumanMoves(state, [
      { type: "recruit", kind: "Monkey", hex: { q: 0, r: 0 } },
      { type: "move", unitHex: { q: 1, r: 0 }, targetHex: { q: 2, r: 0 } },
    ]);
    // Recruit spent 2 bananas (10 -> 8) and added a unit; the move advanced.
    expect(next.players.p1.bananas).toBe(8);
    expect(next.units).toHaveLength(2);
    expect(sameHex(next.units[0].hex, { q: 2, r: 0 })).toBe(true);
  });

  it("rejects a recruit submitted after a move/fight action", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      units: [
        createUnit("Monkey", "p1", { q: 1, r: 0 }, false),
        createUnit("Monkey", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 10), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    expect(() =>
      applyHumanMoves(state, [
        { type: "move", unitHex: { q: 1, r: 0 }, targetHex: { q: 0, r: 1 } },
        { type: "recruit", kind: "Monkey", hex: { q: 1, r: -1 } },
      ]),
    ).toThrow(TurnOrderError);
    // An attack also moves into the fight phase, so a later recruit is rejected.
    expect(() =>
      applyHumanMoves(state, [
        { type: "attack", attackerHex: { q: 1, r: 0 }, targetHex: { q: 2, r: 0 } },
        { type: "recruit", kind: "Monkey", hex: { q: 1, r: -1 } },
      ]),
    ).toThrow(TurnOrderError);
  });

  it("applies a redundant collectIncome as a harmless no-op", () => {
    const state = gameState({
      sites: [createSite("Grove", 0, 0, "p1")],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const next = applyHumanMoves(state, [{ type: "collectIncome" }]);
    expect(next.players.p1.bananas).toBe(1);
  });

  it("propagates a typed reducer error for an illegal move", () => {
    const state = gameState({
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 }, false)],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    // Out-of-range move (distance 2 > standard movement 1, with no owned-land
    // route to the target) throws a MoveError.
    expect(() =>
      applyHumanMoves(state, [
        { type: "move", unitHex: { q: 1, r: 0 }, targetHex: { q: 3, r: 0 } },
      ]),
    ).toThrow(/out-of-range|standard movement|owned-land/);
  });

  it("returns an unchanged state for an empty move list", () => {
    const state = gameState({
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const next = applyHumanMoves(state, []);
    expect(next).toEqual(state);
  });
});

/* ------------------------------------------------------------------ */
/* aiTurnActions / runAiTurn                                           */
/* ------------------------------------------------------------------ */

describe("aiTurnActions", () => {
  it("returns a deterministic sequence for a given seed", () => {
    const state = standardSetup();
    const a = aiTurnActions(state, 42);
    const b = aiTurnActions(state, 42);
    expect(a).toEqual(b);
  });

  it("produces only meaningful (recruit/move/attack) actions", () => {
    const state = standardSetup();
    const actions = aiTurnActions(state, 1);
    for (const action of actions) {
      expect(action.type).not.toBe("collectIncome");
    }
  });

  it("returns an empty list when no meaningful action is available", () => {
    // No Home Tree to recruit from and all units have already acted.
    const state = gameState({
      sites: [createSite("Grove", 0, 0, "p1")],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 }, true)],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    expect(aiTurnActions(state, 1)).toEqual([]);
  });

  it("every action is legal to apply (the AI never makes an illegal move)", () => {
    const state = standardSetup();
    const actions = aiTurnActions(state, 7);
    let s = state;
    for (const action of actions) {
      expect(() => {
        s = applyAction(s, action);
      }).not.toThrow();
    }
  });

  it("with a null trained policy behaves exactly like the base AI (fallback)", () => {
    // M28-T3 backward-compatibility: passing no trained policy (null) must
    // produce the exact same turn as the pre-existing call, so the deployed
    // opponent falls back cleanly when the trained file is unavailable.
    const state = standardSetup();
    expect(aiTurnActions(state, 42)).toEqual(
      aiTurnActions(state, 42, {}, undefined, 0, null),
    );
  });

  it("uses a valid trained policy at higher precedence over the base AI", () => {
    // A state where the AI's current player (p1) has a Monkey that can capture
    // a p2-owned Grove by moving onto it. A capture-heavy policy must select
    // that capture as the first meaningful action regardless of the seed.
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0, "p2"),
        createSite("Grove", 2, 0, "p2"),
      ],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 }, false)],
      players: { p1: createPlayer("p1", 10), p2: createPlayer("p2", 10) },
      currentPlayer: "p1",
    });
    const policy = {
      weights: [0, 0, 100, 0, 0, 0], // strongly prefer captures
      bias: 0,
      gamesSeen: 1,
      decisionsSeen: 1,
      source: TRAINED_AI_SOURCE,
      version: TRAINED_AI_VERSION,
    };
    const actions = aiTurnActions(state, 7, {}, undefined, 0, policy);
    // The capture move onto the Grove is the highest-scoring action, so it is
    // the first action the trained opponent takes.
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]).toEqual({
      type: "move",
      unitHex: { q: 1, r: 0 },
      targetHex: { q: 2, r: 0 },
    });
  });

  it("a malformed trained policy falls back to the base AI without breaking", () => {
    const state = standardSetup();
    // A well-shaped object (so it typechecks as a policy) whose weights are the
    // wrong length — the runtime validator rejects it, so the turn falls back
    // to the rule-legal base AI, identical to the no-policy call.
    const malformed = {
      weights: [0, 0, 0],
      bias: 0,
      gamesSeen: 1,
      decisionsSeen: 1,
      source: TRAINED_AI_SOURCE,
      version: TRAINED_AI_VERSION,
    };
    expect(aiTurnActions(state, 42, {}, undefined, 0, malformed)).toEqual(
      aiTurnActions(state, 42),
    );
  });
});

describe("runAiTurn", () => {
  it("collects income and applies the AI's turn, returning a valid state", () => {
    const state = standardSetup();
    const next = runAiTurn(state, 3);
    // p1 (current player) collected income (3) on top of its starting 2, then
    // spent some on recruits, so it ends with at least 1 banana.
    expect(next.players.p1.bananas).toBeGreaterThanOrEqual(1);
    expect(next.currentPlayer).toBe("p1");
  });

  it("never makes an illegal move across many seeds", () => {
    const state = standardSetup();
    for (let seed = 0; seed < 50; seed++) {
      expect(() => runAiTurn(state, seed)).not.toThrow();
    }
  });

  it("respects the strategic options when generating the turn", () => {
    const state = standardSetup();
    // With preferRecruit, the AI's first meaningful action is a recruit.
    const actions = aiTurnActions(state, 5, { difficulty: 1, preferRecruit: true });
    if (actions.length > 0) {
      expect(actions[0].type).toBe("recruit");
    }
  });

  it("runs a full turn with a trained policy without breaking the game", () => {
    const state = standardSetup();
    const policy = {
      weights: [0, 0, 100, 0, 0, 0],
      bias: 0,
      gamesSeen: 1,
      decisionsSeen: 1,
      source: TRAINED_AI_SOURCE,
      version: TRAINED_AI_VERSION,
    };
    // A trained run must not throw and must land on a valid player.
    const next = runAiTurn(state, 3, {}, undefined, 0, policy);
    expect(next.players[next.currentPlayer]).toBeDefined();
    expect(next.winner).toBeNull();
  });

  it("runAiTurn with a null policy is backward-compatible (fallback)", () => {
    const state = standardSetup();
    const base = runAiTurn(state, 3);
    const fallback = runAiTurn(state, 3, {}, undefined, 0, null);
    expect(base).toEqual(fallback);
  });
});

/* ------------------------------------------------------------------ */
/* playTurn                                                            */
/* ------------------------------------------------------------------ */

describe("playTurn", () => {
  it("plays a human turn, the AI reply, and advances back to the human", () => {
    const state = standardSetup();
    const next = playTurn(state, [], 1);
    // Human was p1; after the round the turn returns to the next active player.
    expect(next.currentPlayer).toBe("p1");
    expect(next.winner).toBeNull();
  });

  it("applies the human's moves and then runs the AI's turn", () => {
    const state = standardSetup();
    // Human (p1) recruits a Monkey at an empty hex adjacent to their Home Tree
    // (the starting units occupy (0,0),(1,0),(-1,0),(0,1) so recruit at (0,-1)).
    const next = playTurn(state, [
      { type: "recruit", kind: "Monkey", hex: { q: 0, r: -1 } },
    ], 1);
    // The recruit cost 2 bananas from p1's starting 2; income (3) was collected
    // first, so p1 ends with 2 - 2 + 3 = 3 bananas before the AI acts.
    expect(next.players.p1.bananas).toBeGreaterThanOrEqual(3);
    // A new unit was recruited and remains on the map.
    expect(next.units.some((u) => u.owner === "p1" && u.kind === "Monkey")).toBe(true);
  });

  it("enforces turn-step ordering for the human's moves", () => {
    const state = standardSetup();
    expect(() =>
      playTurn(state, [
        { type: "move", unitHex: { q: 1, r: 0 }, targetHex: { q: 1, r: 1 } },
        { type: "recruit", kind: "Monkey", hex: { q: 0, r: 1 } },
      ], 1),
    ).toThrow(TurnOrderError);
  });

  it("returns the finished state immediately if the human wins", () => {
    // p1 controls every Home Tree already, so the human wins before the AI acts.
    const state = standardSetup();
    state.sites.forEach((site) => {
      if (site.kind === "HomeTree") site.owner = "p1";
    });
    const next = playTurn(state, [], 1);
    expect(next.winner).toBe("p1");
  });

  it("returns the finished state immediately if the AI wins", () => {
    // p2 controls every Home Tree already, so the AI wins on its turn.
    const state = standardSetup();
    state.sites.forEach((site) => {
      if (site.kind === "HomeTree") site.owner = "p2";
    });
    const next = playTurn(state, [], 1);
    expect(next.winner).toBe("p2");
  });

  it("advances only to the next non-eliminated player", () => {
    // p2 is eliminated; the turn should skip straight back to p1 after the AI
    // (which is also p2, but eliminated) — actually with p2 eliminated the AI
    // cannot act, so the loop should still resolve without error.
    const state = standardSetup();
    state.players.p2 = { ...state.players.p2, eliminated: true };
    state.units = state.units.filter((u) => u.owner !== "p2");
    const next = playTurn(state, [], 1);
    expect(next.currentPlayer).toBe("p1");
  });
});

/* ------------------------------------------------------------------ */
/* Full-game simulation                                                */
/* ------------------------------------------------------------------ */

describe("full-game simulation", () => {
  it("completes many seeded games with valid states and no illegal moves", () => {
    for (let gameSeed = 0; gameSeed < 8; gameSeed++) {
      let state = standardSetup();
      let turn = 0;
      // Persistent site-less territory (M24-T2, #160) and the Protection /
      // Safety Zones rule (M23-T2-G4, #195) make games resolve slower: the
      // defensive standoffs intentionally slow the rush-to-capture, so some
      // naive-AI games hit the 300-turn safety guard without a decisive winner
      // (the guard bounds the run rather than looping forever).
      while (!state.winner && turn < 300) {
        // Generate the human's full turn (recruit/move/fight) via the AI layer.
        const humanMoves = aiTurnActions(state, gameSeed * 1000 + turn);
        expect(() => {
          state = playTurn(state, humanMoves, gameSeed * 1000 + turn + 1);
        }).not.toThrow();
        // The game loop must always land on a valid current player.
        expect(state.players[state.currentPlayer]).toBeDefined();
        turn++;
      }
      // No illegal move was ever thrown and the state is valid. When the game
      // does reach a winner it must be a valid, present player; otherwise the
      // 300-turn cap was reached safely (no winner, no illegal move).
      if (state.winner !== null) {
        expect(state.winner).toMatch(/^p[12]$/);
        expect(state.players[state.winner as string]).toBeDefined();
      }
    }
  });

  it("the AI never makes an illegal move across many seeded one-turn steps", () => {
    for (let seed = 0; seed < 100; seed++) {
      const state = standardSetup();
      const actions = legalActions(state);
      for (const action of actions) {
        expect(() => applyAction(state, action)).not.toThrow();
      }
      expect(() => runAiTurn(state, seed)).not.toThrow();
    }
  });
});
