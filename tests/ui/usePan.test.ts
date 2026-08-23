import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePan, offsetBy } from "../../src/ui/viewModels/usePan";

/* ------------------------------------------------------------------ */
/* offsetBy (pure presentation helper)                                 */
/* ------------------------------------------------------------------ */

describe("offsetBy", () => {
  it("adds a drag delta to a pan offset", () => {
    expect(offsetBy({ x: 0, y: 0 }, 10, -5)).toEqual({ x: 10, y: -5 });
    expect(offsetBy({ x: 4, y: -2 }, -3, 7)).toEqual({ x: 1, y: 5 });
  });

  it("leaves the offset unchanged when the delta is zero", () => {
    expect(offsetBy({ x: 5, y: 6 }, 0, 0)).toEqual({ x: 5, y: 6 });
  });

  it("clamps the offset to a sane bound so the map cannot be lost", () => {
    expect(offsetBy({ x: 0, y: 0 }, 100000, -100000)).toEqual({
      x: 3000,
      y: -3000,
    });
    expect(offsetBy({ x: -100000, y: 100000 }, 0, 0)).toEqual({
      x: -3000,
      y: 3000,
    });
  });

  it("does not mutate its input offset", () => {
    const offset = { x: 1, y: 2 };
    const next = offsetBy(offset, 3, 4);
    expect(next).toEqual({ x: 4, y: 6 });
    expect(offset).toEqual({ x: 1, y: 2 });
  });
});

/* ------------------------------------------------------------------ */
/* usePan hook                                                         */
/* ------------------------------------------------------------------ */

describe("usePan", () => {
  it("starts at the origin (or a caller-provided initial offset)", () => {
    const { result } = renderHook(() => usePan());
    expect(result.current.pan).toEqual({ x: 0, y: 0 });

    const seeded = renderHook(() => usePan({ x: 8, y: -3 }));
    expect(seeded.result.current.pan).toEqual({ x: 8, y: -3 });
  });

  it("panBy accumulates deltas into the offset", () => {
    const { result } = renderHook(() => usePan());
    act(() => {
      result.current.panBy(12, -4);
    });
    act(() => {
      result.current.panBy(-2, 6);
    });
    expect(result.current.pan).toEqual({ x: 10, y: 2 });
  });

  it("setPan sets the offset directly", () => {
    const { result } = renderHook(() => usePan());
    act(() => {
      result.current.setPan({ x: 20, y: -30 });
    });
    expect(result.current.pan).toEqual({ x: 20, y: -30 });
  });
});
