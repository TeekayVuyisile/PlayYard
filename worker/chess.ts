import { Chess, type Square } from "chess.js";
export type ChessGame = {
  match: number;
  moves: { from: string; to: string; promotion?: string }[];
  whiteId: string;
  result?: string;
  winner?: string;
  drawOffer?: string;
  rematchReady: string[];
};
export function createChess(whiteId: string, match = 1): ChessGame {
  return { match, moves: [], whiteId, rematchReady: [] };
}
export function chessPosition(g: ChessGame) {
  const chess = new Chess();
  for (const move of g.moves) chess.move(move);
  return chess;
}
export function chessAction(
  g: ChessGame,
  players: { id: string }[],
  id: string,
  a: Record<string, unknown>,
) {
  if (a.match !== g.match) throw new Error("That match has ended.");
  if (players.length !== 2) throw new Error("Wait for your opponent to join.");
  if (a.type === "rematch") {
    if (!g.result) throw new Error("Finish this match first.");
    if (!g.rematchReady.includes(id)) g.rematchReady.push(id);
    if (g.rematchReady.length === 2)
      Object.assign(
        g,
        createChess(players.find((p) => p.id !== g.whiteId)!.id, g.match + 1),
        { result: undefined, winner: undefined, drawOffer: undefined },
      );
    return;
  }
  if (g.result) throw new Error("This match has ended.");
  if (a.type === "chess-resign") {
    g.result = "Resignation";
    g.winner = players.find((p) => p.id !== id)!.id;
    return;
  }
  if (a.type === "chess-offer-draw") {
    if (g.drawOffer) throw new Error("A draw offer is already pending.");
    g.drawOffer = id;
    return;
  }
  if (a.type === "chess-accept-draw" || a.type === "chess-decline-draw") {
    if (!g.drawOffer || g.drawOffer === id)
      throw new Error("There is no opponent draw offer.");
    if (a.type === "chess-accept-draw") g.result = "Draw by agreement";
    delete g.drawOffer;
    return;
  }
  if (a.type !== "chess-move") throw new Error("Unknown chess action.");
  if (a.ply !== g.moves.length)
    throw new Error("The board has changed. Choose your move again.");
  const chess = chessPosition(g),
    turnId =
      chess.turn() === "w"
        ? g.whiteId
        : players.find((p) => p.id !== g.whiteId)!.id;
  if (turnId !== id) throw new Error("Wait for your turn.");
  if (
    typeof a.from !== "string" ||
    typeof a.to !== "string" ||
    !/^([a-h][1-8])$/.test(a.from) ||
    !/^([a-h][1-8])$/.test(a.to) ||
    (a.promotion !== undefined &&
      !["q", "r", "b", "n"].includes(a.promotion as string))
  )
    throw new Error("Choose a legal move.");
  let move;
  try {
    move = chess.move({
      from: a.from,
      to: a.to,
      promotion: a.promotion as string | undefined,
    });
  } catch {
    throw new Error("That move is not legal.");
  }
  g.moves.push({
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion } : {}),
  });
  delete g.drawOffer;
  if (chess.isCheckmate()) {
    g.result = "Checkmate";
    g.winner = id;
  } else if (chess.isStalemate()) g.result = "Stalemate";
  else if (chess.isThreefoldRepetition()) g.result = "Draw by repetition";
  else if (chess.isInsufficientMaterial())
    g.result = "Draw by insufficient material";
  else if (chess.isDrawByFiftyMoves()) g.result = "Draw by fifty-move rule";
}
export function chessView(g: ChessGame) {
  const chess = chessPosition(g);
  return {
    ...g,
    fen: chess.fen(),
    check: chess.isCheck(),
    turn: chess.turn(),
    history: chess.history(),
    legalMoves: g.result
      ? []
      : chess
          .moves({ verbose: true })
          .map((m) => ({
            from: m.from as Square,
            to: m.to as Square,
            promotion: m.promotion,
          })),
  };
}
