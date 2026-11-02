import { useState } from "react";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  MessageCircle,
  RotateCcw,
  Users,
} from "lucide-react";

export type AnswerSnapshot = {
  match: number;
  round: number;
  totalRounds: number;
  prompt: string;
  answers: Record<string, { submitted: boolean; text?: string }>;
  revealed: boolean;
  finished: boolean;
  score: number;
  nextReady: string[];
  history: {
    prompt: string;
    matched: boolean;
    answers: { id: string; name: string; text: string }[];
  }[];
};
type Props = {
  game: AnswerSnapshot;
  id: string;
  players: { id: string; name: string }[];
  connected: boolean;
  send: (action: unknown) => boolean;
};

export function SameAnswer({ game, id, players, connected, send }: Props) {
  const [draft, setDraft] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const mine = game.answers[id];
  const partner = players.find((p) => p.id !== id);
  const voted = game.nextReady.includes(id);
  const last = game.history.at(-1);
  const action = (type: string, text?: string) =>
    send({
      type,
      match: game.match,
      round: game.round,
      ...(text !== undefined ? { text } : {}),
    });
  return (
    <section className="same-answer" aria-labelledby="answer-title">
      <div className="answer-progress">
        <span className="eyebrow">
          MATCH {game.match} / ROUND {game.round} OF {game.totalRounds}
        </span>
        <span className="shared-score">
          <Users size={15} /> {game.score} / {game.totalRounds} matched
        </span>
      </div>
      <div
        className="answer-dots"
        aria-label={`${game.history.length} of ${game.totalRounds} prompts completed`}
      >
        {Array.from({ length: game.totalRounds }, (_, i) => (
          <span
            key={i}
            className={
              game.history[i]
                ? game.history[i].matched
                  ? "matched"
                  : "missed"
                : i === game.round - 1
                  ? "current"
                  : ""
            }
          />
        ))}
      </div>
      {game.finished && showSummary ? (
        <>
          <div className="answer-symbol">
            <Users size={28} />
          </div>
          <div className="eyebrow">YOUR SHARED SCORE</div>
          <h2 id="answer-title">
            {game.score === 5
              ? "Perfectly in sync."
              : game.score >= 3
                ? "A pretty good connection."
                : "Different minds. Great company."}
          </h2>
          <div className="answer-final-score">
            {game.score}
            <span>/{game.totalRounds}</span>
          </div>
          <p>
            {game.score === 1
              ? "One matching answer"
              : `${game.score} matching answers`}{" "}
            across five prompts. Try a fresh set?
          </p>
          <button
            className="primary"
            disabled={!connected || voted}
            onClick={() => action("rematch")}
          >
            <RotateCcw size={17} />
            {voted ? "Waiting for your partner…" : "Play another match"}
          </button>
          <p className="answer-ready" role="status">
            {voted
              ? `Waiting for ${partner?.name} to confirm.`
              : game.nextReady.length
                ? `${partner?.name} is ready for another match.`
                : "Both players confirm before a new match begins."}
          </p>
        </>
      ) : game.revealed ? (
        <>
          <div className={`answer-symbol ${last?.matched ? "is-match" : ""}`}>
            {last?.matched ? <Check size={28} /> : <MessageCircle size={28} />}
          </div>
          <div className="eyebrow">
            {last?.matched ? "ONE POINT TOGETHER" : "NO MATCH THIS TIME"}
          </div>
          <h2 id="answer-title">
            {last?.matched
              ? "Same thought. Same answer."
              : "Two different takes."}
          </h2>
          <p className="answer-prompt-recap">{game.prompt}</p>
          <div className="answer-reveal" aria-live="polite">
            {players.map((p) => (
              <div key={p.id}>
                <small>
                  {p.name}
                  {p.id === id ? " (you)" : ""}
                </small>
                <strong>{game.answers[p.id]?.text}</strong>
              </div>
            ))}
          </div>
          <button
            className="primary"
            disabled={!game.finished && (!connected || voted)}
            onClick={() =>
              game.finished ? setShowSummary(true) : action("answer-next")
            }
          >
            {game.finished
              ? "See final score"
              : voted
                ? "Waiting for your partner…"
                : "Ready for next prompt"}
            <ArrowRight size={18} />
          </button>
          <p className="answer-ready" role="status">
            {game.finished
              ? "Your last answers stay here until you choose to view the final score."
              : voted
                ? `Waiting for ${partner?.name} to confirm.`
                : game.nextReady.length
                  ? `${partner?.name} is ready. Take a look, then continue.`
                  : "Both players confirm before the next prompt."}
          </p>
        </>
      ) : (
        <>
          <div className="answer-symbol">
            <MessageCircle size={28} />
          </div>
          <div className="eyebrow">
            {mine?.submitted
              ? "YOUR ANSWER IS LOCKED"
              : "THINK ALIKE. ANSWER ALONE."}
          </div>
          <h2 id="answer-title">{game.prompt}</h2>
          <p>
            {!partner
              ? "Invite a friend to start your five-round match."
              : mine?.submitted
                ? `Waiting for ${partner.name}. Your answer stays private until both lock in.`
                : "What would your partner say? Give one answer without discussing it."}
          </p>
          {mine?.submitted ? (
            <div className="answer-locked">
              <LockKeyhole size={18} />
              <div>
                <small>Your answer</small>
                <strong>{mine.text}</strong>
              </div>
            </div>
          ) : (
            <form
              className="answer-form"
              onSubmit={(e) => {
                e.preventDefault();
                action("answer-submit", draft);
              }}
            >
              <label htmlFor="same-answer-input">Your answer</label>
              <input
                id="same-answer-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                required
                maxLength={60}
                autoComplete="off"
                placeholder="Trust your first thought…"
                disabled={!connected || !partner}
              />
              <div className="answer-form-footer">
                <small>{draft.length}/60 characters</small>
                <button
                  className="primary"
                  disabled={!connected || !partner || !draft.trim()}
                >
                  <LockKeyhole size={16} /> Lock in answer
                </button>
              </div>
            </form>
          )}
          <p className="answer-ready" role="status">
            {partner
              ? game.answers[partner.id]?.submitted
                ? `${partner.name} has locked in an answer.`
                : `${partner.name} is thinking…`
              : "Waiting for a second player."}
          </p>
          <small className="answer-rule">
            Case and extra spaces don’t matter. Common English singular/plural
            forms, spelling variants and selected equivalents (like bike/bicycle)
            match. Other wording must match; typos aren’t guessed.
          </small>
        </>
      )}
      {game.history.length > 0 && (
        <details className="answer-history" open={game.finished && showSummary}>
          <summary>
            {game.finished ? "Your five prompts" : "Previous reveals"}{" "}
            <span>{game.history.length}</span>
          </summary>
          <ol>
            {game.history.map((round, i) => (
              <li key={i}>
                <div>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <h3>{round.prompt}</h3>
                  <b className={round.matched ? "history-match" : ""}>
                    {round.matched ? "Match +1" : "No match"}
                  </b>
                </div>
                <ul>
                  {round.answers.map((answer) => (
                    <li key={answer.id}>
                      <span>{answer.name}</span>
                      <strong>{answer.text}</strong>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
