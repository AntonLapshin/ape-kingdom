import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FloatingPanel } from "../../src/ui/components/FloatingPanel";

/* ------------------------------------------------------------------ */
/* FloatingPanel component (M11-T2)                                    */
/* ------------------------------------------------------------------ */

describe("FloatingPanel", () => {
  it("renders a titled, absolutely-positioned floating card with its body", () => {
    render(
      <FloatingPanel
        title="Status"
        anchor="top-left"
        position={{ x: 0, y: 0 }}
        onMoveBy={() => {}}
      >
        <span data-testid="body">hello panel</span>
      </FloatingPanel>,
    );
    const panel = screen.getByTestId("floating-panel");
    expect(panel).toBeInTheDocument();
    // Absolutely positioned and above the board (overlay), pinned to the
    // top-left corner by default.
    expect(panel.className).toContain("absolute");
    expect(panel.className).toContain("z-10");
    expect(panel.className).toContain("left-4");
    expect(panel.className).toContain("top-4");
    expect(panel.getAttribute("data-anchor")).toBe("top-left");
    // A drag header with the title, and the body rendered inside.
    expect(screen.getByTestId("floating-panel-header")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByTestId("body")).toBeInTheDocument();
  });

  it("anchors to the requested corner/edge", () => {
    const { rerender } = render(
      <FloatingPanel
        title="Actions"
        anchor="bottom-right"
        position={{ x: 0, y: 0 }}
        onMoveBy={() => {}}
      />,
    );
    let panel = screen.getByTestId("floating-panel");
    expect(panel.className).toContain("bottom-4");
    expect(panel.className).toContain("right-4");
    expect(panel.getAttribute("data-anchor")).toBe("bottom-right");

    rerender(
      <FloatingPanel
        title="Actions"
        anchor="bottom-left"
        position={{ x: 0, y: 0 }}
        onMoveBy={() => {}}
      />,
    );
    panel = screen.getByTestId("floating-panel");
    expect(panel.className).toContain("bottom-4");
    expect(panel.className).toContain("left-4");
    expect(panel.getAttribute("data-anchor")).toBe("bottom-left");
  });

  it("applies a translate offset away from the anchor", () => {
    const { rerender } = render(
      <FloatingPanel
        title="Status"
        anchor="top-left"
        position={{ x: 0, y: 0 }}
        onMoveBy={() => {}}
      />,
    );
    // Top/left anchors translate by +x/+y (down-right from the corner).
    expect(screen.getByTestId("floating-panel").getAttribute("style")).toContain(
      "translate(0px, 0px)",
    );

    rerender(
      <FloatingPanel
        title="Status"
        anchor="top-left"
        position={{ x: 40, y: 25 }}
        onMoveBy={() => {}}
      />,
    );
    expect(screen.getByTestId("floating-panel").getAttribute("style")).toContain(
      "translate(40px, 25px)",
    );

    // Bottom/right anchors invert x/y so the panel follows the pointer when
    // dragged left/up (away from the opposite corner).
    rerender(
      <FloatingPanel
        title="Status"
        anchor="bottom-right"
        position={{ x: 40, y: 25 }}
        onMoveBy={() => {}}
      />,
    );
    expect(screen.getByTestId("floating-panel").getAttribute("style")).toContain(
      "translate(-40px, -25px)",
    );
  });

  it("reports drag deltas on the header via onMoveBy", () => {
    const onMoveBy = vi.fn();
    render(
      <FloatingPanel
        title="Cell"
        anchor="top-left"
        position={{ x: 0, y: 0 }}
        onMoveBy={onMoveBy}
      />,
    );
    const header = screen.getByTestId("floating-panel-header");

    const pointer = (node: HTMLElement, type: string, x: number, y: number) =>
      act(() =>
        node.dispatchEvent(
          new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
        ),
      );

    pointer(header, "pointerdown", 10, 10);
    pointer(header, "pointermove", 40, 30);
    pointer(header, "pointermove", 40, 60);
    pointer(header, "pointerup", 40, 60);

    // The accumulated deltas are (30, 20) then (0, 30).
    expect(onMoveBy).toHaveBeenNthCalledWith(1, 30, 20);
    expect(onMoveBy).toHaveBeenNthCalledWith(2, 0, 30);
    expect(onMoveBy).toHaveBeenCalledTimes(2);
  });

  it("does not report a drag when the pointer moves without a grab", () => {
    const onMoveBy = vi.fn();
    render(
      <FloatingPanel
        title="Cell"
        anchor="top-left"
        position={{ x: 0, y: 0 }}
        onMoveBy={onMoveBy}
      />,
    );
    const header = screen.getByTestId("floating-panel-header");
    act(() =>
      header.dispatchEvent(
        new MouseEvent("pointermove", { bubbles: true, clientX: 90, clientY: 90 }),
      ),
    );
    expect(onMoveBy).not.toHaveBeenCalled();
  });

  it("stops the drag gesture's pointer events from reaching the board", () => {
    const onMoveBy = vi.fn();
    render(
      <FloatingPanel
        title="Cell"
        anchor="top-left"
        position={{ x: 0, y: 0 }}
        onMoveBy={onMoveBy}
      />,
    );
    const header = screen.getByTestId("floating-panel-header");

    // The pointerdown on the panel header is stopped from propagating to the
    // board's pan handler (bubbling listener on the viewport ancestor).
    const listener = vi.fn();
    document.body.addEventListener("pointerdown", listener);
    fireEvent.pointerDown(header, { clientX: 10, clientY: 10 });
    document.body.removeEventListener("pointerdown", listener);
    // The header's own stopPropagation prevents the event from bubbling up to
    // the document-level board listener.
    expect(listener).not.toHaveBeenCalled();
  });
});
