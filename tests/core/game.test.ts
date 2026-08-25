import { describe, it, expect } from "vitest";
import type { Site, Player, GameState, ApeUnit, ApeKind, Hex } from "../../src/core/game";
import { generateMap, type GameMap } from "../../src/core/mapGenerator";
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
  OWN_LAND_RANGE,
  isOwnedBy,
  bfsReachable,
  reachableForUnit,
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
    map: generateMap({ width: 7, height: 7, seed: 0 }),
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

/* ------------------------------------------------------------------ */
/* Owned-land movement (M20-T3, #148)                                  */
/* ------------------------------------------------------------------ */

/**
 * A flat, all-land map for deterministic owned-land movement tests. Every
 * cell in a wide band is `land`, so no water/mountain interferes with the
 * BFS traversal unless the test explicitly introduces one.
 */
function flatMap(width = 12, height = 12): GameMap {
  const cells: GameMap["cells"] = [];
  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      cells[q * height + r] = { hex: { q, r }, terrain: "land" };
    }
  }
  return { width, height, cells };
}

/** A gameState variant built on the flat all-land map. */
function flatState(opts: {
  sites?: Site[];
  units?: ApeUnit[];
  currentPlayer?: string;
} = {}): GameState {
  return {
    sites: opts.sites ?? [],
    units: opts.units ?? [],
    players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
    currentPlayer: opts.currentPlayer ?? "p1",
    turnOrder: ["p1", "p2"],
    winner: null,
    map: flatMap(),
  };
}

describe("OWN_LAND_RANGE", () => {
  it("is 4 (up to 4 hexes through own land)", () => {
    expect(OWN_LAND_RANGE).toBe(4);
  });
});

describe("isOwnedBy", () => {
  it("returns true for a site owned by the player's kingdom", () => {
    const state = flatState({ sites: [createSite("Grove", 4, 3, "p1")] });
    expect(isOwnedBy(state, { q: 4, r: 3 }, "p1")).toBe(true);
  });

  it("returns true for a hex occupied by the player's unit", () => {
    const state = flatState({ units: [createUnit("Monkey", "p1", { q: 4, r: 3 })] });
    expect(isOwnedBy(state, { q: 4, r: 3 }, "p1")).toBe(true);
  });

  it("returns false for a site owned by an enemy kingdom", () => {
    const state = flatState({ sites: [createSite("Grove", 4, 3, "p2")] });
    expect(isOwnedBy(state, { q: 4, r: 3 }, "p1")).toBe(false);
    expect(isOwnedBy(state, { q: 4, r: 3 }, "p2")).toBe(true);
  });

  it("returns false for a neutral site", () => {
    const state = flatState({ sites: [createSite("Grove", 4, 3)] });
    expect(isOwnedBy(state, { q: 4, r: 3 }, "p1")).toBe(false);
  });

  it("returns false for a site owned by the enemy that also holds the mover's unit (site owner wins)", () => {
    // Per the territory model, a site owned by p2 on which a p1 unit stands
    // is owned by p2 (site owner wins over a unit's owner).
    const state = flatState({
      sites: [createSite("Grove", 4, 3, "p2")],
      units: [createUnit("Monkey", "p1", { q: 4, r: 3 })],
    });
    expect(isOwnedBy(state, { q: 4, r: 3 }, "p1")).toBe(false);
    expect(isOwnedBy(state, { q: 4, r: 3 }, "p2")).toBe(true);
  });

  it("returns false for an empty hex with no site and no unit", () => {
    expect(isOwnedBy(flatState(), { q: 4, r: 3 }, "p1")).toBe(false);
  });
});

describe("bfsReachable", () => {
  it("collects distinct hexes within range, excluding the origin", () => {
    const result = bfsReachable({ q: 3, r: 3 }, 1, new Set(), () => true);
    expect(result).toHaveLength(6);
    expect(result.some((h) => sameHex(h, { q: 3, r: 3 }))).toBe(false);
  });

  it("respects range (reaches distance-2 hexes but not beyond)", () => {
    const result = bfsReachable({ q: 3, r: 3 }, 2, new Set(), () => true);
    expect(result.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(true);
    expect(result.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(false);
  });

  it("does not move through or onto occupied hexes", () => {
    const occupied = new Set(["4,3"]);
    const result = bfsReachable({ q: 3, r: 3 }, 2, occupied, () => true);
    expect(result.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(false);
    expect(result.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
  });

  it("only traverses passable hexes", () => {
    const passable = (hex: Hex) => !sameHex(hex, { q: 4, r: 3 });
    const result = bfsReachable({ q: 3, r: 3 }, 2, new Set(), passable);
    expect(result.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(false);
    expect(result.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
  });
});

describe("reachableForUnit", () => {
  /** A p1 unit at (3,3) on a flat map; p1-owned sites along the east row. */
  function reachableState(opts: {
    ownedRow?: Array<[number, number]>;
    unit?: ApeUnit;
    units?: ApeUnit[];
    sites?: Site[];
    map?: GameMap;
  } = {}): GameState {
    const row = opts.ownedRow ?? [
      [4, 3],
      [5, 3],
      [6, 3],
      [7, 3],
    ];
    const unit = opts.unit ?? createUnit("Monkey", "p1", { q: 3, r: 3 }, false);
    const state = opts.map ? flatState({ units: [unit] }) : flatState({ units: [unit] });
    return {
      ...state,
      map: opts.map ?? state.map,
      sites: opts.sites ?? row.map(([q, r]) => createSite("Grove", q, r, "p1")),
    };
  }

  it("grants the extended own-land range (up to 4) through fully-owned land", () => {
    const state = reachableState();
    const reachable = reachableForUnit(state, state.units[0]);
    // The unit may move up to 4 hexes east through its own land: (4,3)…(7,3).
    for (let d = 1; d <= OWN_LAND_RANGE; d++) {
      expect(
        reachable.some((h) => sameHex(h, { q: 3 + d, r: 3 })),
      ).toBe(true);
    }
    // But not beyond OWN_LAND_RANGE.
    expect(reachable.some((h) => sameHex(h, { q: 8, r: 3 }))).toBe(false);
  });

  it("caps at the standard range when an intermediate cell is not owned", () => {
    // (5,3) is neutral — the own-land route east stops before it, so the
    // unit may only reach the owned cells up to (4,3) via own land plus the
    // standard single-step neighbours.
    const state = reachableState({
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3), // neutral gap
        createSite("Grove", 6, 3, "p1"),
        createSite("Grove", 7, 3, "p1"),
      ],
    });
    const reachable = reachableForUnit(state, state.units[0]);
    // Owned cell before the gap is reachable.
    expect(reachable.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    // Cells beyond the neutral gap are NOT reachable via own land.
    expect(reachable.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
    expect(reachable.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(false);
    expect(reachable.some((h) => sameHex(h, { q: 7, r: 3 }))).toBe(false);
  });

  it("caps at the standard range when the destination is not owned", () => {
    // The route through (4,3),(5,3),(6,3) is owned but the destination (7,3)
    // is neutral — the final step off own land is not allowed, so the unit
    // may move up to (6,3) but not (7,3).
    const state = reachableState({
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3, "p1"),
        createSite("Grove", 6, 3, "p1"),
        createSite("Grove", 7, 3), // neutral destination
      ],
    });
    const reachable = reachableForUnit(state, state.units[0]);
    expect(reachable.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(true);
    expect(reachable.some((h) => sameHex(h, { q: 7, r: 3 }))).toBe(false);
  });

  it("does not allow the extended range into enemy-owned land", () => {
    // (4,3) is owned by p1, (5,3)… owned by p2 — the own-land route may not
    // enter enemy territory.
    const state = reachableState({
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3, "p2"),
        createSite("Grove", 6, 3, "p2"),
        createSite("Grove", 7, 3, "p2"),
      ],
    });
    const reachable = reachableForUnit(state, state.units[0]);
    expect(reachable.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    expect(reachable.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
  });

  it("never allows moving onto or through a mountain cell", () => {
    // Owned row (4,3),(5,3),(6,3),(7,3) but (5,3) is a mountain.
    const map = flatMap();
    map.cells[5 * map.height + 3] = { hex: { q: 5, r: 3 }, terrain: "mountain" };
    const state = reachableState({
      map,
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3, "p1"),
        createSite("Grove", 6, 3, "p1"),
        createSite("Grove", 7, 3, "p1"),
      ],
    });
    const reachable = reachableForUnit(state, state.units[0]);
    expect(reachable.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    expect(reachable.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
    expect(reachable.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(false);
    expect(reachable.some((h) => sameHex(h, { q: 7, r: 3 }))).toBe(false);
  });

  it("never allows moving onto or through a water cell", () => {
    // Owned row (4,3),(5,3),(6,3),(7,3) but (5,3) is water.
    const map = flatMap();
    map.cells[5 * map.height + 3] = { hex: { q: 5, r: 3 }, terrain: "water" };
    const state = reachableState({
      map,
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3, "p1"),
        createSite("Grove", 6, 3, "p1"),
        createSite("Grove", 7, 3, "p1"),
      ],
    });
    const reachable = reachableForUnit(state, state.units[0]);
    expect(reachable.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    expect(reachable.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
    expect(reachable.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(false);
    expect(reachable.some((h) => sameHex(h, { q: 7, r: 3 }))).toBe(false);
  });

  it("does not cross a hex occupied by another unit", () => {
    // A p2 unit on the owned (5,3) blocks both entry and passing through.
    const mover = createUnit("Monkey", "p1", { q: 3, r: 3 }, false);
    const blocker = createUnit("Monkey", "p2", { q: 5, r: 3 });
    const state = flatState({
      units: [mover, blocker],
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3, "p1"),
        createSite("Grove", 6, 3, "p1"),
        createSite("Grove", 7, 3, "p1"),
      ],
    });
    const reachable = reachableForUnit(state, mover);
    expect(reachable.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    expect(reachable.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
    expect(reachable.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(false);
  });
});

describe("moveUnit", () => {
  /** A p1 unit at (2,1) that has not yet acted, with a neutral Grove at (3,1). */
  function moveState(opts: {
    unit?: ApeUnit;
    units?: ApeUnit[];
    sites?: Site[];
    currentPlayer?: string;
  } = {}): GameState {
    const unit = opts.unit ?? createUnit("Monkey", "p1", { q: 2, r: 1 }, false);
    return gameState({
      sites: opts.sites ?? [createSite("Grove", 3, 1)],
      units: opts.units ?? [unit],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: opts.currentPlayer ?? "p1",
    });
  }

  it("moves a unit one hex and marks it as acted", () => {
    const state = moveState();
    const next = moveUnit(state, state.units[0], { q: 3, r: 1 });
    expect(next.units).toHaveLength(1);
    expect(next.units[0].hex).toEqual({ q: 3, r: 1 });
    expect(next.units[0].hasActed).toBe(true);
    expect(next.units[0].kind).toBe("Monkey");
    expect(next.units[0].owner).toBe("p1");
  });

  it("captures an unoccupied site when moving onto it", () => {
    const state = moveState();
    const next = moveUnit(state, state.units[0], { q: 3, r: 1 });
    const captured = next.sites.find((s) => sameHex(s.hex, { q: 3, r: 1 }));
    expect(captured?.owner).toBe("p1");
  });

  it("captures a Grove, Nest, and Home Tree for the moving unit's owner", () => {
    for (const kind of ["Grove", "Nest", "HomeTree"] as const) {
      const state = moveState({ sites: [createSite(kind, 3, 1)] });
      const next = moveUnit(state, state.units[0], { q: 3, r: 1 });
      expect(next.sites.find((s) => sameHex(s.hex, { q: 3, r: 1 }))?.owner).toBe("p1");
    }
  });

  it("does not alter sites that are not the target", () => {
    const state = moveState({
      sites: [createSite("Grove", 3, 1), createSite("Nest", 5, 5)],
    });
    const next = moveUnit(state, state.units[0], { q: 3, r: 1 });
    expect(next.sites.find((s) => sameHex(s.hex, { q: 5, r: 5 }))?.owner).toBeNull();
  });

  it("does not change site ownership when moving onto an empty hex with no site", () => {
    const state = moveState({ sites: [] });
    const next = moveUnit(state, state.units[0], { q: 3, r: 1 });
    expect(next.sites).toEqual([]);
  });

  it("does not capture a site occupied by another unit (move rejected)", () => {
    const mover = createUnit("Monkey", "p1", { q: 2, r: 1 }, false);
    const other = createUnit("Monkey", "p2", { q: 3, r: 1 });
    const state = moveState({
      units: [mover, other],
      sites: [createSite("Grove", 3, 1)],
    });
    expect(() => moveUnit(state, mover, { q: 3, r: 1 })).toThrowError(MoveError);
  });

  // Rule 1 of #102: moving a unit onto an unoccupied Grove/Nest/Home Tree
  // makes that cell part of the unit's kingdom. The site's owner flips to the
  // mover, verified across all three site kinds.
  it("rule 1: moving onto an unoccupied site captures it for the mover's kingdom", () => {
    for (const kind of ["Grove", "Nest", "HomeTree"] as const) {
      const mover = createUnit("Monkey", "p1", { q: 2, r: 1 }, false);
      const state = moveState({ unit: mover, sites: [createSite(kind, 3, 1, "p2")] });
      const next = moveUnit(state, mover, { q: 3, r: 1 });
      const captured = next.sites.find((s) => sameHex(s.hex, { q: 3, r: 1 }));
      expect(captured?.owner).toBe("p1");
    }
  });

  it("rejects when the unit has already acted this turn", () => {
    const acted = createUnit("Monkey", "p1", { q: 2, r: 1 }, true);
    const state = moveState({ unit: acted });
    let caught: unknown;
    try {
      moveUnit(state, acted, { q: 3, r: 1 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("already-acted");
  });

  it("rejects when the unit is not owned by the current player", () => {
    const enemy = createUnit("Monkey", "p2", { q: 2, r: 1 }, false);
    const state = moveState({ unit: enemy });
    expect(() => moveUnit(state, enemy, { q: 3, r: 1 })).toThrowError(MoveError);
    let caught: unknown;
    try {
      moveUnit(state, enemy, { q: 3, r: 1 });
    } catch (e) {
      caught = e;
    }
    expect((caught as MoveError).kind).toBe("already-acted");
  });

  it("rejects when the unit is not present in the state", () => {
    const state = moveState(); // contains a p1 unit at (2,1)
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
      moveUnit(state, state.units[0], { q: 4, r: 1 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("out-of-range");
  });

  it("rejects when the target hex is occupied by another unit", () => {
    const mover = createUnit("Monkey", "p1", { q: 2, r: 1 }, false);
    const other = createUnit("Gorilla", "p2", { q: 3, r: 1 });
    const state = moveState({ units: [mover, other] });
    let caught: unknown;
    try {
      moveUnit(state, mover, { q: 3, r: 1 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("occupied");
  });

  it("rejects moving onto a water cell", () => {
    // The unit sits at (2,1); its neighbour (1,1) is water on the test map.
    const state = moveState();
    let caught: unknown;
    try {
      moveUnit(state, state.units[0], { q: 1, r: 1 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("water");
    // The state is unchanged — no unit moves onto water.
    expect(state.units[0].hex).toEqual({ q: 2, r: 1 });
    expect(state.units[0].hasActed).toBe(false);
  });

  it("rejects moving onto a mountain cell", () => {
    // The unit sits at (1,3); its neighbour (2,3) is a mountain on the
    // default test map. The unit may not step onto the mountain.
    const state = moveState({
      unit: createUnit("Monkey", "p1", { q: 1, r: 3 }, false),
    });
    let caught: unknown;
    try {
      moveUnit(state, state.units[0], { q: 2, r: 3 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("mountain");
    // The state is unchanged — no unit moves onto a mountain.
    expect(state.units[0].hex).toEqual({ q: 1, r: 3 });
    expect(state.units[0].hasActed).toBe(false);
  });

  it("keeps other units unchanged when moving one unit", () => {
    const mover = createUnit("Monkey", "p1", { q: 2, r: 1 }, false);
    const other = createUnit("Gibbon", "p1", { q: 5, r: 5 }, false);
    const state = moveState({ units: [mover, other] });
    const next = moveUnit(state, mover, { q: 3, r: 1 });
    expect(next.units).toHaveLength(2);
    // The other unit is untouched.
    expect(next.units.find((u) => sameHex(u.hex, { q: 5, r: 5 }))).toEqual(other);
  });

  it("returns a new GameState and does not mutate the input", () => {
    const state = moveState();
    const next = moveUnit(state, state.units[0], { q: 3, r: 1 });
    expect(next).not.toBe(state);
    expect(next.units).not.toBe(state.units);
    expect(next.sites).not.toBe(state.sites);
    // Input unchanged.
    expect(state.units[0].hex).toEqual({ q: 2, r: 1 });
    expect(state.units[0].hasActed).toBe(false);
    expect(state.sites[0].owner).toBeNull();
  });

  /* ----- Owned-land range (M20-T3, #148) ----- */

  it("allows moving up to OWN_LAND_RANGE hexes through fully-owned land", () => {
    // A p1 unit at (3,3) with p1-owned Groves along the row (4,3)…(7,3): a
    // move 4 hexes east through own land is legal.
    const mover = createUnit("Monkey", "p1", { q: 3, r: 3 }, false);
    const state = flatState({
      units: [mover],
      sites: [4, 5, 6, 7].map((q) => createSite("Grove", q, 3, "p1")),
    });
    const next = moveUnit(state, mover, { q: 7, r: 3 });
    expect(next.units[0].hex).toEqual({ q: 7, r: 3 });
    expect(next.units[0].hasActed).toBe(true);
    // A 3-hex move also works.
    expect(moveUnit(state, mover, { q: 6, r: 3 }).units[0].hex).toEqual({ q: 6, r: 3 });
  });

  it("rejects a move beyond OWN_LAND_RANGE even through fully-owned land", () => {
    const mover = createUnit("Monkey", "p1", { q: 3, r: 3 }, false);
    const state = flatState({
      units: [mover],
      // Owned row continues past (7,3)
      sites: [4, 5, 6, 7, 8].map((q) => createSite("Grove", q, 3, "p1")),
    });
    let caught: unknown;
    try {
      moveUnit(state, mover, { q: 8, r: 3 }); // distance 5 > 4
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("out-of-range");
  });

  it("rejects a distance-4 move when an intermediate cell is not owned", () => {
    // (5,3) is neutral, so the own-land route east is blocked — the unit
    // cannot jump to (7,3).
    const mover = createUnit("Monkey", "p1", { q: 3, r: 3 }, false);
    const state = flatState({
      units: [mover],
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3), // neutral gap
        createSite("Grove", 6, 3, "p1"),
        createSite("Grove", 7, 3, "p1"),
      ],
    });
    let caught: unknown;
    try {
      moveUnit(state, mover, { q: 7, r: 3 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("out-of-range");
    // The unit stays put — it has not jumped across the gap.
    expect(state.units[0].hex).toEqual({ q: 3, r: 3 });
  });

  it("rejects a distance-4 move when the destination is not owned", () => {
    const mover = createUnit("Monkey", "p1", { q: 3, r: 3 }, false);
    const state = flatState({
      units: [mover],
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3, "p1"),
        createSite("Grove", 6, 3, "p1"),
        createSite("Grove", 7, 3), // neutral destination
      ],
    });
    let caught: unknown;
    try {
      moveUnit(state, mover, { q: 7, r: 3 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("out-of-range");
  });

  it("rejects a distance-4 move through an enemy-owned cell", () => {
    const mover = createUnit("Monkey", "p1", { q: 3, r: 3 }, false);
    const state = flatState({
      units: [mover],
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3, "p2"),
        createSite("Grove", 6, 3, "p1"),
        createSite("Grove", 7, 3, "p1"),
      ],
    });
    let caught: unknown;
    try {
      moveUnit(state, mover, { q: 7, r: 3 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("out-of-range");
  });

  it("rejects a distance-4 move that crosses a water cell", () => {
    // A p1 unit at (4,3) with (5,3) water on an otherwise-owned row.
    const mover = createUnit("Monkey", "p1", { q: 4, r: 3 }, false);
    const map = flatMap();
    map.cells[5 * map.height + 3] = { hex: { q: 5, r: 3 }, terrain: "water" };
    const state = {
      ...flatState({
        units: [mover],
        sites: [4, 5, 6, 7].map((q) => createSite("Grove", q, 3, "p1")),
      }),
      map,
    };
    // Moving onto the adjacent water cell is rejected (M20-T1 defence).
    let caught: unknown;
    try {
      moveUnit(state, mover, { q: 5, r: 3 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("water");
    // And the longer move across the water never succeeds.
    expect(() => moveUnit(state, mover, { q: 7, r: 3 })).toThrowError(MoveError);
  });

  it("rejects a distance-4 move that crosses a mountain cell", () => {
    // A p1 unit at (4,3) with (5,3) mountain on an otherwise-owned row.
    const mover = createUnit("Monkey", "p1", { q: 4, r: 3 }, false);
    const map = flatMap();
    map.cells[5 * map.height + 3] = { hex: { q: 5, r: 3 }, terrain: "mountain" };
    const state = {
      ...flatState({
        units: [mover],
        sites: [4, 5, 6, 7].map((q) => createSite("Grove", q, 3, "p1")),
      }),
      map,
    };
    // Moving onto the adjacent mountain cell is rejected (M20-T2 defence).
    let caught: unknown;
    try {
      moveUnit(state, mover, { q: 5, r: 3 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoveError);
    expect((caught as MoveError).kind).toBe("mountain");
    // And the longer move across the mountain never succeeds.
    expect(() => moveUnit(state, mover, { q: 7, r: 3 })).toThrowError(MoveError);
  });
});

/* ------------------------------------------------------------------ */
/* Territory ownership persistence & loss (issue #124, #122-mechanics)  */
/* ------------------------------------------------------------------ */

/**
 * Regression coverage for the territory ownership rules (issue #122).
 *
 * A site captured by a unit belongs to that unit's kingdom, and stays owned
 * by that kingdom when the unit moves off (ownership is stored on the site,
 * independent of unit position). The only way a kingdom loses a cell is when
 * an enemy unit occupies it — by moving onto it or by defeating a unit on it.
 * These tests codify that persistence in `src/core` (pure, 100% covered).
 */
describe("territory ownership persistence & loss", () => {
  it("retains ownership when the owning unit moves off the site", () => {
    // p1 already controls a Nest at (2,1) and has a Monkey standing on it
    // that has not yet acted this turn.
    const mover = createUnit("Monkey", "p1", { q: 2, r: 1 }, false);
    const state = gameState({
      sites: [createSite("Nest", 2, 1, "p1")],
      units: [mover],
      currentPlayer: "p1",
    });
    // The unit walks off to an adjacent empty hex (3,1).
    const next = moveUnit(state, mover, { q: 3, r: 1 });
    // The site the unit left behind is still owned by p1's kingdom.
    expect(next.units[0].hex).toEqual({ q: 3, r: 1 });
    expect(next.sites.find((s) => sameHex(s.hex, { q: 2, r: 1 }))?.owner).toBe("p1");
  });

  it("keeps ownership after capture even when the mover vacates", () => {
    // p1 owns a Grove (capture itself is covered by the moveUnit tests above);
    // a p1 unit standing on it walks off, and the site persists as p1's.
    const mover = createUnit("Monkey", "p1", { q: 3, r: 1 }, false);
    const state = gameState({
      sites: [createSite("Grove", 3, 1, "p1")],
      units: [mover],
      currentPlayer: "p1",
    });
    const next = moveUnit(state, mover, { q: 4, r: 1 });
    expect(next.units[0].hex).toEqual({ q: 4, r: 1 });
    expect(next.sites.find((s) => sameHex(s.hex, { q: 3, r: 1 }))?.owner).toBe("p1");
  });

  it("a captured site yields income even after the capturing unit moves away", () => {
    // p1 controls a Nest (worth 2 bananas); its unit marches on, but the
    // Nest keeps producing p1 income because ownership persisted.
    const mover = createUnit("Monkey", "p1", { q: 2, r: 1 }, false);
    const state = gameState({
      sites: [createSite("Nest", 2, 1, "p1")],
      units: [mover],
      currentPlayer: "p1",
    });
    const next = moveUnit(state, mover, { q: 3, r: 1 });
    expect(next.sites.find((s) => sameHex(s.hex, { q: 2, r: 1 }))?.owner).toBe("p1");
    expect(incomeFor("p1", next.sites)).toBe(2);
    expect(collectIncome(next).players.p1.bananas).toBe(2);
  });

  it("keeps ownership when the owning unit dies far away from the site", () => {
    // p2 controls a Home Tree at (4,3); its lone unit is far away and dies in
    // an equal-rank clash elsewhere. The Home Tree stays p2's.
    const attacker = createUnit("Monkey", "p1", { q: 5, r: 5 }, false);
    const defender = createUnit("Monkey", "p2", { q: 4, r: 5 });
    const state = gameState({
      sites: [createSite("HomeTree", 4, 3, "p2")],
      units: [attacker, defender],
      currentPlayer: "p1",
    });
    const next = attackUnit(state, attacker, { q: 4, r: 5 }); // both die
    expect(next.units).toHaveLength(0);
    expect(next.sites.find((s) => sameHex(s.hex, { q: 4, r: 3 }))?.owner).toBe("p2");
  });

  it("only loses a cell when an enemy unit occupies the site", () => {
    // p2 captures p1's Grove by defeating the p1 unit standing on it.
    const attacker = createUnit("Gorilla", "p2", { q: 1, r: 5 }, false);
    const defender = createUnit("Monkey", "p1", { q: 2, r: 5 });
    const state = gameState({
      sites: [createSite("Grove", 2, 5, "p1")],
      units: [attacker, defender],
      currentPlayer: "p2",
    });
    const next = attackUnit(state, attacker, { q: 2, r: 5 });
    // p2's attacker moves in and the site owner flips to p2.
    expect(next.sites.find((s) => sameHex(s.hex, { q: 2, r: 5 }))?.owner).toBe("p2");
  });

  it("does not change ownership when an enemy unit merely moves onto an empty adjacent hex", () => {
    // p1 owns an unoccupied Nest; an enemy Monkey moves to the hex next to it.
    const enemy = createUnit("Monkey", "p2", { q: 1, r: 5 }, false);
    const state = gameState({
      sites: [createSite("Nest", 4, 1, "p1")],
      units: [enemy],
      currentPlayer: "p2",
    });
    // p2 moves onto the empty hex (2,5) adjacent to the Nest, not on it.
    const next = moveUnit(state, enemy, { q: 2, r: 5 });
    expect(next.sites.find((s) => sameHex(s.hex, { q: 4, r: 1 }))?.owner).toBe("p1");
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

  // Rule 2 of #102: a unit cannot beat an enemy unit of the same rank or
  // higher. Equal ranks destroy both; a lower-rank attacker is destroyed and
  // the defender remains. Regression-tests the full rank comparison table.
  it("rule 2: equal-rank combat destroys both units", () => {
    const attacker = createUnit("Chimpanzee", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Chimpanzee", "p2", { q: 2, r: 0 });
    const state = attackState({ attacker, defender });
    const next = attackUnit(state, attacker, { q: 2, r: 0 });
    // Equal ranks: both units are destroyed, so neither side gains the hex.
    expect(next.units).toHaveLength(0);
    expect(next.units.find((u) => sameHex(u.hex, { q: 2, r: 0 }))).toBeUndefined();
  });

  it("rule 2: equal-rank combat never lets the attacker capture the defender's hex", () => {
    const attacker = createUnit("Gibbon", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Gibbon", "p2", { q: 2, r: 0 });
    const state = attackState({
      attacker,
      defender,
      sites: [createSite("Nest", 2, 0, "p2")],
    });
    const next = attackUnit(state, attacker, { q: 2, r: 0 });
    // Both destroyed, so the Nest stays with the defender's owner.
    expect(next.units).toHaveLength(0);
    expect(next.sites.find((s) => sameHex(s.hex, { q: 2, r: 0 }))?.owner).toBe("p2");
  });

  it("rule 2: a lower-rank attacker never defeats an equal-or-higher-rank defender", () => {
    // Monkey (1) vs Gibbon (2): attacker lower, so it is destroyed.
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const defender = createUnit("Gibbon", "p2", { q: 2, r: 0 });
    const state = attackState({ attacker, defender });
    const next = attackUnit(state, attacker, { q: 2, r: 0 });
    expect(next.units).toHaveLength(1);
    expect(next.units[0].owner).toBe("p2");
    expect(next.units[0].hex).toEqual({ q: 2, r: 0 });
  });

  it("rule 2: covers every rank pair of the combat table", () => {
    const kinds = ["Monkey", "Gibbon", "Chimpanzee", "Gorilla"] as const;
    const ranks: Record<(typeof kinds)[number], number> = {
      Monkey: 1,
      Gibbon: 2,
      Chimpanzee: 3,
      Gorilla: 4,
    };
    for (const atkKind of kinds) {
      for (const defKind of kinds) {
        const attacker = createUnit(atkKind, "p1", { q: 1, r: 0 }, false);
        const defender = createUnit(defKind, "p2", { q: 2, r: 0 });
        const state = attackState({ attacker, defender });
        const next = attackUnit(state, attacker, { q: 2, r: 0 });
        const defenderSurvives = next.units.some(
          (u) => u.owner === "p2" && sameHex(u.hex, { q: 2, r: 0 }),
        );
        const attackerGainedHex = next.units.some(
          (u) => u.owner === "p1" && sameHex(u.hex, { q: 2, r: 0 }),
        );
        if (ranks[atkKind] > ranks[defKind]) {
          // Higher attacker wins and moves in.
          expect(attackerGainedHex).toBe(true);
          expect(defenderSurvives).toBe(false);
        } else if (ranks[atkKind] === ranks[defKind]) {
          // Equal ranks: both destroyed.
          expect(attackerGainedHex).toBe(false);
          expect(defenderSurvives).toBe(false);
          expect(next.units).toHaveLength(0);
        } else {
          // Lower attacker is destroyed; defender remains.
          expect(attackerGainedHex).toBe(false);
          expect(defenderSurvives).toBe(true);
        }
      }
    }
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
