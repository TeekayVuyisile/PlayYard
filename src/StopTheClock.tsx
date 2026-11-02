import { useClockShortcut } from "./useClockShortcut";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  EyeOff,
  Flag,
  Play,
  RotateCcw,
  Square,
  Timer,
} from "lucide-react";

export type TimerSnapshot = {
  targetMs: number;
  hidden: boolean;
  round: number;
  finished: boolean;
  draw?: boolean;
  attempts: Record<
    string,
    { started: boolean; submitted: boolean; elapsedMs?: number }
  >;
};
type Props = {
  timer: TimerSnapshot;
  id: string;
  players: { id: string; name: string }[];
  winner?: string;
  connected: boolean;
  send: (action: unknown) => boolean;
};
const seconds = (ms: number) => (ms / 1000).toFixed(3);

export function StopTheClock({
  timer,
  id,
  players,
  winner,
  connected,
  send,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const start = useRef<number | null>(null);
  const frame = useRef(0);
  const roundRef = useRef(timer.round);
  const attempt = timer.attempts[id];
  const opponent = players.find((p) => p.id !== id);

  useEffect(() => {
    if (roundRef.current !== timer.round) {
      roundRef.current = timer.round;
      cancelAnimationFrame(frame.current);
      start.current = null;
      setRunning(false);
      setPending(null);
      setElapsed(0);
    }
  }, [timer.round]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const value = Math.min(
        60000,
        Math.round(performance.now() - start.current!),
      );
      setElapsed(value);
      if (value >= 60000) {
        start.current = null;
        setRunning(false);
        setPending(value);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [running]);

  // Retry a captured stop after a transient disconnection; never restart the
  // monotonic clock from a server timestamp or a refreshed page.
  useEffect(() => {
    if (
      pending !== null &&
      connected &&
      attempt?.started &&
      !attempt.submitted
    ) {
      const retry = setTimeout(
        () =>
          send({ type: "timer-stop", round: timer.round, elapsedMs: pending }),
        300,
      );
      return () => clearTimeout(retry);
    }
  }, [pending, connected, attempt?.started, attempt?.submitted, timer.round]);

  function begin() {
    if (
      start.current !== null ||
      running ||
      pending !== null ||
      attempt?.started ||
      !opponent ||
      !connected ||
      timer.finished
    )
      return false;
    if (!send({ type: "timer-start", round: timer.round })) return false;
    start.current = performance.now();
    setElapsed(0);
    setPending(null);
    setRunning(true);
    return true;
  }
  function stop() {
    if (start.current === null) return false;
    const value = Math.min(
      60000,
      Math.round(performance.now() - start.current),
    );
    cancelAnimationFrame(frame.current);
    start.current = null;
    setElapsed(value);
    setRunning(false);
    setPending(value);
    return true;
  }
  function reset() {
    if (send({ type: "timer-reset", round: timer.round })) {
      cancelAnimationFrame(frame.current);
      start.current = null;
      setRunning(false);
      setPending(null);
      setElapsed(0);
    }
  }

  useClockShortcut(
    !timer.finished &&
      (running ||
        (!!opponent &&
          connected &&
          !attempt?.started &&
          !attempt?.submitted &&
          pending === null)),
    () => (start.current !== null ? stop() : Boolean(begin())),
  );

  if (timer.finished)
    return (
      <section
        className="clock-game clock-results"
        aria-labelledby="clock-result-title"
      >
        <div className="eyebrow">
          <Flag size={15} /> ROUND {timer.round} COMPLETE
        </div>
        <h2 id="clock-result-title">
          {timer.draw
            ? "It's a draw!"
            : winner === id
              ? "Right on time. You win!"
              : `${players.find((p) => p.id === winner)?.name} wins!`}
        </h2>
        <p>
          Target: <b>{seconds(timer.targetMs)}s</b>. Smallest difference wins.
        </p>
        <ol className="clock-scoreboard">
          {[...players]
            .sort(
              (a, b) =>
                Math.abs(timer.attempts[a.id].elapsedMs! - timer.targetMs) -
                Math.abs(timer.attempts[b.id].elapsedMs! - timer.targetMs),
            )
            .map((p) => {
              const value = timer.attempts[p.id].elapsedMs!;
              const delta = value - timer.targetMs;
              return (
                <li
                  className={
                    p.id === winner || timer.draw ? "winning-time" : ""
                  }
                  key={p.id}
                >
                  <span>
                    {p.name}
                    {p.id === id ? " (you)" : ""}
                  </span>
                  <strong>
                    {seconds(value)}
                    <small>s</small>
                  </strong>
                  <span>
                    {delta === 0
                      ? "Exactly on target"
                      : `${seconds(Math.abs(delta))}s ${delta > 0 ? "late" : "early"}`}
                  </span>
                </li>
              );
            })}
        </ol>
        <button
          className="primary"
          disabled={!connected}
          onClick={() => send({ type: "rematch", round: timer.round })}
        >
          Another round <ArrowRight size={18} />
        </button>
      </section>
    );

  return (
    <section className="clock-game" aria-labelledby="clock-title">
      <div className="eyebrow">
        ROUND {timer.round} /{" "}
        {timer.hidden ? "TRUST YOUR INSTINCT" : "MAKE EVERY MILLISECOND COUNT"}
      </div>
      <h2 id="clock-title">
        Stop at <span>{seconds(timer.targetMs)}s</span>
      </h2>
      <p>
        {!opponent
          ? "Invite a friend to put your timing to the test."
          : attempt?.submitted
            ? `Your result is locked. Waiting for ${opponent.name}.`
            : "Start when you’re ready. Closest to the target wins."}
      </p>
      <div
        className={`clock-display ${running ? "clock-running" : ""}`}
        aria-label={
          timer.hidden && running
            ? "Timer hidden while running"
            : `Elapsed time ${seconds(attempt?.elapsedMs ?? elapsed)} seconds`
        }
      >
        {timer.hidden && running ? (
          <>
            <EyeOff size={28} />
            <span className="clock-hidden">Feel the seconds.</span>
          </>
        ) : (
          <>
            <span>{seconds(attempt?.elapsedMs ?? elapsed)}</span>
            <small>SECONDS</small>
          </>
        )}
      </div>
      {attempt?.submitted ? (
        <div className="clock-status" role="status">
          <Flag size={16} /> Submitted. Both results reveal together.
        </div>
      ) : running ? (
        <button
          className="primary clock-action"
          data-clock-shortcut
          onClick={stop}
        >
          <Square size={20} /> Stop the clock
        </button>
      ) : pending !== null ? (
        <div className="clock-status" role="status">
          {connected
            ? "Submitting your time…"
            : "Time captured. Reconnecting to submit…"}
        </div>
      ) : attempt?.started ? (
        <div className="clock-recovery">
          <p>This attempt was interrupted. Reset it to start a fresh timer.</p>
          <button className="secondary" disabled={!connected} onClick={reset}>
            <RotateCcw size={17} /> Reset attempt
          </button>
        </div>
      ) : (
        <button
          className="primary clock-action"
          disabled={!opponent || !connected}
          onClick={begin}
        >
          <Play size={20} /> Start my timer
        </button>
      )}
      {pending !== null && !attempt?.submitted && attempt?.started && (
        <button className="clock-reset" disabled={!connected} onClick={reset}>
          Timer not submitting? Reset attempt
        </button>
      )}
      <div className="clock-footnotes">
        <span>
          <Timer size={15} />{" "}
          {timer.hidden ? "Timer hidden while running" : "Timer stays visible"}
        </span>
        <span>
          {opponent
            ? timer.attempts[opponent.id]?.submitted
              ? `${opponent.name} has finished`
              : timer.attempts[opponent.id]?.started
                ? `${opponent.name} is timing…`
                : `${opponent.name} hasn't started`
            : "Waiting for a second player"}
        </span>
      </div>
      <p className="clock-keyboard-hint">
        <kbd>Space</kbd> to start or stop. Typing in chat won’t trigger the
        clock.
      </p>
      <small className="clock-note">
        Measured on your device. Casual play, with a 60-second attempt limit.
      </small>
    </section>
  );
}
