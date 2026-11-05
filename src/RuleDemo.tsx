import {
  ArrowDown,
  ArrowRight,
  Bot,
  Check,
  Heart,
  LockKeyhole,
  MousePointer2,
  Skull,
  Timer,
  Users,
} from "lucide-react";
import { Crystal } from "./HiddenDuels";
import { Piece } from "./ChessGame";
import type { GameId } from "./game-catalog";

export function RuleDemo({ game, step }: { game: GameId; step: number }) {
  const colours = ["blue", "green", "red", "yellow"] as const;
  if (game === "fuse")
    return (
      <div className="demo-fuse">
        <span className="demo-label">PASS BEFORE THE CLOCK REACHES 0</span>
        <div className="demo-fuse-players">
          <div>
            <Users />
            <span>You</span>
          </div>
          <div className="demo-bomb">
            <Timer size={44} />
            <b>{step >= 3 ? "0" : "3"}</b>
          </div>
          <div>
            <Users />
            <span>Sam</span>
          </div>
        </div>
        <div className="demo-fake-button">
          <MousePointer2 />
          Pass to Sam
        </div>
        <strong>
          {step >= 3
            ? "Holding it at 0? Lose 1 life."
            : "Pass it! The clock does not restart."}
        </strong>
        <span className="demo-hearts">
          <Heart />
          <Heart />
          <Heart />3 lives each · last player left wins
        </span>
      </div>
    );
  if (game === "chess") {
    const mate = step === 4;
    const pieces: Record<string, [string, boolean]> = mate
      ? { h8: ["k", false], g7: ["q", true], f6: ["k", true] }
      : { b1: ["n", true] };
    return (
      <div className="demo-chess">
        <div
          className="demo-mini-board"
          aria-label={
            mate
              ? "Example checkmate: black king h8, white queen g7 protected by white king f6."
              : "Example: a knight jumps from b1 to c3 in an L shape."
          }
        >
          {Array.from({ length: 64 }, (_, i) => {
            const file = i % 8,
              rank = 8 - Math.floor(i / 8),
              square = "abcdefgh"[file] + rank,
              p = pieces[square];
            return (
              <span
                key={square}
                className={`${(file + rank) % 2 ? "light" : "dark"} ${!mate && square === "c3" ? "demo-destination" : ""}`}
              >
                {p && <Piece type={p[0]} white={p[1]} />}
                <small>{square}</small>
                {!mate && square === "c3" && (
                  <MousePointer2 className="demo-pointer" />
                )}
              </span>
            );
          })}
        </div>
        <strong>
          {mate
            ? "Checkmate! The black king has no escape."
            : "A knight jumps in an L. Tap the marked square."}
        </strong>
      </div>
    );
  }
  if (game === "timer")
    return (
      <div className="demo-timer">
        <span className="demo-label">TARGET: 5 SECONDS</span>
        <Timer size={58} />
        <div className={`demo-count ${step >= 2 ? "demo-stop" : ""}`}>
          <span>0.0</span>
          <span>2.0</span>
          <span>4.0</span>
          <span>5.0</span>
        </div>
        <div className="demo-fake-button">
          <MousePointer2 size={20} />
          {step < 2 ? "Press Start" : "Press Stop near 5.0"}
        </div>
        <strong>
          {step >= 3
            ? "5.1 is closer than 5.8. Smaller gap wins!"
            : "Watch the time. Then press Stop."}
        </strong>
      </div>
    );
  if (game === "prism" || game === "memory")
    return (
      <div className="demo-crystals">
        <span className="demo-label">
          {game === "prism"
            ? "EXAMPLE SECRET ORDER"
            : "LOOK: BLUE, GREEN, RED, YELLOW"}
        </span>
        <div
          className={game === "memory" && step >= 2 ? "demo-memory-hide" : ""}
        >
          {colours.map((c, i) => (
            <div key={c}>
              <small>{i + 1}</small>
              <Crystal colour={c} small />
              <span>{c}</span>
            </div>
          ))}
        </div>
        {game === "prism" ? (
          <>
            <div className="demo-swap">
              <MousePointer2 />
              Tap two crystals to swap
              <ArrowRight />
            </div>
            <div className="demo-guess">Blue · Green · Yellow · Red</div>
            <strong>2 in the right place. Which two? That stays secret.</strong>
          </>
        ) : (
          <>
            <div className="demo-fake-button">
              <MousePointer2 />
              Tap a place. Then pick its colour.
            </div>
            <strong>
              {step >= 2
                ? "Now rebuild the hidden pattern."
                : "You get 3 seconds to look."}
            </strong>
          </>
        )}
      </div>
    );
  if (game === "poison")
    return (
      <div className="demo-poison">
        <div className="demo-hearts">
          {[0, 1, 2].map((i) => (
            <Heart
              key={i}
              fill={step >= 3 && i === 2 ? "none" : "currentColor"}
            />
          ))}
          <span>{step >= 3 ? "2 hearts left" : "3 hearts"}</span>
        </div>
        <span className="demo-label">
          {step < 2 ? "SET 3 TRAPS ON THEIR TRAY" : "PICK FROM YOUR OWN TRAY"}
        </span>
        <div className="demo-tray">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={
                (step < 2 ? [1, 4, 8].includes(i) : step >= 3 && i === 4)
                  ? "demo-trapped"
                  : ""
              }
            >
              {step >= 3 && i === 4 ? <Skull /> : i + 1}
            </span>
          ))}
        </div>
        <strong>
          {step < 2
            ? "Choose 3 different bites. Keep them secret."
            : step >= 3
              ? "Poison! Lose 1 heart. The other player picks next."
              : "Tap one bite. You cannot see their traps."}
        </strong>
      </div>
    );
  if (game === "imposter")
    return (
      <div className="demo-imposter">
        {step === 2 ? (
          <>
            <span className="demo-label">DRAWING MODE: ONE UNBROKEN LINE</span>
            <svg
              viewBox="0 0 280 130"
              role="img"
              aria-label="A single line draws a pizza slice. Lifting your finger ends the turn."
            >
              <path
                className="demo-stroke"
                d="M65 100 L140 20 Q190 35 215 100 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
            <strong>Keep your finger down. Lift it to finish.</strong>
          </>
        ) : (
          <>
            <div className="demo-people">
              {["PIZZA", "PIZZA", "NO WORD"].map((s, i) => (
                <div key={i}>
                  <Users />
                  <span>{s}</span>
                  <small>{i === 2 ? "Imposter" : "Knows the word"}</small>
                </div>
              ))}
            </div>
            <div className="demo-clue">
              “Cheesy!” <ArrowRight /> “Round!” <ArrowRight /> “Snowy?”
            </div>
            <strong>
              {step >= 3
                ? "Vote once. Wrong choice or tied vote? The imposter wins."
                : "Words mode: give a clue. Do not say “pizza”."}
            </strong>
          </>
        )}
      </div>
    );
  if (game === "answer")
    return (
      <div className="demo-answer">
        <span className="demo-label">QUESTION: NAME A FRUIT</span>
        <div className="demo-people">
          {["apple", "apples"].map((s, i) => (
            <div key={s}>
              <Users />
              <small>{i ? "Your friend" : "You"}</small>
              <b className={step < 3 ? "demo-private" : ""}>{s}</b>
              {step < 3 && <LockKeyhole />}
            </div>
          ))}
        </div>
        <div className="demo-match">
          <Check />
          Same thing! Your team gets 1 point.
        </div>
        <strong>Think alone. Lock your answers. Reveal together.</strong>
      </div>
    );
  return (
    <div className="demo-number">
      <span className="demo-label">EXAMPLE RANGE: 0 TO 10</span>
      <div className="demo-secret">
        <LockKeyhole />
        <span>THEIR SECRET</span>
        <b>{step >= 4 ? "8" : "?"}</b>
      </div>
      <div className="demo-number-clue">
        <span>
          {step < 3
            ? "You guess 5"
            : step === 3
              ? "You guess 9"
              : "You guess 8"}
        </span>
        {step < 3 ? <ArrowRight /> : step === 3 ? <ArrowDown /> : <Check />}
        <strong>
          {step < 3
            ? "Go higher"
            : step === 3
              ? "Go lower"
              : "Exact match! You win."}
        </strong>
      </div>
      <span className="demo-label">
        {step < 3
          ? "Try a bigger number next."
          : step === 3
            ? "Try a smaller number next."
            : "Take turns until someone gets it right."}
      </span>
    </div>
  );
}
