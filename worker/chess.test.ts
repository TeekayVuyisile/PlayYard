import { describe, expect, it } from "vitest";
import { act, view, type State } from "./game";
import { chessPosition, createChess } from "./chess";
function setup(): State {
  return {
    code: "TESTCODE",
    min: 0,
    max: 500,
    players: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
    turn: 0,
    guesses: [],
    messages: [],
    game: "chess",
    chess: createChess("a"),
  };
}
function move(s: State, from: string, to: string, promotion?: string) {
  const g = s.chess!,
    id =
      chessPosition(g).turn() === "w"
        ? g.whiteId
        : s.players.find((p) => p.id !== g.whiteId)!.id;
  act(s, id, {
    type: "chess-move",
    match: g.match,
    ply: g.moves.length,
    from,
    to,
    promotion,
  });
}
describe("Chess", () => {
  it("rejects illegal, wrong-turn and stale moves without changing the board", () => {
    const s = setup();
    expect(view(s, "a").chess!.legalMoves).toHaveLength(20);
    expect(() =>
      act(s, "b", {
        type: "chess-move",
        match: 1,
        ply: 0,
        from: "e7",
        to: "e5",
      }),
    ).toThrow(/turn/);
    expect(() => move(s, "e2", "e5")).toThrow(/legal/);
    expect(s.chess!.moves).toHaveLength(0);
    move(s, "e2", "e4");
    expect(() =>
      act(s, "b", {
        type: "chess-move",
        match: 1,
        ply: 0,
        from: "e7",
        to: "e5",
      }),
    ).toThrow(/changed/);
  });
  it("detects checkmate and requires both players for a colour-swapped rematch", () => {
    const s = setup();
    move(s, "f2", "f3");
    move(s, "e7", "e5");
    move(s, "g2", "g4");
    move(s, "d8", "h4");
    expect(s.chess!.result).toBe("Checkmate");
    expect(s.chess!.winner).toBe("b");
    expect(view(s, "a").chess!.legalMoves).toEqual([]);
    act(s, "a", { type: "rematch", match: 1 });
    expect(s.chess!.match).toBe(1);
    act(s, "b", { type: "rematch", match: 1 });
    expect(s.chess!.match).toBe(2);
    expect(s.chess!.whiteId).toBe("b");
    expect(s.chess!.result).toBeUndefined();
  });
  it("supports castling and en passant on server-validated positions", () => {
    const s = setup();
    for (const [a, b] of [
      ["e2", "e4"],
      ["a7", "a6"],
      ["e4", "e5"],
      ["d7", "d5"],
      ["e5", "d6"],
    ])
      move(s, a, b);
    expect(chessPosition(s.chess!).get("d5")).toBeUndefined();
    expect(chessPosition(s.chess!).get("d6")?.color).toBe("w");
    const t = setup();
    for (const [a, b] of [
      ["e2", "e4"],
      ["e7", "e5"],
      ["g1", "f3"],
      ["b8", "c6"],
      ["f1", "c4"],
      ["g8", "f6"],
      ["e1", "g1"],
    ])
      move(t, a, b);
    expect(chessPosition(t.chess!).get("f1")?.type).toBe("r");
    expect(chessPosition(t.chess!).get("g1")?.type).toBe("k");
  });
  it("offers, declines, accepts draws and supports resignation", () => {
    const s = setup();
    act(s, "a", { type: "chess-offer-draw", match: 1 });
    expect(() => act(s, "a", { type: "chess-accept-draw", match: 1 })).toThrow(
      /opponent/,
    );
    act(s, "b", { type: "chess-decline-draw", match: 1 });
    expect(s.chess!.drawOffer).toBeUndefined();
    act(s, "b", { type: "chess-offer-draw", match: 1 });
    act(s, "a", { type: "chess-accept-draw", match: 1 });
    expect(s.chess!.result).toBe("Draw by agreement");
    const t = setup();
    act(t, "a", { type: "chess-resign", match: 1 });
    expect(t.chess!.winner).toBe("b");
    expect(t.chess!.result).toBe("Resignation");
  });
  it("preserves move history for threefold repetition across serialization", () => {
    let s = setup();
    for (let cycle = 0; cycle < 2; cycle++) {
      for (const [a, b] of [
        ["g1", "f3"],
        ["g8", "f6"],
        ["f3", "g1"],
        ["f6", "g8"],
      ])
        move(s, a, b);
      s = JSON.parse(JSON.stringify(s));
    }
    expect(s.chess!.result).toBe("Draw by repetition");
  });
  it("supports promotion including an underpromotion", () => {
    const s = setup();
    for (const [a, b] of [
      ["a2", "a4"],
      ["h7", "h5"],
      ["a4", "a5"],
      ["h5", "h4"],
      ["a5", "a6"],
      ["h4", "h3"],
      ["a6", "b7"],
      ["h3", "g2"],
    ])
      move(s, a, b);
    expect(() => move(s, "b7", "a8")).toThrow(/legal/);
    move(s, "b7", "a8", "n");
    expect(chessPosition(s.chess!).get("a8")?.type).toBe("n");
  });
});
