import { act, view, type State } from "../worker/game";
import { createChess } from "../worker/chess";
import {
  createPrism,
  PRISM_COLOURS,
  type PrismColour,
} from "../worker/hidden-duels";

export type SoloGame = "number" | "chess" | "prism";
export type Difficulty = "easy" | "medium" | "hard";
export const HUMAN = "you",
  COMPUTER = "computer";
export function createSolo(game: SoloGame, min = 0, max = 500): State {
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    min < 0 ||
    max > 1_000_000 ||
    max <= min
  )
    throw new Error(
      "Use whole numbers from 0 to 1,000,000, with a maximum greater than the minimum.",
    );
  return {
    code: "",
    game,
    min,
    max,
    players: [
      { id: HUMAN, name: "You" },
      { id: COMPUTER, name: "Computer" },
    ],
    turn: 0,
    guesses: [],
    messages: [],
    ...(game === "chess" ? { chess: createChess(HUMAN) } : {}),
    ...(game === "prism" ? { prism: createPrism() } : {}),
  };
}
const choose = <T>(items: T[], random: () => number) =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))];
function permutations<T>(items: T[]): T[][] {
  return items.length
    ? items.flatMap((item, i) =>
        permutations(items.filter((_, j) => j !== i)).map((rest) => [
          item,
          ...rest,
        ]),
      )
    : [[]];
}
const arrangements = permutations<PrismColour>([...PRISM_COLOURS]);
const correct = (a: PrismColour[], b: PrismColour[]) =>
  a.filter((c, i) => c === b[i]).length;

// The strategy receives exactly the computer player's public view, never room secrets.
export function computerAction(
  snapshot: ReturnType<typeof view>,
  difficulty: Difficulty,
  random = Math.random,
): Record<string, unknown> | null {
  if (snapshot.game === "number") {
    if (snapshot.winner) return null;
    const me = snapshot.players.find((p) => p.id === COMPUTER)!;
    if (!me.ready)
      return {
        type: "secret",
        value:
          snapshot.min +
          Math.floor(random() * (snapshot.max - snapshot.min + 1)),
      };
    if (
      snapshot.players.some((p) => !p.ready) ||
      snapshot.players[snapshot.turn].id !== COMPUTER
    )
      return null;
    let low = snapshot.min,
      high = snapshot.max;
    const previous = snapshot.guesses.filter((g) => g.player === me.name);
    for (const guess of previous) {
      if (guess.result === "higher") low = Math.max(low, guess.value + 1);
      if (guess.result === "lower") high = Math.min(high, guess.value - 1);
    }
    let value: number;
    if (difficulty === "easy") {
      // Pick an untried number, without using higher/lower deductions.
      const tried = new Set(previous.map((g) => g.value));
      value =
        snapshot.min +
        Math.floor(random() * (snapshot.max - snapshot.min + 1 - tried.size));
      for (const used of [...tried].sort((a, b) => a - b))
        if (used <= value) value++;
    } else
      value =
        difficulty === "hard"
          ? Math.floor((low + high) / 2)
          : low + Math.floor(random() * (high - low + 1));
    return { type: "guess", value };
  }
  if (snapshot.game === "prism" && snapshot.prism) {
    const g = snapshot.prism;
    if (g.phase === "finished")
      return g.rematchReady.includes(HUMAN)
        ? { type: "rematch", match: g.match }
        : null;
    if (g.phase === "setup")
      return !g.locked.includes(COMPUTER)
        ? {
            type: "prism-lock",
            match: g.match,
            colours: [...choose(arrangements, random)],
          }
        : null;
    if (snapshot.players[g.turn].id !== COMPUTER) return null;
    const history = g.guesses.filter((guess) => guess.playerId === COMPUTER);
    const untried = arrangements.filter(
      (code) => !history.some((guess) => correct(code, guess.colours) === 4),
    );
    const candidates = untried.filter((code) =>
      history.every((guess) => correct(code, guess.colours) === guess.correct),
    );
    let options = difficulty === "easy" ? untried : candidates;
    if (difficulty === "hard") {
      let best = Infinity;
      options = [];
      for (const code of candidates) {
        const buckets = [0, 0, 0, 0, 0];
        for (const target of candidates) buckets[correct(code, target)]++;
        const worst = Math.max(...buckets);
        if (worst < best) {
          best = worst;
          options = [code];
        } else if (worst === best) options.push(code);
      }
    }
    return {
      type: "prism-guess",
      match: g.match,
      step: g.step,
      colours: [...choose(options.length ? options : untried, random)],
    };
  }
  if (snapshot.game === "chess" && snapshot.chess) {
    const g = snapshot.chess;
    if (g.result)
      return g.rematchReady.includes(HUMAN)
        ? { type: "rematch", match: g.match }
        : null;
    if (g.drawOffer === HUMAN)
      return { type: "chess-accept-draw", match: g.match };
  }
  return null;
}
export function soloAction(
  state: State,
  id: string,
  action: Record<string, unknown>,
) {
  const next = structuredClone(state);
  act(next, id, action);
  return next;
}
