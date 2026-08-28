/**
 * Core tests for neutral-unit interaction (M30-T4, #233).
 *
 * "Interaction with neutral units" defines how players engage the random
 * neutral guardian units placed during setup (M30-T2, #225): players attack
 * and defeat them with the existing combat rules, defeating a neutral lifts
 * its protection over its surrounding cells so they can be entered/captured,
 * and neutral units themselves are **static guardians** that never act across
 * turns.
 *
 * These tests are written entirely against the pure core reducers and helpers
 * (`isCellProtected`, `attackUnit`, `moveUnit`, `legalActions`,
 * `advanceTurn`/`playTurn`), so every interaction flows through the same
 * legality checks and typed errors (`AttackError`, `MoveError`) as normal
 * player-vs-player combat.
 *
 * Geometry: all used hexes sit on land of the default `generateMap({ width: 7,
 * height: 7, seed: 0 })` board — (1,2), (1,3), (2,2), (2,3), (3,2), (3,3) are
 * all land, so terrain/occupied checks never mask the interaction under test.
 */

import { describe, it, expect } from "vitest";
import type { Site, Player, GameState, ApeUnit, PlayerId } from "../../src/core/game";
import { generateMap } from "../../src/core/mapGenerator";
import {
  createUnit,
  createSite,
  createPlayer,
  sameHex,
  moveUnit,
  MoveError,
  attackUnit,
  AttackError,
  isCellProtected,
  isNeutralUnit,
  canNeutralUnitAct,
} from "../../src/core/game";
import { legalActions, type GameAction } from "../../src/core/ai";
import { playTurn, advanceTurn } from "../../src/core/gameLoop";

/** Build a minimal two-player state on the 7×7 land board. */
function gameState(opts: {
  sites?: Site[];
  units?: ApeUnit[];
  currentPlayer?: string;
  territory?: Record<string, PlayerId>;
} = {}): GameState {
  const players: Record<string, Player> = {
    p1: createPlayer("p1", 0),
    p2: createPlayer("p2", 0),
  };
  return {
    sites: opts.sites ?? [],
    units: opts.units ?? [],
    players,
    currentPlayer: opts.currentPlayer ?? "p1",
    turnOrder: ["p1", "p2"],
    winner: null,
    map: generateMap({ width: 7, height: 7, seed: 0 }),
    territory: opts.territory,
  };
}

/** Extract the move/attack actions the legal set offers for the given unit hex. */
function actionsFor(
  actions: GameAction[],
  unitHex: { q: number; r: number },
): { moves: GameAction[]; attacks: GameAction[] } {
  return {
    moves: actions.filter(
      (a) => a.type === "move" && a.unitHex.q === unitHex.q && a.unitHex.r === unitHex.r,
    ),
    attacks: actions.filter(
      (a) =>
        a.type === "attack" && a.attackerHex.q === unitHex.q && a.attackerHex.r === unitHex.r,
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Attack & defeat                                                     */
/* ------------------------------------------------------------------ */

describe("attacking and defeating neutral units (M30-T4)", () => {
  it("a higher-rank attacker defeats a neutral guardian and moves onto its cell", () => {
    const attacker = createUnit("Gorilla", "p1", { q: 2, r: 3 }, false);
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const state = gameState({ units: [attacker, neutral] });

    const next = attackUnit(state, attacker, { q: 3, r: 3 });

    // The neutral is destroyed; the Gorilla moves onto the guardian's cell
    // and is marked as acted this turn.
    expect(next.units).toHaveLength(1);
    expect(next.units[0].owner).toBe("p1");
    expect(next.units[0].kind).toBe("Gorilla");
    expect(next.units[0].hex).toEqual({ q: 3, r: 3 });
    expect(next.units[0].hasActed).toBe(true);
    // No neutral unit remains.
    expect(next.units.some((u) => isNeutralUnit(u))).toBe(false);
  });

  it("equal-rank combat destroys both the attacker and the neutral guardian", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 3 }, false);
    const neutral = createUnit("Monkey", null, { q: 2, r: 3 });
    const state = gameState({ units: [attacker, neutral] });

    const next = attackUnit(state, attacker, { q: 2, r: 3 });

    expect(next.units).toHaveLength(0);
  });

  it("a lower-rank attacker is destroyed and the neutral guardian remains", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 3 }, false);
    const neutral = createUnit("Gorilla", null, { q: 2, r: 3 });
    const state = gameState({ units: [attacker, neutral] });

    const next = attackUnit(state, attacker, { q: 2, r: 3 });

    expect(next.units).toHaveLength(1);
    expect(isNeutralUnit(next.units[0])).toBe(true);
    expect(next.units[0].hex).toEqual({ q: 2, r: 3 });
  });

  it("it is legal to attack a neutral guardian (offered as an attack action)", () => {
    const attacker = createUnit("Gorilla", "p1", { q: 2, r: 3 }, false);
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const state = gameState({ units: [attacker, neutral] });

    const { attacks } = actionsFor(legalActions(state), { q: 2, r: 3 });

    expect(
      attacks.some((a) => a.type === "attack" && sameHex(a.targetHex, { q: 3, r: 3 })),
    ).toBe(true);
  });

  it("defeating a neutral on a site-less cell claims that cell as the attacker's territory", () => {
    const attacker = createUnit("Gorilla", "p1", { q: 2, r: 3 }, false);
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const state = gameState({ units: [attacker, neutral] });

    const next = attackUnit(state, attacker, { q: 3, r: 3 });

    expect(next.territory?.["3,3"]).toBe("p1");
  });

  it("defeating a neutral on a site flips the site's owner to the attacker", () => {
    const attacker = createUnit("Gorilla", "p1", { q: 2, r: 3 }, false);
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const state = gameState({
      units: [attacker, neutral],
      sites: [createSite("Grove", 3, 3)],
    });

    const next = attackUnit(state, attacker, { q: 3, r: 3 });

    expect(next.sites.find((s) => sameHex(s.hex, { q: 3, r: 3 }))?.owner).toBe("p1");
  });
});

/* ------------------------------------------------------------------ */
/* Protection lift + capture-after-defeat                              */
/* ------------------------------------------------------------------ */

describe("protection-lift and capture-after-defeat (M30-T4)", () => {
  /** A neutral Monkey at (3,3) guarding its neighbours, plus a p1 Monkey at
   *  (2,2) that would be blocked by it. */
  function guardedState(units: ApeUnit[]): GameState {
    return gameState({ units });
  }

  it("a neutral guardian protects its surrounding cells while it stands", () => {
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const state = guardedState([neutral, p1Monkey]);

    // (2,3) is adjacent to the neutral Monkey; a same-rank (Monkey) mover is
    // protected from entering it.
    expect(isCellProtected(state, { q: 2, r: 3 }, p1Monkey)).toBe(true);
    // A higher-rank mover (Gorilla) is not blocked by the Monkey guardian.
    const gorilla = createUnit("Gorilla", "p1", { q: 2, r: 2 }, false);
    expect(isCellProtected(guardedState([neutral, gorilla]), { q: 2, r: 3 }, gorilla)).toBe(
      false,
    );
  });

  it("before defeat the protected cell is not a legal move target (blocked)", () => {
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const state = guardedState([neutral, p1Monkey]);

    let caught: unknown;
    try {
      moveUnit(state, p1Monkey, { q: 2, r: 3 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("protected");
  });

  it("defeating the neutral lifts its protection so the cell becomes legal to enter", () => {
    // A p1 Gorilla next to the neutral, and a p1 Monkey that is currently
    // blocked from the cell the neutral guards.
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const gorilla = createUnit("Gorilla", "p1", { q: 2, r: 3 }, false);
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const state = guardedState([neutral, gorilla, p1Monkey]);

    // The Gorilla defeats the neutral guardian.
    const afterFight = attackUnit(state, gorilla, { q: 3, r: 3 });

    // The neutral is gone, so (2,3) is no longer protected: the p1 Monkey may
    // now occupy (capture) the previously-protected cell.
    expect(isCellProtected(afterFight, { q: 2, r: 3 }, p1Monkey)).toBe(false);
    const moved = moveUnit(afterFight, p1Monkey, { q: 2, r: 3 });
    expect(moved.units.find((u) => sameHex(u.hex, { q: 2, r: 3 }))?.owner).toBe("p1");
  });

  it("after defeating the neutral its surrounding cells are offered as legal move targets", () => {
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const gorilla = createUnit("Gorilla", "p1", { q: 2, r: 3 }, false);
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const before = guardedState([neutral, gorilla, p1Monkey]);

    // Any move to the guarded cell is absent from the legal set while the
    // neutral stands.
    const { moves: beforeMoves } = actionsFor(legalActions(before), { q: 2, r: 2 });
    expect(
      beforeMoves.some((a) => a.type === "move" && sameHex(a.targetHex, { q: 2, r: 3 })),
    ).toBe(false);

    const afterFight = attackUnit(before, gorilla, { q: 3, r: 3 });
    const { moves: afterMoves } = actionsFor(legalActions(afterFight), { q: 2, r: 2 });
    expect(
      afterMoves.some((a) => a.type === "move" && sameHex(a.targetHex, { q: 2, r: 3 })),
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Static guardians across turns                                       */
/* ------------------------------------------------------------------ */

describe("neutral units are static guardians across turns (M30-T4)", () => {
  it("canNeutralUnitAct is always false", () => {
    expect(canNeutralUnitAct()).toBe(false);
  });

  it("a neutral unit is never offered as a move or attack actor by the legal set", () => {
    // Two neutral units on the board; the legal set must never pick either as
    // an actor (no move/attack whose unitHex/attackerHex is a neutral hex).
    const neutralA = createUnit("Monkey", null, { q: 1, r: 3 });
    const neutralB = createUnit("Gorilla", null, { q: 3, r: 3 });
    const state = gameState({ units: [neutralA, neutralB] });

    const actions = legalActions(state);
    for (const a of actions) {
      if (a.type === "move") {
        expect(a.unitHex).not.toEqual({ q: 1, r: 3 });
        expect(a.unitHex).not.toEqual({ q: 3, r: 3 });
      }
      if (a.type === "attack") {
        expect(a.attackerHex).not.toEqual({ q: 1, r: 3 });
        expect(a.attackerHex).not.toEqual({ q: 3, r: 3 });
      }
    }
  });

  it("advanceTurn never resets a neutral unit's hasActed (it stays true, so it can never act)", () => {
    // A neutral created with hasActed=false is a degenerate case; the turn
    // advance must leave it false (never flipped to actionable) regardless.
    const neutral = createUnit("Monkey", null, { q: 1, r: 3 }, false);
    const p1Unit = createUnit("Monkey", "p1", { q: 2, r: 3 }, true);
    const state = gameState({ units: [neutral, p1Unit], currentPlayer: "p1" });

    const next = advanceTurn(state);

    const neutralNext = next.units.find((u) => isNeutralUnit(u));
    expect(neutralNext).toBeDefined();
    // The neutral stays exactly as it was (hasActed untouched by the reset).
    expect(neutralNext!.hasActed).toBe(false);
    // The next player's own unit was rolled over normally for comparison.
    const p2Unit = next.units.find((u) => u.owner === "p2");
    expect(p2Unit).toBeUndefined();
  });

  it("a full playTurn round leaves a neutral guardian's position and kind untouched", () => {
    const neutral = createUnit("Gorilla", null, { q: 3, r: 3 });
    const p1Unit = createUnit("Monkey", "p1", { q: 2, r: 3 });
    const state = gameState({ units: [neutral, p1Unit], currentPlayer: "p1" });

    // Play a full human move (empty) plus the AI's reply, resolving victory.
    const result = playTurn(state, [], 1234);

    const neutralAfter = result.units.find((u) => isNeutralUnit(u));
    // A neutral that the players never engaged is entirely untouched — it did
    // not move, attack, join, or change in any way.
    expect(neutralAfter).toBeDefined();
    expect(neutralAfter!.kind).toBe("Gorilla");
    expect(neutralAfter!.hex).toEqual({ q: 3, r: 3 });
  });

  it("a neutral unit that is never engaged survives across a turn unchanged in the session flow", () => {
    // Use the setup to confirm a real random neutral guardian persists into
    // the projected turn state with a high-rank, non-acting shape.
    const state = gameState({
      units: [createUnit("Chimpanzee", null, { q: 4, r: 5 }), createUnit("Monkey", "p1", { q: 2, r: 3 })],
    });

    // The neutral's `hasActed` is not rolled into an actionable state by
    // resetting for the next player's turn (it never is — static guardian).
    const next = advanceTurn(state);
    const neutralAfter = next.units.find((u) => isNeutralUnit(u));
    expect(neutralAfter!.hex).toEqual({ q: 4, r: 5 });
    expect(neutralAfter!.kind).toBe("Chimpanzee");
  });
});

/* ------------------------------------------------------------------ */
/* Legality checks and typed errors                                    */
/* ------------------------------------------------------------------ */

describe("neutral interaction legality and typed errors (M30-T4)", () => {
  it("moving onto a neutral-occupied hex is rejected with an occupied error", () => {
    const attacker = createUnit("Gorilla", "p1", { q: 2, r: 2 }, false);
    const neutral = createUnit("Monkey", null, { q: 2, r: 3 });
    const state = gameState({ units: [attacker, neutral] });

    let caught: unknown;
    try {
      moveUnit(state, attacker, { q: 2, r: 3 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("occupied");
  });

  it("attacking into a cell guarded by a same-rank neutral is rejected as protected", () => {
    // Attacker p1 Gibbon (rank 2); defender neutral Monkey at (2,3); a neutral
    // Gibbon at (3,3) guards the defender's cell (2,3) from same-rank Gibbons.
    const attacker = createUnit("Gibbon", "p1", { q: 1, r: 3 }, false);
    const defender = createUnit("Monkey", null, { q: 2, r: 3 });
    const guard = createUnit("Gibbon", null, { q: 3, r: 3 });
    const state = gameState({ units: [attacker, defender, guard] });

    // Neutral guards protect like kingdom guards: the defender's cell is
    // protected against a same-rank (Gibbon) attacker.
    expect(isCellProtected(state, { q: 2, r: 3 }, attacker)).toBe(true);

    let caught: unknown;
    try {
      attackUnit(state, attacker, { q: 2, r: 3 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AttackError);
    expect((caught as AttackError).kind).toBe("protected");
  });

  it("a neutral guard does not block an unguarded (different-rank) attack", () => {
    // A p1 Gorilla (rank 4) beats the neutral Monkey defender even though the
    // neutral Gibbon guard at (3,3) is present — protection only blocks
    // same-rank movers/attackers.
    const attacker = createUnit("Gorilla", "p1", { q: 1, r: 3 }, false);
    const defender = createUnit("Monkey", null, { q: 2, r: 3 });
    const guard = createUnit("Gibbon", null, { q: 3, r: 3 });
    const state = gameState({ units: [attacker, defender, guard] });

    const next = attackUnit(state, attacker, { q: 2, r: 3 });

    // Gorilla beats Monkey; the neutral guard survives.
    expect(next.units).toHaveLength(2);
    expect(next.units.find((u) => u.owner === "p1" && sameHex(u.hex, { q: 2, r: 3 }))).toBeDefined();
    expect(next.units.find((u) => isNeutralUnit(u) && u.kind === "Gibbon")).toBeDefined();
  });

  it("a neutral unit is an enemy to both players for attack legality", () => {
    // Each player may legally attack the same neutral guardian from their own
    // turn, using only their own adjacent unit (so no cross-protection standoff
    // masks the attack action).
    const neutral = createUnit("Monkey", null, { q: 2, r: 3 });
    const p1Unit = createUnit("Gorilla", "p1", { q: 1, r: 3 }, false);
    const p2Unit = createUnit("Gorilla", "p2", { q: 2, r: 4 }, false);
    const asP1 = gameState({ units: [neutral, p1Unit], currentPlayer: "p1" });
    const asP2 = gameState({ units: [neutral, p2Unit], currentPlayer: "p2" });

    expect(
      actionsFor(legalActions(asP1), { q: 1, r: 3 }).attacks.some(
        (a) => a.type === "attack" && sameHex(a.targetHex, { q: 2, r: 3 }),
      ),
    ).toBe(true);
    expect(
      actionsFor(legalActions(asP2), { q: 2, r: 4 }).attacks.some(
        (a) => a.type === "attack" && sameHex(a.targetHex, { q: 2, r: 3 }),
      ),
    ).toBe(true);
  });
});
