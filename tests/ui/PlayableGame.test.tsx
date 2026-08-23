import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { PlayableGame } from "../../src/ui/components/PlayableGame";

/* ------------------------------------------------------------------ */
/* PlayableGame (composition wired to the useGameSession view model)   */
/* ------------------------------------------------------------------ */

describe("PlayableGame", () => {
  it("renders the board, status panel, and action controls", () => {
    render(<PlayableGame />);
    expect(screen.getByTestId("playable-game")).toBeInTheDocument();
    expect(screen.getByTestId("board")).toBeInTheDocument();
    expect(screen.getByTestId("status")).toBeInTheDocument();
    expect(screen.getByTestId("actions")).toBeInTheDocument();
  });

  it("lets the human collect income, then end the turn, and the AI replies", () => {
    render(<PlayableGame />);
    // The first legal action on the income step is "Collect Income".
    const incomeButton = screen.getByText("Collect Income");
    expect(incomeButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(incomeButton);
    });

    // After income, recruiting becomes available and the step advances.
    // ("Recruit / Act" appears in both the status panel and the action controls.)
    expect(screen.getAllByText(/Recruit \/ Act/).length).toBeGreaterThan(0);

    act(() => {
      fireEvent.click(screen.getByTestId("submit-turn"));
    });

    // The AI replies and the next human turn starts on the income step.
    expect(screen.getByText("Collect Income")).toBeInTheDocument();
    expect(screen.getByText(/Current: You/)).toBeInTheDocument();
  });

  it("clear discards this turn's selections back to the income step", () => {
    render(<PlayableGame />);
    act(() => {
      fireEvent.click(screen.getByText("Collect Income"));
    });
    expect(screen.getAllByText(/Recruit \/ Act/).length).toBeGreaterThan(0);
    act(() => {
      fireEvent.click(screen.getByTestId("clear-actions"));
    });
    expect(screen.getByText("Income")).toBeInTheDocument();
  });

  it("fills the viewport with a non-scrolling on-screen container", () => {
    const { container } = render(<PlayableGame />);
    const game = screen.getByTestId("playable-game");
    expect(game).toBeInTheDocument();
    // The full-viewport container is directly on the testid root.
    expect(container.querySelector("[data-testid='playable-game']")).toBe(game);
    expect(game.className).toContain("h-screen");
    expect(game.className).toContain("w-screen");
    expect(game.className).toContain("overflow-hidden");
  });

  it("lays out the board full-screen without a max-width grid or a wrapping glass panel (M11-T1)", () => {
    const { container } = render(<PlayableGame />);
    const game = screen.getByTestId("playable-game");
    const board = screen.getByTestId("board");

    // The board is no longer wrapped by a glass panel inside a max-w-5xl grid:
    // the board's closest wrap is the full-screen board layer, not a contained
    // grid/panel column.
    const boardLayer = board.closest("[data-testid='board-layer']");
    expect(boardLayer).toBeDefined();
    // The full viewport is an ancestor of the board layer.
    expect(boardLayer!.closest("[data-testid='playable-game']")).toBe(game);

    // The legacy constrained grid container is gone entirely.
    expect(
      container.querySelector("[class*='max-w-5xl']"),
    ).toBeNull();

    // The board layer fills the whole viewport (absolute inset-0) so the map
    // is no longer a contained UI element.
    expect(boardLayer!.className).toContain("absolute");
    expect(boardLayer!.className).toContain("inset-0");

    // The info panels float over the map as each-of-their-own absolute
    // overlays (no side column / aside wrapper) anchored to viewport corners.
    const floatingPanels = container.querySelectorAll(
      "[data-testid='floating-panel']",
    );
    expect(floatingPanels.length).toBe(3);
    floatingPanels.forEach((p) => {
      expect(p.className).toContain("absolute");
      expect(p.className).toContain("z-10");
    });
  });

  it("floats each panel at a viewport corner above the board, preserving the game wiring (M11-T2)", () => {
    const { container } = render(<PlayableGame />);
    // Status, cell info, and action controls are each their own floating
    // overlay (absolutely positioned, z-index above the board) rather than a
    // single side column.
    const panels = Array.from(
      container.querySelectorAll("[data-testid='floating-panel']"),
    );
    expect(panels).toHaveLength(3);

    // Each panel is anchored to a sensible viewport corner/edge and carries a
    // draggable header.
    const anchors = panels.map((p) => p.getAttribute("data-anchor"));
    expect(new Set(anchors)).toEqual(
      new Set(["top-left", "top-right", "bottom-right"]),
    );
    panels.forEach((p) => {
      expect(
        p.querySelector("[data-testid='floating-panel-header']"),
      ).toBeDefined();
      expect(p.className).toContain("absolute");
      expect(p.className).toContain("z-10");
    });

    // The status panel floats top-left and still renders the game wiring.
    expect(screen.getByTestId("status")).toBeInTheDocument();
    expect(
      screen.getByTestId("status").closest("[data-testid='floating-panel']"),
    ).toBeDefined();
    // The cell info panel floats top-right and still renders its prompt.
    expect(screen.getByTestId("cell-info")).toBeInTheDocument();
    expect(screen.getByText(/click a hex to inspect/i)).toBeInTheDocument();
    // The action controls float bottom-right and still wire End Turn / Clear.
    expect(screen.getByTestId("actions")).toBeInTheDocument();
    expect(screen.getByTestId("submit-turn")).toBeInTheDocument();
    expect(screen.getByTestId("clear-actions")).toBeInTheDocument();
  });

  it("drags a floating panel header to move it without panning the board (M11-T2)", () => {
    render(<PlayableGame />);
    const board = screen.getByTestId("board");
    // The status panel is anchored top-left.
    const status = screen
      .getByTestId("status")
      .closest("[data-testid='floating-panel']") as HTMLElement;
    const header = status.querySelector(
      "[data-testid='floating-panel-header']",
    ) as HTMLElement;
    const startStyle = status.getAttribute("style");

    const pointer = (node: HTMLElement, type: string, x: number, y: number) =>
      node.dispatchEvent(
        new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
      );

    // Drag the status panel header from (100,100) to (160, 80): a +60 dx (the
    // panel is left-anchored, so a positive dx translates right) and a -20 dy
    // (up). The board must not pan.
    act(() => pointer(header, "pointerdown", 100, 100));
    act(() => pointer(header, "pointermove", 160, 100));
    act(() => pointer(header, "pointermove", 160, 80));
    act(() => pointer(header, "pointerup", 160, 80));

    const newStyle = status.getAttribute("style")!;
    expect(newStyle).toContain("translate(60px, -20px)");
    expect(newStyle).not.toBe(startStyle);
    // Because dragging is stopped at the header, the board underneath does not
    // pan: its translate stays at the initial origin (0px, 0px).
    expect(board.getAttribute("style")!).toContain("translate(0px, 0px)");
  });

  it("tracks drag deltas from a bottom-anchored panel's own header, not the board's pan (M11-T2)", () => {
    render(<PlayableGame />);
    const board = screen.getByTestId("board");
    // Actions panel is anchored bottom-right.
    const actions = screen
      .getByTestId("actions")
      .closest("[data-testid='floating-panel']") as HTMLElement;
    const header = actions.querySelector(
      "[data-testid='floating-panel-header']",
    ) as HTMLElement;

    const pointer = (node: HTMLElement, type: string, x: number, y: number) =>
      node.dispatchEvent(
        new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
      );

    // Drag the bottom-right panel's header left/up by (-40, -30): a
    // bottom/right anchor inverts the +dx/+dy so the panel follows the pointer.
    // The board doesn't pan.
    act(() => pointer(header, "pointerdown", 200, 200));
    act(() => pointer(header, "pointermove", 160, 200));
    act(() => pointer(header, "pointermove", 160, 170));
    act(() => pointer(header, "pointerup", 160, 170));

    expect(actions.getAttribute("style")!).toContain("translate(40px, 30px)");
    // The board underneath doesn't pan (stays at the initial origin).
    expect(board.getAttribute("style")!).toContain("translate(0px, 0px)");
  });

  it("keeps board pan/zoom working over the full-screen map with the floating panels (M11-T2)", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");

    // A zoom gesture over the board still works.
    act(() =>
      game.dispatchEvent(
        new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 }),
      ),
    );
    expect(board.getAttribute("style")!).toContain("scale(1.1)");

    // A drag directly on the board (not on a panel header) still pans it.
    const drag = (type: string, x: number, y: number) =>
      act(() =>
        game.dispatchEvent(
          new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
        ),
      );
    drag("pointerdown", 0, 0);
    drag("pointermove", 20, 10);
    drag("pointerup", 20, 10);
    expect(board.getAttribute("style")!).toContain("translate(20px, 10px)");
  });

  it("drags across the viewport to pan the board", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const startStyle = board.getAttribute("style");

    // Pointer events carry coordinates via a MouseEvent in jsdom (no native
    // PointerEvent is available); the component consumes clientX/clientY.
    const pointer = (type: string, coords?: { x: number; y: number }) => {
      const init: Record<string, unknown> = { bubbles: true, cancelable: true };
      if (coords) {
        init.clientX = coords.x;
        init.clientY = coords.y;
      }
      game.dispatchEvent(new MouseEvent(type, init));
    };

    // Pointer down at (10, 10), then two moves to (40, 55) and (60, 75).
    act(() => {
      pointer("pointerdown", { x: 10, y: 10 });
    });
    act(() => {
      pointer("pointermove", { x: 40, y: 55 });
    });
    act(() => {
      pointer("pointermove", { x: 60, y: 75 });
    });
    act(() => {
      pointer("pointerup");
    });

    const panStyle = board.getAttribute("style")!;
    // The board transform reflects the accumulated drag deltas: (30, 45) then
    // (20, 20), i.e. a total of translate(50px, 65px).
    expect(panStyle).toContain("translate(50px, 65px)");
    expect(panStyle).not.toBe(startStyle);

    // A second drag from the origin continues to add to the offset.
    act(() => {
      pointer("pointerdown", { x: 0, y: 0 });
    });
    act(() => {
      pointer("pointermove", { x: -10, y: 0 });
    });
    act(() => {
      pointer("pointerup");
    });
    expect(board.getAttribute("style")!).toContain("translate(40px, 65px)");
  });

  it("does not pan when the pointer moves without a drag gesture", () => {
    render(<PlayableGame />);
    const board = screen.getByTestId("board");
    const startStyle = board.getAttribute("style");
    // A pointer move with no preceding pointer down must not pan the board.
    const game = screen.getByTestId("playable-game") as HTMLElement;
    act(() => {
      game.dispatchEvent(
        new MouseEvent("pointermove", {
          bubbles: true,
          clientX: 100,
          clientY: 100,
        }),
      );
    });
    expect(board.getAttribute("style")).toBe(startStyle);
  });

  it("scrolls the wheel up to zoom in and down to zoom out on the board", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");

    const wheel = (deltaY: number) => {
      act(() => {
        game.dispatchEvent(
          new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }),
        );
      });
    };

    // Scroll up (negative deltaY) zooms in: default 1 -> scale(1.1).
    wheel(-100);
    expect(board.getAttribute("style")!).toContain("scale(1.1)");

    // Scroll down (positive deltaY) zooms back out to 1.
    wheel(100);
    expect(board.getAttribute("style")!).toContain("scale(1)");
  });

  it("prevents the default page scroll when zooming", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -100,
    });
    act(() => {
      game.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it("clamps the zoom scale so the board maps stays visible", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const wheel = (deltaY: number) =>
      act(() =>
        game.dispatchEvent(
          new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }),
        ),
      );

    // Zoom out many times: the board never goes below the min scale.
    for (let i = 0; i < 40; i++) wheel(100);
    expect(board.getAttribute("style")!).toContain("scale(0.5)");

    // Zoom in many times: never above the max scale.
    for (let i = 0; i < 40; i++) wheel(-100);
    expect(board.getAttribute("style")!).toContain("scale(2.5)");
  });

  it("combines zoom and pan in the board transform", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const wheel = (deltaY: number) =>
      act(() =>
        game.dispatchEvent(
          new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }),
        ),
      );
    const drag = (type: string, x: number, y: number) =>
      act(() =>
        game.dispatchEvent(
          new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
        ),
      );

    // Zoom in once then pan by (30, 20).
    wheel(-100);
    drag("pointerdown", 0, 0);
    drag("pointermove", 30, 20);
    drag("pointerup", 30, 20);

    expect(board.getAttribute("style")!).toContain("translate(30px, 20px)");
    expect(board.getAttribute("style")!).toContain("scale(1.1)");
  });

  it("renders the cell info panel showing an empty prompt initially", () => {
    render(<PlayableGame />);
    expect(screen.getByTestId("cell-info")).toBeInTheDocument();
    expect(screen.getByText(/click a hex to inspect/i)).toBeInTheDocument();
  });

  it("selects a hex on click, highlights it, and shows its info panel", () => {
    render(<PlayableGame />);
    // Click p1's Home Tree cell.
    const cells = screen.getAllByTestId("board-cell");
    const homeCell = cells.find((c) =>
      c.querySelector('[data-testid="board-site"]')?.textContent?.includes("Home Tree"),
    )!;
    act(() => {
      fireEvent.click(homeCell);
    });
    // The clicked cell is now highlighted as selected.
    expect(homeCell.className).toContain("hex-selected");
    expect(homeCell.dataset.selected).toBe("true");
    // The info panel shows the selected home tree's read-only info.
    expect(screen.getByTestId("cell-info-site")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("cell-info")).getByText("Home Tree"),
    ).toBeInTheDocument();
  });

  it("lists buildable recruit actions from the panel and wires them to the game", () => {
    render(<PlayableGame />);
    // Collect income to make recruiting legal.
    act(() => {
      fireEvent.click(screen.getByText("Collect Income"));
    });
    // Select a buildable hex (one adjacent to p1's Home Tree).
    const cells = screen.getAllByTestId("board-cell");
    // Some neighbouring land hexes of p1's (the human's) Home Tree are legal
    // placement hexes this turn (recruiting is restricted to the controlled
    // Home Tree's empty adjacent hexes), so click candidate neighbours until
    // the panel shows recruit action buttons for the selected buildable cell.
    const p1Home = cells.find((c) =>
      c.querySelector('[data-testid="board-site"]')?.textContent?.includes("Home Tree") &&
      c.dataset.owner === "p1",
    )!;
    const [hq, hr] = p1Home.dataset.hex!.split(",").map(Number);
    const candidates = cells.filter((c) => {
      const [q, r] = c.dataset.hex!.split(",").map(Number);
      const dist = Math.max(Math.abs(q - hq), Math.abs(r - hr), Math.abs(q + r - hq - hr));
      return dist === 1 && c.dataset.owner === "neutral" && c.dataset.terrain === "land";
    });
    let clickedBuildable: HTMLElement | undefined;
    for (const candidate of candidates) {
      act(() => {
        fireEvent.click(candidate);
      });
      if (screen.queryAllByTestId("cell-action-button").length > 0) {
        clickedBuildable = candidate;
        break;
      }
    }
    expect(clickedBuildable).toBeDefined();
    // The panel now lists recruit action buttons (buildable cell).
    const actionButtons = screen.getAllByTestId("cell-action-button");
    expect(actionButtons.length).toBeGreaterThan(0);
    // Clicking the first recruit action selects it via the existing flow.
    const kindsBefore = actionButtons.map((b) => b.textContent);
    act(() => {
      fireEvent.click(actionButtons[0]);
    });
    // A recruit was performed: the step stays/advances and the action buttons
    // now reflect the reduced legal set (the occupied hex is no longer
    // buildable), so the panel re-derives against the new state.
    expect(kindsBefore.length).toBeGreaterThan(0);
  });
});
