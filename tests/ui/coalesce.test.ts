import { describe, it, expect } from "vitest";
import {
  createCoalescer,
  sumNumbers,
  sumPanDeltas,
  ZERO_DELTA,
} from "../../src/ui/viewModels/coalesce";

/* ------------------------------------------------------------------ */
/* sumNumbers / sumPanDeltas (pure merge helpers)                      */
/* ------------------------------------------------------------------ */

describe("sumNumbers", () => {
  it("adds two numeric deltas", () => {
    expect(sumNumbers(1, 2)).toBe(3);
    expect(sumNumbers(-0.5, 0.25)).toBeCloseTo(-0.25);
  });

  it("identity is ZERO_DELTA", () => {
    expect(sumNumbers(ZERO_DELTA, 5)).toBe(5);
  });
});

describe("sumPanDeltas", () => {
  it("adds two pan deltas component-wise without mutating the inputs", () => {
    const a = { x: 10, y: -5 };
    const b = { x: -2, y: 7 };
    expect(sumPanDeltas(a, b)).toEqual({ x: 8, y: 2 });
    expect(a).toEqual({ x: 10, y: -5 });
    expect(b).toEqual({ x: -2, y: 7 });
  });
});

/* ------------------------------------------------------------------ */
/* createCoalescer                                                     */
/* ------------------------------------------------------------------ */

describe("createCoalescer", () => {
  it("starts empty: no pending delta, take returns null", () => {
    const c = createCoalescer(sumNumbers);
    expect(c.hasPending()).toBe(false);
    expect(c.take()).toBeNull();
  });

  it("accumulates many added deltas into a single pending total", () => {
    const c = createCoalescer(sumNumbers);
    c.add(1);
    c.add(2);
    c.add(3);
    expect(c.hasPending()).toBe(true);
    // All three coalesce into one take that equals their sum.
    expect(c.take()).toBe(6);
  });

  it("take returns the accumulated total and resets the accumulator", () => {
    const c = createCoalescer(sumNumbers);
    c.add(10);
    c.add(-3);
    expect(c.take()).toBe(7);
    // The accumulator is empty again after take.
    expect(c.hasPending()).toBe(false);
    expect(c.take()).toBeNull();
  });

  it("accumulates pan deltas into a single {x, y} total", () => {
    const c = createCoalescer(sumPanDeltas);
    c.add({ x: 30, y: 45 });
    c.add({ x: 20, y: 20 });
    c.add({ x: -10, y: 0 });
    // All three coalesce into one take; the result equals the sum of all.
    expect(c.take()).toEqual({ x: 40, y: 65 });
  });

  it("does not lose deltas that arrive after a take: they start a new batch", () => {
    const c = createCoalescer(sumNumbers);
    c.add(1);
    c.add(2);
    expect(c.take()).toBe(3);
    // A new frame's deltas accumulate independently.
    c.add(10);
    expect(c.take()).toBe(10);
    // The second take drained the new batch.
    expect(c.take()).toBeNull();
  });
});
