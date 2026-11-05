import { Chess, type Move } from "chess.js";
import type { Difficulty } from "./solo-engine";

const values: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};
function evaluate(chess: Chess) {
  if (chess.isCheckmate()) return -100000;
  if (chess.isDraw()) return 0;
  let score = 0;
  for (const row of chess.board())
    for (const piece of row)
      if (piece) {
        const file = piece.square.charCodeAt(0) - 97,
          rank = Number(piece.square[1]) - 1;
        const centre = 3.5 - Math.abs(file - 3.5) + 3.5 - Math.abs(rank - 3.5);
        const advance = piece.color === "w" ? rank : 7 - rank;
        const bonus =
          piece.type === "p"
            ? advance * 7
            : piece.type === "n" || piece.type === "b"
              ? centre * 8
              : 0;
        score +=
          (piece.color === chess.turn() ? 1 : -1) *
          (values[piece.type] + bonus);
      }
  return score;
}
const ordered = (moves: Move[]) =>
  moves.sort(
    (a, b) =>
      values[b.captured ?? "k"] +
      Number(!!b.promotion) * 800 -
      (values[a.captured ?? "k"] + Number(!!a.promotion) * 800),
  );
export function chessComputerMove(
  moves: { from: string; to: string; promotion?: string }[],
  difficulty: Difficulty,
  random = Math.random,
) {
  const chess = new Chess();
  for (const move of moves) chess.move(move);
  const legal = chess.moves({ verbose: true });
  if (!legal.length || chess.isGameOver()) return null;
  if (difficulty === "easy")
    return legal[
      Math.min(legal.length - 1, Math.floor(random() * legal.length))
    ];
  const deadline = Date.now() + 1500;
  let nodes = 0;
  function search(depth: number, alpha: number, beta: number): number {
    if (++nodes > 45000 || Date.now() > deadline)
      throw new Error("search-limit");
    if (!depth || chess.isGameOver()) return evaluate(chess);
    let best = -Infinity;
    for (const move of ordered(chess.moves({ verbose: true }))) {
      chess.move(move);
      let score: number;
      try {
        score = -search(depth - 1, -beta, -alpha);
      } finally {
        chess.undo();
      }
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return best;
  }
  let selected = legal[0];
  // Iterative deepening retains a completed legal choice when the budget expires.
  for (let depth = 1; depth <= (difficulty === "hard" ? 3 : 2); depth++) {
    let best = -Infinity,
      choice = selected;
    try {
      for (const move of ordered([...legal])) {
        chess.move(move);
        let score: number;
        try {
          score = -search(depth - 1, -Infinity, Infinity);
        } finally {
          chess.undo();
        }
        if (score > best) {
          best = score;
          choice = move;
        }
      }
      selected = choice;
    } catch {
      break;
    }
  }
  return {
    from: selected.from,
    to: selected.to,
    ...(selected.promotion ? { promotion: selected.promotion } : {}),
  };
}
