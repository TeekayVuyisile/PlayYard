import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SameAnswer, type AnswerSnapshot } from "../src/SameAnswer";
import { GameCards } from "../src/GameCards";
import { ClockPractice } from "../src/ClockPractice";
import { GAMES } from "../src/game-catalog";
const players = [
  { id: "a", name: "Alex" },
  { id: "b", name: "Sam" },
];
function finished(matched = false): AnswerSnapshot {
  return {
    match: 1,
    round: 5,
    totalRounds: 5,
    prompt: "Name a fruit.",
    answers: {
      a: { submitted: true, text: "Mango" },
      b: { submitted: true, text: matched ? "Mango" : "Pear" },
    },
    revealed: true,
    finished: true,
    score: matched ? 5 : 2,
    nextReady: [],
    history: Array.from({ length: 5 }, () => ({
      prompt: "Name a fruit.",
      matched,
      answers: [
        { ...players[0], text: "Mango" },
        { ...players[1], text: matched ? "Mango" : "Pear" },
      ],
    })),
  };
}
describe("Game entry and reveal regressions", () => {
  it("shows the fifth answer reveal before offering the match summary, including mismatches", () => {
    const html = renderToStaticMarkup(
      createElement(SameAnswer, {
        game: finished(),
        id: "a",
        players,
        connected: true,
        send: () => true,
      }),
    );
    expect(html).toContain('class="answer-reveal"');
    expect(html).toContain("Two different takes.");
    expect(html).toContain("Mango");
    expect(html).toContain("Pear");
    expect(html).toContain("See final score");
    expect(html).not.toContain("Play another match");
    expect(html).not.toContain("answer-final-score");
    expect(html.indexOf("answer-reveal")).toBeLessThan(
      html.indexOf("answer-history"),
    );
    expect(html).not.toContain('<details class="answer-history" open');
  });
  it("also reveals a matching final answer first, even when the connection is interrupted", () => {
    const html = renderToStaticMarkup(
      createElement(SameAnswer, {
        game: finished(true),
        id: "a",
        players,
        connected: false,
        send: () => false,
      }),
    );
    expect(html).toContain("Same thought. Same answer.");
    expect(html).toContain("See final score");
    expect(html).not.toContain("Play another match");
  });
  it("keeps non-final reveals on the existing next-prompt flow", () => {
    const g = { ...finished(), round: 4, finished: false };
    const html = renderToStaticMarkup(
      createElement(SameAnswer, {
        game: g,
        id: "a",
        players,
        connected: true,
        send: () => true,
      }),
    );
    expect(html).toContain("Ready for next prompt");
    expect(html).not.toContain("See final score");
  });
  it("gives every game separate create/join actions without nesting buttons or adding a game selector", () => {
    const html = renderToStaticMarkup(
      createElement(GameCards, {
        onCreate: () => {},
        onJoin: () => {},
        onPractice: () => {},
      }),
    );
    expect((html.match(/<article /g) || []).length).toBe(9);
    for (const g of GAMES) {
      expect(html).toContain(`aria-label="Create ${g.title} room"`);
      expect(html).toContain(`aria-label="Join ${g.title} room"`);
      expect(html).toContain(`cover-${g.id}`);
    }
    expect((html.match(/<button /g) || []).length).toBe(28);
    expect(html).not.toContain("<select");
    expect(html).toContain("Practice solo");
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
  });
  it("offers solo clock practice before any room or opponent exists", () => {
    const html = renderToStaticMarkup(
      createElement(ClockPractice, { onCreateRoom: () => {} }),
    );
    expect(html).toContain("SOLO PRACTICE");
    expect(html).toContain("Start practice timer");
    expect(html).toContain("Space");
    expect(html).toContain("Target time (seconds)");
    expect(html).not.toContain("Waiting for a second player");
  });
  it("offers computer opponents only for the three supported games", () => {
    const html = renderToStaticMarkup(
      createElement(GameCards, {
        onCreate: () => {},
        onJoin: () => {},
        onPractice: () => {},
        onSolo: () => {},
      }),
    );
    for (const title of ["Chess", "Guess My Number", "Prism Code"])
      expect(html).toContain(`Play ${title} with computer`);
    expect((html.match(/Play with computer/g) || []).length).toBe(3);
  });
});
