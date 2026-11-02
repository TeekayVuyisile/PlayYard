import { useEffect, useRef, useState } from "react";
import {
  Bomb,
  Brain,
  CircleDashed,
  Heart,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { memoryView, FuseGame } from "../worker/timed-games";
import type { PrismColour } from "../worker/hidden-duels";
import { Crystal } from "./HiddenDuels";
export type MemorySnapshot = ReturnType<typeof memoryView>;
export type FuseSnapshot = FuseGame;
type Player = { id: string; name: string };
type Props<T> = {
  game: T;
  id: string;
  players: Player[];
  connected: boolean;
  serverNow: number;
  send: (a: unknown) => boolean;
};
const COLOURS: PrismColour[] = ["blue", "green", "red", "yellow"];
function useServerClock(serverNow: number, active: boolean) {
  const anchor = useRef({ server: serverNow, local: performance.now() }),
    [now, setNow] = useState(serverNow);
  useEffect(() => {
    anchor.current = { server: serverNow, local: performance.now() };
    setNow(serverNow);
  }, [serverNow]);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(
      () =>
        setNow(
          anchor.current.server + performance.now() - anchor.current.local,
        ),
      50,
    );
    return () => clearInterval(t);
  }, [active]);
  return Math.max(now, serverNow);
}
function Pattern({ colours }: { colours: PrismColour[] }) {
  return (
    <div className="memory-pattern">
      {colours.map((c, i) => (
        <div
          key={i}
          className="memory-cell"
          aria-label={`Position ${i + 1}: ${c}`}
        >
          <span className="eyebrow">{i + 1}</span>
          <Crystal colour={c} />
        </div>
      ))}
    </div>
  );
}
export function MemoryDuo({
  game: g,
  id,
  players,
  connected,
  serverNow,
  send,
}: Props<MemorySnapshot>) {
  const [draft, setDraft] = useState<(PrismColour | null)[]>(
      Array(g.length).fill(null),
    ),
    [selected, setSelected] = useState(0);
  useEffect(() => {
    setDraft(Array(g.length).fill(null));
    setSelected(0);
  }, [g.match, g.round, g.length]);
  const now = useServerClock(
    serverNow,
    g.phase === "countdown" || g.phase === "memorize",
  );
  const showing =
    g.phase === "memorize" && now < g.previewEndsAt && !!g.pattern;
  const answered = !!g.answers[id],
    finished = g.phase === "finished",
    review = g.phase === "review" || finished;
  const dispatch = (type: string, extra = {}) =>
    send({ type, match: g.match, round: g.round, ...extra });
  return (
    <section className="party-game memory-game">
      <div className="game-kicker">
        <Brain size={19} />
        Memory Duo · Round {g.round} / 5
      </div>
      <div className="duel-status" aria-live="polite">
        <span className="eyebrow">
          {finished
            ? "THE FINAL RECALL"
            : review
              ? "COMPARE YOUR MEMORIES"
              : showing
                ? "THREE SECONDS. TAKE IT IN."
                : g.phase === "recall"
                  ? "THE PATTERN IS HIDDEN"
                  : "FIND YOUR FOCUS"}
        </span>
        <h2>
          {finished
            ? g.draw
              ? "A match of equal minds."
              : g.winner === id
                ? "Your memory takes the match."
                : `${players.find((p) => p.id === g.winner)?.name} wins the match.`
            : review
              ? "Here’s what you remembered."
              : showing
                ? "Remember the order."
                : g.phase === "recall"
                  ? answered
                    ? "Your memory is locked in."
                    : "Rebuild the pattern."
                  : g.phase === "lobby"
                    ? "Two minds. The same fleeting pattern."
                    : "Get ready to remember."}
        </h2>
        <p>
          {g.phase === "lobby"
            ? "Study the same crystal pattern for three seconds, then recreate it privately. Five rounds grow from four to eight positions. Each correct position earns one point. Colours can repeat. Highest total wins."
            : finished
              ? "Five rounds, thirty possible points. Matching totals are a draw."
              : review
                ? "Both answers are revealed. Confirm when you’re ready for a longer pattern."
                : g.phase === "recall"
                  ? "Choose a position, then its colour. Fill every position before locking your answer. Colours may repeat."
                  : "The pattern disappears when the server’s three-second window ends."}
        </p>
      </div>
      <div className="memory-scores">
        {players.map((p) => (
          <div key={p.id}>
            <span>
              {p.name}
              {p.id === id ? " · You" : ""}
            </span>
            <strong>
              {g.scores[p.id] || 0}
              <small> / 30</small>
            </strong>
          </div>
        ))}
      </div>
      {g.phase === "countdown" && (
        <div className="memory-wait">
          <Brain size={42} />
          <span>
            Pattern in{" "}
            <time aria-live="off">
              {Math.max(0, (g.previewStartsAt - now) / 1000).toFixed(1)}s
            </time>
          </span>
        </div>
      )}
      {showing && (
        <div className="memory-study">
          <Pattern colours={g.pattern!} />
          <div className="study-timer">
            <span>Pattern hides in</span>
            <time aria-live="off">
              {Math.max(0, (g.previewEndsAt - now) / 1000).toFixed(1)}s
            </time>
          </div>
          <progress
            max={3000}
            value={Math.max(0, g.previewEndsAt - now)}
            aria-label="Pattern viewing time remaining"
          />
        </div>
      )}
      {g.phase === "memorize" && !showing && (
        <p className="muted">
          Pattern hidden. Waiting for the server to open recall…
        </p>
      )}
      {g.phase === "recall" &&
        (answered ? (
          <>
            <p className="vote-confirmed">
              <ShieldCheck size={19} />
              Waiting for your friend’s answer. Yours stays private until both
              are locked.
            </p>
            <Pattern colours={g.answers[id].colours!} />
          </>
        ) : (
          <>
            <div
              className="memory-pattern"
              role="group"
              aria-label="Your recalled pattern"
            >
              {draft.map((c, i) => (
                <button
                  key={i}
                  className={`memory-cell recall-cell ${selected === i ? "chosen" : ""}`}
                  aria-label={`Recall position ${i + 1}: ${c || "empty"}`}
                  aria-pressed={selected === i}
                  disabled={!connected}
                  onClick={() => setSelected(i)}
                >
                  <span className="eyebrow">{i + 1}</span>
                  {c ? (
                    <Crystal colour={c} />
                  ) : (
                    <CircleDashed size={34} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
            <div
              className="memory-palette"
              role="group"
              aria-label={`Choose a colour for position ${selected + 1}`}
            >
              {COLOURS.map((c) => (
                <button
                  key={c}
                  className="secondary"
                  disabled={!connected}
                  onClick={() => {
                    const next = [...draft];
                    next[selected] = c;
                    setDraft(next);
                    const empty = next.findIndex(
                      (v, i) => i > selected && v === null,
                    );
                    setSelected(
                      empty >= 0
                        ? empty
                        : next.findIndex((v) => v === null) >= 0
                          ? next.findIndex((v) => v === null)
                          : selected,
                    );
                  }}
                >
                  <Crystal colour={c} small />
                  {c}
                </button>
              ))}
            </div>
            <p className="muted">
              Position {selected + 1} selected · {draft.filter(Boolean).length}{" "}
              / {g.length} filled
            </p>
            <button
              className="primary"
              disabled={!connected || draft.some((c) => c === null)}
              onClick={() => dispatch("memory-submit", { colours: draft })}
            >
              <ShieldCheck size={17} />
              Lock my memory
            </button>
          </>
        ))}
      {review && (
        <div className="memory-review">
          <h3>The original pattern</h3>
          <Pattern colours={g.pattern!} />
          {g.history.at(-1)?.answers.map((a) => (
            <div key={a.id}>
              <h3>
                {players.find((p) => p.id === a.id)?.name} · {a.points} /{" "}
                {g.length} correct
              </h3>
              <Pattern colours={a.colours} />
            </div>
          ))}
        </div>
      )}
      {(g.phase === "lobby" || g.phase === "review") && (
        <button
          className="primary"
          disabled={!connected || players.length !== 2 || g.ready.includes(id)}
          onClick={() => dispatch("memory-ready")}
        >
          {g.ready.includes(id)
            ? "Waiting for your friend…"
            : g.phase === "lobby"
              ? "Ready to remember"
              : `Ready for round ${g.round + 1}`}
        </button>
      )}
      {finished && (
        <button
          className="primary"
          disabled={!connected || g.rematchReady.includes(id)}
          onClick={() => dispatch("rematch")}
        >
          {g.rematchReady.includes(id)
            ? "Waiting for your friend…"
            : "Play another memory match"}
        </button>
      )}
      {!!g.history.length && (
        <details className="memory-history">
          <summary>Round scores</summary>
          <ol>
            {g.history.map((h) => (
              <li key={h.round}>
                <b>Round {h.round}</b>
                {h.answers.map((a) => (
                  <span key={a.id}>
                    {players.find((p) => p.id === a.id)?.name}: {a.points} /{" "}
                    {h.pattern.length}
                  </span>
                ))}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
export function FuseRush({
  game: g,
  id,
  players,
  connected,
  serverNow,
  send,
}: Props<FuseSnapshot>) {
  const now = useServerClock(
      serverNow,
      g.phase === "live" || g.phase === "between",
    ),
    host = players[0]?.id === id,
    mine = g.phase === "live" && g.holderId === id;
  const remaining = Math.max(0, g.deadline - now),
    grip = Math.max(0, g.passedAt + 300 - now),
    out = g.phase !== "lobby" && (g.lives[id] || 0) === 0;
  const holder = players.find((p) => p.id === g.holderId),
    winner = players.find((p) => p.id === g.winner);
  return (
    <section className={`party-game fuse-game ${mine ? "holding-fuse" : ""}`}>
      <div className="game-kicker">
        <Bomb size={19} />
        Fuse Rush ·{" "}
        {g.phase === "lobby" ? "The night circuit" : `Fuse ${g.round}`}
      </div>
      <div className="duel-status" aria-live="polite">
        <span className="eyebrow">
          {g.phase === "lobby"
            ? "QUICK HANDS. COOL NERVES."
            : g.phase === "finished"
              ? "THE LAST SURVIVOR"
              : g.phase === "between"
                ? "FUSE BURNED OUT"
                : mine
                  ? "YOU HAVE THE BOMB"
                  : "KEEP YOUR EYES ON THE FUSE"}
        </span>
        <h2>
          {g.phase === "lobby"
            ? "Don’t be the last to hold it."
            : g.phase === "finished"
              ? `${winner?.name} survived the rush.`
              : g.phase === "between"
                ? `${holder?.name} lost a life.`
                : mine
                  ? "Pass it. Before it’s too late."
                  : `${holder?.name} has the bomb.`}
        </h2>
        <p>
          {g.phase === "lobby"
            ? "2–8 players. Three lives each. Every fuse burns for a random 10–20 seconds. Pass to any survivor after a 300 ms grip. The holder at expiry loses one life. Last survivor wins."
            : g.phase === "between"
              ? "The next fuse starts automatically after a four-second breather. Eliminated players stay to watch."
              : g.phase === "finished"
                ? "The host can deal a fresh match. Everyone returns with three lives."
                : out
                  ? "You’re out of lives. Stay and watch the remaining players."
                  : "The server judges who holds the bomb when time runs out. Passes must arrive before the deadline."}
        </p>
      </div>
      {g.phase === "live" && (
        <>
          <div
            className={`fuse-instrument ${remaining <= 3000 ? "fuse-urgent" : ""}`}
          >
            <div className="fuse-orb" aria-hidden="true">
              <Bomb size={70} />
              <span className="fuse-orb-ring" />
            </div>
            <span className="eyebrow">FUSE REMAINING</span>
            <time className="fuse-clock" aria-live="off">
              {(remaining / 1000).toFixed(2)}
              <small>s</small>
            </time>
            <p>
              {remaining === 0
                ? "Time’s up. Waiting for the server…"
                : mine
                  ? grip > 0
                    ? `Grip · ${(grip / 1000).toFixed(2)}s`
                    : "Pass now"
                  : `${g.passes} ${g.passes === 1 ? "pass" : "passes"} this fuse`}
            </p>
          </div>
          {mine && (
            <div
              className="fuse-targets"
              role="group"
              aria-label="Choose a player to pass the bomb to"
            >
              {players
                .filter((p) => p.id !== id && g.lives[p.id] > 0)
                .map((p) => (
                  <button
                    key={p.id}
                    className="primary"
                    disabled={!connected || grip > 0 || remaining === 0}
                    onClick={() =>
                      send({
                        type: "fuse-pass",
                        match: g.match,
                        round: g.round,
                        revision: g.revision,
                        playerId: p.id,
                      })
                    }
                  >
                    <Send size={18} />
                    <span>
                      Pass to {p.name}
                      <small>
                        {g.lives[p.id]} {g.lives[p.id] === 1 ? "life" : "lives"}
                      </small>
                    </span>
                  </button>
                ))}
            </div>
          )}
        </>
      )}
      {g.phase === "between" && (
        <div className="fuse-breather">
          <Bomb size={34} />
          <span>
            Next fuse in{" "}
            <time aria-live="off">
              {Math.max(0, (g.nextRoundAt - now) / 1000).toFixed(1)}s
            </time>
          </span>
        </div>
      )}
      <div className="fuse-roster">
        {players.map((p) => (
          <div
            key={p.id}
            className={
              g.phase === "live" && g.holderId === p.id ? "current-holder" : ""
            }
          >
            <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>
                {p.name}
                {p.id === id ? " · You" : ""}
              </strong>
              <span
                className="fuse-lives"
                aria-label={`${g.phase === "lobby" ? 3 : g.lives[p.id] || 0} ${g.lives[p.id] === 1 ? "life" : "lives"}`}
              >
                {[0, 1, 2].map((n) => (
                  <Heart
                    key={n}
                    size={16}
                    aria-hidden="true"
                    className={
                      n < (g.phase === "lobby" ? 3 : g.lives[p.id] || 0)
                        ? "life-full"
                        : "life-lost"
                    }
                    fill={
                      n < (g.phase === "lobby" ? 3 : g.lives[p.id] || 0)
                        ? "currentColor"
                        : "none"
                    }
                  />
                ))}
                <small>
                  {g.phase === "lobby"
                    ? p.id === players[0].id
                      ? "Host"
                      : "Ready"
                    : g.lives[p.id] === 0
                      ? "Eliminated"
                      : `${g.lives[p.id]} / 3`}
                </small>
              </span>
            </div>
            {g.phase === "live" && g.holderId === p.id && <Bomb size={21} />}
          </div>
        ))}
      </div>
      {(g.phase === "lobby" || g.phase === "finished") &&
        (host ? (
          <button
            className="primary"
            disabled={!connected || players.length < 2}
            onClick={() => send({ type: "fuse-start", match: g.match })}
          >
            {g.phase === "lobby"
              ? "Light the first fuse"
              : "Start a fresh match"}
          </button>
        ) : (
          <p className="muted">
            Waiting for {players[0]?.name} to light the fuse.
          </p>
        ))}
      {!!g.history.length && (
        <details className="fuse-history">
          <summary>Fuse history ({g.history.length})</summary>
          <ol>
            {g.history.map((h) => (
              <li key={h.round}>
                Fuse {h.round}
                <span>
                  {players.find((p) => p.id === h.playerId)?.name} ·{" "}
                  {h.livesRemaining === 0
                    ? "eliminated"
                    : `${h.livesRemaining} lives left`}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
