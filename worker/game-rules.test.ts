import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GAMES } from "../src/game-catalog";
import { GAME_RULES, PRACTICE_RULES } from "../src/game-rules";
import { GameRules } from "../src/GameRules";
import { RuleDemo } from "../src/RuleDemo";

describe("visual game instructions", () => {
  it.each(GAMES)(
    "offers an instruction launcher for $title without rendering a long inline panel",
    (game) => {
      const html = renderToStaticMarkup(
        createElement(GameRules, { game: game.id }),
      );
      expect(html).toContain(`aria-label="How to play ${game.title}"`);
      expect(html).not.toContain("<details");
      expect(html).not.toContain("Your goal");
      expect(GAME_RULES[game.id].steps).toHaveLength(5);
      for (let step = 0; step < 5; step++)
        expect(
          renderToStaticMarkup(
            createElement(RuleDemo, { game: game.id, step }),
          ),
        ).not.toBe("");
    },
  );
  it("shows example checkmate and legal knight movement instead of a generic illustration", () => {
    expect(
      renderToStaticMarkup(createElement(RuleDemo, { game: "chess", step: 4 })),
    ).toContain("black king h8");
    expect(
      renderToStaticMarkup(createElement(RuleDemo, { game: "chess", step: 1 })),
    ).toContain("knight jumps from b1 to c3");
  });
  it("distinguishes memory practice instructions and real win conditions", () => {
    expect(PRACTICE_RULES.goal).toContain("your own best");
    expect(
      GAME_RULES.imposter.more.flatMap((g) => g.rules).join(" "),
    ).toContain("tie for the most votes");
    expect(GAME_RULES.answer.goal).toContain("team");
  });
});
