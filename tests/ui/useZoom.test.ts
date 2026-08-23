import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useZoom,
  clampZoom,
  zoomBy,
  boardTransform,
  ZOOM_MIN,
  ZOOM_MAX,
  DEFAULT_ZOOM,
  ZOOM_STEP,
} from "../../src/ui/viewModels/useZoom";

/* ------------------------------------------------------------------ */
/* clampZoom (pure presentation helper)                                */
/* ------------------------------------------------------------------ */

describe("clampZoom", () => {
  it("passes through a scale inside the allowed range", () => {
    expect(clampZoom(DEFAULT_ZOOM)).toBe(1);
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it("clamps to the minimum allowed scale", () => {
    expect(clampZoom(0)).toBe(ZOOM_MIN);
    expect(clampZoom(-5)).toBe(ZOOM_MIN);
  });

  it("clamps to the maximum allowed scale", () => {
    expect(clampZoom(100)).toBe(ZOOM_MAX);
    expect(clampZoom(9)).toBe(ZOOM_MAX);
  });
});

/* ------------------------------------------------------------------ */
/* zoomBy (pure presentation helper)                                   */
/* ------------------------------------------------------------------ */

describe("zoomBy", () => {
  it("adds a wheel delta to the scale (positive zooms in)", () => {
    expect(zoomBy(1, ZOOM_STEP)).toBe(1.1);
    expect(zoomBy(1, -ZOOM_STEP)).toBe(0.9);
  });

  it("leaves the scale unchanged when the delta is zero", () => {
    expect(zoomBy(1, 0)).toBe(1);
  });

  it("never goes below the minimum scale", () => {
    expect(zoomBy(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
    // Zooming out past the floor stays clamped.
    expect(zoomBy(0.55, -1)).toBe(ZOOM_MIN);
  });

  it("never exceeds the maximum scale", () => {
    expect(zoomBy(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(zoomBy(2.4, 1)).toBe(ZOOM_MAX);
  });

  it("does not mutate its input", () => {
    const scale = 1;
    const next = zoomBy(scale, 0.2);
    expect(next).toBe(1.2);
    expect(scale).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* boardTransform (pure presentation helper)                           */
/* ------------------------------------------------------------------ */

describe("boardTransform", () => {
  it("combines the pan translate and the zoom scale", () => {
    expect(boardTransform(1, { x: 0, y: 0 })).toBe(
      "translate(0px, 0px) scale(1)",
    );
    expect(boardTransform(1.2, { x: 40, y: -25 })).toBe(
      "translate(40px, -25px) scale(1.2)",
    );
  });

  it("reflects a zoomed-out and panned board", () => {
    expect(boardTransform(0.5, { x: 10, y: 20 })).toBe(
      "translate(10px, 20px) scale(0.5)",
    );
  });
});

/* ------------------------------------------------------------------ */
/* useZoom hook                                                        */
/* ------------------------------------------------------------------ */

describe("useZoom", () => {
  it("starts at the default scale (or a caller-provided initial scale)", () => {
    const { result } = renderHook(() => useZoom());
    expect(result.current.zoom).toBe(DEFAULT_ZOOM);

    const seeded = renderHook(() => useZoom(1.4));
    expect(seeded.result.current.zoom).toBe(1.4);
  });

  it("clamps a caller-provided initial scale to the allowed range", () => {
    const tooLow = renderHook(() => useZoom(0.1));
    expect(tooLow.result.current.zoom).toBe(ZOOM_MIN);
    const tooHigh = renderHook(() => useZoom(99));
    expect(tooHigh.result.current.zoom).toBe(ZOOM_MAX);
  });

  it("zoomBy accumulates wheel deltas into the scale", () => {
    const { result } = renderHook(() => useZoom());
    act(() => {
      result.current.zoomBy(1);
    });
    act(() => {
      result.current.zoomBy(-1);
    });
    // Back to the default after one step in and one step out.
    expect(result.current.zoom).toBe(DEFAULT_ZOOM);
  });

  it("zoomBy clamps at the bounds", () => {
    const { result } = renderHook(() => useZoom());
    for (let i = 0; i < 100; i++) {
      act(() => {
        result.current.zoomBy(1);
      });
    }
    expect(result.current.zoom).toBe(ZOOM_MAX);
    for (let i = 0; i < 100; i++) {
      act(() => {
        result.current.zoomBy(-1);
      });
    }
    expect(result.current.zoom).toBe(ZOOM_MIN);
  });

  it("setZoom sets the scale directly (clamped)", () => {
    const { result } = renderHook(() => useZoom());
    act(() => {
      result.current.setZoom(1.6);
    });
    expect(result.current.zoom).toBe(1.6);
    act(() => {
      result.current.setZoom(0.2);
    });
    expect(result.current.zoom).toBe(ZOOM_MIN);
  });
});
