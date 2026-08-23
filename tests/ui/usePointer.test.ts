import { describe, it, expect } from "vitest";
import {
  DRAG_THRESHOLD,
  exceedsDragThreshold,
} from "../../src/ui/viewModels/usePointer";

/* --------------------------------------------------------------------- */
/* usePointer — pure click-vs-drag helpers (M12-T1, #84)                  */
/* --------------------------------------------------------------------- */

describe("exceedsDragThreshold", () => {
  it("returns false for a static click (no movement from the start)", () => {
    expect(exceedsDragThreshold(10, 10, 10, 10)).toBe(false);
  });

  it("returns false for sub-threshold movement (minor mouse jitter)", () => {
    // A few pixels of wobble is still a static click, not a drag.
    expect(exceedsDragThreshold(10, 10, 11, 12)).toBe(false);
    expect(exceedsDragThreshold(10, 10, 10 + DRAG_THRESHOLD, 10)).toBe(false);
  });

  it("returns true once the pointer moves beyond the drag threshold", () => {
    expect(exceedsDragThreshold(10, 10, 10 + DRAG_THRESHOLD + 1, 10)).toBe(true);
    expect(exceedsDragThreshold(10, 10, 10, 10 + DRAG_THRESHOLD + 1)).toBe(true);
    // A diagonal move whose distance exceeds the threshold.
    expect(exceedsDragThreshold(0, 0, DRAG_THRESHOLD + 1, DRAG_THRESHOLD + 1)).toBe(
      true,
    );
  });

  it("supports an explicit custom threshold", () => {
    expect(exceedsDragThreshold(0, 0, 10, 0, 20)).toBe(false);
    expect(exceedsDragThreshold(0, 0, 21, 0, 20)).toBe(true);
  });

  it("treats non-finite coordinates as a non-drag (jsdom never supplies them)", () => {
    expect(exceedsDragThreshold(0, 0, NaN, 0)).toBe(false);
    expect(exceedsDragThreshold(0, 0, 0, undefined as unknown as number)).toBe(
      false,
    );
    expect(exceedsDragThreshold(0, 0, Infinity, 0)).toBe(false);
  });
});
