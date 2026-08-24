import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CellInfoPanel } from "../../src/ui/components/CellInfoPanel";
import { cellInfo } from "../../src/core/cellInfo";
import {
  createGameSession,
  standardSetup,
} from "../../src/core/gameSession";
import { sameHex, type GameState, type Hex } from "../../src/core/game";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function p1Home(state: GameState): Hex {
  return state.sites.find(
    (s) => s.kind === "HomeTree" && s.owner === "p1",
  )!.hex;
}

/** A session on the recruit step (recruit actions legal; income collected
 *  automatically at the start of the turn). */
function recruitSession() {
  return createGameSession();
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

describe("CellInfoPanel empty", () => {
  it("shows a click-to-inspect prompt when no hex is selected", () => {
    render(
      <CellInfoPanel
        info={null}
        legalActions={[]}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByTestId("cell-info")).toBeInTheDocument();
    expect(screen.getByText(/click a hex to inspect/i)).toBeInTheDocument();
    // No site/unit/action rows when nothing is selected.
    expect(screen.queryByTestId("cell-info-site")).toBeNull();
    expect(screen.queryByTestId("cell-info-unit")).toBeNull();
    expect(screen.queryByTestId("cell-action-button")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Read-only rendering                                                 */
/* ------------------------------------------------------------------ */

describe("CellInfoPanel read-only", () => {
  it("renders terrain and hex coordinates for a selected cell", () => {
    const state = standardSetup();
    const info = cellInfo(state, p1Home(state));
    render(
      <CellInfoPanel
        info={info}
        legalActions={[]}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText(/Hex \(.*\)/)).toBeInTheDocument();
    expect(screen.getByText("land")).toBeInTheDocument();
  });

  it("shows a hexagonal preview of the exact selected hexagon with its owner colour (M17-T3/#116)", () => {
    // A p1 Home Tree is owned by p1, so the preview hexagon is tinted p1.
    const state = standardSetup();
    render(
      <CellInfoPanel
        info={cellInfo(state, p1Home(state))}
        legalActions={[]}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const hex = screen.getByTestId("cell-info-hexagon");
    expect(hex).toBeInTheDocument();
    expect(hex.className).toContain("bg-owner-p1");
    expect(hex.style.clipPath).toContain("polygon");
  });

  it("preview hexagon shows the unit badge when the selected hex is occupied (M17-T3/#116)", () => {
    const state = standardSetup();
    render(
      <CellInfoPanel
        info={cellInfo(state, p1Home(state))}
        legalActions={[]}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const hex = screen.getByTestId("cell-info-hexagon");
    // The exact unit that sits on the selected hex is rendered inside it.
    const badge = hex.querySelector(
      '[data-testid="board-unit"]',
    ) as HTMLElement | null;
    expect(badge).not.toBeNull();
    expect(badge!.dataset.kind).toBe("Monkey");
  });

  it("preview hexagon shows the neutral terrain colour when the hex is unowned (M17-T3/#116)", () => {
    // A neutral Grove hex: no owner, so the preview keeps its terrain colour.
    const state = standardSetup();
    const grove = state.sites.find((s) => s.kind === "Grove")!;
    render(
      <CellInfoPanel
        info={cellInfo(state, grove.hex)}
        legalActions={[]}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const hex = screen.getByTestId("cell-info-hexagon");
    expect(hex.className).toContain("bg-terrain-");
    expect(hex.className).not.toContain("bg-owner-");
  });

  it("renders site info (label, neutral marker, income) for a sited hex", () => {
    const state = standardSetup();
    const home = p1Home(state);
    render(
      <CellInfoPanel
        info={cellInfo(state, home)}
        legalActions={[]}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const row = screen.getByTestId("cell-info-site");
    expect(row).toBeInTheDocument();
    expect(screen.getByText("Home Tree")).toBeInTheDocument();
    expect(screen.getByText(/\+3\/turn/)).toBeInTheDocument();
    // A p1-owned Home Tree is not marked neutral.
    expect(screen.queryByText("neutral")).toBeNull();
  });

  it("marks a neutral site as neutral", () => {
    const state = standardSetup();
    const grove = state.sites.find((s) => s.kind === "Grove")!;
    render(
      <CellInfoPanel
        info={cellInfo(state, grove.hex)}
        legalActions={[]}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText("neutral")).toBeInTheDocument();
  });

  it("renders unit info (kind, rank, cost) for an occupied hex", () => {
    const state = standardSetup();
    const home = p1Home(state);
    render(
      <CellInfoPanel
        info={cellInfo(state, home)}
        legalActions={[]}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const row = screen.getByTestId("cell-info-unit");
    expect(row).toBeInTheDocument();
    expect(screen.getByText("Monkey (rank 1)")).toBeInTheDocument();
    expect(screen.getByText("🍌 2")).toBeInTheDocument();
  });

  it("shows no action buttons for a read-only cell", () => {
    // An occupied Home Tree is read-only (no recruit offered on an occupied hex).
    const state = standardSetup();
    render(
      <CellInfoPanel
        info={cellInfo(state, p1Home(state))}
        legalActions={[]}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("cell-action-button")).toBeNull();
    expect(screen.queryByText(/Recruit here/i)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Actionable rendering + wiring                                       */
/* ------------------------------------------------------------------ */

describe("CellInfoPanel actionable", () => {
  it("lists recruit action items with cost for a buildable hex", () => {
    const session = recruitSession();
    const recruit = session.legalMoves.find((a) => a.type === "recruit");
    if (!recruit || recruit.type !== "recruit") {
      throw new Error("expected a legal recruit action");
    }
    render(
      <CellInfoPanel
        info={cellInfo(session.state, recruit.hex)}
        legalActions={session.legalMoves}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // At least one recruit item labelled with its kind and banana cost.
    expect(screen.getAllByTestId("cell-action-button").length).toBeGreaterThan(0);
    expect(screen.getByText(/Recruit here/i)).toBeInTheDocument();
  });

  it("wires each recruit button to the selectAction flow", () => {
    const session = recruitSession();
    const recruit = session.legalMoves.find((a) => a.type === "recruit");
    if (!recruit || recruit.type !== "recruit") {
      throw new Error("expected a legal recruit action");
    }
    const onSelectAction = vi.fn();
    render(
      <CellInfoPanel
        info={cellInfo(session.state, recruit.hex)}
        legalActions={session.legalMoves}
        onSelectAction={onSelectAction}
        onClear={vi.fn()}
      />,
    );
    // Click the first item; it should dispatch the matching recruit action.
    const first = screen.getAllByTestId("cell-action-button")[0];
    fireEvent.click(first);
    expect(onSelectAction).toHaveBeenCalledTimes(1);
    const action = onSelectAction.mock.calls[0][0] as { type: string; kind: string; hex: Hex };
    expect(action.type).toBe("recruit");
    expect(sameHex(action.hex, recruit.hex)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Moved action list (M17-T2 / #115)                                   */
/* ------------------------------------------------------------------ */

describe("CellInfoPanel moved action list (M17-T2 / #115)", () => {
  it("lists the non-recruit legal actions (move/attack) as buttons", () => {
    const session = recruitSession();
    const move = session.legalMoves.find((a) => a.type === "move");
    if (!move) throw new Error("expected a legal move action");
    render(
      <CellInfoPanel
        info={null}
        legalActions={session.legalMoves}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // A move/attack button is listed under "Your actions" (recruits excluded).
    expect(screen.getByText(/Your actions/i)).toBeInTheDocument();
    const actions = screen.getAllByTestId("action-button");
    expect(actions.length).toBeGreaterThan(0);
    const label = actions.map((b) => b.textContent).join(" ");
    expect(label).toMatch(/move/i);
  });

  it("excludes recruit actions from the moved 'Your actions' list (issue 113-2 / #119)", () => {
    // The session's legal moves include recruit actions alongside move/attack
    // (recruits are already offered per selected hex in the "Recruit here"
    // section). They must NOT be duplicated in the relocated "Your actions"
    // list — so no recruit-labelled button may render here. Register spies on
    // the recruit actions passed in to prove they are still valid inputs but
    // were filtered out of this section.
    const session = recruitSession();
    const recruit = session.legalMoves.find((a) => a.type === "recruit");
    if (!recruit || recruit.type !== "recruit") {
      throw new Error("expected a legal recruit action");
    }
    render(
      <CellInfoPanel
        info={null}
        legalActions={session.legalMoves}
        onSelectAction={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // The "Your actions" section lists only non-recruit actions.
    expect(screen.getByText(/Your actions/i)).toBeInTheDocument();
    const actions = screen.getAllByTestId("action-button");
    expect(actions.length).toBeGreaterThan(0);
    actions.forEach((b) => expect(b.textContent).not.toMatch(/recruit/i));
    // The recruit action is therefore not offered as a duplicate button here
    // (it only appears per selected hex in the "Recruit here" section).
    expect(screen.queryByTestId("cell-action-button")).toBeNull();
  });

  it("wires a moved action button to the selectAction flow", () => {
    const session = recruitSession();
    const move = session.legalMoves.find((a) => a.type === "move");
    if (!move) throw new Error("expected a legal move action");
    const onSelectAction = vi.fn();
    render(
      <CellInfoPanel
        info={null}
        legalActions={session.legalMoves}
        onSelectAction={onSelectAction}
        onClear={vi.fn()}
      />,
    );
    const moveButton = screen
      .getAllByTestId("action-button")
      .find((b) => /move/i.test(b.textContent!))!;
    fireEvent.click(moveButton);
    expect(onSelectAction).toHaveBeenCalledWith(move);
  });

  it("wires the Clear button to the onClear flow", () => {
    const session = recruitSession();
    const onClear = vi.fn();
    render(
      <CellInfoPanel
        info={null}
        legalActions={session.legalMoves}
        onSelectAction={vi.fn()}
        onClear={onClear}
      />,
    );
    fireEvent.click(screen.getByTestId("clear-actions"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
