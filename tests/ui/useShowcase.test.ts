import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useShowcase,
  toShowcaseView,
  type ShowcaseView,
} from "../../src/ui/viewModels/useShowcase";
import type { ShowcaseRegistry } from "../../src/core/showcase";

/** A minimal, valid registry used across tests. */
function sampleRegistry(): ShowcaseRegistry {
  return [
    { name: "Button", showcases: { Primary: () => null, Secondary: () => null } },
    { name: "Panel", showcases: { Basic: () => null, WithFooter: () => null } },
  ];
}

/** Reset the URL to a clean state between tests. */
function resetUrl() {
  window.history.replaceState({}, "", "/");
}

beforeEach(() => {
  resetUrl();
});

afterEach(() => {
  resetUrl();
});

/* ------------------------------------------------------------------ */
/* toShowcaseView (pure presentation adaptation)                       */
/* ------------------------------------------------------------------ */

describe("toShowcaseView", () => {
  it("produces one sidebar entry per file with its showcase names", () => {
    const registry = sampleRegistry();
    const view = toShowcaseView(
      { file: null, showcase: null, expanded: new Set() },
      registry,
    );
    expect(view.files.map((f) => f.name)).toEqual(["Button", "Panel"]);
    expect(view.files[0].showcases).toEqual(["Primary", "Secondary"]);
    expect(view.files[0].expanded).toBe(false);
    expect(view.files[0].selected).toBe(false);
    expect(view.selectedFile).toBeNull();
    expect(view.selectedShowcase).toBeNull();
    expect(view.selectedRender).toBeNull();
  });

  it("flags the selected file and expanded files", () => {
    const registry = sampleRegistry();
    const view = toShowcaseView(
      {
        file: "Panel",
        showcase: "Basic",
        expanded: new Set(["Button", "Panel"]),
      },
      registry,
    );
    expect(view.selectedFile).toBe("Panel");
    expect(view.selectedShowcase).toBe("Basic");
    const button = view.files.find((f) => f.name === "Button")!;
    const panel = view.files.find((f) => f.name === "Panel")!;
    expect(button.expanded).toBe(true);
    expect(button.selected).toBe(false);
    expect(panel.expanded).toBe(true);
    expect(panel.selected).toBe(true);
  });

  it("exposes the selected showcase's render function for the canvas", () => {
    const render = () => null;
    const withRender: ShowcaseRegistry = [
      { name: "Chip", showcases: { Active: render } },
    ];
    const view = toShowcaseView(
      { file: "Chip", showcase: "Active", expanded: new Set(["Chip"]) },
      withRender,
    );
    expect(view.selectedRender).toBe(render);
  });

  it("exposes no render when nothing is selected", () => {
    const view = toShowcaseView(
      { file: null, showcase: null, expanded: new Set() },
      sampleRegistry(),
    );
    expect(view.selectedRender).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* useShowcase hook                                                    */
/* ------------------------------------------------------------------ */

describe("useShowcase", () => {
  it("starts with nothing selected on an empty URL", () => {
    const { result } = renderHook(() => useShowcase(sampleRegistry()));
    const view: ShowcaseView = result.current.view;
    expect(view.selectedFile).toBeNull();
    expect(view.selectedShowcase).toBeNull();
    expect(view.files).toHaveLength(2);
    expect(view.files.every((f) => !f.expanded)).toBe(true);
  });

  it("reads a deep link from the URL on mount", () => {
    window.history.replaceState({}, "", "/?file=Panel&showcase=Basic");
    const { result } = renderHook(() => useShowcase(sampleRegistry()));
    const view: ShowcaseView = result.current.view;
    expect(view.selectedFile).toBe("Panel");
    expect(view.selectedShowcase).toBe("Basic");
    expect(view.files.find((f) => f.name === "Panel")!.selected).toBe(true);
    // Selecting via URL also expands the file so the showcase is visible.
    expect(view.files.find((f) => f.name === "Panel")!.expanded).toBe(true);
  });

  it("ignores a stale deep link that names an unknown file", () => {
    window.history.replaceState({}, "", "/?file=Missing&showcase=Primary");
    const { result } = renderHook(() => useShowcase(sampleRegistry()));
    expect(result.current.view.selectedFile).toBeNull();
    expect(result.current.view.selectedShowcase).toBeNull();
  });

  it("select pushes the selection to the URL and updates the view", () => {
    const { result } = renderHook(() => useShowcase(sampleRegistry()));
    act(() => {
      result.current.select("Button", "Primary");
    });
    expect(result.current.view.selectedFile).toBe("Button");
    expect(result.current.view.selectedShowcase).toBe("Primary");
    expect(window.location.search).toBe("?file=Button&showcase=Primary");
  });

  it("toggleFile expands and collapses a sidebar file without touching the URL", () => {
    const { result } = renderHook(() => useShowcase(sampleRegistry()));
    act(() => {
      result.current.toggleFile("Button");
    });
    expect(result.current.view.files[0].expanded).toBe(true);
    act(() => {
      result.current.toggleFile("Button");
    });
    expect(result.current.view.files[0].expanded).toBe(false);
    // No selection was made, so the URL stays clean.
    expect(window.location.search).toBe("");
  });

  it("navigating back via popstate re-applies the previous selection", () => {
    const { result } = renderHook(() => useShowcase(sampleRegistry()));
    // Select a showcase, which pushes a history entry.
    act(() => {
      result.current.select("Button", "Primary");
    });
    expect(window.location.search).toBe("?file=Button&showcase=Primary");

    // Select another showcase, pushing a second entry.
    act(() => {
      result.current.select("Panel", "Basic");
    });
    expect(window.location.search).toBe("?file=Panel&showcase=Basic");

    // Simulate the browser back button: the URL returns to the first entry
    // and the browser fires a popstate event.
    window.history.replaceState({}, "", "/?file=Button&showcase=Primary");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.view.selectedFile).toBe("Button");
    expect(result.current.view.selectedShowcase).toBe("Primary");
  });

  it("navigating to a URL with no params clears the selection", () => {
    const { result } = renderHook(() => useShowcase(sampleRegistry()));
    act(() => {
      result.current.select("Button", "Primary");
    });
    expect(result.current.view.selectedFile).toBe("Button");

    // Go back to the initial (empty) entry and fire popstate.
    window.history.replaceState({}, "", "/");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.view.selectedFile).toBeNull();
    expect(result.current.view.selectedShowcase).toBeNull();
  });
});
