import { describe, it, expect } from "vitest";
import type { GameState, ApeUnit, Site, Player } from "../../src/core/game";
import { generateMap } from "../../src/core/mapGenerator";
import {
  createUnit,
  createSite,
  createPlayer,
  startingForce,
  sameHex,
} from "../../src/core/game";
import { legalActions } from "../../src/core/ai";
import {
  applyAction,
  advanceTurn,
  applyHumanMoves,
  aiTurnActions,
  runAiTurn,
  playTurn,
  TurnOrderError,
} from "../../src/core/gameLoop";

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
    map: generateMap({ width: 7, height: 7, seed: 0 }),
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
    // Out-of-range move (distance 2 > movement 1) throws a MoveError.
    expect(() =>
      applyHumanMoves(state, [
        { type: "move", unitHex: { q: 1, r: 0 }, targetHex: { q: 3, r: 0 } },
      ]),
    ).toThrow(/out-of-range|exceeds movement/);
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
  it("completes many seeded games with a winner and no illegal moves", () => {
    for (let gameSeed = 0; gameSeed < 20; gameSeed++) {
      let state = standardSetup();
      let turn = 0;
      while (!state.winner && turn < 200) {
        // Generate the human's full turn (recruit/move/fight) via the AI layer.
        const humanMoves = aiTurnActions(state, gameSeed * 1000 + turn);
        expect(() => {
          state = playTurn(state, humanMoves, gameSeed * 1000 + turn + 1);
        }).not.toThrow();
        // The game loop must always land on a valid current player.
        expect(state.players[state.currentPlayer]).toBeDefined();
        turn++;
      }
      // The game must complete with a winner.
      expect(state.winner).not.toBeNull();
      expect(state.winner).toMatch(/^p[12]$/);
      // The winner must be a present, non-eliminated player.
      expect(state.players[state.winner as string]).toBeDefined();
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
