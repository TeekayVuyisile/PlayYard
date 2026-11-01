export const PRISM_COLOURS = ["blue", "green", "red", "yellow"] as const;
export type PrismColour = (typeof PRISM_COLOURS)[number];
type Player = { id: string; name: string };
type Duel = {
  match: number;
  phase: "setup" | "playing" | "finished";
  starter: number;
  turn: number;
  step: number;
  winner?: string;
  rematchReady: string[];
};
export type PrismGame = Duel & {
  codes: Record<string, PrismColour[]>;
  guesses: { playerId: string; colours: PrismColour[]; correct: number }[];
};
export type PoisonGame = Duel & {
  traps: Record<string, number[]>;
  picks: { playerId: string; slot: number; poison: boolean }[];
};
const duel = (match: number, starter: number): Duel => ({
  match,
  phase: "setup",
  starter,
  turn: starter,
  step: 0,
  rematchReady: [],
});
export const createPrism = (match = 1, starter = 0): PrismGame => ({
  ...duel(match, starter),
  codes: {},
  guesses: [],
});
export const createPoison = (match = 1, starter = 0): PoisonGame => ({
  ...duel(match, starter),
  traps: {},
  picks: [],
});
function permutation(value: unknown): value is PrismColour[] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    new Set(value).size === 4 &&
    value.every((c) => PRISM_COLOURS.includes(c))
  );
}
function prepare(
  g: Duel,
  players: Player[],
  id: string,
  a: Record<string, unknown>,
  reset: () => void,
) {
  if (a.match !== g.match) throw new Error("That match has ended.");
  if (a.type === "rematch") {
    if (g.phase !== "finished") throw new Error("Finish this match first.");
    if (!g.rematchReady.includes(id)) g.rematchReady.push(id);
    if (
      players.length === 2 &&
      players.every((p) => g.rematchReady.includes(p.id))
    )
      reset();
    return true;
  }
  if (g.phase === "finished") throw new Error("This match has ended.");
  return false;
}
function requireTurn(
  g: Duel,
  players: Player[],
  id: string,
  a: Record<string, unknown>,
) {
  if (g.phase !== "playing" || players.length !== 2)
    throw new Error("Wait for both players to lock their setup.");
  if (a.step !== g.step) throw new Error("That turn has ended.");
  if (players[g.turn].id !== id) throw new Error("Wait for your turn.");
}
export function prismAction(
  g: PrismGame,
  players: Player[],
  id: string,
  a: Record<string, unknown>,
) {
  if (
    prepare(g, players, id, a, () =>
      Object.assign(g, createPrism(g.match + 1, 1 - g.starter), {
        winner: undefined,
      }),
    )
  )
    return;
  if (a.type === "prism-lock") {
    if (g.phase !== "setup" || Object.hasOwn(g.codes, id))
      throw new Error("Your code is already locked in.");
    if (!permutation(a.colours))
      throw new Error("Use each of the four colours exactly once.");
    g.codes[id] = [...a.colours];
    if (
      players.length === 2 &&
      players.every((p) => Object.hasOwn(g.codes, p.id))
    )
      g.phase = "playing";
    return;
  }
  if (a.type !== "prism-guess")
    throw new Error("Use a Prism Code action in this room.");
  requireTurn(g, players, id, a);
  if (!permutation(a.colours))
    throw new Error("Use each of the four colours exactly once.");
  const colours = a.colours;
  if (
    g.guesses.some(
      (p) => p.playerId === id && p.colours.every((c, i) => c === colours[i]),
    )
  )
    throw new Error("You already tried that arrangement. Try a different one.");
  const target = g.codes[players.find((p) => p.id !== id)!.id],
    correct = colours.filter((c, i) => c === target[i]).length;
  g.guesses.push({ playerId: id, colours: [...colours], correct });
  g.step++;
  if (correct === 4) {
    g.phase = "finished";
    g.winner = id;
  } else g.turn = 1 - g.turn;
}
export function poisonAction(
  g: PoisonGame,
  players: Player[],
  id: string,
  a: Record<string, unknown>,
) {
  if (
    prepare(g, players, id, a, () =>
      Object.assign(g, createPoison(g.match + 1, 1 - g.starter), {
        winner: undefined,
      }),
    )
  )
    return;
  if (a.type === "poison-lock") {
    if (g.phase !== "setup" || Object.hasOwn(g.traps, id))
      throw new Error("Your traps are already locked in.");
    if (
      !Array.isArray(a.slots) ||
      a.slots.length !== 3 ||
      new Set(a.slots).size !== 3 ||
      !a.slots.every((n) => Number.isInteger(n) && n >= 0 && n < 10)
    )
      throw new Error("Choose three different tokens from the ten-token tray.");
    g.traps[id] = [...a.slots].sort((a, b) => a - b);
    if (
      players.length === 2 &&
      players.every((p) => Object.hasOwn(g.traps, p.id))
    )
      g.phase = "playing";
    return;
  }
  if (a.type !== "poison-pick")
    throw new Error("Use an Avoid the Poison action in this room.");
  requireTurn(g, players, id, a);
  if (
    typeof a.slot !== "number" ||
    !Number.isInteger(a.slot) ||
    a.slot < 0 ||
    a.slot >= 10
  )
    throw new Error("Choose a token from your tray.");
  if (g.picks.some((p) => p.playerId === id && p.slot === a.slot))
    throw new Error("That token has already been picked.");
  const opponent = players.find((p) => p.id !== id)!.id,
    poison = g.traps[opponent].includes(a.slot);
  g.picks.push({ playerId: id, slot: a.slot, poison });
  g.step++;
  if (g.picks.filter((p) => p.playerId === id && p.poison).length === 3) {
    g.phase = "finished";
    g.winner = opponent;
  } else g.turn = 1 - g.turn;
}
export function prismView(g: PrismGame, id: string) {
  const { codes, ...rest } = g;
  return {
    ...rest,
    locked: Object.keys(codes),
    myCode: codes[id],
    ...(g.phase === "finished" ? { revealedCodes: codes } : {}),
  };
}
export function poisonView(g: PoisonGame, id: string) {
  const { traps, ...rest } = g;
  return {
    ...rest,
    locked: Object.keys(traps),
    myTraps: traps[id],
    ...(g.phase === "finished" ? { revealedTraps: traps } : {}),
  };
}
