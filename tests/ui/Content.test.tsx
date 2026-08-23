import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Content } from "../../src/ui/components/Content";

/* ------------------------------------------------------------------ */
/* Content atom component                                              */
/* ------------------------------------------------------------------ */

describe("Content", () => {
  it("renders the label for a Grove site", () => {
    render(<Content kind="Grove" />);
    const marker = screen.getByTestId("board-site");
    expect(marker).toHaveTextContent("Grove");
  });

  it("renders the label for a Nest site", () => {
    render(<Content kind="Nest" />);
    const marker = screen.getByTestId("board-site");
    expect(marker).toHaveTextContent("Nest");
  });

  it("renders the label for a Home Tree site", () => {
    render(<Content kind="HomeTree" />);
    const marker = screen.getByTestId("board-site");
    expect(marker).toHaveTextContent("Home Tree");
  });

  it("marks the marker with the site kind", () => {
    render(<Content kind="Nest" />);
    const marker = screen.getByTestId("board-site");
    expect(marker.dataset.kind).toBe("Nest");
  });

  it("applies the site-content marker styling", () => {
    render(<Content kind="Grove" />);
    const marker = screen.getByTestId("board-site");
    expect(marker.className).toContain("text-text-body");
    expect(marker.className).toContain("font-semibold");
  });
});
