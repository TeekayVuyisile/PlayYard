export const WORDS = [
  "Volcano",
  "Umbrella",
  "Penguin",
  "Bicycle",
  "Pizza",
  "Lighthouse",
  "Guitar",
  "Snowman",
  "Airplane",
  "Castle",
  "Octopus",
  "Waterfall",
  "Camera",
  "Robot",
  "Cactus",
  "Pirate",
  "Rainbow",
  "Telescope",
  "Dinosaur",
  "Popcorn",
  "Rocket",
  "Butterfly",
  "Treehouse",
  "Skateboard",
  "Mermaid",
  "Submarine",
  "Campfire",
  "Dragon",
  "Pineapple",
  "Ferris wheel",
];
export type Point = [number, number];
export type ImposterGame = {
  mode: "words" | "drawing";
  totalRounds: number;
  match: number;
  phase: "lobby" | "clues" | "voting" | "finished";
  round: number;
  turn: number;
  turnStartedAt: number;
  word?: string;
  imposterId?: string;
  clues: {
    playerId: string;
    round: number;
    text?: string;
    points?: Point[];
    skipped?: boolean;
  }[];
  votes: Record<string, string>;
  winner?: "crew" | "imposter";
  caughtId?: string;
};
export function createImposter(
  mode: "words" | "drawing",
  totalRounds: number,
  match = 1,
): ImposterGame {
  return {
    mode,
    totalRounds,
    match,
    phase: "lobby",
    round: 1,
    turn: 0,
    turnStartedAt: 0,
    clues: [],
    votes: {},
  };
}
const pick = (length: number) =>
  Math.floor(
    (crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * length,
  );
export function imposterAction(
  g: ImposterGame,
  players: { id: string }[],
  id: string,
  a: Record<string, unknown>,
  now: number,
) {
  if (a.match !== g.match) throw new Error("That match has ended.");
  const host = players[0].id === id;
  if (a.type === "imposter-start") {
    if (!host) throw new Error("Only the host can start the match.");
    if (g.phase !== "lobby" && g.phase !== "finished")
      throw new Error("Finish this match first.");
    if (players.length < 3)
      throw new Error("Invite at least two more players.");
    const next = createImposter(
      g.mode,
      g.totalRounds,
      g.phase === "finished" ? g.match + 1 : g.match,
    );
    next.phase = "clues";
    next.word = WORDS[pick(WORDS.length)];
    next.imposterId = players[pick(players.length)].id;
    next.turnStartedAt = now;
    Object.assign(g, next);
    delete g.winner;
    delete g.caughtId;
    return;
  }
  if (a.type === "imposter-vote") {
    if (g.phase !== "voting") throw new Error("Voting is not open.");
    if (Object.hasOwn(g.votes, id))
      throw new Error("Your vote is already locked in.");
    if (
      typeof a.playerId !== "string" ||
      a.playerId === id ||
      !players.some((p) => p.id === a.playerId)
    )
      throw new Error("Vote for another player in this room.");
    g.votes[id] = a.playerId;
    if (players.every((p) => Object.hasOwn(g.votes, p.id))) {
      const counts = players.map((p) => ({
        id: p.id,
        count: Object.values(g.votes).filter((v) => v === p.id).length,
      }));
      const high = Math.max(...counts.map((p) => p.count)),
        top = counts.filter((p) => p.count === high);
      g.caughtId = top.length === 1 ? top[0].id : undefined;
      g.winner = g.caughtId === g.imposterId ? "crew" : "imposter";
      g.phase = "finished";
    }
    return;
  }
  if (g.phase !== "clues") throw new Error("Clue turns are not open.");
  if (a.round !== g.round || a.turn !== g.turn)
    throw new Error("That turn has ended.");
  const playerId = players[g.turn].id;
  if (a.type === "imposter-skip") {
    if (!host || now - g.turnStartedAt < 60000)
      throw new Error(
        "The host can skip a stalled clue turn after 60 seconds.",
      );
    g.clues.push({ playerId, round: g.round, skipped: true });
  } else {
    if (playerId !== id) throw new Error("Wait for your turn.");
    if (a.type === "imposter-clue" && g.mode === "words") {
      if (a.spoken === true) a = { ...a, text: "Clue shared aloud" };
      if (typeof a.text !== "string" || !a.text.trim() || a.text.length > 120)
        throw new Error("Use a clue of 1–120 characters.");
      if (
        id !== g.imposterId &&
        a.text.toLowerCase().includes(g.word!.toLowerCase())
      )
        throw new Error("Describe the word without naming it.");
      g.clues.push({ playerId, round: g.round, text: a.text.trim() });
    } else if (a.type === "imposter-stroke" && g.mode === "drawing") {
      if (
        !Array.isArray(a.points) ||
        a.points.length < 1 ||
        a.points.length > 128 ||
        !a.points.every(
          (p) =>
            Array.isArray(p) &&
            p.length === 2 &&
            p.every(
              (n) =>
                typeof n === "number" &&
                Number.isFinite(n) &&
                n >= 0 &&
                n <= 1000,
            ),
        )
      )
        throw new Error("Invalid drawing. Use one stroke within the canvas.");
      g.clues.push({ playerId, round: g.round, points: a.points as Point[] });
    } else throw new Error("Use the action for this game mode.");
  }
  g.turn++;
  if (g.turn === players.length) {
    g.turn = 0;
    if (g.round === g.totalRounds) g.phase = "voting";
    else g.round++;
  }
  g.turnStartedAt = now;
}
export function imposterView(g: ImposterGame, id: string) {
  const { word, imposterId, votes, ...rest } = g;
  const revealed = g.phase === "finished";
  return {
    ...rest,
    ...(g.phase === "lobby"
      ? {}
      : {
          role: id === imposterId ? "imposter" : "crew",
          ...(id !== imposterId || revealed ? { word } : {}),
        }),
    ...(revealed ? { imposterId, votes } : {}),
    voted: Object.keys(votes),
  };
}
