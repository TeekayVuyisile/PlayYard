import { useEffect, useState } from "react";
import { Bot, RotateCcw } from "lucide-react";
import { view, type State } from "../worker/game";
import { ChessGame } from "./ChessGame";
import { PrismCode } from "./HiddenDuels";
import { gameTitle } from "./game-catalog";
import {
  COMPUTER,
  HUMAN,
  computerAction,
  createSolo,
  soloAction,
  type Difficulty,
  type SoloGame,
} from "./solo-engine";

const descriptions: Record<SoloGame, Record<Difficulty, string>> = {
  chess: {
    easy: "Random legal moves. A relaxed place to learn.",
    medium: "Looks two moves ahead and weighs material and position.",
    hard: "Looks up to three moves ahead with a longer search. A stronger casual opponent.",
  },
  number: {
    easy: "Guesses untried numbers without narrowing the range.",
    medium: "Uses higher/lower clues, then picks within the remaining range.",
    hard: "Halves the remaining range with each guess.",
  },
  prism: {
    easy: "Tries different arrangements without using the clues.",
    medium: "Uses its previous clues to rule out impossible arrangements.",
    hard: "Uses clues and chooses arrangements that narrow the possibilities.",
  },
};
export function SoloPlay({ game }: { game: SoloGame }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [min, setMin] = useState("0"),
    [max, setMax] = useState("500");
  const [side, setSide] = useState("white");
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState("");
  const [thinking, setThinking] = useState(false),
    [retry, setRetry] = useState(0);
  const [value, setValue] = useState("");
  function start() {
    try {
      const next = createSolo(game, Number(min), Number(max));
      if (game === "chess" && side === "black") next.chess!.whiteId = COMPUTER;
      setState(next);
      setValue("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function send(action: unknown) {
    if (!state) return false;
    try {
      setState(soloAction(state, HUMAN, action as Record<string, unknown>));
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  useEffect(() => {
    if (!state) return;
    let cancelled = false,
      worker: Worker | undefined,
      watchdog: ReturnType<typeof setTimeout> | undefined;
    const snapshot = view(state, COMPUTER);
    const action = computerAction(snapshot, difficulty);
    const chess = snapshot.chess;
    const chessTurn =
      !!chess &&
      !chess.result &&
      (chess.turn === "w") === (chess.whiteId === COMPUTER);
    if (!action && !chessTurn) {
      setThinking(false);
      return;
    }
    setThinking(true);
    const apply = (a: Record<string, unknown>) => {
      if (cancelled) return;
      try {
        setState(soloAction(state, COMPUTER, a));
        setThinking(false);
      } catch (e) {
        setError((e as Error).message);
        setThinking(false);
      }
    };
    const timer = setTimeout(() => {
      if (action) {
        apply(action);
        return;
      }
      try {
        worker = new Worker(
          new URL("./chess-computer.worker.ts", import.meta.url),
          { type: "module" },
        );
        const fail = () => {
          if (!cancelled) {
            setError(
              "The computer could not finish its move. Retry the computer turn.",
            );
            setThinking(false);
          }
        };
        worker.onmessage = (event) => {
          clearTimeout(watchdog);
          if (event.data.move)
            apply({
              type: "chess-move",
              match: chess!.match,
              ply: chess!.moves.length,
              ...event.data.move,
            });
          else fail();
          worker?.terminate();
        };
        worker.onerror = (event) => {
          console.error("Chess computer worker failed:", event.message);
          fail();
        };
        watchdog = setTimeout(() => {
          worker?.terminate();
          fail();
        }, 8000);
        worker.postMessage({ moves: chess!.moves, difficulty });
      } catch {
        setError("The computer could not start. Retry the computer turn.");
        setThinking(false);
      }
    }, 550);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(watchdog);
      worker?.terminate();
    };
  }, [state, difficulty, retry]);
  const snapshot = state ? view(state, HUMAN) : null;
  const me = snapshot?.players.find((p) => p.id === HUMAN);
  const ready = snapshot?.players.every((p) => p.ready);
  const humanTurn = !!snapshot && snapshot.players[snapshot.turn].id === HUMAN;
  return (
    <section className="solo-shell" aria-labelledby="solo-title">
      <header className="solo-heading">
        <span className="eyebrow">
          <Bot size={17} /> PLAY WITH COMPUTER
        </span>
        <h1 id="solo-title">{gameTitle(game)}</h1>
        <p>
          {state
            ? `${difficulty[0].toUpperCase() + difficulty.slice(1)} opponent · ${descriptions[game][difficulty]}`
            : "Your own table. Your own pace. Choose your challenge."}
        </p>
      </header>
      {!state ? (
        <form
          className="solo-settings board"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <label htmlFor="solo-difficulty">Difficulty</label>
          <select
            id="solo-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <p className="muted">{descriptions[game][difficulty]}</p>
          {game === "number" && (
            <div className="solo-range">
              <label>
                Minimum
                <input
                  type="number"
                  min="0"
                  max="999999"
                  required
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                />
              </label>
              <label>
                Maximum
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  required
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                />
              </label>
            </div>
          )}
          {game === "chess" && (
            <>
              <label htmlFor="solo-side">Your colour</label>
              <select
                id="solo-side"
                value={side}
                onChange={(e) => setSide(e.target.value)}
              >
                <option value="white">White · move first</option>
                <option value="black">Black · computer moves first</option>
              </select>
            </>
          )}
          <button className="primary" type="submit">
            <Bot size={17} />
            Start solo game
          </button>
          <p className="muted">
            Played on this device. Refreshing or leaving starts over.
          </p>
        </form>
      ) : (
        <>
          <div className="solo-toolbar">
            <span role="status">
              {thinking ? "Computer is thinking…" : "You vs Computer"}
            </span>
            <button
              className="secondary"
              onClick={() => {
                setState(null);
                setError("");
                setValue("");
              }}
            >
              <RotateCcw size={16} />
              Change settings
            </button>
          </div>
          <div className="board solo-board">
            {game === "chess" && snapshot?.chess ? (
              <ChessGame
                key={snapshot.chess.match}
                game={snapshot.chess}
                id={HUMAN}
                players={snapshot.players}
                connected
                send={send}
              />
            ) : game === "prism" && snapshot?.prism ? (
              <PrismCode
                key={snapshot.prism.match}
                game={snapshot.prism}
                id={HUMAN}
                players={snapshot.players}
                connected
                send={send}
              />
            ) : (
              snapshot && (
                <section
                  className="party-game solo-number"
                  aria-labelledby="number-solo-status"
                >
                  <span className="eyebrow">
                    RANGE {snapshot.min}–{snapshot.max}
                  </span>
                  <h2 id="number-solo-status">
                    {snapshot.winner
                      ? snapshot.winner === HUMAN
                        ? "You found it!"
                        : "Computer found your number."
                      : !me?.ready
                        ? "Choose your secret number."
                        : !ready
                          ? "Computer is choosing a secret…"
                          : humanTurn
                            ? "Your turn to guess."
                            : "Computer is guessing."}
                  </h2>
                  <p>
                    Find the computer’s secret before it finds yours. Both use
                    the same higher/lower clues.
                  </p>
                  {snapshot.winner ? (
                    <>
                      <p>
                        Your secret: {state.players[0].secret} · Computer’s
                        secret: {state.players[1].secret}
                      </p>
                      <button
                        className="primary"
                        onClick={() => {
                          send({ type: "rematch" });
                          setValue("");
                        }}
                      >
                        Play again · switch starter
                      </button>
                    </>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (
                          value.trim() &&
                          send({
                            type: me?.ready ? "guess" : "secret",
                            value: Number(value),
                          })
                        )
                          setValue("");
                      }}
                    >
                      <label htmlFor="solo-number">
                        {me?.ready ? "Your guess" : "Your secret number"}
                      </label>
                      <input
                        id="solo-number"
                        type="number"
                        min={snapshot.min}
                        max={snapshot.max}
                        step="1"
                        required
                        value={value}
                        disabled={!!me?.ready && (!ready || !humanTurn)}
                        onChange={(e) => setValue(e.target.value)}
                      />
                      <button
                        className="primary"
                        disabled={
                          !value.trim() ||
                          (!!me?.ready && (!ready || !humanTurn))
                        }
                      >
                        {me?.ready ? "Submit guess" : "Lock secret number"}
                      </button>
                    </form>
                  )}
                  {me?.ready && !snapshot.winner && (
                    <p className="muted">
                      Your secret is {me.secret}. Hidden from the computer’s
                      strategy.
                    </p>
                  )}
                  <ol className="solo-guesses" aria-label="Guess history">
                    {snapshot.guesses.map((g, i) => (
                      <li key={i}>
                        <span>
                          {g.player}: {g.value}
                        </span>
                        <strong>
                          {g.result === "higher"
                            ? "Go higher"
                            : g.result === "lower"
                              ? "Go lower"
                              : "Exact match"}
                        </strong>
                      </li>
                    ))}
                  </ol>
                </section>
              )
            )}
          </div>
        </>
      )}
      {error && (
        <div className="solo-error" role="alert">
          <p>{error}</p>
          {state && (
            <button
              className="secondary"
              onClick={() => {
                setError("");
                setRetry((n) => n + 1);
              }}
            >
              Retry computer turn
            </button>
          )}
        </div>
      )}
    </section>
  );
}
