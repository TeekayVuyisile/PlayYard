import { describe, expect, it } from "vitest";
import { act, view, type State } from "./game";
import { createPrism, createPoison, type PrismColour } from "./hidden-duels";
const codeA: PrismColour[] = ["blue", "green", "red", "yellow"],
  codeB: PrismColour[] = ["red", "yellow", "blue", "green"];
function setup(game: "prism" | "poison"): State {
  return {
    code: "TESTCODE",
    game,
    min: 0,
    max: 500,
    players: [
      { id: "a", name: "Alex" },
      { id: "b", name: "Sam" },
    ],
    turn: 0,
    guesses: [],
    messages: [],
    ...(game === "prism"
      ? { prism: createPrism() }
      : { poison: createPoison() }),
  };
}
function lockPrism(s: State) {
  act(s, "a", { type: "prism-lock", match: 1, colours: codeA });
  act(s, "b", { type: "prism-lock", match: 1, colours: codeB });
}
function lockPoison(s: State) {
  act(s, "a", { type: "poison-lock", match: 1, slots: [0, 1, 2] });
  act(s, "b", { type: "poison-lock", match: 1, slots: [7, 8, 9] });
}
describe("Prism Code", () => {
  it("accepts only a permutation of the four colours and immutable private codes", () => {
    const s = setup("prism");
    for (const colours of [
      [],
      ["blue", "blue", "red", "yellow"],
      ["blue", "green", "red", "purple"],
      ["blue", "green", "red", "yellow", "purple"],
      null,
    ])
      expect(() =>
        act(s, "a", { type: "prism-lock", match: 1, colours }),
      ).toThrow(/four colours/);
    act(s, "a", { type: "prism-lock", match: 1, colours: codeA });
    expect(() =>
      act(s, "a", { type: "prism-lock", match: 1, colours: codeB }),
    ).toThrow(/locked/);
    const b = view(s, "b").prism!;
    expect(b).not.toHaveProperty("codes");
    expect(b.myCode).toBeUndefined();
    expect(b).not.toHaveProperty("revealedCodes");
    expect(b.locked).toEqual(["a"]);
    expect(view(s, "a").prism!.myCode).toEqual(codeA);
  });
  it("requires two locked setups, current turns and a fresh step; reveals only a correct-position count", () => {
    const s = setup("prism");
    expect(() =>
      act(s, "a", { type: "prism-guess", match: 1, step: 0, colours: codeA }),
    ).toThrow(/both/);
    lockPrism(s);
    expect(() =>
      act(s, "b", { type: "prism-guess", match: 1, step: 0, colours: codeA }),
    ).toThrow(/turn/);
    act(s, "a", {
      type: "prism-guess",
      match: 1,
      step: 0,
      colours: ["red", "green", "blue", "yellow"],
    });
    expect(s.prism!.guesses[0].correct).toBe(2);
    expect(s.prism!.turn).toBe(1);
    expect(view(s, "a").prism!.guesses[0]).not.toHaveProperty("positions");
    expect(view(s, "a").prism).not.toHaveProperty("revealedCodes");
    expect(() =>
      act(s, "b", { type: "prism-guess", match: 1, step: 0, colours: codeB }),
    ).toThrow(/ended/);
    expect(() =>
      act(s, "outsider", {
        type: "prism-guess",
        match: 1,
        step: 1,
        colours: codeA,
      }),
    ).toThrow(/Join/);
  });
  it("rejects repeated guesses without consuming a turn and ends on the first exact match", () => {
    const s = setup("prism");
    lockPrism(s);
    act(s, "a", { type: "prism-guess", match: 1, step: 0, colours: codeA });
    act(s, "b", { type: "prism-guess", match: 1, step: 1, colours: codeB });
    expect(() =>
      act(s, "a", { type: "prism-guess", match: 1, step: 2, colours: codeA }),
    ).toThrow(/already tried/);
    expect(s.prism!.step).toBe(2);
    act(s, "a", { type: "prism-guess", match: 1, step: 2, colours: codeB });
    expect(s.prism!.winner).toBe("a");
    expect(s.prism!.phase).toBe("finished");
    expect(view(s, "a").prism!.revealedCodes?.b).toEqual(codeB);
    expect(() =>
      act(s, "b", { type: "prism-guess", match: 1, step: 3, colours: codeA }),
    ).toThrow(/ended/);
    act(s, "a", { type: "rematch", match: 1 });
    expect(s.prism!.match).toBe(1);
    act(s, "b", { type: "rematch", match: 1 });
    expect(s.prism).toMatchObject({
      match: 2,
      phase: "setup",
      starter: 1,
      turn: 1,
      step: 0,
      codes: {},
      guesses: [],
      rematchReady: [],
    });
    expect(s.prism!.winner).toBeUndefined();
    expect(() =>
      act(s, "a", { type: "prism-lock", match: 1, colours: codeA }),
    ).toThrow(/ended/);
  });
  it("preserves secrecy and locked setup after serialization and allows setup before a friend joins", () => {
    let s = setup("prism");
    s.players.pop();
    act(s, "a", { type: "prism-lock", match: 1, colours: codeA });
    expect(s.prism!.phase).toBe("setup");
    s = JSON.parse(JSON.stringify(s));
    s.players.push({ id: "b", name: "Sam" });
    act(s, "b", { type: "prism-lock", match: 1, colours: codeB });
    expect(s.prism!.phase).toBe("playing");
    expect(view(s, "b").prism!.myCode).toEqual(codeB);
    expect(view(s, "b").prism).not.toHaveProperty("codes");
  });
});
describe("Avoid the Poison", () => {
  it("requires exactly three distinct in-range traps and keeps the opponent-set traps private", () => {
    const s = setup("poison");
    for (const slots of [
      [1, 2],
      [1, 1, 2],
      [-1, 0, 1],
      [0, 1, 10],
      [0, 1, 1.5],
      [0, 1, "2"],
      null,
    ])
      expect(() =>
        act(s, "a", { type: "poison-lock", match: 1, slots }),
      ).toThrow(/three different/);
    lockPoison(s);
    expect(view(s, "a").poison!.myTraps).toEqual([0, 1, 2]);
    expect(view(s, "a").poison).not.toHaveProperty("traps");
    expect(view(s, "a").poison).not.toHaveProperty("revealedTraps");
    expect(() =>
      act(s, "a", { type: "poison-lock", match: 1, slots: [4, 5, 6] }),
    ).toThrow(/locked/);
  });
  it("enforces turn, fresh step and one pick per own-tray token; safe picks cost no life", () => {
    const s = setup("poison");
    expect(() =>
      act(s, "a", { type: "poison-pick", match: 1, step: 0, slot: 0 }),
    ).toThrow(/both/);
    lockPoison(s);
    expect(() =>
      act(s, "b", { type: "poison-pick", match: 1, step: 0, slot: 0 }),
    ).toThrow(/turn/);
    for (const slot of [-1, 10, 0.5, "1", NaN])
      expect(() =>
        act(s, "a", { type: "poison-pick", match: 1, step: 0, slot }),
      ).toThrow(/Choose a token/);
    act(s, "a", { type: "poison-pick", match: 1, step: 0, slot: 0 });
    expect(s.poison!.picks[0].poison).toBe(false);
    expect(() =>
      act(s, "b", { type: "poison-pick", match: 1, step: 0, slot: 0 }),
    ).toThrow(/ended/);
    act(s, "b", { type: "poison-pick", match: 1, step: 1, slot: 0 });
    expect(s.poison!.picks[1].poison).toBe(true);
    expect(() =>
      act(s, "a", { type: "poison-pick", match: 1, step: 2, slot: 0 }),
    ).toThrow(/already/);
    expect(s.poison!.step).toBe(2);
    expect(() =>
      act(s, "a", { type: "prism-guess", match: 1, step: 2, colours: codeA }),
    ).toThrow(/Avoid the Poison/);
  });
  it("awards the opponent a win on the third poison, reveals traps only then and confirms rematches mutually", () => {
    const s = setup("poison");
    lockPoison(s);
    for (let i = 0; i < 3; i++) {
      act(s, "a", { type: "poison-pick", match: 1, step: i * 2, slot: 7 + i });
      if (i < 2)
        act(s, "b", {
          type: "poison-pick",
          match: 1,
          step: i * 2 + 1,
          slot: 3 + i,
        });
    }
    expect(s.poison!.winner).toBe("b");
    expect(s.poison!.phase).toBe("finished");
    expect(view(s, "a").poison!.revealedTraps?.b).toEqual([7, 8, 9]);
    expect(() =>
      act(s, "b", { type: "poison-pick", match: 1, step: 5, slot: 6 }),
    ).toThrow(/ended/);
    act(s, "a", { type: "rematch", match: 1 });
    act(s, "a", { type: "rematch", match: 1 });
    expect(s.poison!.match).toBe(1);
    act(s, "b", { type: "rematch", match: 1 });
    expect(s.poison).toMatchObject({
      match: 2,
      starter: 1,
      turn: 1,
      traps: {},
      picks: [],
      phase: "setup",
    });
    expect(s.poison!.winner).toBeUndefined();
  });
  it("isolates the two trays and preserves picked tokens on reconnect", () => {
    let s = setup("poison");
    lockPoison(s);
    act(s, "a", { type: "poison-pick", match: 1, step: 0, slot: 0 });
    act(s, "b", { type: "poison-pick", match: 1, step: 1, slot: 0 });
    s = JSON.parse(JSON.stringify(s));
    expect(s.poison!.picks.map((p) => p.poison)).toEqual([false, true]);
    expect(view(s, "a").poison).not.toHaveProperty("revealedTraps");
    expect(() =>
      act(s, "a", { type: "poison-pick", match: 1, step: 2, slot: 0 }),
    ).toThrow(/already/);
  });
});
