import { describe, it, expect } from "vitest";
import {
  visibleHexes,
  unitVision,
  HOME_TREE_VISION,
  UNIT_VISION,
  DEFAULT_UNIT_VISION,
} from "../../src/core/vision";
import {
  createPlayer,
  createSite,
  createUnit,
  hexDistance,
  sameHex,
  type ApeKind,
  type ApeUnit,
  type PlayerId,
  type Site,
} from "../../src/core/game";
import { generateMap } from "../../src/core/mapGenerator";
import type { GameState } from "../../src/core/game";

/** A tiny 7×7 map with no mountains/lakes for predictable geometry. */
const map = generateMap({ width: 7, height: 7, seed: 1, islandSize: 1, mountainDensity: 0, lakeDensity: 0 });

/** Build a minimal GameState around the shared map. */
function makeState(
  units: ApeUnit[] = [],
  sites: Site[] = [],
  territory?: Record<string, PlayerId>,
): GameState {
  return {
    sites,
    units,
    players: { p1: createPlayer("p1"), p2: createPlayer("p2") },
    currentPlayer: "p1",
    turnOrder: ["p1", "p2"],
    winner: null,
    map,
    territory,
  };
}

/** Whether any returned hex is within `radius` of `source`. */
function expectRevealedRadius(
  revealed: Array<{ q: number; r: number }>,
  source: { q: number; r: number },
  radius: number,
) {
  for (const hex of revealed) {
    expect(hexDistance(source, hex)).toBeLessThanOrEqual(radius);
  }
}

describe("unitVision", () => {
  it("maps Monkey to 1, Gibbon to 2, and the other kinds to 3", () => {
    expect(unitVision("Monkey")).toBe(1);
    expect(unitVision("Gibbon")).toBe(2);
    expect(unitVision("Chimpanzee")).toBe(3);
    expect(unitVision("Gorilla")).toBe(3);
    expect(UNIT_VISION).toEqual({
      Monkey: 1,
      Gibbon: 2,
      Chimpanzee: 3,
      Gorilla: 3,
    });
  });

  it("falls back to the default vision for an unknown kind", () => {
    expect(DEFAULT_UNIT_VISION).toBe(3);
    expect(unitVision("Yeti")).toBe(DEFAULT_UNIT_VISION);
  });
});

describe("visibleHexes — fog off (default)", () => {
  it("returns every map cell when fog is off (default)", () => {
    const state = makeState([createUnit("Monkey", "p1", { q: 3, r: 3 })]);
    const revealed = visibleHexes(state, "p1");
    expect(revealed.length).toBe(map.cells.length);
    // Every map cell is present.
    for (const cell of map.cells) {
      expect(revealed.some((h) => sameHex(h, cell.hex))).toBe(true);
    }
  });

  it("returns every map cell even for the opponent when fog is off", () => {
    const state = makeState([createUnit("Monkey", "p1", { q: 3, r: 3 })]);
    expect(visibleHexes(state, "p2").length).toBe(map.cells.length);
  });
});

describe("visibleHexes — a Monkey reveals 1 ring", () => {
  it("reveals the source cell and its 1-ring, nothing farther", () => {
    const source = { q: 3, r: 3 };
    const state = makeState([createUnit("Monkey", "p1", source)]);
    const revealed = visibleHexes(state, "p1", true);

    expect(revealed.length).toBeGreaterThan(0);
    // The source cell itself is revealed.
    expect(revealed.some((h) => sameHex(h, source))).toBe(true);
    // Every revealed cell is within distance 1 of the source.
    expectRevealedRadius(revealed, source, 1);
    // The full 1-ring is revealed: the source plus its 6 neighbours.
    expect(revealed.length).toBe(7);
  });
});

describe("visibleHexes — a Gibbon reveals 2 rings", () => {
  it("reveals the source cell and rings up to distance 2, nothing farther", () => {
    const source = { q: 3, r: 3 };
    const state = makeState([createUnit("Gibbon", "p1", source)]);
    const revealed = visibleHexes(state, "p1", true);

    expect(revealed.some((h) => sameHex(h, source))).toBe(true);
    expectRevealedRadius(revealed, source, 2);
    // Distance-2 ring has 12 cells + 6 at ring 1 + source = 19.
    expect(revealed.length).toBe(19);
  });

  it("reveals more than a Monkey does for the same source", () => {
    const source = { q: 3, r: 3 };
    const monkey = makeState([createUnit("Monkey", "p1", source)]);
    const gibbon = makeState([createUnit("Gibbon", "p1", source)]);
    expect(visibleHexes(gibbon, "p1", true).length).toBeGreaterThan(
      visibleHexes(monkey, "p1", true).length,
    );
  });
});

describe("visibleHexes — Home Tree and the other units reveal 3 rings", () => {
  it("a controlled Home Tree reveals rings up to distance 3", () => {
    const hex = { q: 3, r: 3 };
    const state = makeState(
      [createUnit("Monkey", "p2", { q: 0, r: 6 })], // an unrelated far unit from p2
      [createSite("HomeTree", hex.q, hex.r, "p1")],
    );
    const revealed = visibleHexes(state, "p1", true);
    expect(revealed.some((h) => sameHex(h, hex))).toBe(true);
    expectRevealedRadius(revealed, hex, HOME_TREE_VISION);
    expect(HOME_TREE_VISION).toBe(3);
  });

  it.each<[ApeKind, number]>([
    ["Chimpanzee", 3],
    ["Gorilla", 3],
  ])("a %s unit reveals rings up to distance %i", (kind, radius) => {
    const source = { q: 3, r: 3 };
    const state = makeState([createUnit(kind, "p1", source)]);
    const revealed = visibleHexes(state, "p1", true);
    expect(revealed.some((h) => sameHex(h, source))).toBe(true);
    expectRevealedRadius(revealed, source, radius);
  });
});

describe("visibleHexes — per-player ownership", () => {
  it("a player sees only from their own Home Tree, not the opponent's", () => {
    // p1's Home Tree on the left, p2's on the right; no units.
    const tree1 = { q: 1, r: 3 };
    const tree2 = { q: 5, r: 3 };
    const state = makeState(
      [],
      [
        createSite("HomeTree", tree1.q, tree1.r, "p1"),
        createSite("HomeTree", tree2.q, tree2.r, "p2"),
      ],
    );
    const forP1 = visibleHexes(state, "p1", true);
    const forP2 = visibleHexes(state, "p2", true);

    // p1 sees its own tree but not p2's far tree.
    expect(forP1.some((h) => sameHex(h, tree1))).toBe(true);
    expect(forP1.some((h) => sameHex(h, tree2))).toBe(false);
    // p2 sees its own tree but not p1's far tree.
    expect(forP2.some((h) => sameHex(h, tree2))).toBe(true);
    expect(forP2.some((h) => sameHex(h, tree1))).toBe(false);
  });

  it("a player with no Home Tree and no units sees nothing under fog", () => {
    // p1 has no owned sight lines (no Home Tree, no units); p2 owns a tree.
    const tree2 = { q: 5, r: 3 };
    const state = makeState(
      [],
      [createSite("HomeTree", tree2.q, tree2.r, "p2")],
    );
    const forP1 = visibleHexes(state, "p1", true);

    expect(forP1).toEqual([]);
  });

  it("a player does not see from an opponent's unit", () => {
    const source = { q: 3, r: 3 };
    const far = { q: 2, r: 3 };
    // p2's Monkey reveals the source; p1 has no sight lines.
    const state = makeState([createUnit("Monkey", "p2", source)]);
    const forP1 = visibleHexes(state, "p1", true);
    const forP2 = visibleHexes(state, "p2", true);

    expect(forP2.some((h) => sameHex(h, source))).toBe(true);
    expect(forP1.some((h) => sameHex(h, source))).toBe(false);
    expect(forP1.some((h) => sameHex(h, far))).toBe(false);
  });

  it("two players see (possibly overlapping) but independent sets", () => {
    const a = { q: 2, r: 3 };
    const b = { q: 4, r: 3 };
    const state = makeState([
      createUnit("Monkey", "p1", a),
      createUnit("Monkey", "p2", b),
    ]);
    const forP1 = visibleHexes(state, "p1", true);
    const forP2 = visibleHexes(state, "p2", true);

    expect(forP1.some((h) => sameHex(h, a))).toBe(true);
    expect(forP1.some((h) => sameHex(h, b))).toBe(false);
    expect(forP2.some((h) => sameHex(h, b))).toBe(true);
    expect(forP2.some((h) => sameHex(h, a))).toBe(false);
  });
});

describe("visibleHexes — owning cells are always revealed (M27-T2, #173)", () => {
  it("reveals a persistent site-less territory cell far outside any unit's vision", () => {
    // p1's Monkey at the centre sees only 1 ring around it.
    const source = { q: 3, r: 3 };
    // A far site-less cell p1 owns (persistent territory) well outside the
    // Monkey's 1-ring vision.
    const owned = { q: 0, r: 0 };
    expect(hexDistance(source, owned)).toBeGreaterThan(1);
    const state = makeState(
      [createUnit("Monkey", "p1", source)],
      [],
      { "0,0": "p1" },
    );
    const revealed = visibleHexes(state, "p1", true);

    expect(revealed.some((h) => sameHex(h, owned))).toBe(true);
  });

  it("reveals a captured Grove/Nest site owned by the kingdom outside any vision", () => {
    // No units at all; a Groove owned by p1 far away with no Home Tree.
    const owned = { q: 0, r: 6 };
    const state = makeState(
      [],
      [createSite("Grove", owned.q, owned.r, "p1")],
    );
    const revealed = visibleHexes(state, "p1", true);

    expect(revealed.some((h) => sameHex(h, owned))).toBe(true);
  });

  it("reveals the p1 Home Tree site even with no units and no other territory", () => {
    const tree = { q: 1, r: 3 };
    const state = makeState(
      [],
      [createSite("HomeTree", tree.q, tree.r, "p1")],
    );
    const revealed = visibleHexes(state, "p1", true);

    expect(revealed.some((h) => sameHex(h, tree))).toBe(true);
  });

  it("a unit on a site-less cell keeps it visible as owned territory even after it vacates", () => {
    // p1's Monkey stands on `owned` (reveals it) and recorded it as
    // persistent site-less territory; a second far cell p1 also owns is
    // visible even though no unit is near it.
    const standing = { q: 3, r: 3 };
    const farOwned = { q: 0, r: 0 };
    const state = makeState(
      [createUnit("Monkey", "p1", standing)],
      [],
      { "0,0": "p1" },
    );
    const revealed = visibleHexes(state, "p1", true);

    expect(revealed.some((h) => sameHex(h, standing))).toBe(true);
    expect(revealed.some((h) => sameHex(h, farOwned))).toBe(true);
  });

  it("does not reveal a neutral (unowned) far cell outside any unit's vision", () => {
    const source = { q: 3, r: 3 };
    const neutral = { q: 0, r: 0 };
    const state = makeState([createUnit("Monkey", "p1", source)]);
    const revealed = visibleHexes(state, "p1", true);

    // The neutral cell is far from p1's unit and not owned by anyone.
    expect(revealed.some((h) => sameHex(h, neutral))).toBe(false);
  });

  it("does not reveal an enemy-owned cell outside the player's own vision", () => {
    const source = { q: 3, r: 3 };
    const enemyOwned = { q: 0, r: 0 };
    const state = makeState(
      [createUnit("Monkey", "p1", source)],
      [],
      { "0,0": "p2" },
    );
    const forP1 = visibleHexes(state, "p1", true);

    expect(forP1.some((h) => sameHex(h, enemyOwned))).toBe(false);
  });

  it("an opponent does not see p1's owned territory", () => {
    // p1 owns a far site-less cell; p2 should not see it unless it has its
    // own sight line there.
    const p1Owned = { q: 0, r: 0 };
    const state = makeState(
      [],
      [createSite("Grove", p1Owned.q, p1Owned.r, "p1")],
    );
    const forP2 = visibleHexes(state, "p2", true);

    expect(forP2.some((h) => sameHex(h, p1Owned))).toBe(false);
  });
});


describe("visibleHexes — cumulative & monotonic", () => {
  it("unions sight lines so a hex revealed by any line is present once", () => {
    const source = { q: 3, r: 3 };
    const farMonkey = { q: 2, r: 4 };
    // Two p1 units: revealing around the source, plus a second near it so
    // their rings overlap.
    const state = makeState([
      createUnit("Gibbon", "p1", source),
      createUnit("Monkey", "p1", farMonkey),
    ]);
    const revealed = visibleHexes(state, "p1", true);

    // A hex revealed by both lines is still listed exactly once.
    const keys = revealed.map((h) => `${h.q},${h.r}`);
    expect(new Set(keys).size).toBe(keys.length);
    // All cells are within the combined radius of one of the two sources.
    for (const hex of revealed) {
      const d1 = hexDistance(source, hex);
      const d2 = hexDistance(farMonkey, hex);
      expect(Math.min(d1, d2)).toBeLessThanOrEqual(2);
    }
  });

  it("adding a sight line only ever adds, never removes, revealed hexes", () => {
    const a = { q: 3, r: 3 };
    const b = { q: 4, r: 3 };
    const solo = makeState([createUnit("Gibbon", "p1", a)]);
    const withExtra = makeState([
      createUnit("Gibbon", "p1", a),
      createUnit("Monkey", "p1", b),
    ]);
    const before = new Set(visibleHexes(solo, "p1", true).map((h) => `${h.q},${h.r}`));
    const after = visibleHexes(withExtra, "p1", true).map((h) => `${h.q},${h.r}`);

    // Every hex visible before remains visible after (monotonicity), and the
    // set only grows.
    for (const key of before) {
      expect(after).toContain(key);
    }
    expect(after.length).toBeGreaterThanOrEqual(before.size);
  });

  it("always returns a deterministic, deduplicated set", () => {
    const source = { q: 3, r: 3 };
    const state = makeState([
      createUnit("Monkey", "p1", source),
      createUnit("Monkey", "p1", source),
    ]);
    const first = visibleHexes(state, "p1", true).map((h) => `${h.q},${h.r}`).sort();
    const second = visibleHexes(state, "p1", true).map((h) => `${h.q},${h.r}`).sort();
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(first.length);
  });
});
