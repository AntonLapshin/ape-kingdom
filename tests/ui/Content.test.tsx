import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Content } from "../../src/ui/components/Content";
import { gameIcons } from "../../src/assets/icons";
import { siteKindIcon } from "../../src/ui/presentation";

/* ------------------------------------------------------------------ */
/* Content atom component                                              */
/* ------------------------------------------------------------------ */

describe("Content", () => {
  it("renders the Home Tree pixel-art icon via the barrel", () => {
    render(<Content kind="HomeTree" />);
    const marker = screen.getByTestId("board-site");
    expect(marker.tagName).toBe("IMG");
    expect(marker.getAttribute("src")).toBe(gameIcons[siteKindIcon("HomeTree")!]);
    expect(marker.getAttribute("alt")).toBe("Home Tree site");
  });

  it("renders the Nest pixel-art icon via the barrel", () => {
    render(<Content kind="Nest" />);
    const marker = screen.getByTestId("board-site");
    expect(marker.tagName).toBe("IMG");
    expect(marker.getAttribute("src")).toBe(gameIcons[siteKindIcon("Nest")!]);
    expect(marker.getAttribute("alt")).toBe("Nest site");
  });

  it("marks the icon marker with the site kind", () => {
    render(<Content kind="Nest" />);
    const marker = screen.getByTestId("board-site");
    expect(marker.dataset.kind).toBe("Nest");
  });

  it("falls back to the text label for a Grove site (no icon asset)", () => {
    render(<Content kind="Grove" />);
    const marker = screen.getByTestId("board-site");
    expect(marker.tagName).toBe("SPAN");
    expect(marker).toHaveTextContent("Grove");
    expect(marker.querySelector("img")).toBeNull();
  });

  it("maps each site kind to its icon or null", () => {
    expect(siteKindIcon("HomeTree")).toBe("homeTree");
    expect(siteKindIcon("Nest")).toBe("monkeyNest");
    expect(siteKindIcon("Grove")).toBeNull();
  });

  it("applies the site-content label styling for the Grove fallback", () => {
    render(<Content kind="Grove" />);
    const marker = screen.getByTestId("board-site");
    expect(marker.className).toContain("text-text-body");
    expect(marker.className).toContain("font-semibold");
  });
});
