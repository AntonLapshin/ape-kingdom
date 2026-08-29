import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useZoom,
  clampZoom,
  zoomBy,
  boardTransform,
  boardScaleToFit,
  FIT_VIEWPORT_MARGIN,
  ZOOM_MIN,
  ZOOM_MAX,
  DEFAULT_ZOOM,
  ZOOM_STEP,
} from "../../src/ui/viewModels/useZoom";

/* ------------------------------------------------------------------ */
/* boardScaleToFit (pure fit-to-viewport helper, M31-T4)               */
/* ------------------------------------------------------------------ */

describe("boardScaleToFit", () => {
  it("scales a board larger than the viewport so it fits fully", () => {
    // Board 1933×1160 in a 1440×900 viewport: height is the binding dimension.
    const viewportW = 1440;
    const viewportH = 900;
    const margin = FIT_VIEWPORT_MARGIN;
    const expected = Math.min(
      (viewportW - margin * 2) / 1933,
      (viewportH - margin * 2) / 1160,
    );
    expect(boardScaleToFit(1933, 1160, viewportW, viewportH)).toBeCloseTo(
      expected,
      6,
    );
  });

  it("uses the smaller dimension when height binds", () => {
    // A board whose height (not width) is the binding dimension in the viewport.
    const scale = boardScaleToFit(800, 720, 1920, 900);
    const expected = (900 - FIT_VIEWPORT_MARGIN * 2) / 720;
    expect(scale).toBeCloseTo(expected, 6);
  });

  it("respects a caller-provided margin on every side", () => {
    const scale = boardScaleToFit(2400, 1000, 1440, 900, 96);
    // Width binds with the custom 96px margin on each side.
    const expected = (1440 - 96 * 2) / 2400;
    expect(scale).toBeCloseTo(expected, 6);
  });

  it("does not zoom a board smaller than the viewport above the max", () => {
    // A tiny board in a large viewport would want to be magnified, but the
    // helper clamps to the allowed zoom range rather than blowing it up.
    expect(boardScaleToFit(200, 200, 1440, 900)).toBeLessThanOrEqual(ZOOM_MAX);
    expect(boardScaleToFit(200, 200, 1440, 900)).toBeGreaterThanOrEqual(
      ZOOM_MIN,
    );
  });

  it("clamps to the allowed zoom range", () => {
    // An extremely wide board in a tiny viewport can never fit within ZOOM_MIN.
    expect(boardScaleToFit(999999, 999999, 100, 100)).toBe(ZOOM_MIN);
  });

  it("handles a zero/unknown viewport size gracefully without NaN", () => {
    const scale = boardScaleToFit(1933, 1160, 0, 0);
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThanOrEqual(ZOOM_MIN);
  });
});

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
