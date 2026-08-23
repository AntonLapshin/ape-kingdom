import { Content } from "../components/Content";

/**
 * Showcase demos for the `Content` atom component (M8-T3).
 *
 * Each named export is a tiny render function showing the component in one
 * state. There is no component implementation or business logic here — only
 * imports plus the scene-setting render functions. The `name` constant is the
 * display name shown in the Showcase sidebar.
 */
export const name = "Content";

/** A Grove site content marker. */
export const Grove = () => <Content kind="Grove" />;

/** A Nest site content marker. */
export const Nest = () => <Content kind="Nest" />;

/** A Home Tree site content marker. */
export const HomeTree = () => <Content kind="HomeTree" />;
