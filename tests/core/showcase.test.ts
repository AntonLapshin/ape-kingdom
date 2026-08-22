import { describe, it, expect } from "vitest";
import {
  createShowcaseState,
  select,
  toggleFile,
  validateRegistry,
  findFile,
  encodeSelection,
  decodeSelection,
  ShowcaseError,
} from "../../src/core/showcase";
import type { ShowcaseRegistry } from "../../src/core/showcase";

/** A minimal, valid registry used across tests. */
function sampleRegistry(): ShowcaseRegistry {
  return [
    { name: "Button", showcases: { Primary: () => null, Secondary: () => null } },
    { name: "Panel", showcases: { Basic: () => null, WithFooter: () => null } },
  ];
}

describe("showcase core engine (M7-T1)", () => {
  it("creates an empty initial state", () => {
    const state = createShowcaseState();
    expect(state.file).toBeNull();
    expect(state.showcase).toBeNull();
    expect(state.expanded.size).toBe(0);
  });

  it("finds a file by name in the registry", () => {
    const registry = sampleRegistry();
    expect(findFile(registry, "Button")?.name).toBe("Button");
    expect(findFile(registry, "Panel")?.name).toBe("Panel");
    expect(findFile(registry, "Missing")).toBeUndefined();
  });

  describe("validateRegistry", () => {
    it("accepts a well-formed registry", () => {
      expect(() => validateRegistry(sampleRegistry())).not.toThrow();
    });

    it("rejects an empty file name", () => {
      const registry: ShowcaseRegistry = [
        { name: "", showcases: { Primary: () => null } },
      ];
      expect(() => validateRegistry(registry)).toThrowError(
        new ShowcaseError("invalid-registry", "Every showcase file must have a non-empty name"),
      );
    });

    it("rejects duplicate file names", () => {
      const registry: ShowcaseRegistry = [
        { name: "Button", showcases: { Primary: () => null } },
        { name: "Button", showcases: { Secondary: () => null } },
      ];
      expect(() => validateRegistry(registry)).toThrowError(
        new ShowcaseError("invalid-registry", "Duplicate showcase file name: Button"),
      );
    });

    it("rejects a file with no showcases", () => {
      const registry: ShowcaseRegistry = [{ name: "Empty", showcases: {} }];
      expect(() => validateRegistry(registry)).toThrowError(
        new ShowcaseError("invalid-registry", 'Showcase file "Empty" has no showcases'),
      );
    });
  });

  describe("select", () => {
    it("selects a file + showcase and expands the file", () => {
      const next = select(createShowcaseState(), sampleRegistry(), "Button", "Primary");
      expect(next.file).toBe("Button");
      expect(next.showcase).toBe("Primary");
      expect(next.expanded.has("Button")).toBe(true);
    });

    it("keeps previously expanded files when selecting another", () => {
      const first = select(createShowcaseState(), sampleRegistry(), "Button", "Primary");
      const second = select(first, sampleRegistry(), "Panel", "Basic");
      expect(second.file).toBe("Panel");
      expect(second.showcase).toBe("Basic");
      expect(second.expanded.has("Button")).toBe(true);
      expect(second.expanded.has("Panel")).toBe(true);
    });

    it("rejects an unknown file name with a typed error", () => {
      expect(() =>
        select(createShowcaseState(), sampleRegistry(), "Missing", "Primary"),
      ).toThrowError(
        new ShowcaseError("unknown-file", "Unknown showcase file: Missing"),
      );
    });

    it("rejects an unknown showcase name with a typed error", () => {
      expect(() =>
        select(createShowcaseState(), sampleRegistry(), "Button", "Nope"),
      ).toThrowError(
        new ShowcaseError(
          "unknown-showcase",
          'Unknown showcase "Nope" in file "Button"',
        ),
      );
    });

    it("does not mutate the input state", () => {
      const state = createShowcaseState();
      select(state, sampleRegistry(), "Button", "Primary");
      expect(state.file).toBeNull();
      expect(state.showcase).toBeNull();
      expect(state.expanded.size).toBe(0);
    });
  });

  describe("toggleFile", () => {
    it("expands a collapsed file", () => {
      const next = toggleFile(createShowcaseState(), sampleRegistry(), "Button");
      expect(next.expanded.has("Button")).toBe(true);
    });

    it("collapses an expanded file", () => {
      const expanded = toggleFile(createShowcaseState(), sampleRegistry(), "Button");
      const collapsed = toggleFile(expanded, sampleRegistry(), "Button");
      expect(collapsed.expanded.has("Button")).toBe(false);
    });

    it("rejects an unknown file with a typed error", () => {
      expect(() =>
        toggleFile(createShowcaseState(), sampleRegistry(), "Missing"),
      ).toThrowError(
        new ShowcaseError("unknown-file", "Unknown showcase file: Missing"),
      );
    });
  });

  describe("encodeSelection", () => {
    it("encodes a selection into a query string", () => {
      const state = select(createShowcaseState(), sampleRegistry(), "Button", "Primary");
      expect(encodeSelection(state)).toBe("?file=Button&showcase=Primary");
    });

    it("returns an empty string when nothing is selected", () => {
      expect(encodeSelection(createShowcaseState())).toBe("");
    });

    it("percent-encodes special characters", () => {
      const state = select(
        createShowcaseState(),
        [{ name: "My Chip", showcases: { "State A/B": () => null } }],
        "My Chip",
        "State A/B",
      );
      expect(encodeSelection(state)).toBe(
        "?file=My%20Chip&showcase=State%20A%2FB",
      );
    });
  });

  describe("decodeSelection", () => {
    it("decodes file and showcase from a query string", () => {
      expect(decodeSelection("?file=Button&showcase=Primary")).toEqual({
        file: "Button",
        showcase: "Primary",
      });
    });

    it("accepts a query string without a leading ?", () => {
      expect(decodeSelection("file=Panel&showcase=Basic")).toEqual({
        file: "Panel",
        showcase: "Basic",
      });
    });

    it("returns nulls when a param is absent", () => {
      expect(decodeSelection("file=Button")).toEqual({
        file: "Button",
        showcase: null,
      });
      expect(decodeSelection("")).toEqual({ file: null, showcase: null });
    });

    it("percent-decodes special characters", () => {
      expect(decodeSelection("?file=My%20Chip&showcase=State%20A%2FB")).toEqual({
        file: "My Chip",
        showcase: "State A/B",
      });
    });
  });
});
