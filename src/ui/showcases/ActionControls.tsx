import { ActionControls } from "../components/ActionControls";

/**
 * Showcase demos for the `ActionControls` atom component (M7-T3).
 *
 * Each named export is a tiny render function showing the component in one
 * state. There is no component implementation or business logic here — only
 * imports plus the scene-setting render functions. The `name` constant is the
 * display name shown in the Showcase sidebar.
 */
export const name = "ActionControls";

const noop = () => {};

/** The income step: a single "Collect Income" action. */
export const Income = () => (
  <ActionControls
    legalActions={[{ type: "collectIncome" }]}
    step="income"
    isDone={false}
    onSelect={noop}
    onClear={noop}
    onSubmit={noop}
  />
);

/** The recruit step: a recruit action offered. */
export const Recruit = () => (
  <ActionControls
    legalActions={[
      { type: "recruit", kind: "Monkey", hex: { q: 0, r: 0 } },
      { type: "recruit", kind: "Gorilla", hex: { q: 1, r: -1 } },
    ]}
    step="recruit"
    isDone={false}
    onSelect={noop}
    onClear={noop}
    onSubmit={noop}
  />
);

/** The move/fight step: a move action offered. */
export const MoveFight = () => (
  <ActionControls
    legalActions={[
      { type: "move", unitHex: { q: 0, r: 0 }, targetHex: { q: 1, r: -1 } },
      { type: "attack", attackerHex: { q: 0, r: 0 }, targetHex: { q: 1, r: -1 } },
    ]}
    step="movefight"
    isDone={false}
    onSelect={noop}
    onClear={noop}
    onSubmit={noop}
  />
);

/** No legal actions: the user must end their turn. */
export const NoActions = () => (
  <ActionControls
    legalActions={[]}
    step="movefight"
    isDone={false}
    onSelect={noop}
    onClear={noop}
    onSubmit={noop}
  />
);

/** The game has ended: controls are replaced by an end-state message. */
export const GameOver = () => (
  <ActionControls
    legalActions={[]}
    step="done"
    isDone={true}
    onSelect={noop}
    onClear={noop}
    onSubmit={noop}
  />
);
