import { useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Fingerprint,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { imposterView, Point } from "../worker/imposter";
export type ImposterSnapshot = ReturnType<typeof imposterView>;
type Player = { id: string; name: string };
const COLORS = [
  "#d8fc83",
  "#76cafa",
  "#ff9cbd",
  "#d4b4ff",
  "#ffcd81",
  "#80e3ca",
  "#f9f2df",
  "#c4b6a5",
];
function Drawing({
  game,
  players,
  active,
  connected,
  send,
}: {
  game: ImposterSnapshot;
  players: Player[];
  active: boolean;
  connected: boolean;
  send: (a: unknown) => boolean;
}) {
  const [draft, setDraft] = useState<Point[]>([]),
    points = useRef<Point[]>([]),
    pointer = useRef<number | null>(null);
  const [sealed, setSealed] = useState(false);
  const payload = (stroke: Point[]) => ({
    type: "imposter-stroke",
    match: game.match,
    round: game.round,
    turn: game.turn,
    points: stroke,
  });
  function position(e: React.PointerEvent<SVGSVGElement>): Point {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.round(
        Math.max(0, Math.min(1000, ((e.clientX - r.left) / r.width) * 1000)),
      ),
      Math.round(
        Math.max(0, Math.min(1000, ((e.clientY - r.top) / r.height) * 1000)),
      ),
    ];
  }
  function finish(e: React.PointerEvent<SVGSVGElement>) {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    setSealed(true);
    send(payload(points.current));
  }
  const strokes = game.clues
    .filter((c) => c.points)
    .map((c) => ({
      points: c.points!,
      color: COLORS[players.findIndex((p) => p.id === c.playerId)],
    }));
  if (draft.length) strokes.push({ points: draft, color: COLORS[game.turn] });
  return (
    <div className="drawing-area">
      <svg
        className={`shared-canvas ${active && !sealed ? "can-draw" : ""}`}
        viewBox="0 0 1000 1000"
        role="img"
        aria-label="Shared drawing canvas. Each player adds one continuous stroke."
        onPointerDown={(e) => {
          if (!active || !connected || sealed || pointer.current !== null)
            return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          pointer.current = e.pointerId;
          points.current = [position(e)];
          setDraft([...points.current]);
        }}
        onPointerMove={(e) => {
          if (pointer.current !== e.pointerId) return;
          const p = position(e);
          if (points.current.length >= 128)
            points.current = points.current.filter((_, i) => i % 2 === 0);
          points.current.push(p);
          setDraft([...points.current]);
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      >
        <defs>
          <pattern
            id="paper-grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#303b49"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="1000" height="1000" fill="#111c29" />
        <rect width="1000" height="1000" fill="url(#paper-grid)" />
        {strokes.map((s, i) =>
          s.points.length === 1 ? (
            <circle
              key={i}
              cx={s.points[0][0]}
              cy={s.points[0][1]}
              r="5"
              fill={s.color}
            />
          ) : (
            <polyline
              key={i}
              points={s.points.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}
      </svg>
      <p className="muted">
        {active
          ? sealed
            ? "Stroke submitted. Waiting for the server…"
            : "Touch or press to begin. Lifting your finger or pen ends your turn. No undo."
          : "Watch the drawing grow. New strokes appear when a player finishes their turn."}{" "}
        Don’t write the secret word.
      </p>
      {sealed && active && (
        <button
          className="secondary"
          disabled={!connected}
          onClick={() => send(payload(points.current))}
        >
          Retry sending stroke
        </button>
      )}
      <div className="drawing-legend">
        {players.map((p, i) => (
          <span key={p.id}>
            <i style={{ background: COLORS[i] }} />
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}
export function Imposter({
  game: g,
  players,
  id,
  connected,
  send,
}: {
  game: ImposterSnapshot;
  players: Player[];
  id: string;
  connected: boolean;
  send: (a: unknown) => boolean;
}) {
  const [show, setShow] = useState(false),
    [clue, setClue] = useState(""),
    [vote, setVote] = useState(""),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setClue("");
    setShow(false);
    setVote("");
  }, [g.match, g.phase]);
  const host = players[0]?.id === id,
    active = g.phase === "clues" && players[g.turn]?.id === id;
  const dispatch = (type: string, extra = {}) =>
    send({ type, match: g.match, round: g.round, turn: g.turn, ...extra });
  return (
    <section className="party-game imposter-game">
      <div className="game-kicker">
        <Fingerprint size={19} />
        {g.mode === "words" ? "Read the room" : "One stroke. One alibi."}
      </div>
      {g.phase === "lobby" ? (
        <div className="party-intro">
          <h2>Someone won’t know the word.</h2>
          <p>
            Give a subtle clue. Catch the bluff. You get one vote to find the
            imposter.
          </p>
          <div className="match-settings">
            <span>
              <Users size={16} />
              {players.length} / 8 players
            </span>
            <span>
              {g.totalRounds} clue {g.totalRounds === 1 ? "round" : "rounds"}
            </span>
            <span>
              {g.mode === "words" ? "Written clues" : "Shared drawing"}
            </span>
          </div>
          <p className="muted">
            3–8 players. One imposter, no word or hint. Complete every clue
            round, then vote once. A wrong choice or tied top vote gives the
            imposter the win. Votes stay private until everyone votes.
          </p>
          {host ? (
            <button
              className="primary"
              disabled={!connected || players.length < 3}
              onClick={() => dispatch("imposter-start")}
            >
              Deal secret roles
            </button>
          ) : (
            <p>Waiting for {players[0]?.name} to start.</p>
          )}
        </div>
      ) : (
        <>
          <div className="secret-card">
            <div>
              <span className="eyebrow">YOUR PRIVATE ROLE</span>
              <strong>
                {show
                  ? g.role === "imposter"
                    ? "You are the imposter"
                    : g.word
                  : "Keep this to yourself"}
              </strong>
              <small>
                {show
                  ? g.role === "imposter"
                    ? "Blend in. You don’t get the word."
                    : "You’re crew. Describe it without giving it away."
                  : "Reveal when nobody else can see your screen."}
              </small>
            </div>
            <button
              className="secondary"
              aria-label={show ? "Hide secret role" : "Reveal secret role"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {g.phase === "clues" && (
            <>
              <div className="party-phase" aria-live="polite">
                <span className="eyebrow">
                  ROUND {g.round} / {g.totalRounds} · TURN {g.turn + 1} /{" "}
                  {players.length}
                </span>
                <h2>
                  {active
                    ? "Your clue. Make it count."
                    : `${players[g.turn]?.name} is ${g.mode === "drawing" ? "drawing" : "giving a clue"}.`}
                </h2>
              </div>
              {g.mode === "words" && active && (
                <form
                  className="clue-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (dispatch("imposter-clue", { text: clue })) setClue("");
                  }}
                >
                  <label htmlFor="imposter-clue">
                    Describe the word without naming it
                  </label>
                  <div>
                    <input
                      id="imposter-clue"
                      required
                      maxLength={120}
                      value={clue}
                      onChange={(e) => setClue(e.target.value)}
                      disabled={!connected}
                      placeholder="A subtle clue…"
                    />
                    <button
                      className="primary"
                      disabled={!connected || !clue.trim()}
                    >
                      <Send size={17} />
                      Lock clue
                    </button>
                  </div>
                  <p className="muted">
                    Prefer voice? Say your clue on the call, then finish your
                    turn below.
                  </p>
                  <button
                    type="button"
                    className="secondary"
                    disabled={!connected}
                    onClick={() => dispatch("imposter-clue", { spoken: true })}
                  >
                    Clue given aloud · finish turn
                  </button>
                </form>
              )}
              {host && (
                <button
                  className="secondary skip-turn"
                  disabled={!connected || now - g.turnStartedAt < 60000}
                  onClick={() => dispatch("imposter-skip")}
                >
                  Skip stalled turn{" "}
                  {now - g.turnStartedAt < 60000
                    ? `(${Math.min(60, Math.ceil((60000 - now + g.turnStartedAt) / 1000))}s)`
                    : ""}
                </button>
              )}
            </>
          )}
          {g.phase === "voting" && (
            <div className="party-phase">
              <span className="eyebrow">ONE VOTE. NO SECOND CHANCE.</span>
              <h2>Who was bluffing?</h2>
              <p>
                Discuss using voice or room chat, then lock your vote.{" "}
                {g.voted.length} / {players.length} votes in.
              </p>
              {g.voted.includes(id) ? (
                <p className="vote-confirmed">
                  <ShieldCheck size={20} />
                  Your vote is locked. Waiting for the others.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    dispatch("imposter-vote", { playerId: vote });
                  }}
                >
                  <label htmlFor="suspect">Choose a suspect</label>
                  <select
                    id="suspect"
                    value={vote}
                    required
                    onChange={(e) => setVote(e.target.value)}
                  >
                    <option value="">Select a player</option>
                    {players
                      .filter((p) => p.id !== id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <button className="primary" disabled={!connected || !vote}>
                    Lock vote
                  </button>
                </form>
              )}
            </div>
          )}
          {g.phase === "finished" && (
            <div className="party-phase match-result" aria-live="polite">
              <span className="eyebrow">THE REVEAL</span>
              <h2>
                {g.winner === "crew"
                  ? "The crew caught the imposter."
                  : "The imposter got away."}
              </h2>
              <p>
                <b>{players.find((p) => p.id === g.imposterId)?.name}</b> was
                the imposter. The word was <b>{g.word}</b>.
              </p>
              <p>
                {g.caughtId
                  ? `The group voted for ${players.find((p) => p.id === g.caughtId)?.name}.`
                  : "The top vote was tied."}
              </p>
              <ul className="vote-results">
                {players.map((p) => (
                  <li key={p.id}>
                    {p.name}
                    <span>
                      voted for{" "}
                      {players.find((v) => v.id === g.votes?.[p.id])?.name}
                    </span>
                  </li>
                ))}
              </ul>
              {host ? (
                <button
                  className="primary"
                  disabled={!connected}
                  onClick={() => dispatch("imposter-start")}
                >
                  Deal a new match
                </button>
              ) : (
                <p>Waiting for the host to deal again.</p>
              )}
            </div>
          )}
          {g.mode === "drawing" && (
            <Drawing
              key={`${g.match}:${g.round}:${g.turn}:${g.phase}`}
              game={g}
              players={players}
              active={active}
              connected={connected}
              send={send}
            />
          )}
          <div className="clue-history">
            <h3>{g.mode === "words" ? "The clues" : "Drawing turns"}</h3>
            {g.clues.length === 0 ? (
              <p className="muted">The first clue is still under wraps.</p>
            ) : (
              <ol>
                {g.clues.map((c, i) => (
                  <li key={i}>
                    <span className="eyebrow">
                      R{c.round} ·{" "}
                      {players.find((p) => p.id === c.playerId)?.name}
                    </span>
                    <p>
                      {c.skipped
                        ? "Turn skipped by host"
                        : c.text || "Added one stroke to the shared drawing."}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </section>
  );
}
