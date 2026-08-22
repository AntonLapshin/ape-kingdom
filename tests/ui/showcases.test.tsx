import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { showcaseRegistry } from "../../src/ui/showcases";
import { validateRegistry } from "../../src/core/showcase";

/**
 * Showcase registration tests (M7-T3).
 *
 * Verifies the showcase index produces a valid registry (per the core engine's
 * `validateRegistry`), that every atom component in `src/ui/components/` has a
 * registered showcase, and that each showcase render function mounts without
 * throwing. No business logic is tested here — these are scene-setting demos.
 */
describe("showcase registry", () => {
  it("produces a valid registry accepted by the core engine", () => {
    const registry = showcaseRegistry();
    expect(() => validateRegistry(registry)).not.toThrow();
  });

  it("registers a showcase for every atom component in src/ui/components", () => {
    const registry = showcaseRegistry();
    const names = registry.map((file) => file.name).sort();
    // The renderable atom components in src/ui/components/. The composition
    // layers (PlayableGame, Showcase) are pages/browsers, not atoms, and are
    // intentionally not showcased.
    expect(names).toEqual([
      "ActionControls",
      "Board",
      "DemoPanel",
      "StatusPanel",
    ]);
  });

  it("registers at least one showcase per file", () => {
    const registry = showcaseRegistry();
    for (const file of registry) {
      expect(Object.keys(file.showcases).length).toBeGreaterThan(0);
    }
  });

  it("mounts every showcase render without throwing", () => {
    const registry = showcaseRegistry();
    for (const file of registry) {
      for (const renderFn of Object.values(file.showcases)) {
        const { unmount } = render(<>{renderFn()}</>);
        unmount();
      }
    }
    cleanup();
  });
});
