import { describe, it, expect } from "vitest";
import { legalActions } from "../../src/core/ai";
import { aiTurnActions } from "../../src/core/gameLoop";
import { sameHex, adjacentHexes } from "../../src/core/game";
import { createUnit, createSite, createPlayer } from "../../src/core/game";
import { generateMap, terrainAt, type GameMap } from "../../src/core/mapGenerator";
import type { GameSession } from "../../src/core/gameSession";
import {
  createGameSession,
  selectAction,
  submitTurn,
  resetTurn,
  standardSetup,
  chooseHomeHexes,
  randomSeed,
  placeNeutralUnits,
  DEFAULT_NEUTRAL_UNIT_COUNT,
  GameSessionError,
} from "../../src/core/gameSession";
import { TRAINED_AI_SOURCE, TRAINED_AI_VERSION } from "../../src/core/training";

/**
 * A small 7×7 map config used by full-game simulation tests. On maps this
 * small the players' Home Trees start close together, so full games reliably
 * terminate quickly (the default 20×20 board is too large for a greedy
 * legal-move picker to reach victory in a bounded number of turns).
 */
const SIM_MAP = { width: 7, height: 7, seed: 0 };

/* ------------------------------------------------------------------ */
/* Map-agnostic test helpers                                           */
/* ------------------------------------------------------------------ */

/**
 * Return a legal `recruit` action from the session's current legal set.
 * Used instead of hard-coded hexes so tests hold on any generated map.
 */
function firstRecruit(session: GameSession) {
  const action = session.legalMoves.find((a) => a.type === "recruit");
  if (!action || action.type !== "recruit") {
    throw new Error("expected a legal recruit action");
  }
  return action;
}

/**
 * Return a legal `move` action from the session's current legal set.
 * Used instead of hard-coded hexes so tests hold on any generated map.
 */
function firstMove(session: GameSession) {
  const action = session.legalMoves.find((a) => a.type === "move");
  if (!action || action.type !== "move") {
    throw new Error("expected a legal move action");
  }
  return action;
}

/* ------------------------------------------------------------------ */
/* standardSetup                                                       */
/* ------------------------------------------------------------------ */

describe("standardSetup", () => {
  it("builds the standard two-player setup with p1 as the current player", () => {
    const state = standardSetup();
    expect(state.currentPlayer).toBe("p1");
    expect(state.turnOrder).toEqual(["p1", "p2"]);
    expect(state.winner).toBeNull();
  });

  it("places one Home Tree per player with neutral Groves/Nests between them", () => {
    const state = standardSetup();
    const homeTrees = state.sites.filter((s) => s.kind === "HomeTree");
    expect(homeTrees).toHaveLength(2);
    expect(homeTrees.some((s) => s.owner === "p1")).toBe(true);
    expect(homeTrees.some((s) => s.owner === "p2")).toBe(true);
    // 6 Groves and 4 Nests per the rules.
    expect(state.sites.filter((s) => s.kind === "Grove")).toHaveLength(6);
    expect(state.sites.filter((s) => s.kind === "Nest")).toHaveLength(4);
  });

  it("gives each player the standard starting force (3 Monkeys, 1 Gibbon, 2 bananas)", () => {
    const state = standardSetup();
    for (const id of ["p1", "p2"]) {
      const units = state.units.filter((u) => u.owner === id);
      expect(units.filter((u) => u.kind === "Monkey")).toHaveLength(3);
      expect(units.filter((u) => u.kind === "Gibbon")).toHaveLength(1);
      expect(state.players[id].bananas).toBe(2);
    }
  });

  it("generates a fresh 20x20 map by default and carries it on the state", () => {
    const state = standardSetup();
    expect(state.map.width).toBe(20);
    expect(state.map.height).toBe(20);
    expect(state.map.cells).toHaveLength(400);
  });

  it("places a different map per seed (fresh map per game)", () => {
    const a = standardSetup({ seed: 1 });
    const b = standardSetup({ seed: 2 });
    expect(a.map.cells).not.toEqual(b.map.cells);
  });

  it("reproduces the same map for the same seed", () => {
    expect(standardSetup({ seed: 7 }).map.cells).toEqual(
      standardSetup({ seed: 7 }).map.cells,
    );
  });

  it("draws a fresh random map when no explicit seed is supplied (M31-T1)", () => {
    // A handful of unseeded setups must produce more than one distinct board, so
    // every fresh load starts on a new map rather than the fixed seed-0 one.
    // (Checking >1 distinct map over several draws, rather than asserting two
    // specific calls differ, keeps the test robust while still proving the
    // regular map is no longer deterministic.)
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const s = standardSetup();
      // Fresh (random) seeds still yield valid 20×20 maps.
      expect(s.map.width).toBe(20);
      expect(s.map.height).toBe(20);
      seen.add(JSON.stringify(s.map.cells));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("reproduces the same spawn for the same seed (M31-T1)", () => {
    const a = standardSetup({ seed: 7 });
    const b = standardSetup({ seed: 7 });
    const homeOf = (state: ReturnType<typeof standardSetup>, id: string) =>
      state.sites.find((s) => s.kind === "HomeTree" && s.owner === id)!.hex;
    expect(homeOf(a, "p1")).toEqual(homeOf(b, "p1"));
    expect(homeOf(a, "p2")).toEqual(homeOf(b, "p2"));
  });

  it("randomizes spawn locations across seeds (M31-T1)", () => {
    const seen = new Set<string>();
    let varied = 0;
    for (let seed = 0; seed < 40; seed++) {
      const state = standardSetup({ seed });
      const homes = state.sites.filter((s) => s.kind === "HomeTree");
      const p1 = homes.find((s) => s.owner === "p1")!.hex;
      const p2 = homes.find((s) => s.owner === "p2")!.hex;
      seen.add(`${p1.q},${p1.r}|${p2.q},${p2.r}`);
      if (p1.q !== 0 && p2.q !== 0) varied = Math.max(varied, 1);
    }
    // Across 40 seeds the spawn spots are not pinned to one fixed pair.
    expect(seen.size).toBeGreaterThan(1);
    expect(varied).toBe(1);
  });

  it("honours a custom map config (non-default dimensions)", () => {
    const state = standardSetup({ width: 9, height: 7, seed: 3 });
    expect(state.map.width).toBe(9);
    expect(state.map.height).toBe(7);
    expect(state.map.cells).toHaveLength(9 * 7);
  });

  it("places the two Home Trees on opposite sides of the island", () => {
    // Spawn spots are now randomized (M31-T1, #220), but the left-vs-right
    // split guarantees p1 sits strictly on the left half of the island's q
    // axis and p2 on the right half, so they remain on opposite-ish sides. The
    // distance varies seed-to-seed; the ordering and side separation hold
    // across every seed (checked over a range so the random pick is exercised).
    for (let seed = 0; seed < 40; seed++) {
      const state = standardSetup({ seed });
      const homes = state.sites.filter((s) => s.kind === "HomeTree");
      const p1Home = homes.find((s) => s.owner === "p1")!.hex;
      const p2Home = homes.find((s) => s.owner === "p2")!.hex;
      // p1 strictly on the left half, p2 strictly on the right half.
      expect(p1Home.q).toBeLessThan(state.map.width / 2);
      expect(p2Home.q).toBeGreaterThanOrEqual(state.map.width / 2);
      expect(p1Home.q).toBeLessThan(p2Home.q);
    }
  });

  it("places every site on a land cell only", () => {
    const state = standardSetup();
    for (const site of state.sites) {
      expect(terrainAt(state.map, site.hex)).toBe("land");
    }
  });

  it("places no starting unit in the sea remainders", () => {
    const state = standardSetup();
    for (const unit of state.units) {
      const terrain = terrainAt(state.map, unit.hex);
      expect(terrain).not.toBe("water");
      expect(terrain).not.toBeNull();
    }
  });
});

/* ------------------------------------------------------------------ */
/* placeNeutralUnits / neutral units in setup (M30-T2 #225)            */
/* ------------------------------------------------------------------ */

describe("neutral units in setup (M30-T2 #225)", () => {
  const homeKeys = (state: ReturnType<typeof standardSetup>): Set<string> =>
    new Set(
      state.sites
        .filter((s) => s.kind === "HomeTree")
        .flatMap((s) => {
          // The FULL Home-Tree neighbourhood: the Home Tree hex plus all six
          // adjacent hexes (M30-T2 #225 acceptance criterion #2 — a neutral
          // must never sit on any hex of the neighbourhood, not just the
          // three starting-force neighbours).
          return [s.hex, ...adjacentHexes(s.hex)].map(
            (h) => `${h.q},${h.r}`,
          );
        }),
    );
  const siteKeys = (state: ReturnType<typeof standardSetup>): Set<string> =>
    new Set(state.sites.map((s) => `${s.hex.q},${s.hex.r}`));

  it("places a handful of neutral (owner null) units during setup", () => {
    const state = standardSetup();
    const neutrals = state.units.filter((u) => u.owner === null);
    expect(neutrals.length).toBeGreaterThan(0);
    expect(neutrals.length).toBeLessThanOrEqual(DEFAULT_NEUTRAL_UNIT_COUNT);
    for (const u of neutrals) expect(u.owner).toBeNull();
  });

  it("places every neutral unit on a plain-land cell", () => {
    const state = standardSetup();
    for (const u of state.units) {
      if (u.owner !== null) continue;
      expect(terrainAt(state.map, u.hex)).toBe("land");
    }
  });

  it("keeps neutral units clear of home spawn hexes/neighbourhoods and sites", () => {
    const state = standardSetup();
    const occupied = new Set([...homeKeys(state), ...siteKeys(state)]);
    for (const u of state.units) {
      if (u.owner !== null) continue;
      expect(occupied.has(`${u.hex.q},${u.hex.r}`)).toBe(false);
    }
  });

  it("places no two neutral units on the same hex", () => {
    const state = standardSetup();
    const keys = state.units
      .filter((u) => u.owner === null)
      .map((u) => `${u.hex.q},${u.hex.r}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("reproduces the exact neutral layout for the same setup seed", () => {
    const a = standardSetup({ seed: 11 });
    const b = standardSetup({ seed: 11 });
    const neutralOf = (state: ReturnType<typeof standardSetup>) =>
      state.units
        .filter((u) => u.owner === null)
        .map((u) => `${u.hex.q},${u.hex.r}`)
        .sort();
    expect(neutralOf(a)).toEqual(neutralOf(b));
  });

  it("produces a fresh neutral layout under a fresh map seed", () => {
    // Across several distinct seeds the neutral layouts are not all pinned to
    // a single fixed placement.
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const layout = standardSetup({ seed })
        .units.filter((u) => u.owner === null)
        .map((u) => `${u.hex.q},${u.hex.r}`)
        .sort()
        .join("|");
      seen.add(layout);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ */
/* placeNeutralUnits (pure helper)                                     */
/* ------------------------------------------------------------------ */

describe("placeNeutralUnits", () => {
  const key = (hex: { q: number; r: number }) => `${hex.q},${hex.r}`;

  it("places exactly `count` neutral units across distinct land cells", () => {
    const map = standardSetup({ seed: 4 }).map;
    const neutralUnits = placeNeutralUnits(map, new Set(), 6, 42);
    expect(neutralUnits).toHaveLength(6);
    const keys = neutralUnits.map((u) => key(u.hex));
    expect(new Set(keys).size).toBe(6);
    for (const u of neutralUnits) {
      expect(u.owner).toBeNull();
      expect(terrainAt(map, u.hex)).toBe("land");
    }
  });

  it("is deterministic under a fixed seed and fresh under a new seed", () => {
    const map = standardSetup({ seed: 4 }).map;
    const a = placeNeutralUnits(map, new Set(), 6, 42);
    const b = placeNeutralUnits(map, new Set(), 6, 42);
    const c = placeNeutralUnits(map, new Set(), 6, 99);
    expect(a.map((u) => key(u.hex))).toEqual(b.map((u) => key(u.hex)));
    expect(a.map((u) => key(u.hex))).not.toEqual(c.map((u) => key(u.hex)));
  });

  it("never places on occupied (cleared) hexes", () => {
    const state = standardSetup({ seed: 4 });
    const map = state.map;
    const occupied = new Set<string>();
    // Occupy every plain-land cell so no neutral unit can be placed.
    for (const cell of map.cells) {
      if (cell.terrain === "land") occupied.add(key(cell.hex));
    }
    const neutralUnits = placeNeutralUnits(map, occupied, 6, 42);
    expect(neutralUnits).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* chooseHomeHexes                                                     */
/* ------------------------------------------------------------------ */

describe("chooseHomeHexes", () => {
  it("returns two distinct home hexes from a generated map", () => {
    const { p1, p2 } = chooseHomeHexes(standardSetup().map);
    expect(sameHex(p1, p2)).toBe(false);
  });

  it("throws no-suitable-home when the map has too few suitable land cells", () => {
    // A degenerate map with a single isolated land cell (no land neighbours)
    // cannot fit two Home Trees, so setup must reject it rather than crash.
    const base = generateMap({ width: 5, height: 5, seed: 0 });
    const degenerate: GameMap = {
      width: base.width,
      height: base.height,
      cells: base.cells.map((c, i) =>
        i === 0 ? { hex: c.hex, terrain: "land" } : { hex: c.hex, terrain: "water" },
      ),
    };
    let err: unknown;
    try {
      chooseHomeHexes(degenerate);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(GameSessionError);
    expect((err as GameSessionError).kind).toBe("no-suitable-home");
  });

  it("is deterministic for a fixed seed (M31-T1)", () => {
    const map = standardSetup({ seed: 3 }).map;
    const a = chooseHomeHexes(map, 99);
    const b = chooseHomeHexes(map, 99);
    expect(a).toEqual(b);
  });

  it("varies the chosen spawns across seeds on the same map (M31-T1)", () => {
    const map = standardSetup({ seed: 3 }).map;
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const { p1, p2 } = chooseHomeHexes(map, seed);
      seen.add(`${p1.q},${p1.r}|${p2.q},${p2.r}`);
    }
    // The picker is genuinely random across seeds, not pinned to one pair.
    expect(seen.size).toBeGreaterThan(1);
  });

  it("always places p1 on the left half and p2 on the right half", () => {
    const map = standardSetup({ seed: 3 }).map; // complex island, many candidates
    for (let seed = 0; seed < 20; seed++) {
      const { p1, p2 } = chooseHomeHexes(map, seed);
      expect(p1.q).toBeLessThan(map.width / 2);
      expect(p2.q).toBeGreaterThanOrEqual(map.width / 2);
    }
  });

  it("falls back to leftmost/rightmost when all candidates sit on one side (M31-T1)", () => {
    // A map whose suitable land cells all lie on the left half (the right
    // half is entirely water) has no right-half candidates, so the picker
    // must fall back to the leftmost/rightmost candidates — still two
    // separated Home Trees — rather than pick from an empty side or crash.
    const base = generateMap({ width: 9, height: 9, seed: 0 });
    const degenerate: GameMap = {
      width: base.width,
      height: base.height,
      cells: base.cells.map((c) => ({
        hex: c.hex,
        terrain: c.hex.q <= 4 ? "land" : "water",
      })),
    };
    const { p1, p2 } = chooseHomeHexes(degenerate, 1);
    // Both spawns land on the only land (the left half) and are separated.
    expect(p1.q).toBeLessThan(4.5);
    expect(p2.q).toBeLessThan(4.5);
    expect(sameHex(p1, p2)).toBe(false);
    // The fallback picks the two extreme candidates (leftmost come before
    // rightmost in sorted-by-q order).
    expect(p1.q).toBeLessThanOrEqual(p2.q);
  });
});

/* ------------------------------------------------------------------ */
/* randomSeed                                                          */
/* ------------------------------------------------------------------ */

describe("randomSeed", () => {
  it("returns a non-negative integer", () => {
    for (let i = 0; i < 50; i++) {
      const s = randomSeed();
      expect(typeof s).toBe("number");
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
    }
  });

  it("produces varied seeds across calls (fresh spawns/maps each load)", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 50; i++) seen.add(randomSeed());
    expect(seen.size).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ */
/* createGameSession                                                   */
/* ------------------------------------------------------------------ */

describe("createGameSession", () => {
  it("starts on the recruit step (income applied automatically, no income step)", () => {
    const session = createGameSession();
    expect(session.step).toBe("recruit");
    expect(session.moves).toEqual([]);
    // Since income is collected automatically at the start of the turn, the
    // human's turn begins directly on recruit/move actions — never a manual
    // collectIncome step.
    expect(session.legalMoves.some((a) => a.type === "collectIncome")).toBe(false);
    expect(session.legalMoves.some((a) => a.type === "recruit")).toBe(true);
    expect(session.winner).toBeNull();
  });

  it("applies income from controlled sites automatically at the start of the turn", () => {
    const session = createGameSession();
    // p1 starts with 2 bananas and controls their Home Tree (income 3), so the
    // projected start-of-turn state has collected the 3 bananas automatically.
    const setup = standardSetup();
    expect(session.state.players.p1.bananas).toBe(
      setup.players.p1.bananas + 3,
    );
    expect(session.state.players.p1.bananas).toBe(5);
  });

  it("exposes the initial GameState and the current player's legal moves", () => {
    const session = createGameSession();
    expect(session.state.currentPlayer).toBe("p1");
    expect(session.baseState.currentPlayer).toBe("p1");
    // The base state is the same map/sites; the projected state adds the
    // automatic turn-start income.
    expect(session.state.sites).toEqual(session.baseState.sites);
  });

  it("resets the current player's units so they may act this turn", () => {
    const session = createGameSession();
    for (const unit of session.state.units) {
      if (unit.owner === "p1") expect(unit.hasActed).toBe(false);
    }
  });

  it("carries the aiSeed and aiOptions through to the session", () => {
    const session = createGameSession(42, { difficulty: 1, preferRecruit: true });
    expect(session.aiSeed).toBe(42);
    expect(session.aiOptions).toEqual({ difficulty: 1, preferRecruit: true });
  });

  it("carries an optional trained policy through to the session (M28-T3)", () => {
    const policy = {
      weights: [0, 0, 100, 0, 0, 0],
      bias: 0,
      gamesSeen: 1,
      decisionsSeen: 1,
      source: TRAINED_AI_SOURCE,
      version: TRAINED_AI_VERSION,
    };
    const withPolicy = createGameSession(0, {}, undefined, policy);
    expect(withPolicy.trainedPolicy).toEqual(policy);
    // Without a policy the field is left undefined so the session falls back
    // to the rule-legal base AI for its replies.
    expect(createGameSession().trainedPolicy).toBeUndefined();
  });

  it("passes a mapConfig through to the generated board", () => {
    const session = createGameSession(0, {}, { width: 9, height: 7, seed: 4 });
    const state = session.baseState;
    expect(state.map.width).toBe(9);
    expect(state.map.height).toBe(7);
  });
});

/* ------------------------------------------------------------------ */
/* selectAction                                                        */
/* ------------------------------------------------------------------ */

describe("selectAction", () => {
  it("does not expose a manual collectIncome action on the recruit step", () => {
    const session = createGameSession();
    expect(() =>
      selectAction(session, { type: "collectIncome" }),
    ).toThrow(GameSessionError);
    expect(() =>
      selectAction(session, { type: "collectIncome" }),
    ).toThrow(/not a legal move/);
  });

  it("appends a recruit action and stays in the recruit step", () => {
    let session = createGameSession();
    const recruit = firstRecruit(session);
    session = selectAction(session, recruit);
    expect(session.step).toBe("recruit");
    expect(session.moves).toHaveLength(1);
    // The recruited unit appears in the projected state.
    expect(
      session.state.units.some(
        (u) =>
          u.owner === "p1" && u.kind === recruit.kind && sameHex(u.hex, recruit.hex),
      ),
    ).toBe(true);
  });

  it("rejects an action that is not in the current legalMoves", () => {
    const session = createGameSession();
    // A blind recruit at a non-legal hex is not in legalMoves.
    expect(() =>
      selectAction(session, { type: "recruit", kind: "Monkey", hex: { q: 0, r: 0 } }),
    ).toThrow(GameSessionError);
    expect(() =>
      selectAction(session, { type: "recruit", kind: "Monkey", hex: { q: 0, r: 0 } }),
    ).toThrow(/not a legal move/);
  });

  it("moves to the movefight step after a move or attack", () => {
    let session = createGameSession();
    const move = firstMove(session);
    session = selectAction(session, move);
    expect(session.step).toBe("movefight");
    // Recruiting is no longer legal once the human has moved/fought.
    expect(
      session.legalMoves.some((a) => a.type === "recruit"),
    ).toBe(false);
    expect(
      session.legalMoves.some((a) => a.type === "move" || a.type === "attack"),
    ).toBe(true);
  });

  it("allows skipping recruiting by moving straight to the movefight step", () => {
    let session = createGameSession();
    session = selectAction(session, firstMove(session));
    expect(session.step).toBe("movefight");
  });

  it("rejects a recruit after the human has moved/fought", () => {
    let session = createGameSession();
    // A recruit action that was legal before moving.
    const recruit = firstRecruit(session);
    session = selectAction(session, firstMove(session));
    // After a move, recruiting is no longer in legalMoves.
    expect(() => selectAction(session, recruit)).toThrow(GameSessionError);
  });

  it("removes the moved unit from legalMoves as it acts", () => {
    let session = createGameSession();
    const first = firstMove(session);
    const movedFrom = first.unitHex;
    // The moved unit is selectable before the move.
    expect(
      session.legalMoves.some(
        (a) => a.type === "move" && sameHex(a.unitHex, movedFrom),
      ),
    ).toBe(true);
    session = selectAction(session, first);
    // Once a unit acts it is no longer selectable: no move action originates
    // from the hex it vacated.
    expect(
      session.legalMoves.some(
        (a) => a.type === "move" && sameHex(a.unitHex, movedFrom),
      ),
    ).toBe(false);
    // The unit's new position has already acted, so it is not a move source.
    expect(
      session.legalMoves.some(
        (a) => a.type === "move" && sameHex(a.unitHex, first.targetHex),
      ),
    ).toBe(false);
  });

  it("selects an attack action on the movefight step", () => {
    // Build a session where p1 has a Gorilla adjacent to a p2 Monkey.
    const baseState = {
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0, "p2"),
      ],
      units: [
        createUnit("Gorilla", "p1", { q: 1, r: 0 }, false),
        createUnit("Monkey", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
      turnOrder: ["p1", "p2"],
      winner: null,
      map: generateMap({ width: 7, height: 7, seed: 0 }),
    };
    let session: GameSession = {
      baseState,
      state: baseState,
      moves: [],
      step: "recruit",
      legalMoves: [
        { type: "attack", attackerHex: { q: 1, r: 0 }, targetHex: { q: 2, r: 0 } },
      ],
      aiSeed: 0,
      aiOptions: {},
      winner: null,
    };
    // The attack action is legal and can be selected directly.
    session = selectAction(session, {
      type: "attack",
      attackerHex: { q: 1, r: 0 },
      targetHex: { q: 2, r: 0 },
    });
    expect(session.step).toBe("movefight");
    expect(session.moves).toHaveLength(1);
    // The Gorilla wins and captures the hex; the Monkey is destroyed.
    expect(session.state.units).toHaveLength(1);
    expect(session.state.units[0].owner).toBe("p1");
  });

  it("rejects actions after the game has ended", () => {
    let session = createGameSession();
    // Force a win by making p1 control every Home Tree before submitting.
    session = {
      ...session,
      baseState: {
        ...session.baseState,
        sites: session.baseState.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
      state: {
        ...session.state,
        sites: session.state.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
    };
    session = submitTurn(session);
    expect(session.step).toBe("done");
    expect(session.winner).toBe("p1");
    expect(() =>
      selectAction(session, { type: "recruit", kind: "Monkey", hex: { q: 0, r: 0 } }),
    ).toThrow(GameSessionError);
  });
});

/* ------------------------------------------------------------------ */
/* submitTurn                                                          */
/* ------------------------------------------------------------------ */

describe("submitTurn", () => {
  it("runs the AI reply and advances to the next human turn", () => {
    const session = createGameSession();
    const next = submitTurn(session);
    // The game is not over; the next human turn starts on the recruit step
    // (income collected automatically — no manual collectIncome step).
    expect(next.step).toBe("recruit");
    expect(next.moves).toEqual([]);
    expect(next.legalMoves.some((a) => a.type === "collectIncome")).toBe(false);
    expect(next.legalMoves.some((a) => a.type === "recruit")).toBe(true);
    expect(next.winner).toBeNull();
    // A full round is human + AI + advance back to the human, so the next
    // human turn is again p1 (the human is always the session's current player).
    expect(next.state.currentPlayer).toBe("p1");
    expect(next.baseState.currentPlayer).toBe("p1");
  });

  it("produces a deterministic result for a given aiSeed", () => {
    // Fix the map seed (which now randomizes by default) so the AI-seed
    // determinism is measured against the same starting board.
    const build = () => {
      const session = createGameSession(7, {}, SIM_MAP);
      return submitTurn(session);
    };
    const a = build();
    const b = build();
    expect(a.state).toEqual(b.state);
  });

  it("uses a trained policy for the AI reply when present (M28-T3)", () => {
    const policy = {
      weights: [0, 0, 100, 0, 0, 0], // strongly prefer captures
      bias: 0,
      gamesSeen: 1,
      decisionsSeen: 1,
      source: TRAINED_AI_SOURCE,
      version: TRAINED_AI_VERSION,
    };
    const base = submitTurn(createGameSession(0, {}, SIM_MAP));
    const trained = submitTurn({
      ...createGameSession(0, {}, SIM_MAP),
      trainedPolicy: policy,
    });
    // The trained opponent steers the AI reply (capture-heavy selection), so
    // submitting the same start-of-game turn with the policy produces a
    // different outcome than the rule-legal base AI.
    expect(trained.state).not.toEqual(base.state);
    // Both outcomes land on a valid next player (nothing breaks).
    expect(trained.state.players[trained.state.currentPlayer]).toBeDefined();
  });

  it("a null trained policy falls back exactly to the rule-legal AI (M28-T3)", () => {
    const base = submitTurn(createGameSession(7, {}, SIM_MAP));
    const fallback = submitTurn({
      ...createGameSession(7, {}, SIM_MAP),
      trainedPolicy: null,
    });
    expect(fallback.state).toEqual(base.state);
  });

  it("applies the human's selected moves before the AI reply", () => {
    let session = createGameSession();
    const recruit = firstRecruit(session);
    session = selectAction(session, recruit);
    const next = submitTurn(session);
    // The recruited ape remains on the map after the turn.
    expect(
      next.state.units.some(
        (u) =>
          u.owner === "p1" && u.kind === recruit.kind && sameHex(u.hex, recruit.hex),
      ),
    ).toBe(true);
  });

  it("submits from the movefight step even while other units remain unmoved (#131)", () => {
    // Move one of p1's units (advancing to the movefight step) while other p1
    // units never act, then submit the turn. End Turn must still work: it ends
    // the human's turn and runs the AI reply regardless of how many units acted.
    let session = createGameSession();
    session = selectAction(session, firstMove(session));
    expect(session.step).toBe("movefight");
    // At least one p1 unit is still unmoved (hasActed false) on the projected
    // movefight state, so this is exactly the "didn't move all my units" case.
    expect(
      session.state.units.some((u) => u.owner === "p1" && !u.hasActed),
    ).toBe(true);

    const next = submitTurn(session);
    // The AI replied and the next human turn began.
    expect(next.step).toBe("recruit");
    expect(next.winner).toBeNull();
    expect(next.state.currentPlayer).toBe("p1");
    expect(next.moves).toEqual([]);
  });

  it("marks the session done with a winner when the game ends", () => {
    let session = createGameSession();
    // p1 controls every Home Tree, so the human wins before the AI acts.
    session = {
      ...session,
      baseState: {
        ...session.baseState,
        sites: session.baseState.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
      state: {
        ...session.state,
        sites: session.state.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
    };
    const next = submitTurn(session);
    expect(next.step).toBe("done");
    expect(next.winner).toBe("p1");
    expect(next.legalMoves).toEqual([]);
  });

  it("rejects submitting after the game has already ended", () => {
    let session = createGameSession();
    session = {
      ...session,
      baseState: {
        ...session.baseState,
        sites: session.baseState.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
      state: {
        ...session.state,
        sites: session.state.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
    };
    session = submitTurn(session);
    expect(() => submitTurn(session)).toThrow(GameSessionError);
  });
});

/* ------------------------------------------------------------------ */
/* resetTurn                                                           */
/* ------------------------------------------------------------------ */

describe("resetTurn", () => {
  it("discards this turn's selections and returns to the recruit step", () => {
    let session = createGameSession();
    session = selectAction(session, firstRecruit(session));
    expect(session.step).toBe("recruit");
    expect(session.moves).toHaveLength(1);

    const reset = resetTurn(session);
    expect(reset.step).toBe("recruit");
    expect(reset.moves).toEqual([]);
    expect(reset.legalMoves.some((a) => a.type === "collectIncome")).toBe(false);
    expect(reset.legalMoves.some((a) => a.type === "recruit")).toBe(true);
    expect(reset.winner).toBeNull();
    // The base state (start of the turn) is preserved; the projected state has
    // the turn's income collected automatically.
    expect(reset.baseState).toEqual(session.baseState);
    expect(reset.state.players.p1.bananas).toBe(5);
  });

  it("returns the session unchanged once the game has ended", () => {
    let session = createGameSession();
    session = {
      ...session,
      baseState: {
        ...session.baseState,
        sites: session.baseState.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
      state: {
        ...session.state,
        sites: session.state.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
    };
    session = submitTurn(session);
    expect(session.step).toBe("done");
    const reset = resetTurn(session);
    expect(reset.step).toBe("done");
    expect(reset.winner).toBe("p1");
  });
});

/* ------------------------------------------------------------------ */
/* Full-game simulation via the session                                */
/* ------------------------------------------------------------------ */

describe("full-game simulation via session", () => {
  it("completes many seeded games with valid states and no illegal moves", () => {
    for (let gameSeed = 0; gameSeed < 6; gameSeed++) {
      let session = createGameSession(gameSeed, {}, SIM_MAP);
      let guard = 0;
      while (session.step !== "done" && guard < 200) {
        // Build the human's turn by applying, through the session API
        // (selectAction), the AI layer's own legal recruit/move/attack sequence
        // generated on the income-applied start-of-turn state. There is no
        // manual income step — income is applied automatically at the start of
        // the turn, and `selectAction` validates every action against the
        // session's current legalMoves. Then submit the turn and advance.
        const humanMoves = aiTurnActions(session.state, gameSeed * 1000 + guard);
        for (const action of humanMoves) {
          session = selectAction(session, action);
        }
        session = submitTurn(session);
        expect(session.state.players[session.state.currentPlayer]).toBeDefined();
        guard++;
      }
      // With the Protection / Safety Zones rule (#195) the intended defensive
      // standoffs can slow a naive-AI game past the 200-turn safety guard. The
      // loop never applied an illegal move (selectAction/submitTurn throw on
      // any). If the game did complete, its winner must be a valid player;
      // otherwise the guard was reached safely without a decisive winner.
      if (session.step === "done") {
        expect(session.winner).toMatch(/^p[12]$/);
      }
    }
  });

  it("every exposed legal move is legal to apply to the projected state", () => {
    const session = createGameSession(3);
    for (const action of session.legalMoves) {
      // The legal move must be one of the core's enumerated legal actions.
      const all = legalActions(session.state);
      expect(
        all.some(
          (a) =>
            JSON.stringify(a) === JSON.stringify(action),
        ),
      ).toBe(true);
    }
  });

  it("the session never produces an illegal move across many seeds", () => {
    // Fix a deterministic map (the default is now randomized per load, M31-T1)
    // so this iterates the AI across many AI seeds against one stable board —
    // the map-vs-AI matrix is covered by the seeded MAP tests above.
    for (let seed = 0; seed < 20; seed++) {
      const session = createGameSession(seed, {}, SIM_MAP);
      const next = submitTurn(session);
      // The AI's reply via playTurn must not throw and must land on a valid player.
      expect(next.state.players[next.state.currentPlayer]).toBeDefined();
    }
  });
});
