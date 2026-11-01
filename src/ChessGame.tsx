import { useEffect, useState } from "react";
import { Crown, Flag, Handshake } from "lucide-react";
import type { chessView } from "../worker/chess";
export type ChessSnapshot = ReturnType<typeof chessView>;
function Piece({ type, white }: { type: string; white: boolean }) {
  const common = {
    fill: white ? "#f5f1df" : "#243246",
    stroke: white ? "#485568" : "#c6d1dc",
    strokeWidth: 2.5,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="chess-piece">
      <g {...common}>
        {type === "p" ? (
          <>
            <circle cx="32" cy="18" r="9" />
            <path d="M26 27h12l-3 12 9 10H20l9-10z" />
          </>
        ) : type === "r" ? (
          <path d="M17 10h8v9h7v-9h7v9h8v-9h5v18l-9 5 2 16H19l2-16-9-5V10z" />
        ) : type === "n" ? (
          <>
            <path d="M20 49l3-14-9-2 4-11L36 9l2 8c14 5 14 18 10 32z" />
            <circle
              cx="30"
              cy="24"
              r="2"
              fill={white ? "#243246" : "#f5f1df"}
            />
          </>
        ) : type === "b" ? (
          <>
            <path d="M32 8C12 24 19 32 28 35l-9 14h26l-9-14c9-3 16-11-4-27z" />
            <path d="M27 16l9 10" fill="none" />
          </>
        ) : type === "q" ? (
          <>
            <path d="M15 19l9 9 8-15 8 15 9-9-6 30H21z" />
            <circle cx="14" cy="16" r="4" />
            <circle cx="32" cy="10" r="4" />
            <circle cx="50" cy="16" r="4" />
          </>
        ) : (
          <>
            <path d="M25 8h14v6h-4v7h-6v-7h-4z" />
            <path d="M19 30c0-10 26-10 26 0l-7 9 6 10H20l6-10z" />
          </>
        )}
        <path d="M18 49h28l4 7H14z" />
      </g>
    </svg>
  );
}
const NAMES: Record<string, string> = {
  p: "pawn",
  r: "rook",
  n: "knight",
  b: "bishop",
  q: "queen",
  k: "king",
};
export function ChessGame({
  game: g,
  id,
  players,
  connected,
  send,
}: {
  game: ChessSnapshot;
  id: string;
  players: { id: string; name: string }[];
  connected: boolean;
  send: (a: unknown) => boolean;
}) {
  const [selected, setSelected] = useState(""),
    [promotion, setPromotion] = useState<{ from: string; to: string } | null>(
      null,
    ),
    [confirmResign, setConfirmResign] = useState(false);
  useEffect(() => {
    setSelected("");
    setPromotion(null);
    setConfirmResign(false);
  }, [g.moves.length, g.match, g.result]);
  const white = g.whiteId === id,
    myTurn = !g.result && players.length === 2 && (g.turn === "w") === white;
  const pieces: Record<string, string> = {};
  g.fen
    .split(" ")[0]
    .split("/")
    .forEach((row, r) => {
      let f = 0;
      for (const p of row) {
        if (/\d/.test(p)) f += Number(p);
        else {
          pieces["abcdefgh"[f] + (8 - r)] = p;
          f++;
        }
      }
    });
  const files = white ? "abcdefgh" : "hgfedcba",
    ranks = white ? "87654321" : "12345678";
  const dispatch = (type: string, extra = {}) =>
    send({ type, match: g.match, ply: g.moves.length, ...extra });
  function squareClick(square: string) {
    if (!myTurn || !connected) return;
    const options = g.legalMoves.filter(
      (m) => m.from === selected && m.to === square,
    );
    if (options.length) {
      if (options.some((m) => m.promotion)) {
        setPromotion({ from: selected, to: square });
        return;
      }
      dispatch("chess-move", { from: selected, to: square });
      return;
    }
    setSelected(g.legalMoves.some((m) => m.from === square) ? square : "");
  }
  return (
    <section className="party-game chess-game">
      <div className="game-kicker">
        <Crown size={19} />
        The strategy table · Match {g.match}
      </div>
      <div className="chess-status" aria-live="polite">
        <h2>
          {g.result
            ? g.winner
              ? `${players.find((p) => p.id === g.winner)?.name} wins.`
              : "A drawn game."
            : players.length < 2
              ? "Your opponent’s seat is open."
              : myTurn
                ? "Your move."
                : `${players.find((p) => (p.id === g.whiteId) === (g.turn === "w"))?.name} to move.`}
        </h2>
        <p>
          {g.result ||
            `${white ? "You play white" : "You play black"}${g.check ? " · Check!" : ""} · No clock`}
        </p>
      </div>
      <div
        className="chess-board"
        role="group"
        aria-label="Chess board. Select a piece, then a highlighted destination."
      >
        {[...ranks].flatMap((rank) =>
          [...files].map((file) => {
            const square = file + rank,
              p = pieces[square],
              isWhite = !!p && p === p.toUpperCase(),
              legal = g.legalMoves.some(
                (m) => m.from === selected && m.to === square,
              ),
              last = g.moves.at(-1);
            return (
              <button
                key={square}
                type="button"
                className={`chess-square ${(file.charCodeAt(0) + Number(rank)) % 2 ? "light" : "dark"} ${selected === square ? "selected" : ""} ${last && (last.from === square || last.to === square) ? "last-move" : ""}`}
                aria-label={`${square}${p ? ` ${isWhite ? "white" : "black"} ${NAMES[p.toLowerCase()]}` : " empty"}${legal ? ", legal destination" : ""}`}
                aria-pressed={selected === square}
                aria-disabled={!myTurn || !connected}
                onClick={() => squareClick(square)}
              >
                {p && <Piece type={p.toLowerCase()} white={isWhite} />}
                <span className="square-coordinate">{square}</span>
                {legal && <span className="legal-square" />}
              </button>
            );
          }),
        )}
      </div>
      <p className="muted chess-help">
        {selected
          ? `${selected} selected. Choose a marked destination.`
          : "Select a piece, then its destination. Castling: move the king two squares."}
      </p>
      {promotion && (
        <div
          className="promotion-choice"
          role="group"
          aria-label="Choose promotion piece"
        >
          <p>Promote your pawn</p>
          {["q", "r", "b", "n"].map((p) => (
            <button
              key={p}
              className="secondary"
              disabled={!connected}
              onClick={() =>
                dispatch("chess-move", { ...promotion, promotion: p })
              }
            >
              {NAMES[p]}
            </button>
          ))}
          <button className="secondary" onClick={() => setPromotion(null)}>
            Cancel
          </button>
        </div>
      )}
      {g.result ? (
        <div className="chess-actions">
          <button
            className="primary"
            disabled={!connected || g.rematchReady.includes(id)}
            onClick={() => dispatch("rematch")}
          >
            {g.rematchReady.includes(id)
              ? "Waiting for opponent…"
              : "Rematch · switch colours"}
          </button>
        </div>
      ) : (
        players.length === 2 && (
          <div className="chess-actions">
            {g.drawOffer ? (
              g.drawOffer === id ? (
                <p>
                  Draw offered. Your opponent can accept or continue playing.
                </p>
              ) : (
                <>
                  <p>Your opponent offers a draw.</p>
                  <button
                    className="primary"
                    disabled={!connected}
                    onClick={() => dispatch("chess-accept-draw")}
                  >
                    Accept draw
                  </button>
                  <button
                    className="secondary"
                    disabled={!connected}
                    onClick={() => dispatch("chess-decline-draw")}
                  >
                    Decline
                  </button>
                </>
              )
            ) : (
              <button
                className="secondary"
                disabled={!connected}
                onClick={() => dispatch("chess-offer-draw")}
              >
                <Handshake size={16} />
                Offer draw
              </button>
            )}
            {confirmResign ? (
              <>
                <span>Resign this match?</span>
                <button
                  className="secondary"
                  disabled={!connected}
                  onClick={() => dispatch("chess-resign")}
                >
                  Confirm resignation
                </button>
                <button
                  className="secondary"
                  onClick={() => setConfirmResign(false)}
                >
                  Keep playing
                </button>
              </>
            ) : (
              <button
                className="secondary"
                onClick={() => setConfirmResign(true)}
              >
                <Flag size={16} />
                Resign
              </button>
            )}
          </div>
        )
      )}
      <details className="chess-history">
        <summary>Move history ({g.history.length} half-moves)</summary>
        <ol>
          {g.history.map((m, i) => (
            <li key={i}>
              {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : "… "}
              {m}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
