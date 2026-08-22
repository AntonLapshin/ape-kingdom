import { describe, it, expect } from "vitest";
import type { GameState, ApeUnit, Site, Player } from "../../src/core/game";
import {
  createUnit,
  createSite,
  createPlayer,
  sameHex,
  collectIncome,
  recruitUnit,
  moveUnit,
  attackUnit,
} from "../../src/core/game";
import { legalActions, type GameAction } from "../../src/core/ai";
import { legalMoves } from "../../src/core/legalMoves";

/** Build a minimal game state for legal-move tests. */
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
  };
}

/**
 * Apply a `GameAction` to the state using the corresponding reducer, exactly
 * as the game loop / UI would. Returns the resulting state.
 */
function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "collectIncome":
      return collectIncome(state);
    case "recruit":
      return recruitUnit(state, action.kind, action.hex);
    case "move": {
      const unit = state.units.find((u) => sameHex(u.hex, action.unitHex));
      if (!unit) throw new Error("move action references a missing unit");
      return moveUnit(state, unit, action.targetHex);
    }
    case "attack": {
      const attacker = state.units.find((u) => sameHex(u.hex, action.attackerHex));
      if (!attacker) throw new Error("attack action references a missing attacker");
      return attackUnit(state, attacker, action.targetHex);
    }
  }
}

/* ------------------------------------------------------------------ */
/* legalMoves (M3-T1 public API)                                       */
/* ------------------------------------------------------------------ */

describe("legalMoves — M3-T1 public API", () => {
  it("is the shared legal-move enumeration used by the AI", () => {
    const state = gameState();
    // legalMoves is the M3-T1 entry point; it must agree exactly with the
    // AI's legalActions set so the UI and AI see the same legal moves.
    expect(legalMoves(state)).toEqual(legalActions(state));
  });

  it("returns a plain, serializable descriptor for every turn step", () => {
    // A state that exercises all four turn steps: a Home Tree that allows
    // recruit, a not-acted unit that can move, and an adjacent enemy to attack.
    const enemy = createPlayer("p2", 100);
    const me = createPlayer("p1", 100);
    const state = gameState({
      currentPlayer: "p1",
      players: { p1: me, p2: enemy },
      sites: [createSite("HomeTree", 0, 0, "p1")],
      units: [
        createUnit("Monkey", "p1", { q: 5, r: 0 }, false),
        createUnit("Gibbon", "p2", { q: 6, r: 0 }),
      ],
    });

    const moves = legalMoves(state);
    const types = new Set(moves.map((m) => m.type));

    // All four turn steps are enumerated.
    expect(types.has("collectIncome")).toBe(true);
    expect(types.has("recruit")).toBe(true);
    expect(types.has("move")).toBe(true);
    expect(types.has("attack")).toBe(true);

    // Every descriptor is plain and serializable (JSON round-trips).
    for (const move of moves) {
      expect(JSON.parse(JSON.stringify(move))).toEqual(move);
    }

    // Feeding every descriptor back into the reducers never throws — each is
    // a legal action the UI / game loop can apply.
    for (const move of moves) {
      expect(() => applyAction(state, move)).not.toThrow();
    }
  });

  it("respects turn-step ordering: income, recruit, move, attack", () => {
    const me = createPlayer("p1", 100);
    const enemy = createPlayer("p2", 100);
    const state = gameState({
      currentPlayer: "p1",
      players: { p1: me, p2: enemy },
      sites: [createSite("HomeTree", 0, 0, "p1")],
      units: [
        createUnit("Monkey", "p1", { q: 5, r: 0 }, false),
        createUnit("Gibbon", "p2", { q: 6, r: 0 }),
      ],
    });

    const order = legalMoves(state).map((m) => m.type);
    // The first descriptor is always collectIncome; recruit comes before
    // move/attack, matching the income -> recruit -> move/fight rule order.
    expect(order[0]).toBe("collectIncome");
    const firstRecruit = order.indexOf("recruit");
    const firstMove = order.indexOf("move");
    const firstAttack = order.indexOf("attack");
    expect(firstRecruit).toBeGreaterThanOrEqual(0);
    expect(firstMove).toBeGreaterThan(firstRecruit);
    expect(firstAttack).toBeGreaterThan(firstRecruit);
  });

  it("returns only collectIncome when there are no other legal actions", () => {
    // No sites (no recruit), no units (no move/attack): only income remains.
    const state = gameState();
    expect(legalMoves(state)).toEqual([{ type: "collectIncome" }]);
  });

  it("enumerates only the current player's legal moves", () => {
    const enemy = createPlayer("p2", 100);
    const me = createPlayer("p1", 100);
    const state = gameState({
      currentPlayer: "p1",
      players: { p1: me, p2: enemy },
      units: [
        // p1's unit can move/attack; p2's units belong to the other player.
        createUnit("Monkey", "p1", { q: 5, r: 0 }, false),
        createUnit("Gibbon", "p2", { q: 6, r: 0 }),
        createUnit("Gibbon", "p2", { q: 10, r: 0 }),
      ],
    });

    const moves = legalMoves(state);
    // Only p1's unit (at 5,0) is a legal attacker/mover; p2's units are not.
    const attacks = moves.filter((m) => m.type === "attack");
    for (const a of attacks) {
      expect(a.attackerHex).toEqual({ q: 5, r: 0 });
      expect(a.targetHex).toEqual({ q: 6, r: 0 });
    }
    // No move action references p2's units.
    const movesByP1 = moves.filter((m) => m.type === "move");
    for (const m of movesByP1) {
      expect(m.unitHex).toEqual({ q: 5, r: 0 });
    }
  });
});
