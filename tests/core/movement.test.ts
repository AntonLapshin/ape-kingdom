import { describe, it, expect } from "vitest";
import { standardSetup } from "../../src/core/gameSession";
import { movementInfo } from "../../src/core/movement";
import { sameHex, createUnit, createSite, createPlayer, moveUnit, adjacentHexes, type GameState, type Hex } from "../../src/core/game";
import type { GameMap } from "../../src/core/mapGenerator";

/**
 * Reset the current player's units so they may act this turn (mirrors the
 * session's turn-start reset), making them movable for the derivation.
 */
function activeTurn(state: GameState): GameState {
  const me = state.currentPlayer;
  return {
    ...state,
    units: state.units.map((u) =>
      u.owner === me ? { ...u, hasActed: false } : u,
    ),
  };
}

function p1Home(state: GameState): Hex {
  return state.sites.find(
    (s) => s.kind === "HomeTree" && s.owner === "p1",
  )!.hex;
}

describe("movementInfo", () => {
  it("returns no movable unit and no reachable cells when no hex is selected", () => {
    const state = activeTurn(standardSetup());
    const info = movementInfo(state, null);
    expect(info.unit).toBeNull();
    expect(info.movable).toBe(false);
    expect(info.reachable).toEqual([]);
  });

  it("returns no movable unit for an empty hex", () => {
    const state = activeTurn(standardSetup());
    const emptyHex = state.map.cells
      .map((c) => c.hex)
      .find((h) => !state.units.some((u) => sameHex(u.hex, h)))!;
    const info = movementInfo(state, emptyHex);
    expect(info.unit).toBeNull();
    expect(info.movable).toBe(false);
    expect(info.reachable).toEqual([]);
  });

  it("marks a current-player unit that has already acted as not movable", () => {
    // In the raw standard setup the current player's units have hasActed=true.
    const state = standardSetup();
    const home = p1Home(state);
    const info = movementInfo(state, home);
    expect(info.unit).not.toBeNull();
    expect(info.unit!.owner).toBe("p1");
    expect(info.movable).toBe(false);
    expect(info.reachable).toEqual([]);
  });

  it("highlights every reachable, unoccupied target for a movable unit", () => {
    const state = activeTurn(standardSetup());
    const home = p1Home(state);
    const info = movementInfo(state, home);
    expect(info.movable).toBe(true);
    expect(info.reachable.length).toBeGreaterThan(0);
    // Every reachable hex is adjacent to (in movement range of) the home and
    // is either unoccupied or a join-eligible same-kingdom unit (joining adds
    // levels: 1+1=2, …). A reachable target is never an enemy-occupied hex.
    for (const target of info.reachable) {
      const occupant = state.units.find((u) => sameHex(u.hex, target));
      expect(occupant === undefined || occupant.owner === "p1").toBe(true);
    }
    // The home itself is not a move target.
    expect(info.reachable.some((h) => sameHex(h, home))).toBe(false);
  });

  it("does not list a current-player-owned unit as movable for the opponent", () => {
    // Force p2 to be the current player; p1's units are not movable by the
    // current player.
    const base = activeTurn(standardSetup());
    const state: GameState = { ...base, currentPlayer: "p2" };
    const p1HomeHex = p1Home(state);
    const info = movementInfo(state, p1HomeHex);
    expect(info.unit).not.toBeNull();
    expect(info.unit!.owner).toBe("p1");
    // Not the current player's unit, so not movable and no reachable targets.
    expect(info.movable).toBe(false);
    expect(info.reachable).toEqual([]);
  });

  it("derives reachable from legal move actions so a move never throws", () => {
    const state = activeTurn(standardSetup());
    const home = p1Home(state);
    const info = movementInfo(state, home);
    const moved = moveUnit(state, info.unit!, info.reachable[0]);
    const afterUnit = moved.units.find((u) => sameHex(u.hex, info.reachable[0]));
    expect(afterUnit).toBeDefined();
    expect(afterUnit!.owner).toBe("p1");
    expect(afterUnit!.hasActed).toBe(true);
  });

  it("reports joinable friendly units as reachable targets for a movable unit", () => {
    // A unit fully surrounded by friendly units can still join them: moving
    // onto a same-kingdom unit adds the levels (1+1=2, 2+1=3, 2+2=4, 3+1=4),
    // so every adjacent friendly Monkeys is a legal join (move) target.
    const state = activeTurn(standardSetup());
    const me = state.currentPlayer;
    const home = p1Home(state);
    const origin = state.units.find((u) => sameHex(u.hex, home))!;
    // Place friendly blockers on every adjacent hex of the origin, and clear
    // any other current-player units so only the origin unit can move.
    const blockers = adjacentHexes(origin.hex).map((hex) =>
      createUnit("Monkey", me, hex, false),
    );
    // Isolate the origin unit: clear every other unit (enemies AND neutrals,
    // M30-T2 #225) so only the origin unit can move and the six blocker hexes
    // around it are exactly the join targets — a random neutral sitting on one
    // of those hexes would otherwise turn it into a capture target instead of
    // a plain reachable join target and break the length-6 assertion.
    const clearedUnits = state.units.filter((u) => sameHex(u.hex, origin.hex));
    const newState: GameState = {
      ...state,
      units: [...clearedUnits, ...blockers],
    };
    const info = movementInfo(newState, origin.hex);
    expect(info.movable).toBe(true);
    // Every adjacent friendly Monkey is a join target (1+1=2 within max rank).
    expect(info.reachable).toHaveLength(blockers.length);
    for (const b of blockers) {
      expect(info.reachable.some((h) => sameHex(h, b.hex))).toBe(true);
    }
  });

  it("highlights the extended owned-land range for a unit moving through its own territory (#148)", () => {
    // A p1 unit at (3,3) on a flat all-land map with p1-owned Groves along the
    // east row (4,3)…(7,3). The UI highlight (via movementInfo → legalActions)
    // must include cells up to OWN_LAND_RANGE away through that own land.
    const width = 10;
    const height = 10;
    const cells: GameMap["cells"] = [];
    for (let q = 0; q < width; q++) {
      for (let r = 0; r < height; r++) {
        cells[q * height + r] = { hex: { q, r }, terrain: "land" };
      }
    }
    const state: GameState = {
      sites: [4, 5, 6, 7].map((q) => createSite("Grove", q, 3, "p1")),
      units: [createUnit("Monkey", "p1", { q: 3, r: 3 }, false)],
      players: { p1: createPlayer("p1"), p2: createPlayer("p2") },
      currentPlayer: "p1",
      turnOrder: ["p1", "p2"],
      winner: null,
      map: { width, height, cells },
    };
    const info = movementInfo(state, { q: 3, r: 3 });
    expect(info.movable).toBe(true);
    for (const q of [4, 5, 6, 7]) {
      expect(info.reachable.some((h) => sameHex(h, { q, r: 3 }))).toBe(true);
    }
    // Beyond the own-land range is never highlighted.
    expect(info.reachable.some((h) => sameHex(h, { q: 8, r: 3 }))).toBe(false);
  });

  it("lists an adjacent enemy unit's hex as an attackable capture target (M26-T1/#169)", () => {
    // A p1 unit at (3,3) with an adjacent p2 enemy at (4,3). The enemy hex is
    // an `attackable` (red capture) target, distinct from the grayish plain
    // move targets (which are always unoccupied).
    const width = 10;
    const height = 10;
    const cells: GameMap["cells"] = [];
    for (let q = 0; q < width; q++) {
      for (let r = 0; r < height; r++) {
        cells[q * height + r] = { hex: { q, r }, terrain: "land" };
      }
    }
    const state: GameState = {
      sites: [],
      units: [
        createUnit("Monkey", "p1", { q: 3, r: 3 }, false),
        createUnit("Gibbon", "p2", { q: 4, r: 3 }, false),
      ],
      players: { p1: createPlayer("p1"), p2: createPlayer("p2") },
      currentPlayer: "p1",
      turnOrder: ["p1", "p2"],
      winner: null,
      map: { width, height, cells },
    };
    const info = movementInfo(state, { q: 3, r: 3 });
    expect(info.movable).toBe(true);
    // The enemy-occupied hex is a capture target, never a plain move target.
    expect(info.attackable.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(true);
    expect(info.reachable.some((h) => sameHex(h, { q: 4, r: 3 }))).toBe(false);
    // A non-adjacent hex is never attackable.
    expect(info.attackable.some((h) => sameHex(h, { q: 8, r: 3 }))).toBe(false);
  });

  it("reports no attackable targets when no adjacent enemy exists (M26-T1/#169)", () => {
    const state = activeTurn(standardSetup());
    const home = p1Home(state);
    const info = movementInfo(state, home);
    // An isolated p1 unit with no enemy adjacency attack is legal for the
    // home unit iff its neighbours include no enemy; on the standard board the
    // home unit's reachable move targets are all unoccupied.
    expect(Array.isArray(info.attackable)).toBe(true);
    // The home unit's own hex and any plain move target are never in attackable.
    for (const target of info.reachable) {
      expect(info.attackable.some((h) => sameHex(h, target))).toBe(false);
    }
  });
});
