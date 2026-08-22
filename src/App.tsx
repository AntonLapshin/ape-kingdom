import { PlayableGame } from "./ui/components/PlayableGame";

/**
 * App root.
 *
 * Just composes the playable game screen. No business logic here — all game
 * rules live in `src/core` and are reached through the `useGameSession` view
 * model inside `PlayableGame`.
 */
export default function App() {
  return (
    <main className="login-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full">
        <PlayableGame />
      </div>
    </main>
  );
}
