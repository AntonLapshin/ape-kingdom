import { describe, it, expect } from "vitest";
import type { GameState, ApeUnit, Site, Player, Hex } from "../../src/core/game";
import { generateMap, isWater, isMountain, type GameMap } from "../../src/core/mapGenerator";
import {
  createUnit,
  createSite,
  createPlayer,
  sameHex,
  collectIncome,
  recruitUnit,
  moveUnit,
  attackUnit,
  OWN_LAND_RANGE,
  hexDistance,
} from "../../src/core/game";
import {
  legalActions,
  aiChooseMove,
  reachableHexes,
  type GameAction,
} from "../../src/core/ai";

/** Build a minimal game state for AI tests. */
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

/**
 * A flat, all-land map for deterministic owned-land movement tests (every
 * cell in a wide band is `land`, so no water/mountain interferes unless a
 * test introduces one).
 */
function flatMap(width = 10, height = 10): GameMap {
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
    players: { p1: createPlayer("p1"), p2: createPlayer("p2") },
    currentPlayer: opts.currentPlayer ?? "p1",
    turnOrder: ["p1", "p2"],
    winner: null,
    map: flatMap(),
  };
}

/* ------------------------------------------------------------------ */
/* reachableHexes                                                      */
/* ------------------------------------------------------------------ */

describe("reachableHexes", () => {
  it("returns the six adjacent hexes for movement 1 on an empty map", () => {
    const hexes = reachableHexes({ q: 0, r: 0 }, 1, new Set());
    expect(hexes).toHaveLength(6);
    expect(hexes.some((h) => sameHex(h, { q: 0, r: 0 }))).toBe(false);
  });

  it("reaches hexes at distance 2 and deduplicates via multiple paths", () => {
    // With movement 2, a hex two steps out can be reached by more than one
    // path; the BFS must return each hex only once.
    const hexes = reachableHexes({ q: 0, r: 0 }, 2, new Set());
    const keys = hexes.map((h) => `${h.q},${h.r}`);
    expect(new Set(keys).size).toBe(keys.length);
    // A hex at distance 2, e.g. (2,0), is reachable.
    expect(hexes.some((h) => sameHex(h, { q: 2, r: 0 }))).toBe(true);
  });

  it("excludes occupied hexes and does not move through them", () => {
    // Block (1,0) so (2,0) cannot be reached through it.
    const occupied = new Set(["1,0"]);
    const hexes = reachableHexes({ q: 0, r: 0 }, 2, occupied);
    expect(hexes.some((h) => sameHex(h, { q: 1, r: 0 }))).toBe(false);
    expect(hexes.some((h) => sameHex(h, { q: 2, r: 0 }))).toBe(false);
  });

  it("excludes water cells as reachable targets and does not move through them", () => {
    const map = generateMap({ width: 7, height: 7, seed: 0 });
    // A unit at (2,1) on the map: its water neighbours (1,1),(2,0),(3,0) are
    // never reachable, while its land neighbours remain reachable.
    const hexes = reachableHexes({ q: 2, r: 1 }, 1, new Set(), map);
    for (const water of [{ q: 1, r: 1 }, { q: 2, r: 0 }, { q: 3, r: 0 }]) {
      expect(hexes.some((h) => sameHex(h, water))).toBe(false);
    }
    expect(
      hexes.some((h) => sameHex(h, { q: 3, r: 1 })) &&
        hexes.some((h) => sameHex(h, { q: 2, r: 2 })) &&
        hexes.some((h) => sameHex(h, { q: 1, r: 2 })),
    ).toBe(true);
  });

  it("does not move through water to reach a land cell beyond it", () => {
    const map = generateMap({ width: 7, height: 7, seed: 0 });
    // (1,0) is a land cell enclosed entirely by water; the only paths to it
    // from (2,1) within movement 2 run through the water cells (1,1)/(2,0),
    // so it must not be reachable.
    const hexes = reachableHexes({ q: 2, r: 1 }, 2, new Set(), map);
    expect(hexes.some((h) => sameHex(h, { q: 1, r: 0 }))).toBe(false);
  });

  it("excludes mountain cells as reachable targets", () => {
    const map = generateMap({ width: 7, height: 7, seed: 0 });
    // A unit at (2,2) on the map: its mountain neighbour (2,3) is never
    // reachable, while its land neighbours remain reachable.
    const hexes = reachableHexes({ q: 2, r: 2 }, 1, new Set(), map);
    expect(hexes.some((h) => sameHex(h, { q: 2, r: 3 }))).toBe(false);
    expect(
      hexes.some((h) => sameHex(h, { q: 3, r: 2 })) &&
        hexes.some((h) => sameHex(h, { q: 1, r: 2 })) &&
        hexes.some((h) => sameHex(h, { q: 2, r: 1 })),
    ).toBe(true);
  });

  it("does not move through a mountain to reach a cell beyond it", () => {
    const map = generateMap({ width: 7, height: 7, seed: 0 });
    // Mountain at (2,3). A unit at (1,3) within movement 2 cannot reach
    // (3,3) through the mountain, and there is no land path around it within
    // 2 steps, so (3,3) must not be reachable.
    const hexes = reachableHexes({ q: 1, r: 3 }, 2, new Set(), map);
    expect(hexes.some((h) => sameHex(h, { q: 3, r: 3 }))).toBe(false);
    // The mountain itself is never reachable either.
    expect(hexes.some((h) => sameHex(h, { q: 2, r: 3 }))).toBe(false);
  });

  it("extends to OWN_LAND_RANGE when an ownedBy predicate is provided", () => {
    // Origin (3,3) with owned cells along the east row; the own-land range
    // reaches (7,3) even though the standard movement is 1.
    const owned = new Set(["4,3", "5,3", "6,3", "7,3"]);
    const hexes = reachableHexes({ q: 3, r: 3 }, 1, new Set(), flatMap(), (h) =>
      owned.has(`${h.q},${h.r}`),
    );
    for (let d = 1; d <= OWN_LAND_RANGE; d++) {
      expect(hexes.some((h) => sameHex(h, { q: 3 + d, r: 3 }))).toBe(true);
    }
    // But never beyond OWN_LAND_RANGE.
    expect(hexes.some((h) => sameHex(h, { q: 8, r: 3 }))).toBe(false);
  });

  it("stays at the standard range when no ownedBy predicate is provided", () => {
    // With no ownership info the result is purely the standard range — even
    // on a fully passable map, (5,3) at distance 2 is not reachable with
    // movement 1.
    const hexes = reachableHexes({ q: 3, r: 3 }, 1, new Set(), flatMap());
    expect(hexes.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
    expect(hexes.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
  });

  it("does not extend through a non-owned cell", () => {
    // (5,3) is not owned, so the extended own-land route stops before it.
    const owned = new Set(["4,3", "6,3", "7,3"]);
    const hexes = reachableHexes({ q: 3, r: 3 }, 1, new Set(), flatMap(), (h) =>
      owned.has(`${h.q},${h.r}`),
    );
    expect(hexes.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    expect(hexes.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
    expect(hexes.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(false);
    expect(hexes.some((h) => sameHex(h, { q: 7, r: 3 }))).toBe(false);
  });

  it("never extends onto or through water or mountain with ownedBy", () => {
    // Owned row (4,3)…(7,3), but (5,3) is a mountain on the map — the
    // extended route may not cross it.
    const map = flatMap();
    map.cells[5 * map.height + 3] = { hex: { q: 5, r: 3 }, terrain: "mountain" };
    const owned = new Set(["4,3", "5,3", "6,3", "7,3"]);
    const hexes = reachableHexes({ q: 3, r: 3 }, 1, new Set(), map, (h) =>
      owned.has(`${h.q},${h.r}`),
    );
    expect(hexes.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    expect(hexes.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
    expect(hexes.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* legalActions                                                        */
/* ------------------------------------------------------------------ */

describe("legalActions — collect income", () => {
  it("always includes a collectIncome action", () => {
    const state = gameState();
    const actions = legalActions(state);
    expect(actions[0]).toEqual({ type: "collectIncome" });
  });
});

describe("legalActions — recruit", () => {
  function recruitState(bananas = 20, units: ApeUnit[] = []): GameState {
    return gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      units,
      players: { p1: createPlayer("p1", bananas), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
  }

  it("enumerates every affordable ape kind at the Home Tree and adjacent hexes", () => {
    const state = recruitState(100);
    const recruits = legalActions(state).filter((a) => a.type === "recruit");
    // 4 kinds x (1 home tree hex + 6 adjacent) = 28 placements.
    expect(recruits).toHaveLength(4 * 7);
    // Every recruit action places at a legal hex.
    for (const r of recruits) {
      expect(r.type).toBe("recruit");
      if (r.type === "recruit") {
        expect(sameHex(r.hex, { q: 0, r: 0 }) || areAdjacentToHomeTree(r.hex)).toBe(true);
      }
    }
    // Every affordable kind appears.
    const kinds = new Set(
      recruits.filter((r) => r.type === "recruit").map((r) => (r as { kind: string }).kind),
    );
    expect(kinds).toEqual(new Set(["Monkey", "Gibbon", "Chimpanzee", "Gorilla"]));
  });

  it("omits ape kinds the player cannot afford", () => {
    const state = recruitState(7); // can afford Monkey(2), Gibbon(4); not Chimpanzee(8)
    const recruits = legalActions(state).filter((a) => a.type === "recruit");
    const kinds = new Set(
      recruits.filter((r) => r.type === "recruit").map((r) => (r as { kind: string }).kind),
    );
    expect(kinds).toEqual(new Set(["Monkey", "Gibbon"]));
  });

  it("omits occupied placement hexes", () => {
    const occupied = createUnit("Monkey", "p1", { q: 0, r: 0 });
    const state = recruitState(100, [occupied]);
    const recruits = legalActions(state).filter((a) => a.type === "recruit");
    // The Home Tree hex (0,0) is occupied, so only the 6 adjacent hexes remain.
    const targetHexes = recruits
      .filter((r) => r.type === "recruit")
      .map((r) => (r as { hex: { q: number; r: number } }).hex);
    expect(targetHexes.some((h) => sameHex(h, { q: 0, r: 0 }))).toBe(false);
    expect(new Set(targetHexes.map((h) => `${h.q},${h.r}`)).size).toBe(6);
  });

  it("produces no recruit actions with no controlled Home Tree", () => {
    const state = recruitState(100);
    // No sites at all → no placement hexes.
    const recruits = legalActions({ ...state, sites: [] }).filter(
      (a) => a.type === "recruit",
    );
    expect(recruits).toHaveLength(0);
  });

  it("does not allow recruiting at another player's Home Tree", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p2")],
      players: { p1: createPlayer("p1", 100), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    expect(legalActions(state).filter((a) => a.type === "recruit")).toHaveLength(0);
  });
});

/** Whether a hex is adjacent to the controlled Home Tree at (0,0). */
function areAdjacentToHomeTree(hex: { q: number; r: number }): boolean {
  const neighbours = [
    { q: 1, r: 0 },
    { q: -1, r: 0 },
    { q: 0, r: 1 },
    { q: 0, r: -1 },
    { q: 1, r: -1 },
    { q: -1, r: 1 },
  ];
  return neighbours.some((n) => sameHex(n, hex));
}

describe("legalActions — move", () => {
  function moveState(opts: {
    unit?: ApeUnit;
    units?: ApeUnit[];
    sites?: Site[];
    currentPlayer?: string;
  } = {}): GameState {
    const unit = opts.unit ?? createUnit("Monkey", "p1", { q: 4, r: 4 }, false);
    return gameState({
      sites: opts.sites ?? [],
      units: opts.units ?? [unit],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: opts.currentPlayer ?? "p1",
    });
  }

  it("enumerates a move to every adjacent, unoccupied hex for a not-acted unit", () => {
    const state = moveState(); // Monkey at (4,4), movement 1
    const moves = legalActions(state).filter((a) => a.type === "move");
    // All 6 neighbours of (4,4) are land-surface on the test map, so all 6
    // are reachable targets.
    expect(moves).toHaveLength(6);
    for (const m of moves) {
      if (m.type === "move") {
        expect(sameHex(m.unitHex, { q: 4, r: 4 })).toBe(true);
        expect(sameHex(m.targetHex, { q: 4, r: 4 })).toBe(false);
      }
    }
  });

  it("omits moves into hexes occupied by another unit", () => {
    const mover = createUnit("Monkey", "p1", { q: 4, r: 4 }, false);
    const other = createUnit("Gorilla", "p2", { q: 5, r: 4 });
    const state = moveState({ units: [mover, other] });
    const moves = legalActions(state).filter((a) => a.type === "move");
    expect(moves.some((m) => m.type === "move" && sameHex(m.targetHex, { q: 5, r: 4 }))).toBe(
      false,
    );
    // 6 neighbours minus the occupied one = 5.
    expect(moves).toHaveLength(5);
  });

  it("omits moves for units that have already acted", () => {
    const acted = createUnit("Monkey", "p1", { q: 4, r: 4 }, true);
    const state = moveState({ unit: acted });
    expect(legalActions(state).filter((a) => a.type === "move")).toHaveLength(0);
  });

  it("omits moves for units not owned by the current player", () => {
    const enemy = createUnit("Monkey", "p2", { q: 4, r: 4 }, false);
    const state = moveState({ unit: enemy });
    expect(legalActions(state).filter((a) => a.type === "move")).toHaveLength(0);
  });

  it("excludes water cells as legal move targets", () => {
    // Monkey at (2,1) on the map: its water neighbours (1,1),(2,0),(3,0)
    // must never appear as legal move targets.
    const state = moveState({ unit: createUnit("Monkey", "p1", { q: 2, r: 1 }, false) });
    const moves = legalActions(state).filter((a) => a.type === "move");
    const targets = moves.map((m) => (m as { targetHex: { q: number; r: number } }).targetHex);
    for (const water of [{ q: 1, r: 1 }, { q: 2, r: 0 }, { q: 3, r: 0 }]) {
      expect(targets.some((h) => sameHex(h, water))).toBe(false);
    }
    // The land neighbours remain legal targets.
    expect(
      targets.some((h) => sameHex(h, { q: 3, r: 1 })) &&
        targets.some((h) => sameHex(h, { q: 2, r: 2 })) &&
        targets.some((h) => sameHex(h, { q: 1, r: 2 })),
    ).toBe(true);
  });

  it("excludes mountain cells as legal move targets", () => {
    // Monkey at (2,2) on the map: its mountain neighbour (2,3) must never
    // appear as a legal move target.
    const state = moveState({ unit: createUnit("Monkey", "p1", { q: 2, r: 2 }, false) });
    const moves = legalActions(state).filter((a) => a.type === "move");
    const targets = moves.map((m) => (m as { targetHex: { q: number; r: number } }).targetHex);
    expect(targets.some((h) => sameHex(h, { q: 2, r: 3 }))).toBe(false);
    // The land neighbours remain legal targets.
    expect(
      targets.some((h) => sameHex(h, { q: 3, r: 2 })) &&
        targets.some((h) => sameHex(h, { q: 1, r: 2 })) &&
        targets.some((h) => sameHex(h, { q: 2, r: 1 })),
    ).toBe(true);
  });
});

describe("legalActions — owned-land move range (M20-T3, #148)", () => {
  /** A p1 unit at (3,3) with p1-owned Groves along the east row (4,3)…(7,3). */
  function ownedState(opts: {
    sites?: Site[];
    unit?: ApeUnit;
  } = {}): GameState {
    const unit = opts.unit ?? createUnit("Monkey", "p1", { q: 3, r: 3 }, false);
    return flatState({
      units: [unit],
      sites:
        opts.sites ??
        [4, 5, 6, 7].map((q) => createSite("Grove", q, 3, "p1")),
    });
  }

  it("includes moves up to OWN_LAND_RANGE through fully-owned land", () => {
    const state = ownedState();
    const moves = legalActions(state).filter((a) => a.type === "move");
    const targets = moves.map((m) => (m as { targetHex: Hex }).targetHex);
    for (let d = 1; d <= OWN_LAND_RANGE; d++) {
      expect(targets.some((h) => sameHex(h, { q: 3 + d, r: 3 }))).toBe(true);
    }
    // Not beyond OWN_LAND_RANGE.
    expect(targets.some((h) => sameHex(h, { q: 8, r: 3 }))).toBe(false);
  });

  it("caps at the standard range when the owned route is interrupted", () => {
    // (5,3) neutral breaks the owned row east of (4,3).
    const state = ownedState({
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3),
        createSite("Grove", 6, 3, "p1"),
        createSite("Grove", 7, 3, "p1"),
      ],
    });
    const moves = legalActions(state).filter((a) => a.type === "move");
    const targets = moves.map((m) => (m as { targetHex: Hex }).targetHex);
    expect(targets.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    expect(targets.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
    expect(targets.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(false);
    expect(targets.some((h) => sameHex(h, { q: 7, r: 3 }))).toBe(false);
  });

  it("never offers a move into enemy-owned land beyond standard range", () => {
    // (4,3) is p1, (5,3) onward p2 — the unit may move onto (4,3) but not
    // deeper into p2's territory.
    const state = ownedState({
      sites: [
        createSite("Grove", 4, 3, "p1"),
        createSite("Grove", 5, 3, "p2"),
        createSite("Grove", 6, 3, "p2"),
        createSite("Grove", 7, 3, "p2"),
      ],
    });
    const moves = legalActions(state).filter((a) => a.type === "move");
    const targets = moves.map((m) => (m as { targetHex: Hex }).targetHex);
    expect(targets.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    expect(targets.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
    expect(targets.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(false);
    expect(targets.some((h) => sameHex(h, { q: 7, r: 3 }))).toBe(false);
  });

  it("never offers an extended move that crosses a water or mountain cell", () => {
    // Owned row (4,3)…(7,3) but (5,3) is a mountain — extended moves are
    // blocked beyond (4,3).
    const map = flatMap();
    map.cells[5 * map.height + 3] = { hex: { q: 5, r: 3 }, terrain: "mountain" };
    const state = {
      ...ownedState(),
      map,
    };
    const moves = legalActions(state).filter((a) => a.type === "move");
    const targets = moves.map((m) => (m as { targetHex: Hex }).targetHex);
    expect(targets.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    expect(targets.some((h) => sameHex(h, { q: 5, r: 3 }))).toBe(false);
    expect(targets.some((h) => sameHex(h, { q: 6, r: 3 }))).toBe(false);
  });
});

describe("legalActions — attack", () => {
  function attackState(opts: {
    attacker?: ApeUnit;
    defender?: ApeUnit;
    units?: ApeUnit[];
    currentPlayer?: string;
  } = {}): GameState {
    const attacker = opts.attacker ?? createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const defender = opts.defender ?? createUnit("Monkey", "p2", { q: 2, r: 0 });
    return gameState({
      sites: [],
      units: opts.units ?? [attacker, defender],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: opts.currentPlayer ?? "p1",
    });
  }

  it("enumerates an attack against every adjacent enemy unit", () => {
    const state = attackState();
    const attacks = legalActions(state).filter((a) => a.type === "attack");
    expect(attacks).toHaveLength(1);
    if (attacks[0].type === "attack") {
      expect(sameHex(attacks[0].attackerHex, { q: 1, r: 0 })).toBe(true);
      expect(sameHex(attacks[0].targetHex, { q: 2, r: 0 })).toBe(true);
    }
  });

  it("does not allow attacking a friendly unit", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 0 }, false);
    const friend = createUnit("Monkey", "p1", { q: 2, r: 0 });
    const state = attackState({ units: [attacker, friend] });
    expect(legalActions(state).filter((a) => a.type === "attack")).toHaveLength(0);
  });

  it("omits attacks for units that have already acted", () => {
    const attacker = createUnit("Monkey", "p1", { q: 1, r: 0 }, true);
    const defender = createUnit("Monkey", "p2", { q: 2, r: 0 });
    const state = attackState({ units: [attacker, defender] });
    expect(legalActions(state).filter((a) => a.type === "attack")).toHaveLength(0);
  });

  it("omits attacks when the attacker is not owned by the current player", () => {
    const attacker = createUnit("Monkey", "p2", { q: 1, r: 0 }, false);
    const defender = createUnit("Monkey", "p1", { q: 2, r: 0 });
    const state = attackState({ units: [attacker, defender] });
    expect(legalActions(state).filter((a) => a.type === "attack")).toHaveLength(0);
  });
});

describe("legalActions — turn-step ordering", () => {
  it("returns income, then recruit, then move, then attack in order", () => {
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("Grove", 2, 0, "p1"),
        createSite("Nest", 3, 0), // neutral, capturable
      ],
      units: [
        createUnit("Monkey", "p1", { q: 1, r: 0 }, false), // can move/attack
        createUnit("Monkey", "p2", { q: 2, r: 0 }), // enemy adjacent to p1 unit
      ],
      players: { p1: createPlayer("p1", 20), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const actions = legalActions(state);
    const types = actions.map((a) => a.type);
    expect(types[0]).toBe("collectIncome");
    const firstRecruit = types.indexOf("recruit");
    const firstMove = types.indexOf("move");
    const firstAttack = types.indexOf("attack");
    // recruit before move before attack.
    expect(firstRecruit).toBeGreaterThan(0);
    expect(firstMove).toBeGreaterThan(firstRecruit);
    expect(firstAttack).toBeGreaterThan(firstMove);
  });
});

/* ------------------------------------------------------------------ */
/* aiChooseMove                                                        */
/* ------------------------------------------------------------------ */

describe("aiChooseMove — determinism and legality", () => {
  it("returns the same action for the same state and seed", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1"), createSite("Grove", 2, 0)],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 }, false)],
      players: { p1: createPlayer("p1", 10), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    expect(aiChooseMove(state, 42)).toEqual(aiChooseMove(state, 42));
  });

  it("returns a legal action that applies without throwing, across many seeds", () => {
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("Grove", 2, 0),
        createSite("Nest", 3, 0),
      ],
      units: [
        createUnit("Monkey", "p1", { q: 1, r: 0 }, false),
        createUnit("Gorilla", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 20), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    for (let seed = 0; seed < 200; seed++) {
      const action = aiChooseMove(state, seed);
      expect(() => applyAction(state, action)).not.toThrow();
    }
  });

  it("returns a legal action from the legal set for a recruit-only state", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      units: [],
      players: { p1: createPlayer("p1", 20), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    for (let seed = 0; seed < 100; seed++) {
      const action = aiChooseMove(state, seed);
      expect(() => applyAction(state, action)).not.toThrow();
    }
  });

  it("returns a legal action from the legal set for a move-only state", () => {
    const state = gameState({
      sites: [],
      units: [createUnit("Monkey", "p1", { q: 1, r: 0 }, false)],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    for (let seed = 0; seed < 100; seed++) {
      const action = aiChooseMove(state, seed);
      expect(() => applyAction(state, action)).not.toThrow();
    }
  });

  it("returns a legal action from the legal set for an attack-only state", () => {
    const state = gameState({
      sites: [],
      units: [
        createUnit("Monkey", "p1", { q: 1, r: 0 }, false),
        createUnit("Monkey", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    for (let seed = 0; seed < 100; seed++) {
      const action = aiChooseMove(state, seed);
      expect(() => applyAction(state, action)).not.toThrow();
    }
  });

  it("never chooses a move onto a water cell across many seeds", () => {
    // A unit at (2,1) sits next to water (1,1),(2,0),(3,0); the AI must
    // never target a water cell as a move destination.
    const state = gameState({
      sites: [],
      units: [createUnit("Monkey", "p1", { q: 2, r: 1 }, false)],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    for (let seed = 0; seed < 500; seed++) {
      const action = aiChooseMove(state, seed);
      if (action.type !== "move") continue;
      const target = action.targetHex;
      expect(isWater(state.map, target)).toBe(false);
    }
  });

  it("never chooses a move onto a mountain cell across many seeds", () => {
    // A unit at (2,2) sits next to the mountain (2,3); the AI must never
    // target a mountain cell as a move destination.
    const state = gameState({
      sites: [],
      units: [createUnit("Monkey", "p1", { q: 2, r: 2 }, false)],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    for (let seed = 0; seed < 500; seed++) {
      const action = aiChooseMove(state, seed);
      if (action.type !== "move") continue;
      const target = action.targetHex;
      expect(isMountain(state.map, target)).toBe(false);
    }
  });

  it("uses the extended owned-land range and never exceeds it (#148)", () => {
    // A p1 unit at (3,3) with p1-owned Groves along the east row (4,3)…(7,3):
    // the AI may legitimately move up to OWN_LAND_RANGE hexes east, and must
    // never choose a target beyond that owned-land route.
    const state = flatState({
      units: [createUnit("Monkey", "p1", { q: 3, r: 3 }, false)],
      sites: [4, 5, 6, 7, 8].map((q) => createSite("Grove", q, 3, "p1")),
    });
    let usedExtended = false;
    for (let seed = 0; seed < 800; seed++) {
      const action = aiChooseMove(state, seed);
      if (action.type !== "move") continue;
      const distance = hexDistance({ q: 3, r: 3 }, action.targetHex);
      // Standard (1) or extended up to OWN_LAND_RANGE — never beyond.
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThanOrEqual(OWN_LAND_RANGE);
      if (distance > 1) usedExtended = true;
      // The move always applies without throwing (never an illegal teleport).
      expect(() => applyAction(state, action)).not.toThrow();
    }
    // Across many seeds the AI does reach targets beyond the standard range,
    // proving the extended owned-land range is part of its legal set.
    expect(usedExtended).toBe(true);
  });
});

describe("aiChooseMove — naive (difficulty 0)", () => {
  it("selects uniformly from the legal set and can produce every action type", () => {
    const state = gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("Grove", 2, 0),
      ],
      units: [
        createUnit("Monkey", "p1", { q: 1, r: 0 }, false),
        createUnit("Monkey", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 20), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const seen = new Set<GameAction["type"]>();
    for (let seed = 0; seed < 500; seed++) {
      seen.add(aiChooseMove(state, seed).type);
    }
    // With many seeds the naive AI should hit recruit, move, and attack
    // (collectIncome is also in the set).
    expect(seen.has("recruit")).toBe(true);
    expect(seen.has("move")).toBe(true);
    expect(seen.has("attack")).toBe(true);
  });
});

describe("aiChooseMove — strategic preferences", () => {
  /** A state where p1 can recruit, move to a neutral Grove, and attack. */
  function richState(): GameState {
    return gameState({
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("Grove", 1, -1), // neutral → capturable, reachable & empty
      ],
      units: [
        createUnit("Monkey", "p1", { q: 1, r: 0 }, false),
        createUnit("Monkey", "p2", { q: 2, r: 0 }), // enemy adjacent
      ],
      players: { p1: createPlayer("p1", 100), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
  }

  it("prefers recruiting the highest-affordable ape with preferRecruit", () => {
    const state = richState();
    const action = aiChooseMove(state, 7, { difficulty: 1, preferRecruit: true });
    expect(action.type).toBe("recruit");
    if (action.type === "recruit") {
      // Highest affordable ape is Gorilla (rank 4).
      expect(action.kind).toBe("Gorilla");
    }
  });

  it("prefers capturing sites with preferCapture", () => {
    const state = richState();
    const action = aiChooseMove(state, 7, { difficulty: 1, preferCapture: true });
    expect(action.type).toBe("move");
    if (action.type === "move") {
      // The preferred move targets the neutral Grove at (1,-1).
      expect(sameHex(action.targetHex, { q: 1, r: -1 })).toBe(true);
    }
  });

  it("avoids losing attacks with avoidLosingAttacks", () => {
    // p1 Monkey (rank 1) adjacent to p2 Gorilla (rank 4): a losing attack.
    const state = gameState({
      sites: [],
      units: [
        createUnit("Monkey", "p1", { q: 1, r: 0 }, false),
        createUnit("Gorilla", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const action = aiChooseMove(state, 7, {
      difficulty: 1,
      avoidLosingAttacks: true,
    });
    expect(action.type).not.toBe("attack");
  });

  it("prefers a winning attack over other actions when it is the best option", () => {
    // p1 Gorilla (rank 4) adjacent to p2 Monkey (rank 1): a winning attack.
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      units: [
        createUnit("Gorilla", "p1", { q: 1, r: 0 }, false),
        createUnit("Monkey", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 100), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
    });
    const action = aiChooseMove(state, 7, { difficulty: 1 });
    expect(action.type).toBe("attack");
  });
});

describe("aiChooseMove — legal set is never empty", () => {
  it("always has at least the collectIncome action for a present player", () => {
    const state = gameState({
      sites: [],
      units: [],
      players: { p1: createPlayer("p1", 0) },
      currentPlayer: "p1",
    });
    // collectIncome is always legal, so legalActions is never empty and
    // aiChooseMove always returns an action.
    expect(legalActions(state)).toEqual([{ type: "collectIncome" }]);
    expect(aiChooseMove(state, 1)).toEqual({ type: "collectIncome" });
  });
});
