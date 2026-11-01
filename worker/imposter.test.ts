import { describe, expect, it } from "vitest";
import { act, view, type State } from "./game";
import { createImposter } from "./imposter";
const players = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
  { id: "c", name: "C" },
];
function setup(mode: "words" | "drawing" = "words", rounds = 1): State {
  return {
    code: "TESTCODE",
    min: 0,
    max: 500,
    players: structuredClone(players),
    turn: 0,
    guesses: [],
    messages: [],
    game: "imposter",
    imposter: createImposter(mode, rounds),
  };
}
function start(s: State) {
  act(s, "a", { type: "imposter-start", match: 1 }, 100);
}
function clues(s: State) {
  const g = s.imposter!;
  while (g.phase === "clues") {
    const id = s.players[g.turn].id;
    act(
      s,
      id,
      {
        type: g.mode === "words" ? "imposter-clue" : "imposter-stroke",
        match: g.match,
        round: g.round,
        turn: g.turn,
        text: "A subtle clue",
        points: [
          [10, 10],
          [20, 20],
        ],
      },
      200,
    );
  }
}
describe("Guess the Imposter", () => {
  it("keeps an eight-player, five-round drawing and full chat below one storage value", () => {
    const s = setup("drawing", 5);
    s.players = Array.from({length:8}, (_,i)=>({id:String(i).padStart(64,'a'),name:'界'.repeat(20)}));
    act(s,s.players[0].id,{type:'imposter-start',match:1});
    const g=s.imposter!;
    while(g.phase==='clues') act(s,s.players[g.turn].id,{type:'imposter-stroke',match:1,round:g.round,turn:g.turn,points:Array(128).fill([1000,1000])});
    s.messages=Array.from({length:50},()=>({name:'界'.repeat(20),text:'界'.repeat(240)}));
    expect(new TextEncoder().encode(JSON.stringify(s)).length).toBeLessThan(128*1024);
  });
  it("requires host and three players, then hides the word and imposter identity per viewer", () => {
    const s = setup();
    expect(() => act(s, "b", { type: "imposter-start", match: 1 })).toThrow(
      /host/,
    );
    s.players.pop();
    expect(() => start(s)).toThrow(/at least/);
    s.players = structuredClone(players);
    start(s);
    const g = s.imposter!,
      hidden = view(s, g.imposterId!).imposter!;
    expect(hidden.role).toBe("imposter");
    expect(hidden).not.toHaveProperty("word");
    expect(hidden).not.toHaveProperty("imposterId");
    expect(
      view(s, s.players.find((p) => p.id !== g.imposterId)!.id).imposter!.word,
    ).toBe(g.word);
    expect(() =>
      act(s, "outsider", { type: "imposter-vote", match: 1, playerId: "a" }),
    ).toThrow(/Join/);
  });
  it("enforces turns, rounds, one clue, and one final voting phase", () => {
    const s = setup("words", 2);
    start(s);
    expect(() =>
      act(s, "b", {
        type: "imposter-clue",
        match: 1,
        round: 1,
        turn: 0,
        text: "test",
      }),
    ).toThrow(/turn/);
    expect(() =>
      act(s, "a", { type: "imposter-vote", match: 1, playerId: "b" }),
    ).toThrow(/not open/);
    act(s, "a", {
      type: "imposter-clue",
      match: 1,
      round: 1,
      turn: 0,
      text: "test",
    });
    expect(() =>
      act(s, "a", {
        type: "imposter-clue",
        match: 1,
        round: 1,
        turn: 0,
        text: "test",
      }),
    ).toThrow(/ended/);
    clues(s);
    expect(s.imposter!.clues).toHaveLength(6);
    expect(s.imposter!.phase).toBe("voting");
  });
  it("keeps votes private, rejects self/duplicate votes, and awards a correct plurality to crew", () => {
    const s = setup();
    start(s);
    clues(s);
    const g = s.imposter!,
      imp = g.imposterId!,
      crew = s.players.filter((p) => p.id !== imp);
    expect(() =>
      act(s, imp, { type: "imposter-vote", match: 1, playerId: imp }),
    ).toThrow(/another/);
    act(s, crew[0].id, { type: "imposter-vote", match: 1, playerId: imp });
    expect(view(s, imp).imposter).not.toHaveProperty("votes");
    expect(() =>
      act(s, crew[0].id, { type: "imposter-vote", match: 1, playerId: imp }),
    ).toThrow(/locked/);
    act(s, crew[1].id, { type: "imposter-vote", match: 1, playerId: imp });
    act(s, imp, { type: "imposter-vote", match: 1, playerId: crew[0].id });
    expect(g.winner).toBe("crew");
    expect(g.phase).toBe("finished");
    expect(view(s, imp).imposter!.word).toBe(g.word);
  });
  it("awards wrong votes and top ties to the imposter and redeals cleanly", () => {
    for (const tie of [true, false]) {
      const s = setup();
      start(s);
      clues(s);
      const g = s.imposter!;
      if (tie)
        for (let i = 0; i < 3; i++)
          act(s, players[i].id, {
            type: "imposter-vote",
            match: 1,
            playerId: players[(i + 1) % 3].id,
          });
      else {
        const target = players.find((p) => p.id !== g.imposterId)!.id;
        for (const p of players)
          act(s, p.id, {
            type: "imposter-vote",
            match: 1,
            playerId:
              p.id === target
                ? players.find((x) => x.id !== target)!.id
                : target,
          });
      }
      expect(g.winner).toBe("imposter");
      act(s, "a", { type: "imposter-start", match: 1 });
      expect(g.match).toBe(2);
      expect(g.winner).toBeUndefined();
      expect(g.caughtId).toBeUndefined();
      expect(g.votes).toEqual({});
      expect(() =>
        act(s, "a", {
          type: "imposter-clue",
          match: 1,
          round: 1,
          turn: 0,
          text: "old",
        }),
      ).toThrow(/ended/);
    }
  });
  it("validates one bounded stroke and allows host recovery of stalled turns only after 60 seconds", () => {
    const s = setup("drawing");
    start(s);
    expect(() =>
      act(s, "a", {
        type: "imposter-stroke",
        match: 1,
        round: 1,
        turn: 0,
        points: [[NaN, 0]],
      }),
    ).toThrow(/Invalid/);
    expect(() =>
      act(s, "a", {
        type: "imposter-stroke",
        match: 1,
        round: 1,
        turn: 0,
        points: Array(129).fill([1, 2]),
      }),
    ).toThrow(/Invalid/);
    expect(() =>
      act(
        s,
        "a",
        { type: "imposter-skip", match: 1, round: 1, turn: 0 },
        60099,
      ),
    ).toThrow(/60 seconds/);
    act(s, "a", { type: "imposter-skip", match: 1, round: 1, turn: 0 }, 60100);
    expect(s.imposter!.turn).toBe(1);
    act(s, "b", {
      type: "imposter-stroke",
      match: 1,
      round: 1,
      turn: 1,
      points: [
        [0, 0],
        [1000, 1000],
      ],
    });
    expect(s.imposter!.clues[1].points).toHaveLength(2);
  });
});
