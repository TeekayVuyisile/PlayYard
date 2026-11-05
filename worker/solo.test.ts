import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  COMPUTER,
  HUMAN,
  computerAction,
  createSolo,
  soloAction,
  type Difficulty,
} from "../src/solo-engine";
import { chessComputerMove } from "../src/chess-computer";
import { view } from "./game";

describe("local computer opponents", () => {
  it("validates number ranges and keeps human secrets out of the computer view", () => {
    expect(() => createSolo("number", 10, 5)).toThrow("maximum");
    expect(() => createSolo("number", 0, Infinity)).toThrow("whole");
    let s = createSolo("number", 0, 500);
    s = soloAction(s, HUMAN, { type: "secret", value: 390 });
    s = soloAction(
      s,
      COMPUTER,
      computerAction(view(s, COMPUTER), "hard", () => 0.5)!,
    );
    const visible = view(s, COMPUTER);
    expect(visible.players[0]).not.toHaveProperty("secret");
    expect(computerAction(visible, "hard")).toBeNull();
    s = soloAction(s, HUMAN, { type: "guess", value: 0 });
    const guess = computerAction(view(s, COMPUTER), "hard")!;
    expect(guess.value).toBe(250);
    s = soloAction(s, COMPUTER, guess);
    expect(s.guesses.at(-1)?.result).toBe("higher");
    s = soloAction(s, HUMAN, { type: "guess", value: 1 });
    expect(computerAction(view(s, COMPUTER), "hard")!.value).toBe(375);
  });
  it.each<Difficulty>(["easy", "medium", "hard"])(
    "completes a legal number match and rematch on %s",
    (difficulty) => {
      let s = createSolo("number", 0, 10);
      s = soloAction(s, HUMAN, { type: "secret", value: 7 });
      s = soloAction(
        s,
        COMPUTER,
        computerAction(view(s, COMPUTER), difficulty, () => 0.99)!,
      );
      for (let turn = 0; turn < 30 && !s.winner; turn++) {
        const action =
          s.players[s.turn].id === HUMAN
            ? { type: "guess", value: turn % 10 }
            : computerAction(view(s, COMPUTER), difficulty, () => 0.5)!;
        s = soloAction(s, s.players[s.turn].id, action);
      }
      expect(s.winner).toBeTruthy();
      expect(computerAction(view(s, COMPUTER), difficulty)).toBeNull();
      s = soloAction(s, HUMAN, { type: "rematch" });
      expect(s.guesses).toEqual([]);
      expect(s.players.every((p) => p.secret === undefined)).toBe(true);
      expect(computerAction(view(s, COMPUTER), difficulty)?.type).toBe(
        "secret",
      );
    },
  );
  it.each<Difficulty>(["easy", "medium", "hard"])(
    "plays Prism legally with public clues on %s",
    (difficulty) => {
      let s = createSolo("prism");
      s = soloAction(
        s,
        COMPUTER,
        computerAction(view(s, COMPUTER), difficulty, () => 0)!,
      );
      s = soloAction(s, HUMAN, {
        type: "prism-lock",
        match: 1,
        colours: ["yellow", "red", "green", "blue"],
      });
      expect(view(s, COMPUTER).prism).not.toHaveProperty("codes");
      expect(view(s, COMPUTER).prism).not.toHaveProperty("revealedCodes");
      // Simulate the human yielding turns with a legal non-winning guess.
      s = soloAction(s, HUMAN, {
        type: "prism-guess",
        match: 1,
        step: 0,
        colours: ["green", "blue", "red", "yellow"],
      });
      const tried = new Set<string>();
      for (let turn = 0; turn < 24 && s.prism!.phase !== "finished"; turn++) {
        const action = computerAction(view(s, COMPUTER), difficulty, () => 0)!;
        expect(action.type).toBe("prism-guess");
        expect(tried.has(JSON.stringify(action.colours))).toBe(false);
        tried.add(JSON.stringify(action.colours));
        s = soloAction(s, COMPUTER, action);
        // Opponent simulation only; computer decision code never sees this setup.
        if (!s.prism!.winner) s.prism!.turn = 1;
      }
      expect(s.prism!.winner).toBe(COMPUTER);
      s = soloAction(s, HUMAN, { type: "rematch", match: 1 });
      s = soloAction(
        s,
        COMPUTER,
        computerAction(view(s, COMPUTER), difficulty)!,
      );
      expect(s.prism!.match).toBe(2);
      expect(s.prism!.guesses).toEqual([]);
      expect(computerAction(view(s, COMPUTER), difficulty)?.type).toBe(
        "prism-lock",
      );
    },
  );
  it("does not change number or prism decisions when only the hidden human choice changes", () => {
    for (const game of ["number", "prism"] as const) {
      let s = createSolo(game);
      if (game === "number") {
        s.players[0].secret = 42;
        s.players[1].secret = 99;
        s.turn = 1;
      } else {
        s.prism!.codes = {
          [HUMAN]: ["blue", "red", "green", "yellow"],
          [COMPUTER]: ["blue", "green", "red", "yellow"],
        };
        s.prism!.phase = "playing";
        s.prism!.turn = 1;
      }
      const before = computerAction(view(s, COMPUTER), "hard", () => 0.5);
      if (game === "number") s.players[0].secret = 499;
      else s.prism!.codes[HUMAN] = ["yellow", "green", "red", "blue"];
      expect(computerAction(view(s, COMPUTER), "hard", () => 0.5)).toEqual(
        before,
      );
    }
  });
  it.each<Difficulty>(["easy", "medium", "hard"])(
    "returns a legal chess move for %s",
    (difficulty) => {
      const move = chessComputerMove([], difficulty, () => 0.5)!;
      expect(() => new Chess().move(move)).not.toThrow();
    },
  );
  it("finds mate in one and stops when the chess match has ended", () => {
    const chess = new Chess();
    for (const move of ["f3", "e5", "g4"]) chess.move(move);
    const history = chess
      .history({ verbose: true })
      .map((m) => ({ from: m.from, to: m.to }));
    const chosen = chessComputerMove(history, "hard")!;
    chess.move(chosen);
    expect(chess.isCheckmate()).toBe(true);
    expect(chessComputerMove([...history, chosen], "hard")).toBeNull();
  });
  it("reuses chess draw, resignation and colour-swapped rematch rules", () => {
    let s = createSolo("chess");
    s = soloAction(s, HUMAN, { type: "chess-offer-draw", match: 1 });
    s = soloAction(s, COMPUTER, computerAction(view(s, COMPUTER), "medium")!);
    expect(s.chess!.result).toBe("Draw by agreement");
    s = soloAction(s, HUMAN, { type: "rematch", match: 1 });
    s = soloAction(s, COMPUTER, computerAction(view(s, COMPUTER), "medium")!);
    expect(s.chess!.whiteId).toBe(COMPUTER);
    s = soloAction(s, HUMAN, { type: "chess-resign", match: 2 });
    expect(s.chess!.winner).toBe(COMPUTER);
  });
});
