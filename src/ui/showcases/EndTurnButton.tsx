import { EndTurnButton } from "../components/EndTurnButton";

/**
 * Showcase demos for the `EndTurnButton` atom component (M17-T2 / #115).
 *
 * Each named export is a tiny render function showing the component in one
 * state. There is no component implementation or business logic here — only
 * imports plus the scene-setting render functions. The `name` constant is the
 * display name shown in the Showcase sidebar.
 */
export const name = "EndTurnButton";

const noop = () => {};

/** The human's turn is active: the circular End Turn button is enabled. */
export const Active = () => <EndTurnButton enabled onSubmit={noop} />;

/** The game has ended / it is not the human's turn: the button is disabled. */
export const Disabled = () => <EndTurnButton enabled={false} onSubmit={noop} />;
