import { describe, it, expect } from "vitest";
import { standardSetup } from "../../src/core/gameSession";
import { movementInfo } from "../../src/core/movement";
import { sameHex, createUnit, moveUnit, adjacentHexes, type GameState, type Hex } from "../../src/core/game";

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
    // unoccupied on the board.
    for (const target of info.reachable) {
      const occupied = state.units.some((u) => sameHex(u.hex, target));
      expect(occupied).toBe(false);
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

  it("reports no reachable targets for a movable unit with nowhere to go", () => {
    // A unit fully surrounded by friendly units has no legal move targets.
    const state = activeTurn(standardSetup());
    const me = state.currentPlayer;
    const home = p1Home(state);
    const origin = state.units.find((u) => sameHex(u.hex, home))!;
    // Place friendly blockers on every adjacent hex of the origin, and clear
    // any other current-player units so only the origin unit can move.
    const blockers = adjacentHexes(origin.hex).map((hex) =>
      createUnit("Monkey", me, hex),
    );
    const clearedUnits = state.units.filter(
      (u) => sameHex(u.hex, origin.hex) || u.owner !== me,
    );
    const newState: GameState = {
      ...state,
      units: [...clearedUnits, ...blockers],
    };
    const info = movementInfo(newState, origin.hex);
    expect(info.movable).toBe(true);
    expect(info.reachable).toEqual([]);
  });
});
