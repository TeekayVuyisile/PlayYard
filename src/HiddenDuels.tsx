import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Gem,
  Heart,
  ShieldCheck,
  Skull,
  Sparkles,
} from "lucide-react";
import type {
  PrismColour,
  prismView,
  poisonView,
} from "../worker/hidden-duels";
export type PrismSnapshot = ReturnType<typeof prismView>;
export type PoisonSnapshot = ReturnType<typeof poisonView>;
type Player = { id: string; name: string };
type Props<T> = {
  game: T;
  id: string;
  players: Player[];
  connected: boolean;
  send: (a: unknown) => boolean;
};
const COLOURS: PrismColour[] = ["blue", "green", "red", "yellow"];
const LABELS = { blue: "B", green: "G", red: "R", yellow: "Y" };
export function Crystal({
  colour,
  small = false,
}: {
  colour: PrismColour;
  small?: boolean;
}) {
  return (
    <span
      className={`crystal crystal-${colour} ${small ? "crystal-small" : ""}`}
    >
      <svg viewBox="0 0 64 72" aria-hidden="true">
        <path d="M32 3L57 20 53 50 32 69 11 50 7 20Z" fill="currentColor" />
        <path d="M32 3L20 23 32 52 44 23Z" fill="#fff" opacity=".26" />
        <path
          d="M7 20L20 23 32 52 11 50M57 20L44 23 32 52 53 50M32 52V69"
          fill="none"
          stroke="#0b1524"
          strokeWidth="2"
          opacity=".55"
        />
      </svg>
      <b>{LABELS[colour]}</b>
      <span className="sr-only">{colour}</span>
    </span>
  );
}
function CrystalRow({ colours }: { colours: PrismColour[] }) {
  return (
    <span className="crystal-row">
      {colours.map((c) => (
        <Crystal key={c} colour={c} small />
      ))}
    </span>
  );
}
function Arrangement({
  value,
  onChange,
  disabled,
}: {
  value: PrismColour[];
  onChange: (v: PrismColour[]) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => setSelected(null), [disabled]);
  return (
    <div
      className="prism-arrangement"
      role="group"
      aria-label="Crystal arrangement. Select two positions to swap them."
    >
      {value.map((c, i) => (
        <button
          key={i}
          type="button"
          className={`crystal-slot ${selected === i ? "chosen" : ""}`}
          aria-label={`Position ${i + 1}: ${c} crystal${selected === i ? ", selected" : ""}`}
          aria-pressed={selected === i}
          disabled={disabled}
          onClick={() => {
            if (selected === null) {
              setSelected(i);
              return;
            }
            const next = [...value];
            [next[i], next[selected]] = [next[selected], next[i]];
            onChange(next);
            setSelected(null);
          }}
        >
          <span className="eyebrow">0{i + 1}</span>
          <Crystal colour={c} />
          <span className="crystal-name">{c}</span>
        </button>
      ))}
    </div>
  );
}
function Rematch({
  game,
  id,
  connected,
  send,
}: {
  game: { match: number; rematchReady: string[] };
  id: string;
  connected: boolean;
  send: (a: unknown) => boolean;
}) {
  return (
    <button
      className="primary"
      disabled={!connected || game.rematchReady.includes(id)}
      onClick={() => send({ type: "rematch", match: game.match })}
    >
      {game.rematchReady.includes(id)
        ? "Waiting for your friend…"
        : "Play again · switch starter"}
    </button>
  );
}
export function PrismCode({
  game: g,
  id,
  players,
  connected,
  send,
}: Props<PrismSnapshot>) {
  const [colours, setColours] = useState<PrismColour[]>([...COLOURS]),
    [showSecret, setShowSecret] = useState(false);
  useEffect(() => {
    setColours([...COLOURS]);
    setShowSecret(false);
  }, [g.match, g.phase]);
  const locked = g.locked.includes(id),
    myTurn = g.phase === "playing" && players[g.turn]?.id === id,
    opponent = players.find((p) => p.id !== id),
    finished = g.phase === "finished";
  return (
    <section className="party-game prism-game">
      <div className="game-kicker">
        <Gem size={19} />
        Prism Code · Match {g.match}
      </div>
      <div className="duel-status" aria-live="polite">
        <span className="eyebrow">
          {g.phase === "setup"
            ? "SET THE SECRET"
            : finished
              ? "CODE CRACKED"
              : "FOUR COLOURS. ONE HIDDEN ORDER."}
        </span>
        <h2>
          {finished
            ? g.winner === id
              ? "You cracked the code."
              : `${players.find((p) => p.id === g.winner)?.name} cracked your code.`
            : g.phase === "setup"
              ? locked
                ? "Your secret is sealed."
                : "Set a code worth cracking."
              : myTurn
                ? "Your turn to decode."
                : `${players[g.turn]?.name} is decoding.`}
        </h2>
        <p>
          {g.phase === "setup"
            ? "Arrange all four crystals into a secret order for your friend to solve."
            : finished
              ? "The first exact arrangement wins."
              : "Guess your friend’s order. You’ll learn how many positions match, but not which ones."}
        </p>
      </div>
      {g.myCode && !finished && (
        <div className="secret-card">
          <div>
            <span className="eyebrow">YOUR SECRET CODE</span>
            {showSecret ? (
              <CrystalRow colours={g.myCode} />
            ) : (
              <p>Hidden from your friend.</p>
            )}
          </div>
          <button
            className="secondary"
            aria-label={
              showSecret ? "Hide secret code" : "Reveal my secret code"
            }
            onClick={() => setShowSecret(!showSecret)}
          >
            {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      )}
      {!finished && (g.phase === "playing" || !locked) && (
        <div className="prism-controls">
          <Arrangement
            value={colours}
            onChange={setColours}
            disabled={!connected || (g.phase === "playing" && !myTurn)}
          />
          <p className="muted">
            Select two crystals to swap positions. B = blue, G = green, R = red,
            Y = yellow. Each colour appears once.
          </p>
          <button
            className="primary"
            disabled={!connected || (g.phase === "playing" && !myTurn)}
            onClick={() =>
              send({
                type: g.phase === "setup" ? "prism-lock" : "prism-guess",
                match: g.match,
                step: g.step,
                colours,
              })
            }
          >
            {g.phase === "setup" ? (
              <>
                <ShieldCheck size={17} />
                Seal secret code
              </>
            ) : (
              <>
                <Gem size={17} />
                Submit arrangement
              </>
            )}
          </button>
        </div>
      )}
      {g.phase === "setup" && locked && (
        <p className="muted">
          {opponent
            ? `${opponent.name} is choosing their secret.`
            : "Share the room code to invite a friend."}
        </p>
      )}
      {finished && (
        <div className="duel-reveal">
          {players.map((p) => (
            <div key={p.id}>
              <span>{p.name}’s secret</span>
              <CrystalRow colours={g.revealedCodes![p.id]} />
            </div>
          ))}
          <Rematch game={g} id={id} connected={connected} send={send} />
        </div>
      )}
      <div className="clue-history">
        <h3>The decoding log</h3>
        {!g.guesses.length ? (
          <p className="muted">Every arrangement narrows the possibilities.</p>
        ) : (
          <ol className="prism-log">
            {g.guesses.map((attempt, i) => (
              <li key={i}>
                <span>
                  {players.find((p) => p.id === attempt.playerId)?.name}
                </span>
                <CrystalRow colours={attempt.colours} />
                <strong>{attempt.correct} / 4 correct</strong>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
function Snack({ poison, safe }: { poison?: boolean; safe?: boolean }) {
  return (
    <span
      className={`moon-snack ${poison ? "snack-poison" : safe ? "snack-safe" : ""}`}
    >
      {poison ? (
        <Skull size={25} />
      ) : safe ? (
        <Sparkles size={25} />
      ) : (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path
            d="M49 14c-13 2-22 14-18 26 2 6 6 10 12 12C27 60 10 48 12 32 13 15 33 6 49 14Z"
            fill="currentColor"
          />
          <path
            d="M18 33c1-8 7-14 14-16"
            stroke="#fff"
            opacity=".35"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      )}
    </span>
  );
}
export function AvoidPoison({
  game: g,
  id,
  players,
  connected,
  send,
}: Props<PoisonSnapshot>) {
  const [traps, setTraps] = useState<number[]>([]),
    [showTraps, setShowTraps] = useState(false);
  useEffect(() => {
    setTraps([]);
    setShowTraps(false);
  }, [g.match, g.phase]);
  const locked = g.locked.includes(id),
    setup = g.phase === "setup",
    finished = g.phase === "finished",
    myTurn = g.phase === "playing" && players[g.turn]?.id === id,
    opponent = players.find((p) => p.id !== id),
    last = g.picks.at(-1);
  const lives = (playerId: string) =>
    3 - g.picks.filter((p) => p.playerId === playerId && p.poison).length;
  return (
    <section className="party-game poison-game">
      <div className="game-kicker">
        <Skull size={19} />
        Avoid the Poison · Match {g.match}
      </div>
      <div className="duel-status" aria-live="polite">
        <span className="eyebrow">
          {setup
            ? "SET THE TRAP"
            : finished
              ? "THE LAST BITE"
              : "TEN BITES. THREE LIVES."}
        </span>
        <h2>
          {finished
            ? g.winner === id
              ? "You survived the snack table."
              : `${players.find((p) => p.id === g.winner)?.name} survived.`
            : setup
              ? locked
                ? "Your traps are sealed."
                : "Give their tray a dark secret."
              : myTurn
                ? "Pick a bite. Trust your instinct."
                : `${players[g.turn]?.name} is choosing a bite.`}
        </h2>
        <p>
          {setup
            ? "Secretly mark three tokens on your friend’s tray. They’ll trap three on yours."
            : finished
              ? "All traps are revealed below."
              : "Pick from your own tray on your turn. Poison costs one life. Lose all three and you lose the match."}
        </p>
      </div>
      <div className="duel-lives">
        {players.map((p) => (
          <div key={p.id}>
            <strong>
              {p.name}
              {p.id === id ? " · You" : ""}
            </strong>
            <span aria-label={`${lives(p.id)} of 3 lives`}>
              {[0, 1, 2].map((n) => (
                <Heart
                  key={n}
                  size={19}
                  aria-hidden="true"
                  fill={n < lives(p.id) ? "currentColor" : "none"}
                  className={n < lives(p.id) ? "life-full" : "life-lost"}
                />
              ))}
              <b>{lives(p.id)} / 3</b>
            </span>
          </div>
        ))}
      </div>
      {last && (
        <p
          className={`bite-result ${last.poison ? "bite-poison" : "bite-safe"}`}
          role="status"
        >
          {last.poison ? <Skull size={19} /> : <ShieldCheck size={19} />}{" "}
          {players.find((p) => p.id === last.playerId)?.name} picked token{" "}
          {last.slot + 1}: {last.poison ? "poison · one life lost" : "safe"}
        </p>
      )}
      {setup ? (
        <>
          {!locked ? (
            <>
              <h3>
                {opponent?.name || "Your friend"}’s tray · {traps.length} / 3
                traps
              </h3>
              <div
                className="snack-tray"
                role="group"
                aria-label="Select three traps for your opponent’s tray"
              >
                {Array.from({ length: 10 }, (_, slot) => (
                  <button
                    key={slot}
                    className={`snack-token ${traps.includes(slot) ? "trapped" : ""}`}
                    aria-label={`Token ${slot + 1}${traps.includes(slot) ? ", trapped" : ""}`}
                    aria-pressed={traps.includes(slot)}
                    disabled={!connected}
                    onClick={() =>
                      setTraps(
                        traps.includes(slot)
                          ? traps.filter((t) => t !== slot)
                          : traps.length < 3
                            ? [...traps, slot]
                            : traps,
                      )
                    }
                  >
                    <Snack poison={traps.includes(slot)} />
                    <span>{String(slot + 1).padStart(2, "0")}</span>
                  </button>
                ))}
              </div>
              <p className="muted">
                Select a token to mark or unmark it. Your friend won’t see these
                choices.
              </p>
              <button
                className="primary"
                disabled={!connected || traps.length !== 3}
                onClick={() =>
                  send({ type: "poison-lock", match: g.match, slots: traps })
                }
              >
                <ShieldCheck size={17} />
                Seal three traps
              </button>
            </>
          ) : (
            <p className="muted">
              {opponent
                ? `Waiting for ${opponent.name} to seal their traps.`
                : "Invite a friend using the room code."}
            </p>
          )}
        </>
      ) : (
        <>
          <h3>Your tray</h3>
          <div className="snack-tray" role="group" aria-label="Your snack tray">
            {Array.from({ length: 10 }, (_, slot) => {
              const pick = g.picks.find(
                  (p) => p.playerId === id && p.slot === slot,
                ),
                revealed =
                  finished &&
                  opponent &&
                  g.revealedTraps?.[opponent.id]?.includes(slot);
              return (
                <button
                  key={slot}
                  className={`snack-token ${pick ? "eaten" : ""} ${pick?.poison || revealed ? "trapped" : ""}`}
                  aria-label={`Token ${slot + 1}: ${pick ? (pick.poison ? "eaten, poison" : "eaten, safe") : finished ? (revealed ? "uneaten poison" : "uneaten safe") : "unpicked"}`}
                  disabled={!connected || !myTurn || !!pick || finished}
                  onClick={() =>
                    send({
                      type: "poison-pick",
                      match: g.match,
                      step: g.step,
                      slot,
                    })
                  }
                >
                  <Snack
                    poison={pick?.poison || !!revealed}
                    safe={pick ? !pick.poison : finished && !revealed}
                  />
                  <span>
                    {String(slot + 1).padStart(2, "0")}{" "}
                    {pick ? "Eaten" : finished ? "Revealed" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          {finished ? (
            <>
              <h3>{opponent?.name}’s tray</h3>
              <div className="snack-tray tray-reveal">
                {Array.from({ length: 10 }, (_, slot) => {
                  const poison = g.myTraps?.includes(slot),
                    eaten = g.picks.some(
                      (p) => p.playerId === opponent?.id && p.slot === slot,
                    );
                  return (
                    <div
                      key={slot}
                      className={`snack-token ${poison ? "trapped" : ""}`}
                      aria-label={`Token ${slot + 1}, ${poison ? "poison" : "safe"}, ${eaten ? "eaten" : "uneaten"}`}
                    >
                      <Snack poison={poison} safe={!poison} />
                      <span>
                        {String(slot + 1).padStart(2, "0")}{" "}
                        {eaten ? "Eaten" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Rematch game={g} id={id} connected={connected} send={send} />
            </>
          ) : (
            <div className="secret-card">
              <div>
                <span className="eyebrow">TRAPS YOU SET ON THEIR TRAY</span>
                <p>
                  {showTraps
                    ? g
                        .myTraps!.map((n) => String(n + 1).padStart(2, "0"))
                        .join(" · ")
                    : "Your friend can’t see these."}
                </p>
              </div>
              <button
                className="secondary"
                aria-label={showTraps ? "Hide my traps" : "Reveal traps I set"}
                onClick={() => setShowTraps(!showTraps)}
              >
                {showTraps ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}
        </>
      )}
      <div className="clue-history">
        <h3>The tasting log</h3>
        {!g.picks.length ? (
          <p className="muted">The first bite is still waiting.</p>
        ) : (
          <ol>
            {g.picks.map((p, i) => (
              <li key={i}>
                {players.find((player) => player.id === p.playerId)?.name} ·
                Token {p.slot + 1}
                <p>{p.poison ? "Poison · one life lost" : "Safe"}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
