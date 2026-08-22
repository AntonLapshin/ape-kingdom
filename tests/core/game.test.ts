import { describe, it, expect } from "vitest";
import type { Site, Player, GameState, ApeUnit, ApeKind } from "../../src/core/game";
import {
  APE_TYPES,
  APE_KINDS,
  SITE_TYPES,
  SITE_KINDS,
  apeType,
  siteType,
  rankOf,
  costOf,
  movementOf,
  incomeOf,
  allowsRecruitment,
  createUnit,
  createSite,
  createPlayer,
  startingForce,
  incomeFor,
  collectIncome,
  sameHex,
  adjacentHexes,
  areAdjacent,
  recruitUnit,
  RecruitError,
  hexDistance,
  moveUnit,
  MoveError,
  attackUnit,
  AttackError,
  isEliminated,
  eliminatePlayers,
  checkVictory,
  resolveVictory,
} from "../../src/core/game";

describe("ape unit static tables (Ape Units table)", () => {
  it("defines all four ape kinds in ascending rank order", () => {
    expect(APE_KINDS).toEqual(["Monkey", "Gibbon", "Chimpanzee", "Gorilla"]);
  });

  it("assigns rank, cost, and movement per the rules", () => {
    expect(APE_TYPES.Monkey).toEqual({ kind: "Monkey", rank: 1, cost: 2, movement: 1 });
    expect(APE_TYPES.Gibbon).toEqual({ kind: "Gibbon", rank: 2, cost: 4, movement: 1 });
    expect(APE_TYPES.Chimpanzee).toEqual({ kind: "Chimpanzee", rank: 3, cost: 8, movement: 1 });
    expect(APE_TYPES.Gorilla).toEqual({ kind: "Gorilla", rank: 4, cost: 16, movement: 1 });
  });

  it("exposes apeType lookup for every kind", () => {
    for (const kind of APE_KINDS) {
      expect(apeType(kind)).toBe(APE_TYPES[kind]);
    }
  });

  it("returns rank via rankOf", () => {
    expect(rankOf("Monkey")).toBe(1);
    expect(rankOf("Gibbon")).toBe(2);
    expect(rankOf("Chimpanzee")).toBe(3);
    expect(rankOf("Gorilla")).toBe(4);
  });

  it("returns cost via costOf", () => {
    expect(costOf("Monkey")).toBe(2);
    expect(costOf("Gorilla")).toBe(16);
  });

  it("returns movement via movementOf (standard 1 hex)", () => {
    expect(movementOf("Monkey")).toBe(1);
    expect(movementOf("Chimpanzee")).toBe(1);
  });
});

describe("site static tables (Sites & Income table)", () => {
  it("defines all three site kinds", () => {
    expect(SITE_KINDS).toEqual(["Grove", "Nest", "HomeTree"]);
  });

  it("assigns income and recruitment per the rules", () => {
    expect(SITE_TYPES.Grove).toEqual({ kind: "Grove", income: 1, allowsRecruitment: false });
    expect(SITE_TYPES.Nest).toEqual({ kind: "Nest", income: 2, allowsRecruitment: false });
    expect(SITE_TYPES.HomeTree).toEqual({
      kind: "HomeTree",
      income: 3,
      allowsRecruitment: true,
    });
  });

  it("exposes siteType lookup for every kind", () => {
    for (const kind of SITE_KINDS) {
      expect(siteType(kind)).toBe(SITE_TYPES[kind]);
    }
  });

  it("returns income via incomeOf", () => {
    expect(incomeOf("Grove")).toBe(1);
    expect(incomeOf("Nest")).toBe(2);
    expect(incomeOf("HomeTree")).toBe(3);
  });

  it("returns recruitment allowance via allowsRecruitment", () => {
    expect(allowsRecruitment("Grove")).toBe(false);
    expect(allowsRecruitment("Nest")).toBe(false);
    expect(allowsRecruitment("HomeTree")).toBe(true);
  });
});

describe("unit creation", () => {
  it("creates a unit at a hex that has already acted by default", () => {
    const unit = createUnit("Monkey", "p1", { q: 1, r: 2 });
    expect(unit).toEqual({
      kind: "Monkey",
      owner: "p1",
      hex: { q: 1, r: 2 },
      hasActed: true,
    });
  });

  it("creates a unit that can act when hasActed is false", () => {
    const unit = createUnit("Gorilla", "p2", { q: 0, r: 0 }, false);
    expect(unit.kind).toBe("Gorilla");
    expect(unit.owner).toBe("p2");
    expect(unit.hex).toEqual({ q: 0, r: 0 });
    expect(unit.hasActed).toBe(false);
  });
});

describe("site creation", () => {
  it("creates a neutral site on a hex by default", () => {
    const site = createSite("Grove", 1, 2);
    expect(site.kind).toBe("Grove");
    expect(site.hex).toEqual({ q: 1, r: 2 });
    expect(site.owner).toBeNull();
  });

  it("creates a controlled site when an owner is provided", () => {
    const site = createSite("HomeTree", 0, 0, "p1");
    expect(site.owner).toBe("p1");
  });
});

describe("player creation", () => {
  it("creates a player with a default zero banana balance, not eliminated", () => {
    expect(createPlayer("p1")).toEqual({ id: "p1", bananas: 0, eliminated: false });
  });

  it("creates a player with an explicit banana balance, not eliminated", () => {
    expect(createPlayer("p2", 5)).toEqual({ id: "p2", bananas: 5, eliminated: false });
  });
});

describe("standard setup (Setup section)", () => {
  it("gives each player 3 Monkeys, 1 Gibbon, and 2 bananas", () => {
    const force = startingForce("p1", { q: 0, r: 0 });
    expect(force.units).toHaveLength(4);
    expect(force.units.filter((u) => u.kind === "Monkey")).toHaveLength(3);
    expect(force.units.filter((u) => u.kind === "Gibbon")).toHaveLength(1);
    expect(force.units.every((u) => u.owner === "p1")).toBe(true);
    expect(force.player).toEqual({ id: "p1", bananas: 2, eliminated: false });
  });

  it("places the starting units at distinct hexes around the origin", () => {
    const force = startingForce("p1", { q: 0, r: 0 });
    const hexes = force.units.map((u) => u.hex);
    // Each unit is on a distinct hex (one unit per hex).
    expect(new Set(hexes.map((h) => `${h.q},${h.r}`)).size).toBe(4);
    // One unit sits on the origin and the rest on adjacent hexes.
    expect(force.units.some((u) => sameHex(u.hex, { q: 0, r: 0 }))).toBe(true);
    for (const hex of hexes) {
      expect(sameHex(hex, { q: 0, r: 0 }) || areAdjacent(hex, { q: 0, r: 0 })).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Hex helpers                                                         */
/* ------------------------------------------------------------------ */

describe("sameHex", () => {
  it("returns true for equal hexes", () => {
    expect(sameHex({ q: 1, r: 2 }, { q: 1, r: 2 })).toBe(true);
  });

  it("returns false for different hexes", () => {
    expect(sameHex({ q: 1, r: 2 }, { q: 2, r: 2 })).toBe(false);
    expect(sameHex({ q: 1, r: 2 }, { q: 1, r: 3 })).toBe(false);
  });
});

describe("adjacentHexes", () => {
  it("returns the six axial neighbours of a hex", () => {
    const neighbours = adjacentHexes({ q: 0, r: 0 });
    expect(neighbours).toHaveLength(6);
    expect(neighbours).toContainEqual({ q: 1, r: 0 });
    expect(neighbours).toContainEqual({ q: -1, r: 0 });
    expect(neighbours).toContainEqual({ q: 0, r: 1 });
    expect(neighbours).toContainEqual({ q: 0, r: -1 });
    expect(neighbours).toContainEqual({ q: 1, r: -1 });
    expect(neighbours).toContainEqual({ q: -1, r: 1 });
  });

  it("does not include the origin hex itself", () => {
    expect(adjacentHexes({ q: 0, r: 0 })).not.toContainEqual({ q: 0, r: 0 });
  });
});

describe("areAdjacent", () => {
  it("returns true for neighbours", () => {
    expect(areAdjacent({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(true);
    expect(areAdjacent({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(true);
  });

  it("returns false for the same hex and non-adjacent hexes", () => {
    expect(areAdjacent({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(false);
    expect(areAdjacent({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Collect income (Turn Sequence step A)                                */
/* ------------------------------------------------------------------ */

/** Build a minimal game state for reducer tests. */
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

describe("incomeFor", () => {
  it("sums income from all sites controlled by the player", () => {
    const sites = [
      createSite("Grove", 0, 0, "p1"),
      createSite("Nest", 1, 0, "p1"),
      createSite("HomeTree", 2, 0, "p1"),
    ];
    expect(incomeFor("p1", sites)).toBe(1 + 2 + 3);
  });

  it("ignores sites owned by other players", () => {
    const sites = [
      createSite("Nest", 0, 0, "p2"),
      createSite("HomeTree", 1, 0, "p2"),
    ];
    expect(incomeFor("p1", sites)).toBe(0);
  });

  it("ignores neutral sites (owner null)", () => {
    const sites = [createSite("Grove", 0, 0), createSite("Nest", 1, 0, null)];
    expect(incomeFor("p1", sites)).toBe(0);
  });

  it("returns 0 when the player controls no sites", () => {
    expect(incomeFor("p1", [])).toBe(0);
  });
});

describe("collectIncome", () => {
  it("credits the current player with the income of every controlled site", () => {
    const state = gameState({
      sites: [
        createSite("Grove", 0, 0, "p1"),
        createSite("Nest", 1, 0, "p1"),
        createSite("HomeTree", 2, 0, "p1"),
        createSite("Grove", 3, 0, "p2"),
        createSite("Nest", 4, 0), // neutral
      ],
      players: { p1: createPlayer("p1", 5), p2: createPlayer("p2", 0) },
    });
    const next = collectIncome(state);
    // p1 controls Grove(1)+Nest(2)+HomeTree(3) = 6; starts with 5.
    expect(next.players.p1.bananas).toBe(5 + 6);
    // p2's balance is untouched.
    expect(next.players.p2.bananas).toBe(0);
  });

  it("adds income to the current player's existing balance (may save without limit)", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      players: { p1: createPlayer("p1", 100), p2: createPlayer("p2", 0) },
    });
    expect(collectIncome(state).players.p1.bananas).toBe(103);
  });

  it("adds no bananas when the current player controls no sites", () => {
    const state = gameState({
      sites: [createSite("Grove", 0, 0, "p2"), createSite("Nest", 1, 0)],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    expect(collectIncome(state).players.p1.bananas).toBe(2);
  });

  it("returns a new GameState and does not mutate the input", () => {
    const state = gameState({
      sites: [createSite("Nest", 0, 0, "p1")],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
    });
    const next = collectIncome(state);
    expect(next).not.toBe(state);
    expect(next.players).not.toBe(state.players);
    expect(next.players.p1).not.toBe(state.players.p1);
    // Input is unchanged.
    expect(state.players.p1.bananas).toBe(0);
    expect(state.sites).toEqual([createSite("Nest", 0, 0, "p1")]);
  });
});

/* ------------------------------------------------------------------ */
/* Recruit apes (Turn Sequence step B)                                 */
/* ------------------------------------------------------------------ */

describe("recruitUnit", () => {
  /** A controlled Home Tree at (0,0) for p1, with bananas to spend. */
  function recruitState(bananas = 20, units: ApeUnit[] = []): GameState {
    return gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      units,
      players: { p1: createPlayer("p1", bananas), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
  }

  it("recruits an ape on an empty controlled Home Tree hex and deducts the cost", () => {
    const state = recruitState(10);
    const next = recruitUnit(state, "Monkey", { q: 0, r: 0 });
    expect(next.players.p1.bananas).toBe(10 - 2);
    expect(next.units).toHaveLength(1);
    expect(next.units[0]).toEqual({
      kind: "Monkey",
      owner: "p1",
      hex: { q: 0, r: 0 },
      hasActed: true,
    });
  });

  it("recruits an ape on an adjacent empty hex", () => {
    const state = recruitState(10);
    const next = recruitUnit(state, "Gibbon", { q: 1, r: 0 });
    expect(next.players.p1.bananas).toBe(10 - 4);
    expect(next.units[0].hex).toEqual({ q: 1, r: 0 });
  });

  it("deducts the correct cost for each ape kind", () => {
    const cases: Array<[ApeKind, number]> = [
      ["Monkey", 2],
      ["Gibbon", 4],
      ["Chimpanzee", 8],
      ["Gorilla", 16],
    ];
    for (const [kind, cost] of cases) {
      const next = recruitUnit(recruitState(100), kind, { q: 0, r: 0 });
      expect(next.players.p1.bananas).toBe(100 - cost);
    }
  });

  it("marks newly recruited apes as hasActed so they cannot act this turn", () => {
    const next = recruitUnit(recruitState(10), "Monkey", { q: 0, r: 0 });
    expect(next.units[0].hasActed).toBe(true);
  });

  it("keeps existing units and other players untouched", () => {
    const existing = createUnit("Monkey", "p2", { q: 5, r: 5 });
    const state = recruitState(10, [existing]);
    const next = recruitUnit(state, "Monkey", { q: 0, r: 0 });
    expect(next.units).toHaveLength(2);
    expect(next.units).toContainEqual(existing);
    expect(next.players.p2.bananas).toBe(0);
  });

  it("rejects with a typed error when the player cannot afford the ape", () => {
    const state = recruitState(1); // Monkey costs 2
    expect(() => recruitUnit(state, "Monkey", { q: 0, r: 0 })).toThrowError(
      RecruitError,
    );
    let caught: unknown;
    try {
      recruitUnit(state, "Monkey", { q: 0, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(RecruitError);
    expect((caught as RecruitError).kind).toBe("cannot-afford");
  });

  it("rejects when the target hex is not a controlled Home Tree or adjacent", () => {
    // Far from the controlled Home Tree.
    const state = recruitState(20);
    expect(() => recruitUnit(state, "Monkey", { q: 5, r: 5 })).toThrowError(
      RecruitError,
    );
    let caught: unknown;
    try {
      recruitUnit(state, "Monkey", { q: 5, r: 5 });
    } catch (e) {
      caught = e;
    }
    expect((caught as RecruitError).kind).toBe("no-home-tree");
  });

  it("rejects when the only nearby Home Tree is controlled by another player", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p2")],
      players: { p1: createPlayer("p1", 20), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    expect(() => recruitUnit(state, "Monkey", { q: 0, r: 0 })).toThrowError(
      RecruitError,
    );
  });

  it("rejects when the only nearby Home Tree is neutral", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0)],
      players: { p1: createPlayer("p1", 20), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    expect(() => recruitUnit(state, "Monkey", { q: 0, r: 0 })).toThrowError(
      RecruitError,
    );
  });

  it("rejects when the target hex is occupied by a unit", () => {
    const occupied = createUnit("Monkey", "p1", { q: 0, r: 0 });
    const state = recruitState(20, [occupied]);
    expect(() => recruitUnit(state, "Monkey", { q: 0, r: 0 })).toThrowError(
      RecruitError,
    );
    let caught: unknown;
    try {
      recruitUnit(state, "Gorilla", { q: 0, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect((caught as RecruitError).kind).toBe("occupied");
  });

  it("rejects when an adjacent hex is occupied", () => {
    const occupied = createUnit("Monkey", "p1", { q: 1, r: 0 });
    const state = recruitState(20, [occupied]);
    expect(() => recruitUnit(state, "Monkey", { q: 1, r: 0 })).toThrowError(
      RecruitError,
    );
  });

  it("does not mutate the input state", () => {
    const state = recruitState(10);
    const next = recruitUnit(state, "Monkey", { q: 0, r: 0 });
    expect(next).not.toBe(state);
    expect(next.players).not.toBe(state.players);
    expect(next.players.p1).not.toBe(state.players.p1);
    expect(next.units).not.toBe(state.units);
    // Input unchanged.
    expect(state.players.p1.bananas).toBe(10);
    expect(state.units).toHaveLength(0);
    expect(state.sites).toEqual([createSite("HomeTree", 0, 0, "p1")]);
  });
});

/* ------------------------------------------------------------------ */
/* Move and capture (Turn Sequence step C — movement part)             */
/* ------------------------------------------------------------------ */

describe("hexDistance", () => {
  it("returns 0 for the same hex", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
  });

  it("returns 1 for adjacent hexes", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(1);
  });

  it("returns the correct distance for distant hexes", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3);
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 2 })).toBe(4);
  });
});

describe("moveUnit", () => {
  /** A p1 unit at (1,0) that has not yet acted, with a neutral Grove at (2,0). */
  function moveState(opts: {
    unit?: ApeUnit;
    units?: ApeUnit[];
    sites?: Site[];
    currentPlayer?: string;
  } = {}): GameState {
    const unit = opts.unit ?? createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    return gameState({
      sites: opts.sites ?? [createSite("Grove", 2, 0)],
      units: opts.units ?? [unit],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: opts.currentPlayer ?? "p1",
    });
  }

  it("moves a unit one hex and marks it as acted", () => {
    const state = moveState();
    const next = moveUnit(state, state.units[0], { q: 2, r: 0 });
    expect(next.units).toHaveLength(1);
    expect(next.units[0].hex).toEqual({ q: 2, r: 0 });
    expect(next.units[0].hasActed).toBe(true);
    expect(next.units[0].kind).toBe("Monkey");
    expect(next.units[0].owner).toBe("p1");
  });

  it("captures an unoccupied site when moving onto it", () => {
    const state = moveState();
    const next = moveUnit(state, state.units[0], { q: 2, r: 0 });
    const captured = next.sites.find((s) => sameHex(s.hex, { q: 2, r: 0 }));
    expect(captured?.owner).toBe("p1");
  });

  it("captures a Grove, Nest, and Home Tree for the moving unit's owner", () => {
    for (const kind of ["Grove", "Nest", "HomeTree"] as const) {
      const state = moveState({ sites: [createSite(kind, 2, 0)] });
      const next = moveUnit(state, state.units[0], { q: 2, r: 0 });
      expect(next.sites.find((s) => sameHex(s.hex, { q: 2, r: 0 }))?.owner).toBe("p1");
    }
  });

  it("does not alter sites that are not the target", () => {
    const state = moveState({
      sites: [createSite("Grove", 2, 0), createSite("Nest", 5, 5)],
    });
    const next = moveUnit(state, state.units[0], { q: 2, r: 0 });
    expect(next.sites.find((s) => sameHex(s.hex, { q: 5, r: 5 }))?.owner).toBeNull();
  });

  it("does not change site ownership when moving onto an empty hex with no site", () => {
    const state = moveState({ sites: [] });
    const next = moveUnit(state, state.units[0], { q: 2, r: 0 });
    expect(next.sites).toEqual([]);
  });

  it("does not capture a site occupied by another unit (move rejected)", () => {
    const mover = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const other = createUnit("Monkey", "p2", { q: 2, r: 0 });
    const state = moveState({
      units: [mover, other],
      sites: [createSite("Grove", 2, 0)],
    });
    expect(() => moveUnit(state, mover, { q: 2, r: 0 })).toThrowError(MoveError);
  });

  it("rejects when the unit has already acted this turn", () => {
    const acted = createUnit("Monkey", "p1", { q: 1, r: 0 }, true);
    const state = moveState({ unit: acted });
    let caught: unknown;
    try {
      moveUnit(state, acted, { q: 2, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("already-acted");
  });

  it("rejects when the unit is not owned by the current player", () => {
    const enemy = createUnit("Monkey", "p2", { q: 1, r: 0 }, false);
    const state = moveState({ unit: enemy });
    expect(() => moveUnit(state, enemy, { q: 2, r: 0 })).toThrowError(MoveError);
    let caught: unknown;
    try {
      moveUnit(state, enemy, { q: 2, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect((caught as MoveError).kind).toBe("already-acted");
  });

  it("rejects when the unit is not present in the state", () => {
    const state = moveState(); // contains a p1 unit at (1,0)
    const ghost = createUnit("Monkey", "p1", { q: 9, r: 9 }, false);
    expect(() => moveUnit(state, ghost, { q: 8, r: 8 })).toThrowError(MoveError);
    let caught: unknown;
    try {
      moveUnit(state, ghost, { q: 8, r: 8 });
    } catch (e) {
      caught = e;
    }
    expect((caught as MoveError).kind).toBe("already-acted");
  });

  it("rejects when the target is beyond the unit's movement value", () => {
    const state = moveState(); // Monkey movement = 1
    let caught: unknown;
    try {
      moveUnit(state, state.units[0], { q: 3, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("out-of-range");
  });

  it("rejects when the target hex is occupied by another unit", () => {
    const mover = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const other = createUnit("Gorilla", "p2", { q: 2, r: 0 });
    const state = moveState({ units: [mover, other] });
    let caught: unknown;
    try {
      moveUnit(state, mover, { q: 2, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("occupied");
  });

  it("keeps other units unchanged when moving one unit", () => {
    const mover = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const other = createUnit("Gibbon", "p1", { q: 5, r: 5 }, false);
    const state = moveState({ units: [mover, other] });
    const next = moveUnit(state, mover, { q: 2, r: 0 });
    expect(next.units).toHaveLength(2);
    // The other unit is untouched.
    expect(next.units.find((u) => sameHex(u.hex, { q: 5, r: 5 }))).toEqual(other);
  });

  it("returns a new GameState and does not mutate the input", () => {
    const state = moveState();
    const next = moveUnit(state, state.units[0], { q: 2, r: 0 });
    expect(next).not.toBe(state);
    expect(next.units).not.toBe(state.units);
    expect(next.sites).not.toBe(state.sites);
    // Input unchanged.
    expect(state.units[0].hex).toEqual({ q: 1, r: 0 });
    expect(state.units[0].hasActed).toBe(false);
    expect(state.sites[0].owner).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Combat (Turn Sequence step C — attack part)                         */
/* ------------------------------------------------------------------ */

describe("attackUnit", () => {
  /** A p1 Monkey at (1,0) that has not yet acted, facing a p2 Monkey at (2,0). */
  function attackState(opts: {
    attacker?: ApeUnit;
    defender?: ApeUnit;
    units?: ApeUnit[];
    sites?: Site[];
    currentPlayer?: string;
  } = {}): GameState {
    const attacker = opts.attacker ?? createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const defender = opts.defender ?? createUnit("Monkey", "p2", { q: 2, r: 0 });
    return gameState({
      sites: opts.sites ?? [],
      units: opts.units ?? [attacker, defender],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: opts.currentPlayer ?? "p1",
    });
  }

  it("destroys the defender and moves the attacker in when the attacker rank is higher", () => {
    const attacker = createUnit("Gorilla", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Monkey", "p2", { q: 2, r: 0 });
    const state = attackState({ attacker, defender });
    const next = attackUnit(state, attacker, { q: 2, r: 0 });
    // Only the attacker remains, now on the defender's hex.
    expect(next.units).toHaveLength(1);
    expect(next.units[0].owner).toBe("p1");
    expect(next.units[0].hex).toEqual({ q: 2, r: 0 });
    expect(next.units[0].hasActed).toBe(true);
  });

  it("destroys both units when ranks are equal", () => {
    const state = attackState(); // Monkey vs Monkey
    const next = attackUnit(state, state.units[0], { q: 2, r: 0 });
    expect(next.units).toHaveLength(0);
  });

  it("destroys the attacker and keeps the defender when the attacker rank is lower", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Gorilla", "p2", { q: 2, r: 0 });
    const state = attackState({ attacker, defender });
    const next = attackUnit(state, attacker, { q: 2, r: 0 });
    expect(next.units).toHaveLength(1);
    expect(next.units[0].owner).toBe("p2");
    expect(next.units[0].hex).toEqual({ q: 2, r: 0 });
  });

  it("marks the attacking unit as acted after the attack", () => {
    const attacker = createUnit("Gibbon", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Monkey", "p2", { q: 2, r: 0 });
    const state = attackState({ attacker, defender });
    const next = attackUnit(state, attacker, { q: 2, r: 0 });
    // Attacker wins and moved in; it must be marked as acted.
    expect(next.units[0].hasActed).toBe(true);
  });

  it("captures the defender's site when the attacker wins", () => {
    const attacker = createUnit("Gorilla", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Monkey", "p2", { q: 2, r: 0 });
    const state = attackState({
      attacker,
      defender,
      sites: [createSite("Grove", 2, 0, "p2")],
    });
    const next = attackUnit(state, attacker, { q: 2, r: 0 });
    expect(next.sites.find((s) => sameHex(s.hex, { q: 2, r: 0 }))?.owner).toBe("p1");
  });

  it("does not change site ownership when both units are destroyed", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Monkey", "p2", { q: 2, r: 0 });
    const state = attackState({
      attacker,
      defender,
      sites: [createSite("Nest", 2, 0, "p2")],
    });
    const next = attackUnit(state, attacker, { q: 2, r: 0 });
    expect(next.sites.find((s) => sameHex(s.hex, { q: 2, r: 0 }))?.owner).toBe("p2");
  });

  it("leaves site ownership unchanged when the attacker is destroyed", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Gorilla", "p2", { q: 2, r: 0 });
    const state = attackState({
      attacker,
      defender,
      sites: [createSite("HomeTree", 2, 0, "p2")],
    });
    const next = attackUnit(state, attacker, { q: 2, r: 0 });
    expect(next.sites.find((s) => sameHex(s.hex, { q: 2, r: 0 }))?.owner).toBe("p2");
  });

  it("keeps other units and sites untouched", () => {
    const attacker = createUnit("Gorilla", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Monkey", "p2", { q: 2, r: 0 });
    const bystander = createUnit("Gibbon", "p1", { q: 5, r: 5 });
    const state = attackState({
      attacker,
      defender,
      units: [attacker, defender, bystander],
      sites: [createSite("Grove", 2, 0, "p2"), createSite("Nest", 7, 7)],
    });
    const next = attackUnit(state, attacker, { q: 2, r: 0 });
    // Bystander survives untouched.
    expect(next.units).toHaveLength(2);
    expect(next.units.find((u) => sameHex(u.hex, { q: 5, r: 5 }))).toEqual(bystander);
    // Unrelated site untouched.
    expect(next.sites.find((s) => sameHex(s.hex, { q: 7, r: 7 }))?.owner).toBeNull();
  });

  it("rejects when the attacker is not owned by the current player", () => {
    const attacker = createUnit("Monkey", "p2", { q: 1, r: 0 }, false);
    const defender = createUnit("Monkey", "p1", { q: 2, r: 0 });
    const state = attackState({ attacker, defender }); // currentPlayer is p1
    let caught: unknown;
    try {
      attackUnit(state, attacker, { q: 2, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AttackError);
    expect((caught as AttackError).kind).toBe("not-owner");
  });

  it("rejects when the attacker is not present in the state", () => {
    const state = attackState();
    const ghost = createUnit("Monkey", "p1", { q: 9, r: 9 }, false);
    let caught: unknown;
    try {
      attackUnit(state, ghost, { q: 8, r: 8 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AttackError);
    expect((caught as AttackError).kind).toBe("not-owner");
  });

  it("rejects when the attacker has already acted this turn", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 0 }, true);
    const defender = createUnit("Monkey", "p2", { q: 2, r: 0 });
    const state = attackState({ attacker, defender });
    let caught: unknown;
    try {
      attackUnit(state, attacker, { q: 2, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AttackError);
    expect((caught as AttackError).kind).toBe("already-acted");
  });

  it("rejects when the target hex is not adjacent to the attacker", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Monkey", "p2", { q: 3, r: 0 });
    const state = attackState({ attacker, defender });
    let caught: unknown;
    try {
      attackUnit(state, attacker, { q: 3, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AttackError);
    expect((caught as AttackError).kind).toBe("not-adjacent");
  });

  it("rejects when there is no unit at the target hex", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const state = attackState({ attacker, units: [attacker] });
    let caught: unknown;
    try {
      attackUnit(state, attacker, { q: 2, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AttackError);
    expect((caught as AttackError).kind).toBe("no-enemy");
  });

  it("rejects when attacking a friendly unit at the target hex", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const friendly = createUnit("Gibbon", "p1", { q: 2, r: 0 });
    const state = attackState({ attacker, units: [attacker, friendly] });
    let caught: unknown;
    try {
      attackUnit(state, attacker, { q: 2, r: 0 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AttackError);
    expect((caught as AttackError).kind).toBe("no-enemy");
  });

  it("returns a new GameState and does not mutate the input", () => {
    const state = attackState();
    const next = attackUnit(state, state.units[0], { q: 2, r: 0 });
    expect(next).not.toBe(state);
    expect(next.units).not.toBe(state.units);
    // Input unchanged.
    expect(state.units).toHaveLength(2);
    expect(state.units[0].hex).toEqual({ q: 1, r: 0 });
    expect(state.units[0].hasActed).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Elimination                                                         */
/* ------------------------------------------------------------------ */

describe("isEliminated", () => {
  it("eliminates a player who controls no Home Tree and has no units", () => {
    expect(isEliminated("p1", [], [])).toBe(true);
  });

  it("does not eliminate a player who controls a Home Tree even with no units", () => {
    const sites = [createSite("HomeTree", 0, 0, "p1")];
    expect(isEliminated("p1", sites, [])).toBe(false);
  });

  it("does not eliminate a player who controls no Home Tree but still has units", () => {
    const units = [createUnit("Monkey", "p1", { q: 1, r: 0 })];
    expect(isEliminated("p1", [], units)).toBe(false);
  });

  it("does not eliminate a player who controls a Home Tree and has units", () => {
    const sites = [createSite("HomeTree", 0, 0, "p1")];
    const units = [createUnit("Monkey", "p1", { q: 1, r: 0 })];
    expect(isEliminated("p1", sites, units)).toBe(false);
  });

  it("ignores non-Home-Tree sites a player controls when deciding elimination", () => {
    // Controlling Groves/Nests without a Home Tree or units still means
    // eliminated (only a Home Tree counts for survival).
    const sites = [createSite("Grove", 0, 0, "p1"), createSite("Nest", 1, 0, "p1")];
    expect(isEliminated("p1", sites, [])).toBe(true);
  });

  it("does not count another player's Home Tree or units", () => {
    const sites = [createSite("HomeTree", 0, 0, "p2")];
    const units = [createUnit("Monkey", "p2", { q: 1, r: 0 })];
    expect(isEliminated("p1", sites, units)).toBe(true);
  });
});

describe("eliminatePlayers", () => {
  it("marks and drops a player who has no Home Tree and no units", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 })],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    const next = eliminatePlayers(state);
    expect(next.players.p1.eliminated).toBe(false);
    expect(next.players.p2.eliminated).toBe(true);
    expect(next.turnOrder).toEqual(["p1"]);
  });

  it("keeps a player with units but no Home Tree in active play", () => {
    const state = gameState({
      units: [
        createUnit("Monkey", "p1", { q: 0, r: 0 }),
        createUnit("Gibbon", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    const next = eliminatePlayers(state);
    // Neither has a Home Tree, but both have units, so neither is eliminated.
    expect(next.players.p1.eliminated).toBe(false);
    expect(next.players.p2.eliminated).toBe(false);
    expect(next.turnOrder).toEqual(["p1", "p2"]);
  });

  it("keeps a player with a Home Tree but no units in active play", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    const next = eliminatePlayers(state);
    expect(next.players.p1.eliminated).toBe(false);
    expect(next.players.p2.eliminated).toBe(true);
    expect(next.turnOrder).toEqual(["p1"]);
  });

  it("handles multiple players: only truly eliminated players are dropped", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1"), createSite("HomeTree", 5, 0, "p2")],
      units: [createUnit("Monkey", "p3", { q: 1, r: 0 })],
      players: {
        p1: createPlayer("p1", 0),
        p2: createPlayer("p2", 0),
        p3: createPlayer("p3", 0),
        p4: createPlayer("p4", 0),
      },
      turnOrder: ["p1", "p2", "p3", "p4"],
    });
    const next = eliminatePlayers(state);
    // p1, p2 control Home Trees; p3 has units; p4 is eliminated.
    expect(next.players.p1.eliminated).toBe(false);
    expect(next.players.p2.eliminated).toBe(false);
    expect(next.players.p3.eliminated).toBe(false);
    expect(next.players.p4.eliminated).toBe(true);
    expect(next.turnOrder).toEqual(["p1", "p2", "p3"]);
  });

  it("preserves banana balances and site/unit ownership for survivors", () => {
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("Grove", 1, 0, "p1"),
        createSite("Nest", 2, 0, "p2"),
      ],
      units: [createUnit("Monkey", "p1", { q: 3, r: 0 })],
      players: { p1: createPlayer("p1", 7), p2: createPlayer("p2", 0) },
    });
    const next = eliminatePlayers(state);
    expect(next.players.p1.bananas).toBe(7);
    expect(next.players.p1.eliminated).toBe(false);
    expect(next.players.p2.eliminated).toBe(true);
    expect(next.players.p2.bananas).toBe(0);
    // Site/unit ownership unchanged.
    expect(next.sites).toEqual(state.sites);
    expect(next.units).toEqual(state.units);
  });

  it("returns a new GameState and does not mutate the input", () => {
    const state = gameState();
    const next = eliminatePlayers(state);
    expect(next).not.toBe(state);
    expect(next.players).not.toBe(state.players);
    expect(next.turnOrder).not.toBe(state.turnOrder);
    // Input unchanged.
    expect(state.players.p1.eliminated).toBe(false);
    expect(state.turnOrder).toEqual(["p1", "p2"]);
  });
});

/* ------------------------------------------------------------------ */
/* Victory detection                                                   */
/* ------------------------------------------------------------------ */

describe("checkVictory", () => {
  it("returns the player who controls every Home Tree on the map", () => {
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0, "p1"),
      ],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 })],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    expect(checkVictory(state)).toBe("p1");
  });

  it("does not declare a winner when no player controls every Home Tree", () => {
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0, "p2"),
      ],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 })],
    });
    expect(checkVictory(state)).toBe(null);
  });

  it("does not declare a winner when there are no Home Trees and multiple players survive", () => {
    // No Home Trees on the map: no player can win by controlling them all,
    // and both players still have units so neither is eliminated.
    const state = gameState({
      sites: [createSite("Grove", 0, 0, "p1"), createSite("Nest", 1, 0, "p2")],
      units: [
        createUnit("Monkey", "p1", { q: 2, r: 0 }),
        createUnit("Gibbon", "p2", { q: 3, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    expect(checkVictory(state)).toBe(null);
  });

  it("returns the sole surviving player not eliminated", () => {
    // p2 controls no Home Tree and has no units → eliminated; p1 survives
    // (has units). p1 does NOT control every Home Tree (one is neutral), so
    // victory is decided by sole survival.
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0), // neutral
      ],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 })],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    expect(checkVictory(state)).toBe("p1");
  });

  it("declares the winner when all other players are eliminated (sole survivor)", () => {
    // p2 has no Home Tree and no units; p3 has no Home Tree and no units;
    // only p1 remains in active play. p1 does not control every Home Tree
    // (one is neutral), so victory is decided by sole survival.
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0), // neutral
      ],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 })],
      players: {
        p1: createPlayer("p1", 2),
        p2: createPlayer("p2", 0),
        p3: createPlayer("p3", 0),
      },
      turnOrder: ["p1", "p2", "p3"],
    });
    expect(checkVictory(state)).toBe("p1");
  });

  it("returns null when more than one player is not eliminated", () => {
    // p1 and p2 both have units (and no Home Tree), so neither is eliminated.
    const state = gameState({
      units: [
        createUnit("Monkey", "p1", { q: 0, r: 0 }),
        createUnit("Gibbon", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    expect(checkVictory(state)).toBe(null);
  });

  it("returns null (draw) when every player is eliminated", () => {
    // No player controls a Home Tree and no player has units, so all
    // players are eliminated and `active.length === 0`. No sole survivor
    // and no Home Tree controller → no winner (draw).
    const state = gameState({
      sites: [createSite("Grove", 0, 0, "p1"), createSite("Nest", 1, 0, "p2")],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    expect(checkVictory(state)).toBe(null);
  });

  it("gives a player who controls every Home Tree victory even if another survives", () => {
    // p1 controls both Home Trees → p1 wins regardless of p2 having units.
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0, "p1"),
      ],
      units: [createUnit("Monkey", "p2", { q: 1, r: 0 })],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    expect(checkVictory(state)).toBe("p1");
  });
});

describe("resolveVictory", () => {
  it("sets winner to the player who controls every Home Tree", () => {
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0, "p1"),
      ],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    const next = resolveVictory(state);
    expect(next.winner).toBe("p1");
  });

  it("sets winner to the sole surviving player not eliminated", () => {
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0), // neutral
      ],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 })],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    expect(resolveVictory(state).winner).toBe("p1");
  });

  it("sets winner to null while the game is still in progress", () => {
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0, "p2"),
      ],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 })],
    });
    expect(resolveVictory(state).winner).toBe(null);
  });

  it("returns a new GameState and does not mutate the input", () => {
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0, "p1"),
      ],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    const next = resolveVictory(state);
    expect(next).not.toBe(state);
    // Input is unchanged and had no winner before resolution.
    expect(state.winner).toBe(null);
    expect(next.winner).toBe("p1");
    // Other state is preserved.
    expect(next.sites).toEqual(state.sites);
    expect(next.units).toEqual(state.units);
    expect(next.players).toEqual(state.players);
    expect(next.turnOrder).toEqual(state.turnOrder);
  });
});
