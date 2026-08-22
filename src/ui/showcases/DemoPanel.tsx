import { DemoPanel } from "../components/DemoPanel";

/**
 * Showcase demos for the `DemoPanel` atom component (M7-T3).
 *
 * Each named export is a tiny render function showing the component in one
 * state. There is no component implementation or business logic here — only
 * imports plus the scene-setting render functions. The `name` constant is the
 * display name shown in the Showcase sidebar.
 */
export const name = "DemoPanel";

/** A freshly scaffolded project (no description). */
export const Scaffolded = () => (
  <DemoPanel projectName="Ape Kingdom" owner="AntonLapshin" repo="ape-kingdom" />
);

/** An in-progress project with a description. */
export const InProgress = () => (
  <DemoPanel
    projectName="Ape Kingdom"
    owner="AntonLapshin"
    repo="ape-kingdom"
    status="in-progress"
    description="A fully local turn-based game, Human vs AI, with a well-tested TypeScript core."
  />
);

/** A shipped, demo-ready project. */
export const Shipped = () => (
  <DemoPanel
    projectName="Ape Kingdom"
    owner="AntonLapshin"
    repo="ape-kingdom"
    status="shipped"
    description="The POC is shipped and live on GitHub Pages."
  />
);
