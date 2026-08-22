import { DemoPanel } from "./ui/components/DemoPanel";

/**
 * App root.
 *
 * Just composes the (dumb) demo panel, passing the project identity down from
 * the scaffold context. No business logic here — that lives in `src/core`.
 */
export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full">
        <DemoPanel
          projectName="ape-kingdom"
          owner="AntonLapshin"
          repo="ape-kingdom"
          description='Implement a new project "Ape Kingdom" that is a turn-based game, the rules are described in ws/temp/ape-kingdom-rules.md and the guidelines for the implementation are described in the same folder. Keep those guidelines in /guidelines folder of the project and instruct all the personas to follow those guidelines'
        />
      </div>
    </main>
  );
}
