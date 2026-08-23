import { describe, it, expect } from "vitest";
import { moveTargets } from "../../src/core/moveTargets";
import type { GameAction } from "../../src/core/ai";
import { sameHex, type Hex } from "../../src/core/game";

/**
 * Pure core movement-target derivation tests (M10-T4).
 *
 * `moveTargets(moves, unitHex)` collects every `targetHex` of a `move` action
 * whose `unitHex` matches the selected unit. It operates purely on plain
 * `GameAction` descriptors, so these tests exercise the derivation directly
 * with constructed action sets (no session/board needed).
 */

const H = (q: number, r: number): Hex => ({ q, r });

/** A move action for a unit at `from` to `to`. */
const move = (from: Hex, to: Hex): GameAction => ({
  type: "move",
  unitHex: from,
  targetHex: to,
});

describe("moveTargets", () => {
  it("returns every move target for the selected unit in the given moves", () => {
    const unitHex = H(0, 0);
    const targets = moveTargets(
      [
        move(unitHex, H(1, 0)),
        move(unitHex, H(-1, 0)),
        move(unitHex, H(0, 1)),
      ],
      unitHex,
    );
    expect(targets).toHaveLength(3);
    // Order is preserved from the enumeration.
    expect(targets).toEqual([H(1, 0), H(-1, 0), H(0, 1)]);
    expect(targets.some((t) => sameHex(t, H(1, 0)))).toBe(true);
    expect(targets.some((t) => sameHex(t, H(-1, 0)))).toBe(true);
    expect(targets.some((t) => sameHex(t, H(0, 1)))).toBe(true);
  });

  it("excludes move actions belonging to other units", () => {
    const targets = moveTargets(
      [
        move(H(5, 5), H(5, 6)),
        move(H(0, 0), H(1, 0)),
        move(H(9, 9), H(9, 8)),
      ],
      H(0, 0),
    );
    // Only the target of the action whose unitHex is (0,0) is returned.
    expect(targets).toEqual([H(1, 0)]);
  });

  it("excludes non-move actions (collectIncome / recruit / attack)", () => {
    const unitHex = H(3, 3);
    const targets = moveTargets(
      [
        { type: "collectIncome" },
        { type: "recruit", kind: "Monkey", hex: H(1, 1) },
        move(unitHex, H(4, 3)),
        { type: "attack", attackerHex: unitHex, targetHex: H(3, 4) },
      ],
      unitHex,
    );
    // Only the `move` action's target is included; the attack/recruit/income
    // actions do not contribute a move target.
    expect(targets).toEqual([H(4, 3)]);
  });

  it("returns an empty array when the unit has no move action", () => {
    const targets = moveTargets(
      [
        move(H(0, 0), H(1, 0)),
        move(H(0, 0), H(0, 1)),
      ],
      H(7, 7),
    );
    expect(targets).toEqual([]);
  });

  it("returns an empty array for an empty moves list", () => {
    expect(moveTargets([], H(0, 0))).toEqual([]);
  });

  it("handles multiple moves from the selected unit to overlapping targets", () => {
    // Two identical `move` actions for the same unit yield both targets
    // (they are a faithful projection of the enumeration, not deduplicated).
    const unitHex = H(0, 0);
    const targets = moveTargets(
      [move(unitHex, H(1, 0)), move(unitHex, H(1, 0)), move(unitHex, H(0, -1))],
      unitHex,
    );
    expect(targets).toEqual([H(1, 0), H(1, 0), H(0, -1)]);
  });

  it("treats actions from the same unit hex as that unit regardless of direction", () => {
    const unitHex = H(-2, 4);
    const targets = moveTargets(
      [
        move(unitHex, H(-3, 4)),
        move(unitHex, H(-2, 3)),
        move(unitHex, H(-2, 5)),
        move(H(0, 0), H(1, 1)),
      ],
      unitHex,
    );
    expect(targets).toEqual([H(-3, 4), H(-2, 3), H(-2, 5)]);
  });
});
