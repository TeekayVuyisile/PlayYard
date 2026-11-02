import { describe, expect, it } from "vitest";
import { act, view, type State } from "./game";
import {
  createMemory,
  createFuse,
  memoryTick,
  fuseTick,
  nextTimedDeadline,
  tickTimedGames,
} from "./timed-games";
import type { PrismColour } from "./hidden-duels";
function setup(game: "memory" | "fuse", count = 2): State {
  return {
    code: "TESTCODE",
    game,
    min: 0,
    max: 500,
    players: Array.from({ length: count }, (_, i) => ({
      id: String.fromCharCode(97 + i),
      name: `Player ${i}`,
    })),
    turn: 0,
    guesses: [],
    messages: [],
    ...(game === "memory"
      ? { memory: createMemory() }
      : { fuse: createFuse() }),
  };
}
function ready(s: State, now = 1000) {
  for (const p of s.players)
    act(
      s,
      p.id,
      { type: "memory-ready", match: s.memory!.match, round: s.memory!.round },
      now,
    );
}
function live(count = 3) {
  const s = setup("fuse", count);
  act(s, "a", { type: "fuse-start", match: 1 }, 1000);
  Object.assign(s.fuse!, {
    holderId: "a",
    passedAt: 1000,
    deadline: 11000,
    revision: 1,
  });
  return s;
}
describe("Memory Duo", () => {
  it("waits for both players and reveals the shared pattern only inside the viewing window", () => {
    const s = setup("memory"),
      g = s.memory!;
    act(s, "a", { type: "memory-ready", match: 1, round: 1 }, 1000);
    expect(g.phase).toBe("lobby");
    expect(nextTimedDeadline(s)).toBeUndefined();
    act(s, "b", { type: "memory-ready", match: 1, round: 1 }, 1000);
    expect(g.phase).toBe("countdown");
    expect(g.previewEndsAt - g.previewStartsAt).toBe(3000);
    expect(g.pattern).toHaveLength(4);
    expect(view(s, "a", g.previewStartsAt - 1).memory).not.toHaveProperty(
      "pattern",
    );
    expect(nextTimedDeadline(s)).toBe(g.previewStartsAt);
    expect(memoryTick(g, g.previewStartsAt)).toBe(true);
    expect(view(s, "a", g.previewStartsAt).memory!.pattern).toEqual(
      view(s, "b", g.previewStartsAt).memory!.pattern,
    );
    expect(nextTimedDeadline(s)).toBe(g.previewEndsAt);
    expect(view(s, "a", g.previewEndsAt).memory).not.toHaveProperty("pattern");
    expect(memoryTick(g, g.previewEndsAt)).toBe(true);
    expect(g.phase).toBe("recall");
    expect(nextTimedDeadline(s)).toBeUndefined();
    expect(memoryTick(g, g.previewEndsAt)).toBe(false);
  });
  it("rejects early, invalid, duplicate and stale answers while keeping the opponent answer private", () => {
    const s = setup("memory");
    ready(s);
    const g = s.memory!;
    expect(() =>
      act(
        s,
        "a",
        { type: "memory-submit", match: 1, round: 1, colours: g.pattern },
        g.previewEndsAt - 1,
      ),
    ).toThrow(/hidden/);
    expect(() =>
      act(
        s,
        "a",
        { type: "memory-submit", match: 1, round: 1, colours: ["blue"] },
        g.previewEndsAt,
      ),
    ).toThrow(/every position/);
    act(
      s,
      "a",
      { type: "memory-submit", match: 1, round: 1, colours: g.pattern },
      g.previewEndsAt,
    );
    expect(view(s, "b", g.previewEndsAt).memory!.answers.a).toEqual({
      submitted: true,
    });
    expect(view(s, "b", g.previewEndsAt).memory).not.toHaveProperty("pattern");
    expect(view(s, "a", g.previewEndsAt).memory!.answers.a.colours).toEqual(
      g.pattern,
    );
    expect(() =>
      act(
        s,
        "a",
        { type: "memory-submit", match: 1, round: 1, colours: g.pattern },
        g.previewEndsAt,
      ),
    ).toThrow(/locked/);
    expect(() =>
      act(
        s,
        "b",
        { type: "memory-submit", match: 1, round: 0, colours: g.pattern },
        g.previewEndsAt,
      ),
    ).toThrow(/ended/);
    expect(() =>
      act(s, "outsider", { type: "memory-ready", match: 1, round: 1 }),
    ).toThrow(/Join/);
  });
  it("scores five growing rounds, reveals together, and confirms a clean rematch mutually", () => {
    let s = setup("memory");
    for (let round = 1; round <= 5; round++) {
      ready(s, round * 10000);
      let g = s.memory!;
      expect(g.pattern).toHaveLength(round + 3);
      const now = g.previewEndsAt;
      const wrong = g.pattern.map(
        (c) =>
          ({ blue: "green", green: "red", red: "yellow", yellow: "blue" })[
            c
          ] as PrismColour,
      );
      act(
        s,
        "a",
        { type: "memory-submit", match: 1, round, colours: g.pattern },
        now,
      );
      s = JSON.parse(JSON.stringify(s));
      g = s.memory!;
      expect(view(s, "b", now).memory!.answers.a).toEqual({ submitted: true });
      act(
        s,
        "b",
        { type: "memory-submit", match: 1, round, colours: wrong },
        now,
      );
      expect(g.history).toHaveLength(round);
      expect(g.history.at(-1)!.answers.map((a) => a.points)).toEqual([
        round + 3,
        0,
      ]);
      expect(view(s, "a", now).memory!.pattern).toEqual(g.pattern);
      expect(g.phase).toBe(round === 5 ? "finished" : "review");
    }
    const g = s.memory!;
    expect(g.scores).toEqual({ a: 30, b: 0 });
    expect(g.winner).toBe("a");
    act(s, "a", { type: "rematch", match: 1, round: 5 });
    act(s, "a", { type: "rematch", match: 1, round: 5 });
    expect(g.match).toBe(1);
    act(s, "b", { type: "rematch", match: 1, round: 5 });
    expect(g).toMatchObject({
      match: 2,
      round: 1,
      phase: "lobby",
      pattern: [],
      scores: {},
      history: [],
      ready: [],
      answers: {},
    });
    expect(g.winner).toBeUndefined();
  });
  it("draws on equal totals, supports repeated colours and handles a late alarm without reopening the pattern", () => {
    const s = setup("memory");
    for (let round = 1; round <= 5; round++) {
      ready(s, round * 10000);
      const g = s.memory!;
      g.pattern = Array(g.round + 3).fill("blue");
      expect(memoryTick(g, g.previewEndsAt + 5000)).toBe(true);
      expect(g.phase).toBe("recall");
      for (const p of s.players)
        act(
          s,
          p.id,
          { type: "memory-submit", match: 1, round, colours: g.pattern },
          g.previewEndsAt + 5000,
        );
    }
    expect(s.memory!.scores).toEqual({ a: 30, b: 30 });
    expect(s.memory!.draw).toBe(true);
    expect(s.memory!.winner).toBeUndefined();
  });
});
describe("Fuse Rush", () => {
  it("requires the host and two players, and starts a random 10–20 second fuse with three lives each", () => {
    const s = setup("fuse", 8);
    expect(() => act(s, "b", { type: "fuse-start", match: 1 }, 1000)).toThrow(
      /host/,
    );
    act(s, "a", { type: "fuse-start", match: 1 }, 1000);
    const g = s.fuse!;
    expect(g.deadline).toBeGreaterThanOrEqual(11000);
    expect(g.deadline).toBeLessThanOrEqual(21000);
    expect(g.round).toBe(1);
    expect(s.players.some((p) => p.id === g.holderId)).toBe(true);
    expect(Object.values(g.lives)).toEqual(Array(8).fill(3));
    expect(nextTimedDeadline(s)).toBe(g.deadline);
    const solo = setup("fuse", 1);
    expect(() =>
      act(solo, "a", { type: "fuse-start", match: 1 }, 1000),
    ).toThrow(/friend/);
  });
  it("enforces ownership, a 300ms hold, valid survivors and stale revisions without extending the fuse", () => {
    const s = live(),
      g = s.fuse!;
    expect(() =>
      act(
        s,
        "b",
        { type: "fuse-pass", match: 1, round: 1, revision: 1, playerId: "c" },
        1300,
      ),
    ).toThrow(/not holding/);
    expect(() =>
      act(
        s,
        "a",
        { type: "fuse-pass", match: 1, round: 1, revision: 1, playerId: "b" },
        1299,
      ),
    ).toThrow(/300/);
    for (const target of ["a", "outsider"])
      expect(() =>
        act(
          s,
          "a",
          {
            type: "fuse-pass",
            match: 1,
            round: 1,
            revision: 1,
            playerId: target,
          },
          1300,
        ),
      ).toThrow(/surviving/);
    g.lives.c = 0;
    expect(() =>
      act(
        s,
        "a",
        { type: "fuse-pass", match: 1, round: 1, revision: 1, playerId: "c" },
        1300,
      ),
    ).toThrow(/surviving/);
    act(
      s,
      "a",
      { type: "fuse-pass", match: 1, round: 1, revision: 1, playerId: "b" },
      1300,
    );
    expect(g.holderId).toBe("b");
    expect(g.deadline).toBe(11000);
    expect(g.revision).toBe(2);
    expect(() =>
      act(
        s,
        "b",
        { type: "fuse-pass", match: 1, round: 1, revision: 1, playerId: "a" },
        1600,
      ),
    ).toThrow(/moved/);
    expect(() =>
      act(
        s,
        "b",
        { type: "fuse-pass", match: 1, round: 0, revision: 2, playerId: "a" },
        1600,
      ),
    ).toThrow(/moved/);
  });
  it("accepts a pre-deadline pass, rejects one at the exact deadline and applies each explosion only once", () => {
    const s = live(),
      g = s.fuse!;
    act(
      s,
      "a",
      { type: "fuse-pass", match: 1, round: 1, revision: 1, playerId: "b" },
      10999,
    );
    expect(() =>
      act(
        s,
        "b",
        { type: "fuse-pass", match: 1, round: 1, revision: 2, playerId: "a" },
        11000,
      ),
    ).toThrow(/ended/);
    expect(g.lives.b).toBe(2);
    expect(g.phase).toBe("between");
    expect(g.history).toHaveLength(1);
    expect(g.history[0].playerId).toBe("b");
    expect(fuseTick(g, s.players, 11000)).toBe(false);
    expect(g.lives.b).toBe(2);
    expect(nextTimedDeadline(s)).toBe(15000);
    const restored = JSON.parse(JSON.stringify(s)) as State;
    expect(tickTimedGames(restored, 15000)).toBe(true);
    expect(restored.fuse!.round).toBe(2);
    expect(restored.fuse!.deadline).toBeGreaterThan(15000);
    expect(restored.fuse!.lives.b).toBe(2);
  });
  it("eliminates at zero lives, stops on the last survivor and lets an eliminated host restart cleanly", () => {
    const s = live(2),
      g = s.fuse!;
    g.lives.a = 1;
    expect(fuseTick(g, s.players, 11000)).toBe(true);
    expect(g.phase).toBe("finished");
    expect(g.winner).toBe("b");
    expect(g.lives.a).toBe(0);
    expect(nextTimedDeadline(s)).toBeUndefined();
    expect(fuseTick(g, s.players, 999999)).toBe(false);
    act(s, "a", { type: "fuse-start", match: 1 }, 12000);
    expect(g.match).toBe(2);
    expect(g.phase).toBe("live");
    expect(g.lives).toEqual({ a: 3, b: 3 });
    expect(g.history).toEqual([]);
    expect(g.winner).toBeUndefined();
    expect(() =>
      act(
        s,
        g.holderId!,
        { type: "fuse-pass", match: 1, round: 1, revision: 1, playerId: "b" },
        13000,
      ),
    ).toThrow(/match has ended/);
  });
  it("never deals a new fuse to an eliminated player, even after serialization or delayed alarms", () => {
    const s = live(),
      g = s.fuse!;
    g.lives.a = 1;
    fuseTick(g, s.players, 11000);
    expect(g.phase).toBe("between");
    expect(g.lives.a).toBe(0);
    for (let i = 0; i < 15; i++) {
      g.phase = "between";
      g.nextRoundAt = 15000;
      fuseTick(g, s.players, 16000);
      expect(g.holderId).not.toBe("a");
      expect(g.deadline).toBeGreaterThan(16000);
    }
  });
});
