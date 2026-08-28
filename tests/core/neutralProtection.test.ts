/**
 * Core tests for the neutral-unit protection rule (M30-T3, #235).
 *
 * "Neutral unit protection rule" gives each neutral unit a protection effect
 * over the cells surrounding it: those cells become protected so opposing
 * (player-owned) units cannot enter or attack into them. It reuses the
 * existing Protection / Safety Zones mechanic (`isCellProtected`) so that
 * neutral-owned protection works exactly like the established kingdom
 * protections — a neutral unit protects its adjacent cells from *any* player
 * mover/attacker of the same rank, since a neutral unit (owner `null`) is an
 * enemy to every player.
 *
 * This slice is orthogonal to the neutral-unit data model (M30-T1 #219) and
 * placement (M30-T2 #225), and purely extends the core protection rule — no UI.
 *
 * Geometry: all used hexes sit on land of the default
 * `generateMap({ width: 7, height: 7, seed: 0 })` board — (1,2), (1,3), (2,2),
 * (2,3), (3,2), (3,3), (4,1) are all land, so terrain/occupied checks never
 * mask the protection under test.
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
} from "../../src/core/game";
import { legalActions } from "../../src/core/ai";

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

/* ------------------------------------------------------------------ */
/* A neutral unit protects the cells surrounding it                    */
/* ------------------------------------------------------------------ */

describe("neutral unit protection rule — protect cases (M30-T3)", () => {
  it("a neutral Monkey protects its adjacent cells from a player's same-rank Monkey", () => {
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const state = gameState({ units: [neutral, p1Monkey] });

    // (3,2) and (2,3) are both adjacent to the neutral — protected from a
    // player's Monkey (an enemy to every player).
    expect(isCellProtected(state, { q: 3, r: 2 }, p1Monkey)).toBe(true);
    expect(isCellProtected(state, { q: 2, r: 3 }, p1Monkey)).toBe(true);
    // A cell not adjacent to the neutral (1,2) is not protected.
    expect(isCellProtected(state, { q: 1, r: 2 }, p1Monkey)).toBe(false);
  });

  it.each(["Gibbon", "Chimpanzee", "Gorilla"])(
    "a neutral %s protects its adjacent cells from a player's same-rank unit",
    (kind) => {
      const neutral = createUnit(kind as ApeUnit["kind"], null, { q: 3, r: 3 });
      const mover = createUnit(kind as ApeUnit["kind"], "p1", { q: 2, r: 2 }, false);
      const state = gameState({ units: [neutral, mover] });

      expect(isCellProtected(state, { q: 3, r: 2 }, mover)).toBe(true);
    },
  );

  it("a neutral unit protects from a player of either kingdom (enemy to all)", () => {
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const p2Monkey = createUnit("Monkey", "p2", { q: 2, r: 4 }, false);
    const asP1 = gameState({ units: [neutral, p1Monkey], currentPlayer: "p1" });
    const asP2 = gameState({ units: [neutral, p2Monkey], currentPlayer: "p2" });

    expect(isCellProtected(asP1, { q: 3, r: 2 }, p1Monkey)).toBe(true);
    expect(isCellProtected(asP2, { q: 3, r: 2 }, p2Monkey)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* A neutral unit does NOT over-block in unintended ways                */
/* ------------------------------------------------------------------ */

describe("neutral unit protection rule — does not over-block (M30-T3)", () => {
  it("a neutral unit does not block a higher- or lower-ranked player mover", () => {
    const neutralGorilla = createUnit("Gorilla", null, { q: 3, r: 3 });
    // A p1 Monkey (rank 1) is not the same rank as a Gorilla (rank 4) — not blocked.
    expect(
      isCellProtected(
        gameState({ units: [neutralGorilla] }),
        { q: 3, r: 2 },
        createUnit("Monkey", "p1", { q: 2, r: 2 }, false),
      ),
    ).toBe(false);

    const neutralMonkey = createUnit("Monkey", null, { q: 3, r: 3 });
    // A p1 Gorilla (rank 4) is not the same rank as a Monkey (rank 1) — not blocked.
    expect(
      isCellProtected(
        gameState({ units: [neutralMonkey] }),
        { q: 3, r: 2 },
        createUnit("Gorilla", "p1", { q: 2, r: 2 }, false),
      ),
    ).toBe(false);
  });

  it("a neutral unit protects only its surrounding cells, never its own hex", () => {
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const state = gameState({ units: [neutral, p1Monkey] });

    // The neutral's own hex is not one of the cells it protects.
    expect(isCellProtected(state, { q: 3, r: 3 }, p1Monkey)).toBe(false);
  });

  it("a neutral does not protect a cell that is occupied by another unit already", () => {
    // Protection concerns entry; isCellProtected looks at adjacency only and the
    // mere presence of a neutral next to an occupied defender cell is what the
    // guard does — but a neutral same-rank guard must still block an entering
    // mover even when another unit already stands there, exactly like a kingdom
    // guard (the Defender's protected cell is a valid guard target).
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const neutral2 = createUnit("Gorilla", null, { q: 2, r: 3 });
    const state = gameState({ units: [neutral, neutral2, p1Monkey] });

    // The p1 Monkey is still blocked from the cell the same-rank neutral guards,
    // regardless of the gorilla already standing there.
    expect(isCellProtected(state, { q: 2, r: 3 }, p1Monkey)).toBe(true);
  });

  it("two same-rank neutral guardians both protect their surrounding cells", () => {
    const n1 = createUnit("Monkey", null, { q: 1, r: 3 });
    const n2 = createUnit("Monkey", null, { q: 3, r: 3 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 5, r: 2 }, false);
    const state = gameState({ units: [n1, n2, p1Monkey] });

    // (2,3) is adjacent to both guardians — protected.
    expect(isCellProtected(state, { q: 2, r: 3 }, p1Monkey)).toBe(true);
    // (3,2) is adjacent to n2 (3,3) — protected even though n1 is far away.
    expect(isCellProtected(state, { q: 3, r: 2 }, p1Monkey)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Enforced by core legality checks (typed errors)                     */
/* ------------------------------------------------------------------ */

describe("neutral protection is enforced by core legality checks (M30-T3)", () => {
  it("rejects a move into a cell protected by a neutral unit with a typed MoveError", () => {
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const state = gameState({ units: [neutral, p1Monkey] });

    let caught: unknown;
    try {
      moveUnit(state, p1Monkey, { q: 3, r: 2 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("protected");
  });

  it("rejects an attack into a cell protected by a neutral unit with a typed AttackError", () => {
    const guard = createUnit("Gibbon", null, { q: 3, r: 3 });
    const defender = createUnit("Monkey", null, { q: 2, r: 3 });
    const attacker = createUnit("Gibbon", "p1", { q: 1, r: 3 }, false);
    const state = gameState({ units: [guard, defender, attacker] });

    let caught: unknown;
    try {
      attackUnit(state, attacker, { q: 2, r: 3 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AttackError);
    expect((caught as AttackError).kind).toBe("protected");
  });

  it("a guarded move target is absent from the AI legal set while the neutral stands", () => {
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const state = gameState({ units: [neutral, p1Monkey] });

    const moves = legalActions(state).filter(
      (a) => a.type === "move" && sameHex(a.unitHex, { q: 2, r: 2 }),
    );
    expect(
      moves.some((a) => a.type === "move" && sameHex(a.targetHex, { q: 3, r: 2 })),
    ).toBe(false);
  });

  it("an unguarded higher-rank attack into the neutral's hex is still legal", () => {
    const neutral = createUnit("Monkey", null, { q: 3, r: 2 });
    const attacker = createUnit("Gorilla", "p1", { q: 2, r: 2 }, false);
    const state = gameState({ units: [neutral, attacker] });

    // No same-rank guard blocks a Gorilla; it may attack the neutral's hex.
    const attacks = legalActions(state).filter(
      (a) => a.type === "attack" && sameHex(a.attackerHex, { q: 2, r: 2 }),
    );
    expect(
      attacks.some((a) => a.type === "attack" && sameHex(a.targetHex, { q: 3, r: 2 })),
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Co-existing kingdom protection still works                           */
/* ------------------------------------------------------------------ */

describe("co-existing kingdom and neutral protection (M30-T3, no regression)", () => {
  it("kingdom-owned protection still works alongside a neutral guardian", () => {
    // A p2 Monkey (kingdom) and a neutral Monkey both protect cells around
    // them. A p1 Monkey is blocked by either of them independently.
    const p2Guard = createUnit("Monkey", "p2", { q: 5, r: 2 });
    const neutral = createUnit("Monkey", null, { q: 3, r: 3 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const state = gameState({ units: [p2Guard, neutral, p1Monkey] });

    // (5,1)-area cells protected by the p2 kingdom guard and (3,2)-area cells
    // protected by the neutral are both enforced for the same mover.
    expect(isCellProtected(state, { q: 3, r: 2 }, p1Monkey)).toBe(true); // neutral
    expect(isCellProtected(state, { q: 4, r: 2 }, p1Monkey)).toBe(true); // p2 kingdom
    // A cell adjacent to neither guard is not protected.
    expect(isCellProtected(state, { q: 1, r: 2 }, p1Monkey)).toBe(false);
  });

  it("moving into a cell protected by a kingdom guard is still rejected (no regression)", () => {
    const p2Guard = createUnit("Monkey", "p2", { q: 5, r: 2 });
    const p1Monkey = createUnit("Monkey", "p1", { q: 4, r: 1 }, false);
    const state = gameState({ units: [p2Guard, p1Monkey] });

    let caught: unknown;
    try {
      moveUnit(state, p1Monkey, { q: 5, r: 1 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("protected");
  });

  it("a neutral Home Tree still protects no one (no regression to the #195 rule)", () => {
    const tree = createSite("HomeTree", 3, 3); // owner null → neutral
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const state = gameState({ sites: [tree], units: [p1Monkey] });

    // A neutral Home Tree protects no cells, exactly as before #235.
    expect(isCellProtected(state, { q: 3, r: 2 }, p1Monkey)).toBe(false);
  });

  it("a kingdom Home Tree still protects its surrounding cells (no regression)", () => {
    const tree = createSite("HomeTree", 3, 3, "p2");
    const p1Monkey = createUnit("Monkey", "p1", { q: 2, r: 2 }, false);
    const state = gameState({ sites: [tree], units: [p1Monkey] });

    expect(isCellProtected(state, { q: 3, r: 2 }, p1Monkey)).toBe(true);
  });
});
