import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useFloatingPanel,
  moveBy,
} from "../../src/ui/viewModels/useFloatingPanel";

/* ------------------------------------------------------------------ */
/* moveBy (pure presentation helper)                                   */
/* ------------------------------------------------------------------ */

describe("moveBy", () => {
  it("adds a drag delta to a floating panel position", () => {
    expect(moveBy({ x: 0, y: 0 }, 10, -5)).toEqual({ x: 10, y: -5 });
    expect(moveBy({ x: 4, y: -2 }, -3, 7)).toEqual({ x: 1, y: 5 });
  });

  it("leaves the position unchanged when the delta is zero", () => {
    expect(moveBy({ x: 5, y: 6 }, 0, 0)).toEqual({ x: 5, y: 6 });
  });

  it("clamps the position to a sane bound so a panel cannot be lost", () => {
    expect(moveBy({ x: 0, y: 0 }, 100000, -100000)).toEqual({
      x: 2000,
      y: -2000,
    });
    expect(moveBy({ x: -100000, y: 100000 }, 0, 0)).toEqual({
      x: -2000,
      y: 2000,
    });
  });

  it("does not mutate its input position", () => {
    const position = { x: 1, y: 2 };
    const next = moveBy(position, 3, 4);
    expect(next).toEqual({ x: 4, y: 6 });
    expect(position).toEqual({ x: 1, y: 2 });
  });
});

/* ------------------------------------------------------------------ */
/* useFloatingPanel hook                                               */
/* ------------------------------------------------------------------ */

describe("useFloatingPanel", () => {
  it("starts at the origin (or a caller-provided initial position)", () => {
    const { result } = renderHook(() => useFloatingPanel());
    expect(result.current.position).toEqual({ x: 0, y: 0 });

    const seeded = renderHook(() => useFloatingPanel({ x: 8, y: -3 }));
    expect(seeded.result.current.position).toEqual({ x: 8, y: -3 });
  });

  it("moveBy accumulates deltas into the position", () => {
    const { result } = renderHook(() => useFloatingPanel());
    act(() => {
      result.current.moveBy(12, -4);
    });
    act(() => {
      result.current.moveBy(-2, 6);
    });
    expect(result.current.position).toEqual({ x: 10, y: 2 });
  });

  it("setPosition sets the position directly", () => {
    const { result } = renderHook(() => useFloatingPanel());
    act(() => {
      result.current.setPosition({ x: 20, y: -30 });
    });
    expect(result.current.position).toEqual({ x: 20, y: -30 });
  });
});
