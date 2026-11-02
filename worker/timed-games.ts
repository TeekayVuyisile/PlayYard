import { PRISM_COLOURS, type PrismColour } from "./hidden-duels";
type Player = { id: string; name: string };
const random = (length: number) =>
  Math.floor(
    (crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * length,
  );
export type MemoryGame = {
  match: number;
  round: number;
  phase: "lobby" | "countdown" | "memorize" | "recall" | "review" | "finished";
  pattern: PrismColour[];
  previewStartsAt: number;
  previewEndsAt: number;
  ready: string[];
  answers: Record<string, PrismColour[]>;
  scores: Record<string, number>;
  history: {
    round: number;
    pattern: PrismColour[];
    answers: { id: string; colours: PrismColour[]; points: number }[];
  }[];
  rematchReady: string[];
  winner?: string;
  draw?: boolean;
};
export function createMemory(match = 1): MemoryGame {
  return {
    match,
    round: 1,
    phase: "lobby",
    pattern: [],
    previewStartsAt: 0,
    previewEndsAt: 0,
    ready: [],
    answers: {},
    scores: {},
    history: [],
    rematchReady: [],
  };
}
export function memoryTick(g: MemoryGame, now: number) {
  const phase = g.phase;
  if (g.phase === "countdown" && now >= g.previewStartsAt)
    g.phase = now >= g.previewEndsAt ? "recall" : "memorize";
  if (g.phase === "memorize" && now >= g.previewEndsAt) g.phase = "recall";
  return phase !== g.phase;
}
export function memoryAction(
  g: MemoryGame,
  players: Player[],
  id: string,
  a: Record<string, unknown>,
  now: number,
) {
  memoryTick(g, now);
  if (a.match !== g.match || a.round !== g.round)
    throw new Error("That memory round has ended.");
  if (players.length !== 2) throw new Error("Wait for your friend to join.");
  if (a.type === "rematch") {
    if (g.phase !== "finished")
      throw new Error("Finish all five rounds first.");
    if (!g.rematchReady.includes(id)) g.rematchReady.push(id);
    if (players.every((p) => g.rematchReady.includes(p.id)))
      Object.assign(g, createMemory(g.match + 1), {
        winner: undefined,
        draw: undefined,
      });
    return;
  }
  if (a.type === "memory-ready") {
    if (g.phase !== "lobby" && g.phase !== "review")
      throw new Error("Wait for the next round.");
    if (!g.ready.includes(id)) g.ready.push(id);
    if (players.every((p) => g.ready.includes(p.id))) {
      if (g.phase === "review") g.round++;
      g.pattern = Array.from(
        { length: g.round + 3 },
        () => PRISM_COLOURS[random(4)],
      );
      g.answers = {};
      g.ready = [];
      g.previewStartsAt = now + 1500;
      g.previewEndsAt = g.previewStartsAt + 3000;
      g.phase = "countdown";
    }
    return;
  }
  if (a.type !== "memory-submit")
    throw new Error("Use a Memory Duo action in this room.");
  if (g.phase !== "recall")
    throw new Error("Wait until the pattern is hidden.");
  if (Object.hasOwn(g.answers, id))
    throw new Error("Your answer is already locked in.");
  if (
    !Array.isArray(a.colours) ||
    a.colours.length !== g.round + 3 ||
    !a.colours.every((c) => PRISM_COLOURS.includes(c))
  )
    throw new Error(
      "Fill every position with one of the four crystal colours. Colours may repeat.",
    );
  g.answers[id] = [...a.colours];
  if (players.every((p) => Object.hasOwn(g.answers, p.id))) {
    const answers = players.map((p) => {
      const points = g.answers[p.id].filter(
        (c, i) => c === g.pattern[i],
      ).length;
      g.scores[p.id] = (g.scores[p.id] || 0) + points;
      return { id: p.id, colours: g.answers[p.id], points };
    });
    g.history.push({ round: g.round, pattern: [...g.pattern], answers });
    g.ready = [];
    g.phase = g.round === 5 ? "finished" : "review";
    if (g.phase === "finished") {
      const [a, b] = players;
      g.draw = g.scores[a.id] === g.scores[b.id];
      if (!g.draw) g.winner = g.scores[a.id] > g.scores[b.id] ? a.id : b.id;
    }
  }
}
export function memoryView(g: MemoryGame, id: string, now: number) {
  const { pattern, answers, ...rest } = g,
    revealed = g.phase === "review" || g.phase === "finished";
  return {
    ...rest,
    length: g.round + 3,
    ...((g.phase === "memorize" &&
      now >= g.previewStartsAt &&
      now < g.previewEndsAt) ||
    revealed
      ? { pattern }
      : {}),
    answers: Object.fromEntries(
      Object.entries(answers).map(([pid, colours]) => [
        pid,
        { submitted: true, ...(pid === id || revealed ? { colours } : {}) },
      ]),
    ),
  };
}
export type FuseGame = {
  match: number;
  round: number;
  phase: "lobby" | "live" | "between" | "finished";
  lives: Record<string, number>;
  holderId?: string;
  passedAt: number;
  deadline: number;
  nextRoundAt: number;
  revision: number;
  passes: number;
  history: {
    round: number;
    playerId: string;
    explodedAt: number;
    livesRemaining: number;
  }[];
  winner?: string;
};
export function createFuse(match = 1): FuseGame {
  return {
    match,
    round: 0,
    phase: "lobby",
    lives: {},
    passedAt: 0,
    deadline: 0,
    nextRoundAt: 0,
    revision: 0,
    passes: 0,
    history: [],
  };
}
function ignite(g: FuseGame, players: Player[], now: number) {
  const alive = players.filter((p) => g.lives[p.id] > 0);
  g.round++;
  g.phase = "live";
  g.holderId = alive[random(alive.length)].id;
  g.passedAt = now;
  g.deadline = now + 10000 + random(10001);
  g.nextRoundAt = 0;
  g.revision++;
  g.passes = 0;
}
export function fuseTick(g: FuseGame, players: Player[], now: number) {
  if (g.phase === "live" && now >= g.deadline) {
    const id = g.holderId!;
    g.lives[id]--;
    g.revision++;
    g.history.push({
      round: g.round,
      playerId: id,
      explodedAt: g.deadline,
      livesRemaining: g.lives[id],
    });
    const alive = players.filter((p) => g.lives[p.id] > 0);
    if (alive.length === 1) {
      g.phase = "finished";
      g.winner = alive[0].id;
      g.nextRoundAt = 0;
    } else {
      g.phase = "between";
      g.nextRoundAt = now + 4000;
    }
    return true;
  }
  if (g.phase === "between" && now >= g.nextRoundAt) {
    ignite(g, players, now);
    return true;
  }
  return false;
}
export function fuseAction(
  g: FuseGame,
  players: Player[],
  id: string,
  a: Record<string, unknown>,
  now: number,
) {
  fuseTick(g, players, now);
  if (a.match !== g.match) throw new Error("That match has ended.");
  if (a.type === "fuse-start") {
    if (players[0].id !== id)
      throw new Error("Only the host can start the match.");
    if (g.phase !== "lobby" && g.phase !== "finished")
      throw new Error("Finish this match first.");
    if (players.length < 2) throw new Error("Invite at least one friend.");
    const next = createFuse(g.phase === "finished" ? g.match + 1 : g.match);
    next.lives = Object.fromEntries(players.map((p) => [p.id, 3]));
    Object.assign(g, next, { holderId: undefined, winner: undefined });
    ignite(g, players, now);
    return;
  }
  if (a.type !== "fuse-pass")
    throw new Error("Use a Fuse Rush action in this room.");
  if (g.phase !== "live") throw new Error("That fuse has ended.");
  if (a.round !== g.round || a.revision !== g.revision)
    throw new Error("The bomb has moved. Use the current turn.");
  if (g.holderId !== id || g.lives[id] <= 0)
    throw new Error("You are not holding the bomb.");
  if (now - g.passedAt < 300)
    throw new Error("Hold the bomb for at least 300 milliseconds.");
  if (
    typeof a.playerId !== "string" ||
    a.playerId === id ||
    !players.some((p) => p.id === a.playerId && g.lives[p.id] > 0)
  )
    throw new Error("Pass to another surviving player.");
  g.holderId = a.playerId;
  g.passedAt = now;
  g.passes++;
  g.revision++;
}
export function nextTimedDeadline(s: { memory?: MemoryGame; fuse?: FuseGame }) {
  if (s.memory?.phase === "countdown") return s.memory.previewStartsAt;
  if (s.memory?.phase === "memorize") return s.memory.previewEndsAt;
  if (s.fuse?.phase === "live") return s.fuse.deadline;
  if (s.fuse?.phase === "between") return s.fuse.nextRoundAt;
  return undefined;
}
export function tickTimedGames(
  s: { memory?: MemoryGame; fuse?: FuseGame; players: Player[] },
  now: number,
) {
  return s.memory
    ? memoryTick(s.memory, now)
    : s.fuse
      ? fuseTick(s.fuse, s.players, now)
      : false;
}
