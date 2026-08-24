import { CellInfoPanel } from "../components/CellInfoPanel";
import { selectedCellInfo } from "../viewModels/useGameSession";
import { standardSetup, createGameSession } from "../../core/gameSession";

/**
 * Showcase demos for the `CellInfoPanel` atom component (M10-T3).
 *
 * Each named export is a tiny render function showing the component in one
 * state. There is no component implementation or business logic here — only
 * imports plus the scene-setting render functions. The `name` constant is the
 * display name shown in the Showcase sidebar.
 */
export const name = "CellInfoPanel";

const noop = () => {};

/** Empty prompt before any hex has been selected. */
export const Empty = () => (
  <CellInfoPanel info={null} legalActions={[]} onSelectAction={noop} onClear={noop} />
);

/** A selected hex occupied by a p1 Home Tree and a starting Monkey (read-only). */
export const HomeTree = () => {
  const state = standardSetup();
  const home = state.sites.find(
    (s) => s.kind === "HomeTree" && s.owner === "p1",
  )!.hex;
  return (
    <CellInfoPanel
      info={selectedCellInfo(state, home)}
      legalActions={[]}
      onSelectAction={noop}
      onClear={noop}
    />
  );
};

/** A selected friendly buildable hex on the recruit step, listing recruit items. */
export const BuildableRecruit = () => {
  const session = createGameSession();
  const recruit = session.legalMoves.find((a) => a.type === "recruit");
  const hex = recruit && recruit.type === "recruit" ? recruit.hex : null;
  if (!hex) return <CellInfoPanel info={null} legalActions={[]} onSelectAction={noop} onClear={noop} />;
  return (
    <CellInfoPanel
      info={selectedCellInfo(session.state, hex)}
      legalActions={session.legalMoves}
      onSelectAction={noop}
      onClear={noop}
    />
  );
};

/** A selected neutral Grove hex (read-only site info, no actions). */
export const NeutralGrove = () => {
  const state = standardSetup();
  const grove = state.sites.find((s) => s.kind === "Grove")!.hex;
  return (
    <CellInfoPanel
      info={selectedCellInfo(state, grove)}
      legalActions={[]}
      onSelectAction={noop}
      onClear={noop}
    />
  );
};
