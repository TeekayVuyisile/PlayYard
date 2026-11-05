import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GAMES } from "../src/game-catalog";
import { GAME_RULES } from "../src/game-rules";
import { GameRules } from "../src/GameRules";
import { GameCards } from "../src/GameCards";

describe("game instructions", () => {
  it.each(GAMES)(
    "gives $title an accessible guide with a goal, steps, example and full rules",
    (game) => {
      const html = renderToStaticMarkup(
        createElement(GameRules, { game: game.id }),
      );
      expect(html).toContain(`How to play<span class="sr-only"> ${game.title}`);
      expect(html).toContain("Your goal");
      expect(html).toContain("Let’s play");
      expect(html).toContain("Try this example");
      expect(html).toContain("More rules");
      expect(GAME_RULES[game.id].steps.length).toBeGreaterThanOrEqual(4);
      expect(html).toContain("<ol");
      expect(html).toContain("<summary>");
      expect(html).not.toContain("<details open");
    },
  );
  it("makes all nine guides available before creating or joining a room", () => {
    const html = renderToStaticMarkup(
      createElement(GameCards, {
        onCreate: () => {},
        onJoin: () => {},
        onPractice: () => {},
      }),
    );
    expect((html.match(/class="rules-guide /g) || []).length).toBe(9);
    for (const game of GAMES) expect(html).toContain(` ${game.title}</span>`);
  });
  it.each(["number", "chess", "prism"] as const)(
    "explains computer play for %s",
    (game) => {
      const html = renderToStaticMarkup(
        createElement(GameRules, { game, mode: "computer" }),
      );
      expect(html).toContain("You play against the computer.");
      expect(html).toContain("Easy, Medium or Hard");
    expect(html).not.toContain("With friends?");
    },
  );
  it("gives clock practice its own solo goal and controls", () => {
    const html = renderToStaticMarkup(
      createElement(GameRules, { game: "timer", mode: "practice" }),
    );
    expect(html).toContain("beat your own best time");
    expect(html).toContain("Start practice timer");
    expect(html).toContain("last 10 attempts");
    expect(html).not.toContain("The player closest to the target wins");
  });
  it("warns that timed rounds keep running while reading, without implying other games have a clock", () => {
    for (const game of GAMES) {
      const html = renderToStaticMarkup(
        createElement(GameRules, { game: game.id }),
      );
      expect(html.includes("The clock keeps going while you read")).toBe(
        ["timer", "memory", "fuse"].includes(game.id),
      );
    }
  });
});
