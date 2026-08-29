import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { PlayableGame } from "../../src/ui/components/PlayableGame";
import { installFakeRaf } from "./testRaf";
import { boardScaleToFit } from "../../src/ui/viewModels/useZoom";

/* ------------------------------------------------------------------ */
/* PlayableGame (composition wired to the useGameSession view model)   */
/* ------------------------------------------------------------------ */

describe("PlayableGame", () => {
  // M29-T3 (#210): pan/zoom deltas are coalesced and committed once per
  // animation frame. jsdom's requestAnimationFrame never fires, so these tests
  // drive frame boundaries explicitly with a fake rAF: fire the pointer/wheel
  // events (which only accumulate deltas), then `flush()` a frame to commit
  // them into a single React state update.
  const raf = installFakeRaf();
  // Deterministic 17×17 default board (#226): the smaller default
  // map left the game-state tests below seed-dependent on the board's
  // random spawn/terrain. Pinning a fixed seed makes every rendered
  // game deterministically reproducible (no intermittent failures),
  // while pure-render/pan/zoom/panel tests are unaffected either way.
  const GAME_MAP = { seed: 0 };
  it("renders the board, status panel, and action controls", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    expect(screen.getByTestId("playable-game")).toBeInTheDocument();
    expect(screen.getByTestId("board")).toBeInTheDocument();
    expect(screen.getByTestId("status")).toBeInTheDocument();
    // The bottom-right corner now hosts the circular End Turn button, and the
    // turn's legal actions live in the bottom-left cell-info panel (M17-T2).
    expect(screen.getByTestId("submit-turn")).toBeInTheDocument();
    expect(screen.getByTestId("cell-info")).toBeInTheDocument();
  });

  it("forwards a fixed map seed so the rendered board is deterministically reproducible (#226)", () => {
    // The `mapConfig` prop is threaded through to `useGameSession`, so two
    // renders with the same seed produce identical boards (and spawns) instead
    // of a fresh random 17×17 board each time. This is what makes the
    // seed-fragile game-state tests below deterministic.
    const renderBoard = (seed: number) => {
      const r = render(<PlayableGame mapConfig={{ seed }} />);
      const hexes = r
        .getAllByTestId("board-cell")
        .map((c) => c.dataset.hex!)
        .sort()
        .join("|");
      r.unmount();
      return hexes;
    };
    expect(renderBoard(3)).toBe(renderBoard(3));
  });

  it("a different fixed seed renders a different buried spawn layout (#226)", () => {
    // The 17×17 grid always has the same board cells, but the generated layout
    // beneath them (spawns/sites/terrain) is seeded: different seeds place the
    // p1 Home Tree and the starting units on different hexes. Assert on the
    // seeded unit placement so this genuinely needs the seed to vary.
    const unitHexes = (seed: number) => {
      const r = render(<PlayableGame mapConfig={{ seed }} />);
      const hexes = r
        .getAllByTestId("board-cell")
        .filter((c) => c.querySelector("[data-testid='board-unit']"))
        .map((c) => c.dataset.hex!)
        .sort()
        .join("|");
      r.unmount();
      return hexes;
    };
    expect(unitHexes(3)).not.toBe(unitHexes(42));
  });

  it("ends the turn (income is collected automatically) and the AI replies", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // Income is applied automatically at the start of the turn, so the human's
    // turn begins directly on recruit/move actions.
    act(() => {
      fireEvent.click(screen.getByTestId("submit-turn"));
    });

    // The AI replies and the next human turn starts again.
    expect(screen.getByText(/Current: You/)).toBeInTheDocument();
  });

  it("does not render the redundant 'Your actions' move/attack list (M24-T3, #161)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // Movement is interactive only (select a unit on the map, then click a
    // highlighted reachable hex). The bottom-left cell-info panel must no
    // longer render the old non-recruit move/attack action-button list or its
    // Clear button.
    expect(screen.queryByText(/Your actions/i)).toBeNull();
    expect(screen.queryByTestId("action-button")).toBeNull();
    expect(screen.queryByTestId("clear-actions")).toBeNull();
  });

  it("fills the viewport with a non-scrolling on-screen container", () => {
    const { container } = render(<PlayableGame mapConfig={GAME_MAP} />);
    const game = screen.getByTestId("playable-game");
    expect(game).toBeInTheDocument();
    // The full-viewport container is directly on the testid root.
    expect(container.querySelector("[data-testid='playable-game']")).toBe(game);
    expect(game.className).toContain("h-screen");
    expect(game.className).toContain("w-screen");
    expect(game.className).toContain("overflow-hidden");
  });

  it("forbids text selection on the map board layer/board so dragging never selects text (M17-T1/#114)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // Both the wrapping board layer and the board root forbid user text
    // selection, so dragging/panning the map never produces a blue HTML
    // selection highlight.
    const boardLayer = screen.getByTestId("board-layer");
    expect(boardLayer.className).toContain("select-none");
    const board = screen.getByTestId("board");
    expect(board.className).toContain("select-none");
  });

  it("renders the map canvas background dark behind the surrounding ocean (M17-T3/#116)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // The full-screen board layer behind the generated map uses the dark
    // `bg-board-dark` canvas so the space outside the surrounding ocean reads
    // as near-black and the glass hexagons pop.
    const boardLayer = screen.getByTestId("board-layer");
    expect(boardLayer.className).toContain("bg-board-dark");
  });

  it("lays out the board full-screen without a max-width grid or a wrapping glass panel (M11-T1)", () => {
    const { container } = render(<PlayableGame mapConfig={GAME_MAP} />);
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
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    // Commit the accumulated drag deltas once, on the next animation frame
    // (M29-T3): the two moves (30,45)+(20,20) coalesce into a single commit.
    raf.flush();

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
    raf.flush();
    expect(board.getAttribute("style")!).toContain("translate(40px, 65px)");
  });

  it("does not pan when the pointer moves without a drag gesture", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    raf.flush();
    expect(board.getAttribute("style")!).toContain("scale(1.1)");

    // Scroll down (positive deltaY) zooms back out to 1.
    wheel(100);
    raf.flush();
    expect(board.getAttribute("style")!).toContain("scale(1)");
  });

  it("prevents the default page scroll when zooming", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const wheel = (deltaY: number) =>
      act(() =>
        game.dispatchEvent(
          new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }),
        ),
      );

    // Zoom out many times: the board never goes below the min scale. All 40
    // wheel deltas within one frame coalesce into a single commit (M29-T3).
    for (let i = 0; i < 40; i++) wheel(100);
    raf.flush();
    expect(board.getAttribute("style")!).toContain("scale(0.5)");

    // Zoom in many times: never above the max scale.
    for (let i = 0; i < 40; i++) wheel(-100);
    raf.flush();
    expect(board.getAttribute("style")!).toContain("scale(2.5)");
  });

  it("combines zoom and pan in the board transform", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    // Commit the coalesced zoom+pan deltas on the next frame (M29-T3).
    raf.flush();

    expect(board.getAttribute("style")!).toContain("translate(30px, 20px)");
    expect(board.getAttribute("style")!).toContain("scale(1.1)");
  });

  it("coalesces many wheel zoom deltas within a frame into a single committed state update (M29-T3 / #210)", async () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");

    // Count DOM style changes on the board, i.e. committed pan/zoom renders.
    let styleChanges = 0;
    const obs = new MutationObserver((records) => {
      styleChanges += records.length;
    });
    obs.observe(board, { attributes: true, attributeFilter: ["style"] });

    // Fire 5 wheel-in notches within one frame (each is ZOOM_STEP = 0.1).
    for (let i = 0; i < 5; i++) {
      act(() =>
        game.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            deltaY: -100,
          }),
        ),
      );
    }

    // No animation frame has been flushed yet: the deltas are only queued, so
    // the board has NOT committed anything (still at the default scale).
    expect(board.getAttribute("style")!).toContain("scale(1)");
    expect(styleChanges).toBe(0);

    // A single frame flush commits all 5 accumulated deltas at once: the board
    // jumps straight to the total (1 + 5*0.1 = 1.5) via exactly one state
    // update / re-render — no intermediate scale was ever rendered.
    raf.flush();
    expect(board.getAttribute("style")!).toContain("scale(1.5)");
    // Let the (asynchronous) mutation observer deliver its records.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(styleChanges).toBe(1);
    obs.disconnect();
  });

  it("coalesces many drag pan deltas within a frame into a single committed state update (M29-T3 / #210)", async () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");

    let styleChanges = 0;
    const obs = new MutationObserver((records) => {
      styleChanges += records.length;
    });
    obs.observe(board, { attributes: true, attributeFilter: ["style"] });

    const pointer = (type: string, coords?: { x: number; y: number }) => {
      const init: Record<string, unknown> = { bubbles: true, cancelable: true };
      if (coords) {
        init.clientX = coords.x;
        init.clientY = coords.y;
      }
      act(() => game.dispatchEvent(new MouseEvent(type, init)));
    };

    // A genuine drag with many moves all inside one frame (no flush in between).
    pointer("pointerdown", { x: 0, y: 0 });
    pointer("pointermove", { x: 30, y: 40 });
    pointer("pointermove", { x: 60, y: 80 });
    pointer("pointerup", { x: 60, y: 80 });

    // Nothing is committed until the next frame: still zero pan.
    expect(board.getAttribute("style")!).toContain("translate(0px, 0px)");
    expect(styleChanges).toBe(0);

    // One flush commits the two accumulated deltas (30,40)+(30,40) in a single
    // commit: the board jumps straight to translate(60px, 80px), not through
    // the intermediate translate(30px, 40px).
    raf.flush();
    expect(board.getAttribute("style")!).toContain("translate(60px, 80px)");
    // Let the (asynchronous) mutation observer deliver its records.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(styleChanges).toBe(1);
    obs.disconnect();
  });

  it("still accumulates deltas across many frames, so no event is lost (M29-T3 / #210)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");

    const wheel = (deltaY: number) =>
      act(() =>
        game.dispatchEvent(
          new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }),
        ),
      );

    // Zoom in by 2 (per frame), flush, then zoom in by 3 more (per frame), so
    // no delta across frames is lost: 1 + 2*0.1 + 3*0.1 = 1.5.
    wheel(-100);
    wheel(-100);
    raf.flush();
    expect(board.getAttribute("style")!).toContain("scale(1.2)");
    wheel(-100);
    wheel(-100);
    wheel(-100);
    raf.flush();
    expect(board.getAttribute("style")!).toContain("scale(1.5)");
  });

  it("cancels the rAF loop on dispose, so no further frames are scheduled after unmount (M29-T3 / #210, AC #2)", () => {
    const { unmount } = render(<PlayableGame mapConfig={GAME_MAP} />);

    // The initial render scheduled one frame callback (the loop's first tick).
    expect(raf.scheduledCount()).toBe(1);

    // Flushing that frame runs the tick, which reschedules the next frame — so
    // the loop is alive and keeps scheduling exactly one callback per frame.
    raf.flush();
    expect(raf.scheduledCount()).toBe(1);

    // Disposing the component must cancel the pending frame (cancelAnimationFrame)
    // so the loop stops; no further callbacks may be scheduled afterwards.
    unmount();
    expect(raf.scheduledCount()).toBe(0);
  });

  it("renders the cell info panel showing an empty prompt initially", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    expect(screen.getByTestId("cell-info")).toBeInTheDocument();
    expect(screen.getByText(/click a hex to inspect/i)).toBeInTheDocument();
  });

  it("selects a hex on click, highlights it, and shows its info panel", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    render(<PlayableGame mapConfig={GAME_MAP} />);
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

  it("selecting the Home Tree surfaces recruit options that recruit end-to-end (M19-T3/#132)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // Click p1's (the human's) Home Tree. On the recruit step, selecting the
    // Home Tree must surface the "create new unit" recruit options.
    const cells = screen.getAllByTestId("board-cell");
    const p1Home = cells.find(
      (c) =>
        c.querySelector('[data-testid="board-site"]')?.getAttribute("data-kind") ===
          "HomeTree" &&
        c.dataset.owner === "p1",
    )!;
    act(() => {
      fireEvent.click(p1Home);
    });
    expect(p1Home.className).toContain("hex-selected");
    // The Home Tree is selected and the panel offers recruit buttons with cost.
    expect(screen.getByText(/Recruit here/i)).toBeInTheDocument();
    const buttons = screen.getAllByTestId("cell-action-button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) expect(b.textContent).toMatch(/🍌/);
    // Click the first recruit option; it must not crash and must perform a
    // recruit (the recruited unit appears on a board hex at its placement).
    const buttonsBefore = buttons.map((b) => b.textContent);
    act(() => {
      fireEvent.click(buttons[0]);
    });
    // Still rendered (no crash) and the seeded p1 monkeys on the board grew.
    expect(screen.getByTestId("playable-game")).toBeInTheDocument();
    expect(buttonsBefore.length).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------ */
  /* Floating overlay panels (M11-T2)                                   */
  /* ------------------------------------------------------------------ */

  it("floats the three panels as distinct absolutely-positioned overlays at corners (M11-T2)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // The overlay containers are pointer-events-none so the surrounding space
    // never intercepts the board; only the panel card inside is auto. The
    // bottom-right corner is now the standalone circular End Turn button (a
    // native <button>, inherently pointer-interactive), so only the glass panel
    // cards (status + cell-info) carry the explicit pointer-events-auto.
    const overlays = [
      screen.getByTestId("status-overlay"),
      screen.getByTestId("cell-info-overlay"),
    ];
    for (const overlay of overlays) {
      expect(overlay.className).toContain("pointer-events-none");
      const card = overlay.firstElementChild as HTMLElement;
      expect(card.className).toContain("pointer-events-auto");
    }
    // The circular End Turn button is enabled and clickable.
    expect(screen.getByTestId("submit-turn")).toBeEnabled();

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
    raf.flush();
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
    raf.flush();
    expect(board.getAttribute("style")!).toContain("scale(1.1)");
  });

  it("renders all three floating panels' content (status, cell info, actions) (M11-T2)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // Each of the three panels is present and shows its content.
    const status = within(screen.getByTestId("status-overlay"));
    expect(status.getByTestId("status")).toBeInTheDocument();
    expect(status.getByText(/Current: You/)).toBeInTheDocument();

    const cellInfo = within(screen.getByTestId("cell-info-overlay"));
    expect(cellInfo.getByTestId("cell-info")).toBeInTheDocument();
    expect(cellInfo.getByText(/click a hex to inspect/i)).toBeInTheDocument();
    // Movement is interactive only (M24-T3 / #161): the bottom-left panel no
    // longer renders a non-recruit move/attack action-button list.
    expect(cellInfo.queryAllByTestId("action-button")).toHaveLength(0);

    // The bottom-right corner hosts only the circular End Turn button.
    const actions = within(screen.getByTestId("actions-overlay"));
    expect(actions.getByTestId("submit-turn")).toBeInTheDocument();
    expect(actions.queryAllByTestId("action-button")).toHaveLength(0);
  });

  it("makes the circular End Turn button clickable: its wrapper opts back into pointer events so clicks register (M25-T1 / #166)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // The actions overlay container is pointer-events-none (so the board stays
    // interactive everywhere except on the button), but the End Turn button's
    // own wrapper must opt back in with pointer-events-auto — exactly matching
    // the status/cell-info panel cards. Without this the button inherited
    // pointer-events: none and clicks passed straight through, so the turn
    // never ended (#166).
    const actions = screen.getByTestId("actions-overlay");
    expect(actions.className).toContain("pointer-events-none");
    // The button is wrapped in a pointer-events-auto container.
    const buttonWrapper = actions.firstElementChild as HTMLElement;
    expect(buttonWrapper).toBeDefined();
    expect(buttonWrapper.className).toContain("pointer-events-auto");
    // The button sits inside that clickable wrapper.
    expect(buttonWrapper.querySelector("[data-testid='submit-turn']"))
      .not.toBeNull();
  });

  it("wires the floating actions overlay to the game: End Turn and the AI replies (M11-T2)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // Each floating panel card is a design-token frosted-glass surface — a
    // translucent fill over the map with a backdrop blur — so the HUD reads as
    // a polished over-map game HUD that stays readable over any terrain. The
    // panels now use the translucent `glass` surface (M14-T1 / #96) so the
    // glassmorphism effect is actually visible over the map. The bottom-right
    // corner is now the standalone circular End Turn button (not a panel card),
    // so only the card-based status and cell-info panels are checked here.
    const overlays = [
      screen.getByTestId("status-overlay"),
      screen.getByTestId("cell-info-overlay"),
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
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // The M14 glass-design polish (#96) wants the frosted-glass effect visible
    // over the map, so the HUD panels must use the translucent `glass` surface
    // rather than the near-opaque `glass-panel` content sheet.
    const overlays = [
      screen.getByTestId("status-overlay"),
      screen.getByTestId("cell-info-overlay"),
    ];
    for (const overlay of overlays) {
      const card = overlay.firstElementChild as HTMLElement;
      expect(card.className).toContain("glass");
      expect(card.className).not.toContain("glass-panel");
    }
  });

  it("pops each floating panel card in with the token menu-pop animation (M11-T3)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // Each floating panel card animates in on mount via the token `menu-pop`
    // animation class defined in the theme styles (M5-T3), giving the HUD a
    // polished, non-jarring appearance over the map. The bottom-right End Turn
    // button is not a panel card, so only the card-based panels are checked.
    const overlays = [
      screen.getByTestId("status-overlay"),
      screen.getByTestId("cell-info-overlay"),
    ];
    for (const overlay of overlays) {
      const card = overlay.firstElementChild as HTMLElement;
      expect(card.className).toContain("menu-pop");
    }
  });

  it("keeps the full-screen board layer beneath the themed floating panels (M11-T3)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    // Commit the coalesced zoom delta on the next frame (M29-T3 #210).
    raf.flush();
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
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    render(<PlayableGame mapConfig={GAME_MAP} />);

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

    // Its reachable move-target cells are highlighted. Skip enemy (attackable)
    // targets — they resolve as combat, which may destroy the unit (M30-T2 #225
    // added neutral units that can sit adjacent, so a highlighted target is not
    // always a plain capture-free move). Pick a non-enemy reachable target so
    // clicking it reliably issues a `move` and the unit lands there.
    const allTargets = screen
      .getAllByTestId("board-cell")
      .filter((c) => c.dataset.moveTarget === "true");
    expect(allTargets.length).toBeGreaterThan(0);
    const targets = allTargets.filter((c) => c.dataset.enemyTarget !== "true");
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
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const startStyle = board.getAttribute("style");

    // A genuine drag: pointer-down then a pointer-move well beyond the 5px
    // threshold, then pointer-up. The board pans (coalesced + committed on the
    // next animation frame, M29-T3).
    const cell = screen.getAllByTestId("board-cell")[0];
    pointerEvent(game, "pointerdown", { x: 0, y: 0 });
    pointerEvent(game, "pointermove", { x: 60, y: 75 });
    pointerEvent(game, "pointerup", { x: 60, y: 75 });
    raf.flush();

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
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    render(<PlayableGame mapConfig={GAME_MAP} />);
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
    render(<PlayableGame mapConfig={GAME_MAP} />);

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
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const startStyle = board.getAttribute("style");

    // Genuine drag: pointer-down then moves well beyond the 5px threshold,
    // then pointer-up. Only the drag path runs — no static click.
    pointerEvent(game, "pointerdown", { x: 0, y: 0 });
    pointerEvent(game, "pointermove", { x: 40, y: 30 });
    pointerEvent(game, "pointermove", { x: 80, y: 60 });
    pointerEvent(game, "pointerup", { x: 80, y: 60 });
    // Commit the two coalesced drag deltas (40,30)+(40,30) on the next frame.
    raf.flush();

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
    render(<PlayableGame mapConfig={GAME_MAP} />);
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

  /* ------------------------------------------------------------------ */
  /* Circular End Turn + hidden AI bananas (M17-T2 / #115)              */
  /* ------------------------------------------------------------------ */

  it("shows only a circular End Turn button in the bottom-right corner (M17-T2 / #115)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const actions = within(screen.getByTestId("actions-overlay"));
    // The bottom-right corner hosts exactly one control: the circular End Turn
    // button (issue #113-2).
    const buttons = actions.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    const endTurn = actions.getByTestId("submit-turn");
    expect(endTurn.className).toContain("rounded-full");
    // No separate "Step: Recruit / Act" label in the bottom-right corner.
    expect(actions.queryByText(/Step:/i)).toBeNull();
    // Movement is interactive only (M24-T3 / #161): the bottom-left panel no
    // longer renders a move/attack action-button list.
    const cellInfo = within(screen.getByTestId("cell-info-overlay"));
    expect(cellInfo.queryAllByTestId("action-button")).toHaveLength(0);
  });

  it("enables the End Turn button during the human's turn and disables it when done (M17-T2 / #115)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // On the human's turn the button is enabled.
    expect(screen.getByTestId("submit-turn")).toBeEnabled();
    // Ending the turn still advances it (the AI replies) and the next human
    // turn begins, leaving the button enabled again.
    act(() => fireEvent.click(screen.getByTestId("submit-turn")));
    expect(screen.getByText(/Current: You/)).toBeInTheDocument();
    expect(screen.getByTestId("submit-turn")).toBeEnabled();
  });

  it("regression: End Turn works from the movefight step with units still unmoved (#131)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const cells = () => screen.getAllByTestId("board-cell");

    // Move the first p1 unit into a reachable target, advancing the session
    // from recruit to the movefight step while other p1 units remain unmoved.
    const unitCell = cells().find(
      (c) =>
        c.dataset.owner === "p1" &&
        !!c.querySelector("[data-testid='board-unit']"),
    )!;
    act(() => fireEvent.click(unitCell));
    const target = cells().find((c) => c.dataset.moveTarget === "true");
    expect(target).toBeDefined();
    act(() => fireEvent.click(target!));

    // The End Turn button stays enabled after moving (it is not gated on all
    // units having acted), on the movefight step with units left unmoved.
    expect(screen.getByTestId("submit-turn")).toBeEnabled();

    // Clicking End Turn ends the human's turn and triggers the AI reply,
    // advancing to the next human turn — even though some units never moved.
    act(() => fireEvent.click(screen.getByTestId("submit-turn")));
    expect(screen.getAllByText(/Current: You/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("submit-turn")).toBeEnabled();
  });

  it("regression: End Turn works from the recruit step before any move/fight (#131)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // Fresh session: the human's turn begins on the recruit step with all
    // units unmoved. Ending the turn must still submit and run the AI reply.
    expect(screen.getByTestId("submit-turn")).toBeEnabled();
    act(() => fireEvent.click(screen.getByTestId("submit-turn")));
    expect(screen.getAllByText(/Current: You/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Recruit \/ Act/)).toBeInTheDocument();
  });

  it("does not reveal how many bananas the AI has (M17-T2 / #115)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    // The status/scores panel lists one entry per player but only the human's
    // player-score row carries a banana count (issue #113-3).
    const status = within(screen.getByTestId("status"));
    const aiRow = status
      .getAllByTestId("player-score")
      .find((row) => row.textContent!.includes("AI"))!;
    expect(aiRow.textContent).not.toMatch(/🍌/);
    const youRow = status
      .getAllByTestId("player-score")
      .find((row) => row.textContent!.includes("You"))!;
    expect(youRow.textContent).toMatch(/🍌/);
  });

  /* ------------------------------------------------------------------ */
  /* Mid-turn recruit crash regression (#123)                            */
  /* ------------------------------------------------------------------ */

  it("regression: no recruit buttons are offered after moving, so a mid-turn recruit can no longer crash the app (#123)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const cells = () => screen.getAllByTestId("board-cell");

    // Move first: select a p1 unit and move it, advancing the session to the
    // movefight step (recruiting is no longer legal this turn).
    const unitCell = cells().find(
      (c) =>
        c.dataset.owner === "p1" &&
        !!c.querySelector("[data-testid='board-unit']"),
    )!;
    act(() => fireEvent.click(unitCell));
    const target = cells().find((c) => c.dataset.moveTarget === "true");
    expect(target).toBeDefined();
    act(() => fireEvent.click(target!));

    // Select an empty land hex adjacent to the human's Home Tree — exactly the
    // type of hex that used to still advertise a recruit action after moving.
    const p1Home = cells().find(
      (c) =>
        c
          .querySelector('[data-testid="board-site"]')
          ?.getAttribute("data-kind") === "HomeTree" &&
        c.dataset.owner === "p1",
    )!;
    const [hq, hr] = p1Home.dataset.hex!.split(",").map(Number);
    const buildable = cells().find((c) => {
      const [q, r] = c.dataset.hex!.split(",").map(Number);
      const dist = Math.max(
        Math.abs(q - hq),
        Math.abs(r - hr),
        Math.abs(q + r - hq - hr),
      );
      return (
        dist === 1 && c.dataset.owner === "neutral" && c.dataset.terrain === "land"
      );
    });
    expect(buildable).toBeDefined();
    act(() => fireEvent.click(buildable!));

    // The panel no longer offers any recruit button on the movefight step (the
    // bug fix). Before #123 this section still listed a recruit action, and
    // clicking it threw an uncaught GameSessionError that crashed the app.
    expect(screen.queryByTestId("cell-action-button")).toBeNull();
    expect(screen.queryByText(/Recruit here/i)).toBeNull();
    // Reading the (now read-only) buildable cell does not crash the app.
    expect(screen.getByTestId("cell-info")).toBeInTheDocument();
  });

  it("acceptance: a recruited unit renders on the board at its placement hex and stays selectable (#123)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const cells = () => screen.getAllByTestId("board-cell");

    const p1Home = cells().find(
      (c) =>
        c
          .querySelector('[data-testid="board-site"]')
          ?.getAttribute("data-kind") === "HomeTree" &&
        c.dataset.owner === "p1",
    )!;
    const [hq, hr] = p1Home.dataset.hex!.split(",").map(Number);
    // Click a buildable neighbour hex until the panel lists recruit buttons
    // (still on the recruit step, so recruiting a new unit is legal).
    let buildable: HTMLElement | undefined;
    for (const candidate of cells().filter((c) => {
      const [q, r] = c.dataset.hex!.split(",").map(Number);
      const dist = Math.max(
        Math.abs(q - hq),
        Math.abs(r - hr),
        Math.abs(q + r - hq - hr),
      );
      return (
        dist === 1 && c.dataset.owner === "neutral" && c.dataset.terrain === "land"
      );
    })) {
      act(() => fireEvent.click(candidate));
      if (screen.queryAllByTestId("cell-action-button").length > 0) {
        buildable = candidate;
        break;
      }
    }
    expect(buildable).toBeDefined();

    // Before recruiting, the placement hex has no unit badge.
    const placementHex = buildable!.dataset.hex!;
    expect(
      cells()
        .find((c) => c.dataset.hex === placementHex)!
        .querySelector("[data-testid='board-unit']"),
    ).toBeNull();

    // Recruit one ape via the panel's action button.
    act(() => fireEvent.click(screen.getAllByTestId("cell-action-button")[0]));

    // The newly recruited unit now renders on the board at its placement hex.
    const placed = cells().find((c) => c.dataset.hex === placementHex)!;
    const badge = placed.querySelector(
      "[data-testid='board-unit']",
    ) as HTMLElement | null;
    expect(badge).not.toBeNull();
    expect(badge!.dataset.owner).toBe("p1");
    expect(
      ["Monkey", "Gibbon", "Chimpanzee", "Gorilla"].includes(
        badge!.dataset.kind as string,
      ),
    ).toBe(true);

    // It stays present after re-render / selecting the cell (no crash).
    act(() => fireEvent.click(placed));
    expect(screen.getByTestId("cell-info")).toBeInTheDocument();
  });

  it("flex-centres the board layer both ways (vertical + horizontal) (M31-T4)", () => {
    render(<PlayableGame mapConfig={GAME_MAP} />);
    const boardLayer = screen.getByTestId("board-layer");
    // The layer both fills the viewport (absolute inset-0) and is a flex
    // container that centres the board on both axes, so the smaller circular
    // default map sits centered in the viewport (no off-centre top-anchor).
    expect(boardLayer.className).toContain("inset-0");
    expect(boardLayer.className).toContain("flex");
    expect(boardLayer.className).toContain("items-center");
    expect(boardLayer.className).toContain("justify-center");
  });

  it("defaults the zoom to a fit-to-viewport scale on mount when the viewport is measurable (M31-T4)", () => {
    // jsdom reports clientWidth/Height as 0 (which leaves the default zoom), so
    // give ALL elements a concrete viewport size on the prototype before the
    // first render — the fit effect then reads a measurable size on mount and
    // computes a scale that makes the whole circular map visible.
    const vw = 1440;
    const vh = 900;
    const origW = Object.getOwnPropertyDescriptor(
      window.HTMLElement.prototype,
      "clientWidth",
    );
    const origH = Object.getOwnPropertyDescriptor(
      window.HTMLElement.prototype,
      "clientHeight",
    );
    Object.defineProperty(window.HTMLElement.prototype, "clientWidth", {
      configurable: true,
      value: vw,
    });
    Object.defineProperty(window.HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: vh,
    });
    try {
      render(<PlayableGame mapConfig={GAME_MAP} />);
      const board = screen.getByTestId("board") as HTMLElement;
      const style = board.getAttribute("style") ?? "";

      // Read the board wrapper's own inline layout size (unchanged by the CSS
      // zoom transform) and assert the applied zoom is the pure fit-to-viewport
      // scale for that board against the mocked viewport.
      const boardW = parseFloat(board.style.width);
      const boardH = parseFloat(board.style.height);
      const expected = boardScaleToFit(boardW, boardH, vw, vh);
      expect(style).toContain(`scale(${expected})`);
      // The scale actually shrinks the board into the viewport (fully visible).
      expect(expected).toBeLessThan(1);
      expect(expected * boardW).toBeLessThanOrEqual(vw);
      expect(expected * boardH).toBeLessThanOrEqual(vh);
    } finally {
      if (origW) {
        Object.defineProperty(window.HTMLElement.prototype, "clientWidth", origW);
      }
      if (origH) {
        Object.defineProperty(
          window.HTMLElement.prototype,
          "clientHeight",
          origH,
        );
      }
    }
  });
});
