/**
 * Headless self-play simulate CLI (M28-T1b, #180).
 *
 * Runs N configurable AI-vs-AI self-play games through the pure core
 * simulator (`playAiGame` from `src/core/selfPlay.ts`, the M28-T1a headless
 * full-game simulator) and reports aggregate win statistics over the run:
 * how many games each player won and how many games were capped by the
 * `maxTurns` iteration guard (no winner).
 *
 * This script is deliberately **thin and headless** — it contains no business
 * logic and no React/browser code. It only:
 *   1. reads options (games to play, base seed, max-turns guard) from CLI
 *      flags / environment variables with sensible defaults;
 *   2. drives the pure `playAiGame` core function that many times;
 *   3. prints the aggregate results.
 * Every game and every win is computed entirely by `src/core`.
 *
 * Usage:
 *   npm run simulate [-- --games N] [-- --seed S] [-- --max-turns T]
 *
 * Options (flag takes precedence over the environment variable, which takes
 * precedence over the default):
 *   --games N / -n N      number of self-play games to run
 *                         (env: SIMULATE_GAMES, default 10)
 *   --seed S              base seed; each game uses S + gameIndex so runs are
 *                         deterministic and reproducible (env: SIMULATE_SEED,
 *                         default 0)
 *   --max-turns T         pass-through to playAiGame's iteration guard
 *                         (env: SIMULATE_MAX_TURNS, default core default)
 *   --help / -h           print usage and exit
 *
 * No browser, no network, no GUI — run it from a terminal.
 */

import { playAiGame, DEFAULT_MAX_TURNS } from "../src/core/selfPlay";

/** Options for a simulate run, resolved from CLI flags / env / defaults. */
interface SimulateOptions {
  games: number;
  seed: number;
  maxTurns: number | undefined;
}

/** Parse a CLI/env string into an integer, or throw on a non-integer value. */
function toInt(value: string | undefined, name: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`Invalid integer for ${name}: "${value}"`);
  }
  return n;
}

/**
 * Read a value option from CLI args. Supports `--name value`, `--name=value`
 * and `-x value` (where `x` is the first letter of the long name). Returns
 * `{ read: true, value, nextIndex }` when consumed, else `{ read: false }`.
 */
function readFlag(
  args: string[],
  i: number,
  long: string,
  short: string,
): { read: boolean; value?: string; nextIndex?: number } {
  const raw = args[i];
  if (raw.startsWith(`--${long}=`)) {
    return { read: true, value: raw.slice(long.length + 3), nextIndex: i + 1 };
  }
  if (raw === `--${long}` || raw === `-${short}`) {
    const value = args[i + 1];
    if (value === undefined || value.startsWith("--") || value.startsWith("-")) {
      throw new Error(`Missing value for ${long}`);
    }
    return { read: true, value, nextIndex: i + 2 };
  }
  return { read: false };
}

/** Resolve the run options from CLI args and the environment. */
function parseArgs(args: string[], env: NodeJS.ProcessEnv): SimulateOptions {
  let games: number | undefined;
  let seed: number | undefined;
  let maxTurns: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const raw = args[i];
    if (raw === "--help" || raw === "-h") {
      printUsage();
      process.exit(0);
    }
    let hit = readFlag(args, i, "games", "n");
    if (hit.read) {
      games = toInt(hit.value, "--games");
      i = (hit.nextIndex as number) - 1;
      continue;
    }
    hit = readFlag(args, i, "seed", "s");
    if (hit.read) {
      seed = toInt(hit.value, "--seed");
      i = (hit.nextIndex as number) - 1;
      continue;
    }
    hit = readFlag(args, i, "max-turns", "m");
    if (hit.read) {
      maxTurns = toInt(hit.value, "--max-turns");
      i = (hit.nextIndex as number) - 1;
      continue;
    }
    throw new Error(`Unknown argument: "${raw}". Run with --help for usage.`);
  }

  const resolvedGames = games ?? toInt(env.SIMULATE_GAMES, "SIMULATE_GAMES") ?? 10;
  const resolvedSeed = seed ?? toInt(env.SIMULATE_SEED, "SIMULATE_SEED") ?? 0;
  const resolvedMaxTurns = maxTurns ?? toInt(env.SIMULATE_MAX_TURNS, "SIMULATE_MAX_TURNS");
  if (resolvedGames < 1) throw new Error("--games must be at least 1");

  return { games: resolvedGames, seed: resolvedSeed, maxTurns: resolvedMaxTurns };
}

/** Print concise usage text. */
function printUsage(): void {
  console.log(`Usage: npm run simulate [-- --games N] [-- --seed S] [-- --max-turns T]

Run N headless AI-vs-AI self-play games through the core simulator and report
aggregate win statistics.

Options:
  -n, --games N      number of self-play games to run (SIMULATE_GAMES, default 10)
  -s, --seed S       base seed; each game uses S + index (SIMULATE_SEED, default 0)
  -m, --max-turns T  pass-through iteration guard (SIMULATE_MAX_TURNS, default ${DEFAULT_MAX_TURNS})
  -h, --help         show this help`);
}

/**
 * Run the self-play simulation and print aggregate statistics. This is the
 * thin orchestration entry point: it only drives the pure `playAiGame` core
 * function N times and tallies the winners / guarded runs it returns.
 */
function main(): void {
  let options: SimulateOptions;
  try {
    options = parseArgs(process.argv.slice(2), process.env);
  } catch (err) {
    console.error(`error: ${(err as Error).message}`);
    console.error("run `npm run simulate -- --help` for usage");
    process.exit(2);
  }

  const { games, seed, maxTurns } = options;

  // Aggregate tallies across the run. p1Wins / p2Wins count decisive games;
  // capped counts games stopped by the maxTurns guard without a winner.
  let p1Wins = 0;
  let p2Wins = 0;
  let capped = 0;
  let totalTurns = 0;

  console.log(
    `Simulating ${games} self-play game(s) (base seed ${seed}, maxTurns ${maxTurns ?? "default"})...`,
  );
  for (let i = 0; i < games; i++) {
    const result = playAiGame({ seed: seed + i, maxTurns });
    totalTurns += result.turns;
    if (result.winner === "p1") p1Wins += 1;
    else if (result.winner === "p2") p2Wins += 1;
    else capped += 1;
  }

  const pct = (n: number) => `${((n / games) * 100).toFixed(1)}%`;
  console.log("");
  console.log("Self-play results");
  console.log("-----------------");
  console.log(`  games played      : ${games}`);
  console.log(`  p1 wins           : ${p1Wins} (${pct(p1Wins)})`);
  console.log(`  p2 wins           : ${p2Wins} (${pct(p2Wins)})`);
  console.log(`  capped (maxTurns) : ${capped} (${pct(capped)})`);
  console.log(`  avg turns         : ${games > 0 ? (totalTurns / games).toFixed(1) : "0"}`);
}

main();
