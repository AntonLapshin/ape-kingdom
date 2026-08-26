import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Grave } from "../../src/ui/components/Grave";
import { gameIcons } from "../../src/assets/icons";

/* ------------------------------------------------------------------ */
/* Grave atom component (M21-T2, #191)                                 */
/* ------------------------------------------------------------------ */

describe("Grave", () => {
  it("renders the grave icon for the marking", () => {
    render(<Grave owner="p2" />);
    const grave = screen.getByTestId("board-grave");
    const img = grave.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(gameIcons.grave);
    expect(img?.getAttribute("alt")).toBe("Grave");
  });

  it("marks the grave with the owning kingdom", () => {
    render(<Grave owner="p1" />);
    const grave = screen.getByTestId("board-grave");
    expect(grave.dataset.owner).toBe("p1");
  });

  it("renders a distinct grave marker surface", () => {
    render(<Grave owner="p2" />);
    const grave = screen.getByTestId("board-grave");
    // A grave shows the pixel-art icon plus a ghost glyph on a glass chip.
    expect(grave).toHaveTextContent("👻");
    expect(grave.className).toContain("bg-panel");
  });
});
