import { BookOpen, ChevronDown } from "lucide-react";
import { gameTitle, type GameId } from "./game-catalog";
import { GAME_RULES, PRACTICE_RULES } from "./game-rules";

export function GameRules({
  game,
  compact = false,
  mode = "friends",
}: {
  game: GameId;
  compact?: boolean;
  mode?: "friends" | "computer" | "practice";
}) {
  const guide = mode === "practice" ? PRACTICE_RULES : GAME_RULES[game];
  const title =
    mode === "practice" ? "Stop the Clock practice" : gameTitle(game);
  const Heading = compact ? "h4" : "h2";
  const GroupHeading = compact ? "h5" : "h3";
  const timed = game === "timer" || game === "memory" || game === "fuse";
  return (
    <details className={`rules-guide ${compact ? "rules-compact" : ""}`}>
      <summary>
        <BookOpen size={17} aria-hidden="true" />
        <span>
          How to play<span className="sr-only"> {title}</span>
        </span>
        <ChevronDown size={16} className="rules-chevron" aria-hidden="true" />
      </summary>
      <div className="rules-content">
        <Heading>Your goal</Heading>
        <p className="rules-goal">{guide.goal}</p>
        {mode === "friends" && (
          <p className="rules-mode">
          With friends? Create a room. Share its code. Your friends tap Join
          room and enter that code.
          </p>
        )}
        {mode === "computer" && (
          <p className="rules-mode">
            You play against the computer. Choose Easy, Medium or Hard before
            you start.{" "}
            {game === "chess"
              ? "You can choose white or black. The computer accepts rematches for you."
              : "It takes turns like a friend. It uses its own clues to guess, not your secret."}{" "}
            Refreshing or leaving starts this solo game over.
          </p>
        )}
        <Heading>Let’s play</Heading>
        <ol className="rules-steps">
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <aside className="rules-example">
          <Heading>Try this example</Heading>
          <p>{guide.example}</p>
        </aside>
        {timed && (
          <p className="rules-time-note">
            The clock keeps going while you read this guide. Read it before
            starting a timed round.
          </p>
        )}
        <details className="rules-extra">
          <summary>
            More rules <ChevronDown size={16} aria-hidden="true" />
          </summary>
          {guide.more.map((group) => (
            <section key={group.title}>
              <GroupHeading>{group.title}</GroupHeading>
              <ul>
                {group.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </section>
          ))}
        </details>
      </div>
    </details>
  );
}
