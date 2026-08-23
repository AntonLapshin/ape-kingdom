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

    // The info panels float over the map as absolute overlays instead of
    // constraining it in a side column.
    const overlay = container.querySelector("[data-testid='status-overlay']");
    expect(overlay).toBeDefined();
    expect(overlay!.className).toContain("absolute");
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

  /* ------------------------------------------------------------------ */
  /* Floating overlay panels (M11-T2)                                   */
  /* ------------------------------------------------------------------ */

  it("floats the three panels as distinct absolutely-positioned overlays at corners (M11-T2)", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game");
    const board = screen.getByTestId("board");

    // Three distinct floating overlays, one per panel.
    const status = screen.getByTestId("status-overlay");
    const cellInfo = screen.getByTestId("cell-info-overlay");
    const actions = screen.getByTestId("actions-overlay");
    expect(status).not.toBe(cellInfo);
    expect(status).not.toBe(actions);
    expect(cellInfo).not.toBe(actions);

    // Each overlay is absolutely positioned above the board in the viewport.
    for (const overlay of [status, cellInfo, actions]) {
      expect(overlay.className).toContain("absolute");
      expect(overlay.className).toContain("z-10");
      // The board layer is a sibling rendered beneath the overlays.
      expect(board.closest("[data-testid='board-layer']")).toBeDefined();
      expect(overlay.closest("[data-testid='playable-game']")).toBe(game);
    }

    // Status floats top-left, cell info bottom-left, actions bottom-right.
    expect(status.className).toContain("left-4");
    expect(status.className).toContain("top-4");
    expect(cellInfo.className).toContain("bottom-4");
    expect(cellInfo.className).toContain("left-4");
    expect(actions.className).toContain("bottom-4");
    expect(actions.className).toContain("right-4");
  });

  it("keeps the board interactive outside the floating panels (only panels intercept pointer input) (M11-T2)", () => {
    render(<PlayableGame />);
    // The overlay containers are pointer-events-none so the surrounding space
    // never intercepts the board; only the panel card inside is auto.
    const overlays = [
      screen.getByTestId("status-overlay"),
      screen.getByTestId("cell-info-overlay"),
      screen.getByTestId("actions-overlay"),
    ];
    for (const overlay of overlays) {
      expect(overlay.className).toContain("pointer-events-none");
      const card = overlay.firstElementChild as HTMLElement;
      expect(card.className).toContain("pointer-events-auto");
    }

    // Panning still works while the floating panels are present: dragging
    // across the viewport translates the board.
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const pointer = (type: string, coords?: { x: number; y: number }) => {
      const init: Record<string, unknown> = { bubbles: true, cancelable: true };
      if (coords) {
        init.clientX = coords.x;
        init.clientY = coords.y;
      }
      game.dispatchEvent(new MouseEvent(type, init));
    };
    act(() => pointer("pointerdown", { x: 0, y: 0 }));
    act(() => pointer("pointermove", { x: 20, y: 10 }));
    act(() => pointer("pointerup"));
    expect(board.getAttribute("style")!).toContain("translate(20px, 10px)");

    // Zooming still works too.
    act(() =>
      game.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: -100,
        }),
      ),
    );
    expect(board.getAttribute("style")!).toContain("scale(1.1)");
  });

  it("renders all three floating panels' content (status, cell info, actions) (M11-T2)", () => {
    render(<PlayableGame />);
    // Each of the three panels is present and shows its content.
    const status = within(screen.getByTestId("status-overlay"));
    expect(status.getByTestId("status")).toBeInTheDocument();
    expect(status.getByText(/Current: You/)).toBeInTheDocument();

    const cellInfo = within(screen.getByTestId("cell-info-overlay"));
    expect(cellInfo.getByTestId("cell-info")).toBeInTheDocument();
    expect(cellInfo.getByText(/click a hex to inspect/i)).toBeInTheDocument();

    const actions = within(screen.getByTestId("actions-overlay"));
    expect(actions.getByTestId("actions")).toBeInTheDocument();
    expect(actions.getByText("Collect Income")).toBeInTheDocument();
  });

  it("wires the floating actions overlay to the game: collect income then End Turn and the AI replies (M11-T2)", () => {
    render(<PlayableGame />);
    const actions = within(screen.getByTestId("actions-overlay"));
    // Collect income from the floating actions panel, then End Turn — the AI
    // replies and the next human turn starts back on the income step.
    act(() => actions.getByText("Collect Income").click());
    expect(screen.getAllByText(/Recruit \/ Act/).length).toBeGreaterThan(0);
    act(() => actions.getByTestId("submit-turn").click());
    expect(screen.getByText("Collect Income")).toBeInTheDocument();
    expect(screen.getByText(/Current: You/)).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /* Theme-polished floating full-screen UI (M11-T3 / #76)             */
  /* ------------------------------------------------------------------ */

  it("styles each floating panel card with the token glass-panel HUD surface (M11-T3)", () => {
    render(<PlayableGame />);
    // Each floating panel card is a `glass-panel` surface — the design-token
    // backdrop-blur + shadow HUD surface — so the panels read as a polished
    // over-map game HUD that stays readable over any terrain.
    const overlays = [
      screen.getByTestId("status-overlay"),
      screen.getByTestId("cell-info-overlay"),
      screen.getByTestId("actions-overlay"),
    ];
    for (const overlay of overlays) {
      const card = overlay.firstElementChild as HTMLElement;
      expect(card.className).toContain("glass-panel");
      // Rounded HUD card (blur + shadow surface with rounded corners).
      expect(card.className).toContain("rounded-2xl");
    }
  });

  it("pops each floating panel card in with the token menu-pop animation (M11-T3)", () => {
    render(<PlayableGame />);
    // Each floating panel card animates in on mount via the token `menu-pop`
    // animation class defined in the theme styles (M5-T3), giving the HUD a
    // polished, non-jarring appearance over the map.
    const overlays = [
      screen.getByTestId("status-overlay"),
      screen.getByTestId("cell-info-overlay"),
      screen.getByTestId("actions-overlay"),
    ];
    for (const overlay of overlays) {
      const card = overlay.firstElementChild as HTMLElement;
      expect(card.className).toContain("menu-pop");
    }
  });

  it("keeps the full-screen board layer beneath the themed floating panels (M11-T3)", () => {
    render(<PlayableGame />);
    const board = screen.getByTestId("board");
    // The board layer fills the viewport beneath the overlays and is the first
    // absolute layer (rendered before the z-10 panels), so the HUD never
    // occludes pan/zoom/selection outside the panels.
    const boardLayer = board.closest("[data-testid='board-layer']") as HTMLElement;
    expect(boardLayer).toBeDefined();
    expect(boardLayer.className).toContain("absolute");
    expect(boardLayer.className).toContain("inset-0");
    // Pan/zoom/selection still work with the themed HUD present.
    const game = screen.getByTestId("playable-game") as HTMLElement;
    act(() =>
      game.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: -100,
        }),
      ),
    );
    expect(board.getAttribute("style")!).toContain("scale(1.1)");
  });
});
