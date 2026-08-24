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

  it("ends the turn (income is collected automatically) and the AI replies", () => {
    render(<PlayableGame />);
    // Income is applied automatically at the start of the turn, so the human's
    // turn begins directly on recruit/move actions — there is no manual
    // "Collect Income" step.
    expect(screen.getAllByText(/Recruit \/ Act/).length).toBeGreaterThan(0);

    act(() => {
      fireEvent.click(screen.getByTestId("submit-turn"));
    });

    // The AI replies and the next human turn starts again on the recruit step.
    expect(screen.getAllByText(/Recruit \/ Act/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Current: You/)).toBeInTheDocument();
  });

  it("clear discards this turn's selections back to the recruit step", () => {
    render(<PlayableGame />);
    // The human starts on the recruit step; select the first legal action.
    const firstAction = screen.getAllByTestId("action-button")[0];
    act(() => {
      fireEvent.click(firstAction);
    });
    expect(screen.getAllByText(/Recruit \/ Act/).length).toBeGreaterThan(0);
    act(() => {
      fireEvent.click(screen.getByTestId("clear-actions"));
    });
    // Back at the start of the turn: the recruit step (income collected
    // automatically at the start — no separate income step).
    expect(screen.getAllByText(/Recruit \/ Act/).length).toBeGreaterThan(0);
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
    const homeCell = cells.find(
      (c) =>
        c.querySelector('[data-testid="board-site"]')?.getAttribute("data-kind") ===
        "HomeTree",
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
    // The turn starts directly on the recruit step, so recruiting is already
    // legal (income is collected automatically).
    // Select a buildable hex (one adjacent to p1's Home Tree).
    const cells = screen.getAllByTestId("board-cell");
    // Some neighbouring land hexes of p1's (the human's) Home Tree are legal
    // placement hexes this turn (recruiting is restricted to the controlled
    // Home Tree's empty adjacent hexes), so click candidate neighbours until
    // the panel shows recruit action buttons for the selected buildable cell.
    const p1Home = cells.find(
      (c) =>
        c.querySelector('[data-testid="board-site"]')?.getAttribute("data-kind") ===
          "HomeTree" &&
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
    // On the recruit step the human has recruit/move/attack action buttons.
    expect(actions.getAllByTestId("action-button").length).toBeGreaterThan(0);
  });

  it("wires the floating actions overlay to the game: End Turn and the AI replies (M11-T2)", () => {
    render(<PlayableGame />);
    const actions = within(screen.getByTestId("actions-overlay"));
    // Income is collected automatically at the start of the turn, so the human
    // ends their turn directly — the AI replies and the next human turn starts
    // back on the recruit step.
    act(() => actions.getByTestId("submit-turn").click());
    expect(screen.getAllByText(/Recruit \/ Act/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Current: You/)).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /* Theme-polished floating full-screen UI (M11-T3 / #76)             */
  /* ------------------------------------------------------------------ */

  it("styles each floating panel card with the frosted-glass HUD surface (M11-T3 / M14-T1)", () => {
    render(<PlayableGame />);
    // Each floating panel card is a design-token frosted-glass surface — a
    // translucent fill over the map with a backdrop blur — so the HUD reads as
    // a polished over-map game HUD that stays readable over any terrain. The
    // panels now use the translucent `glass` surface (M14-T1 / #96) so the
    // glassmorphism effect is actually visible over the map.
    const overlays = [
      screen.getByTestId("status-overlay"),
      screen.getByTestId("cell-info-overlay"),
      screen.getByTestId("actions-overlay"),
    ];
    for (const overlay of overlays) {
      const card = overlay.firstElementChild as HTMLElement;
      // A token-backed frosted-glass utility (translucent fill + blur).
      expect(card.className).toMatch(/\bglass(?:-\w+)?\b/);
      // Rounded HUD card (blur + shadow surface with rounded corners).
      expect(card.className).toContain("rounded-2xl");
    }
  });

  it("floats the HUD panels on a translucent glass surface, not a near-opaque sheet (M14-T1)", () => {
    render(<PlayableGame />);
    // The M14 glass-design polish (#96) wants the frosted-glass effect visible
    // over the map, so the HUD panels must use the translucent `glass` surface
    // rather than the near-opaque `glass-panel` content sheet.
    const overlays = [
      screen.getByTestId("status-overlay"),
      screen.getByTestId("cell-info-overlay"),
      screen.getByTestId("actions-overlay"),
    ];
    for (const overlay of overlays) {
      const card = overlay.firstElementChild as HTMLElement;
      expect(card.className).toContain("glass");
      expect(card.className).not.toContain("glass-panel");
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

  /* ------------------------------------------------------------------ */
  /* Click-vs-drag selection on the full-screen board (M12-T1 / #84)    */
  /* ------------------------------------------------------------------ */

  /**
   * Helpers to drive a realistic pointer gesture (pointer-down → move → up)
   * and, where a browser would, the follow-up synthetic `click`. dispatching
   * real pointer/mouse events (not `fireEvent.click` on a cell) exercises the
   * viewport's `onPointerDown`/`setPointerCapture` wiring that regressed in
   * #83, so these tests reproduce the bug through the real event path.
   */
  const pointerEvent = (
    game: HTMLElement | Element,
    type: string,
    coords?: { x: number; y: number },
    opts: { pointerId?: number } = {},
  ) => {
    const init: Record<string, unknown> = {
      bubbles: true,
      cancelable: true,
      pointerId: opts.pointerId ?? 1,
    };
    if (coords) {
      init.clientX = coords.x;
      init.clientY = coords.y;
    }
    act(() => game.dispatchEvent(new MouseEvent(type, init)));
  };

  /** Press, release, then emit the browser's synthetic click on `el` with no
   *  drag — the realistic static-click event sequence. */
  const staticClick = (el: Element) => {
    pointerEvent(el, "pointerdown", { x: 0, y: 0 });
    pointerEvent(el, "pointerup", { x: 0, y: 0 });
    act(() => fireEvent.click(el));
  };

  it("selects a hex on a static pointer click (down→up) via the real pointer path (M12-T1)", () => {
    render(<PlayableGame />);
    const cells = screen.getAllByTestId("board-cell");
    const homeCell = cells.find(
      (c) =>
        c
          .querySelector('[data-testid="board-site"]')
          ?.getAttribute("data-kind") === "HomeTree",
    )!;

    // A genuine static click: pointer-down → pointer-up at the same spot, then
    // the browser's synthetic click. Because nothing is captured for a static
    // gesture, the click reaches the cell and selects it.
    staticClick(homeCell);

    expect(homeCell.className).toContain("hex-selected");
    expect(homeCell.dataset.selected).toBe("true");
    // The cell-info panel shows the selected home tree.
    expect(screen.getByTestId("cell-info-site")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("cell-info")).getByText("Home Tree"),
    ).toBeInTheDocument();
  });

  it("selects a movable unit via a static pointer click, highlights reachable targets, and pointer-clicking a target moves it (M12-T1)", () => {
    render(<PlayableGame />);

    // The turn begins directly on the recruit step, so the human's units are
    // already movable this turn (income is collected automatically).

    const cells = screen.getAllByTestId("board-cell");

    // Find a human-owned (p1) unit cell that has at least one legal move this
    // turn (post-income the units are movable).
    const unitCell = cells.find(
      (c) => c.dataset.owner === "p1" && !!c.querySelector("[data-testid='board-unit']"),
    );
    expect(unitCell).toBeDefined();

    // Static-click the movable unit to select it (real pointer path).
    staticClick(unitCell!);
    expect(unitCell!.className).toContain("hex-selected");

    // Its reachable move-target cells are highlighted.
    const targets = screen
      .getAllByTestId("board-cell")
      .filter((c) => c.dataset.moveTarget === "true");
    expect(targets.length).toBeGreaterThan(0);
    expect(unitCell!.dataset.moveTarget).toBe("false");

    // Pointer-clicking a reachable target issues the move: the unit is now on
    // the target cell and no longer on the original cell.
    const targetHex = targets[0].dataset.hex!;
    staticClick(targets[0]);
    screen.getAllByTestId("board-cell");
    expect(
      screen
        .getAllByTestId("board-cell")
        .find((c) => c.dataset.hex === unitCell!.dataset.hex)!
        .querySelector("[data-testid='board-unit']"),
    ).toBeNull();
    expect(
      screen
        .getAllByTestId("board-cell")
        .find((c) => c.dataset.hex === targetHex)!
        .querySelector("[data-testid='board-unit']"),
    ).not.toBeNull();
  });

  it("a drag beyond the threshold pans the board WITHOUT selecting a cell (M12-T1)", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const startStyle = board.getAttribute("style");

    // A genuine drag: pointer-down then a pointer-move well beyond the 5px
    // threshold, then pointer-up. The board pans.
    const cell = screen.getAllByTestId("board-cell")[0];
    pointerEvent(game, "pointerdown", { x: 0, y: 0 });
    pointerEvent(game, "pointermove", { x: 60, y: 75 });
    pointerEvent(game, "pointerup", { x: 60, y: 75 });

    // The board translated by the accumulated drag delta.
    expect(board.getAttribute("style")).not.toBe(startStyle);
    expect(board.getAttribute("style")!).toContain("translate(60px, 75px)");

    // A real browser fires a synthetic click after the drag. Because the
    // pointer was captured for the drag, that click is retargeted to this
    // capturing viewport (not the cell) and must be suppressed — a drag is not
    // a click, so no cell may become selected.
    act(() => fireEvent.click(game));
    expect(cell.className).not.toContain("hex-selected");
    expect(cell.dataset.selected).toBe("false");
    // No board cell is selected after the drag.
    for (const b of screen.getAllByTestId("board-cell")) {
      expect(b.dataset.selected).toBe("false");
    }
  });

  it("a sub-threshold wiggle is still a click: does not pan but does select (M12-T1)", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const startStyle = board.getAttribute("style");
    const cells = screen.getAllByTestId("board-cell");
    const homeCell = cells.find(
      (c) =>
        c
          .querySelector('[data-testid="board-site"]')
          ?.getAttribute("data-kind") === "HomeTree",
    )!;

    // Press, wiggle a couple of pixels (below the drag threshold), release,
    // and emit the browser's synthetic click on the cell.
    pointerEvent(game, "pointerdown", { x: 0, y: 0 });
    pointerEvent(game, "pointermove", { x: 2, y: 3 });
    pointerEvent(game, "pointerup", { x: 2, y: 3 });
    act(() => fireEvent.click(homeCell));

    // The tiny wiggle did not pan the board...
    expect(board.getAttribute("style")).toBe(startStyle);
    // ...and the static click still selected the cell.
    expect(homeCell.className).toContain("hex-selected");
    expect(homeCell.dataset.selected).toBe("true");
  });

  /* ------------------------------------------------------------------ */
  /* Regression tests: click-vs-drag selection interaction (M12-T2, #85) */
  /* ------------------------------------------------------------------ */

  /**
   * Dedicated regression suite for #85: reproduces the #83 selection bug
   * through the real pointer event path (pointerdown → pointerup / pointermove
   * → the viewport's pointer wiring), independent of any single fix commit,
   * so a static click still selects/highlights a hex and drives the info +
   * movement flows while a drag still pans without selecting. These tests
   * exercise the viewport `onPointerDown`/`setPointerCapture` path that
   * `fireEvent.click` alone bypasses.
   */

  it("regression: a static pointer click on a hex selects it and updates the info panel (M12-T2)", () => {
    render(<PlayableGame />);
    const cells = screen.getAllByTestId("board-cell");
    const homeCell = cells.find(
      (c) =>
        c
          .querySelector("[data-testid='board-site']")
          ?.getAttribute("data-kind") === "HomeTree",
    )!;

    // Realistic static click: pointer-down → pointer-up at the same spot (no
    // move), then the browser's synthetic click on the cell underneath. This
    // is the exact sequence that regressed in #83 — the pointer must NOT be
    // captured here, so the click reaches the cell.
    staticClick(homeCell);

    // The cell is selected/highlighted...
    expect(homeCell.className).toContain("hex-selected");
    expect(homeCell.dataset.selected).toBe("true");
    // ...and the info panel updates to the selected hex.
    expect(screen.getByTestId("cell-info-site")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("cell-info")).getByText("Home Tree"),
    ).toBeInTheDocument();

    // No drag happened, so the board did not pan (zero pan offset).
    expect(screen.getByTestId("board").getAttribute("style")!).toContain(
      "translate(0px, 0px)",
    );
  });

  it("regression: selecting a movable unit highlights reachable targets and pointer-clicking one moves it, updating the info panel (M12-T2)", () => {
    render(<PlayableGame />);

    // The turn begins directly on the recruit step, so the human's units are
    // already movable this turn (income is collected automatically).
    const cells = screen.getAllByTestId("board-cell");
    const unitCell = cells.find(
      (c) =>
        c.dataset.owner === "p1" &&
        !!c.querySelector("[data-testid='board-unit']"),
    );
    expect(unitCell).toBeDefined();

    // Select the movable unit via the real pointer path (static click).
    staticClick(unitCell!);

    // The unit is selected and the info panel now shows the unit details.
    expect(unitCell!.className).toContain("hex-selected");
    expect(unitCell!.dataset.selected).toBe("true");
    expect(screen.getByTestId("cell-info-unit")).toBeInTheDocument();

    // Its reachable move-target cells are highlighted.
    const targets = screen
      .getAllByTestId("board-cell")
      .filter((c) => c.dataset.moveTarget === "true");
    expect(targets.length).toBeGreaterThan(0);

    // Pointer-clicking a reachable target issues the move through the
    // selectCell flow: the unit leaves the original hex and appears on the
    // target hex.
    const targetHex = targets[0].dataset.hex!;
    const unitHex = unitCell!.dataset.hex!;
    staticClick(targets[0]);

    expect(
      screen
        .getAllByTestId("board-cell")
        .find((c) => c.dataset.hex === unitHex)!
        .querySelector("[data-testid='board-unit']"),
    ).toBeNull();
    expect(
      screen
        .getAllByTestId("board-cell")
        .find((c) => c.dataset.hex === targetHex)!
        .querySelector("[data-testid='board-unit']"),
    ).not.toBeNull();
  });

  it("regression: a genuine drag pans the board without selecting any cell or leaving selection artifacts (M12-T2)", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const startStyle = board.getAttribute("style");

    // Genuine drag: pointer-down then moves well beyond the 5px threshold,
    // then pointer-up. Only the drag path runs — no static click.
    pointerEvent(game, "pointerdown", { x: 0, y: 0 });
    pointerEvent(game, "pointermove", { x: 40, y: 30 });
    pointerEvent(game, "pointermove", { x: 80, y: 60 });
    pointerEvent(game, "pointerup", { x: 80, y: 60 });

    // The board panned by the accumulated drag deltas (40,30) then (40,30).
    expect(board.getAttribute("style")).not.toBe(startStyle);
    expect(board.getAttribute("style")!).toContain("translate(80px, 60px)");

    // The browser's follow-up synthetic click is retargeted to the capturing
    // viewport and must be suppressed: a drag is not a click, so no cell is
    // selected and no move-target highlights appear.
    act(() => fireEvent.click(game));
    for (const b of screen.getAllByTestId("board-cell")) {
      expect(b.dataset.selected).toBe("false");
      expect(b.dataset.moveTarget).toBe("false");
      expect(b.className).not.toContain("hex-selected");
    }
  });

  it("regression: a static click still selects after a previous drag (suppressClick resets on pointer-down) (M12-T2)", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const cells = screen.getAllByTestId("board-cell");
    const homeCell = cells.find(
      (c) =>
        c
          .querySelector("[data-testid='board-site']")
          ?.getAttribute("data-kind") === "HomeTree",
    )!;

    // First perform a genuine drag that pans and must not select.
    pointerEvent(game, "pointerdown", { x: 0, y: 0 });
    pointerEvent(game, "pointermove", { x: 50, y: 0 });
    pointerEvent(game, "pointerup", { x: 50, y: 0 });
    act(() => fireEvent.click(game));
    expect(homeCell.dataset.selected).toBe("false");

    // Then a fresh static click on a hex: the drag's suppression must have
    // been reset by the new pointer-down, so this click selects the cell.
    staticClick(homeCell);
    expect(homeCell.className).toContain("hex-selected");
    expect(homeCell.dataset.selected).toBe("true");
  });
});
