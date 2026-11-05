import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  EyeOff,
  Play,
  RotateCcw,
  Square,
  Timer,
} from "lucide-react";
import { useClockShortcut } from "./useClockShortcut";
import { GameRules } from "./GameRules";
const seconds = (ms: number) => (ms / 1000).toFixed(3);
type Attempt = {
  number: number;
  elapsed: number;
  target: number;
  hidden: boolean;
};
export function ClockPractice({
  active = true,
  onCreateRoom,
}: {
  active?: boolean;
  onCreateRoom: () => void;
}) {
  const [target, setTarget] = useState("10"),
    [hidden, setHidden] = useState(false),
    [running, setRunning] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [history, setHistory] = useState<Attempt[]>([]);
  const attemptNumber = useRef(0);
  const start = useRef<number | null>(null),
    frame = useRef(0),
    settings = useRef({ target: 10000, hidden: false });
  const targetMs = Math.round(Number(target) * 1000),
    valid =
      target.trim() !== "" &&
      Number.isFinite(targetMs) &&
      Number(target) >= 1 &&
      Number(target) <= 30;
  function finish() {
    if (start.current === null) return false;
    const value = Math.min(
      60000,
      Math.round(performance.now() - start.current),
    );
    start.current = null;
    cancelAnimationFrame(frame.current);
    setElapsed(value);
    setRunning(false);
    const attempt = {
      number: ++attemptNumber.current,
      elapsed: value,
      ...settings.current,
    };
    setHistory((previous) => [attempt, ...previous].slice(0, 10));
    return true;
  }
  function begin() {
    if (!valid || start.current !== null) return false;
    settings.current = { target: targetMs, hidden };
    start.current = performance.now();
    setElapsed(0);
    setRunning(true);
    return true;
  }
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (start.current === null) return;
      const value = Math.min(
        60000,
        Math.round(performance.now() - start.current),
      );
      setElapsed(value);
      if (value === 60000) {
        finish();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [running]);
  useClockShortcut(active && (running || valid), () =>
    start.current !== null ? finish() : begin(),
  );
  const last = history[0],
    best = history.length
      ? Math.min(...history.map((a) => Math.abs(a.elapsed - a.target)))
      : null;
  return (
    <section className="practice-page" aria-labelledby="practice-title">
      <div className="practice-heading">
        <span className="eyebrow">THE NIGHT CIRCUIT / SOLO PRACTICE</span>
        <h1 id="practice-title">Find your timing.</h1>
        <p>No room. No opponent. Just you and the clock.</p>
      </div>
      <GameRules game="timer" mode="practice" />
      <div className="practice-layout">
        <div className="board clock-game practice-clock">
          <div className="eyebrow">
            <Timer size={16} />
            STOP THE CLOCK · PRACTICE
          </div>
          <h2>
            Stop at{" "}
            <span>
              {valid
                ? seconds(running ? settings.current.target : targetMs)
                : "—"}
              s
            </span>
          </h2>
          <div
            className={`clock-display ${running ? "clock-running" : ""}`}
            aria-label={
              hidden && running
                ? "Timer hidden while running"
                : `Elapsed time ${seconds(elapsed)} seconds`
            }
          >
            {hidden && running ? (
              <>
                <EyeOff size={28} />
                <span className="clock-hidden">Feel the seconds.</span>
              </>
            ) : (
              <>
                <span>{seconds(elapsed)}</span>
                <small>SECONDS</small>
              </>
            )}
          </div>
          <button
            className="primary clock-action"
            data-clock-shortcut
            disabled={!active || (!running && !valid)}
            onClick={() => (running ? finish() : begin())}
          >
            {running ? (
              <>
                <Square size={20} />
                Stop practice timer
              </>
            ) : (
              <>
                <Play size={20} />
                {last ? "Try again" : "Start practice timer"}
              </>
            )}
          </button>
          <p className="clock-keyboard-hint">
            <kbd>Space</kbd> to start or stop · Hold once, trigger once.
          </p>
          {last && !running && (
            <div className="practice-feedback" role="status">
              <span className="eyebrow">YOUR LAST ATTEMPT</span>
              <h3>
                {Math.abs(last.elapsed - last.target) === 0
                  ? "Exactly on target."
                  : `${seconds(Math.abs(last.elapsed - last.target))}s ${last.elapsed > last.target ? "late" : "early"}`}
              </h3>
              <p>
                {seconds(last.elapsed)}s against a {seconds(last.target)}s
                target{last.hidden ? " · Hidden timer" : ""}.
              </p>
            </div>
          )}
          <small className="clock-note">
            Practice stays on this page and isn’t saved to a profile. Each
            attempt ends after 60 seconds.
          </small>
        </div>
        <aside className="practice-settings">
          <h2>Set your challenge</h2>
          <label htmlFor="practice-target">Target time (seconds)</label>
          <input
            id="practice-target"
            type="number"
            min="1"
            max="30"
            step="0.001"
            inputMode="decimal"
            value={target}
            disabled={running}
            onChange={(e) => setTarget(e.target.value)}
          />
          <small className="muted">Choose between 1 and 30 seconds.</small>
          <label className="checkbox-label" htmlFor="practice-hidden">
            <input
              id="practice-hidden"
              type="checkbox"
              checked={hidden}
              disabled={running}
              onChange={(e) => setHidden(e.target.checked)}
            />
            <span>
              Hide the running timer
              <small>Count in your head for a tougher challenge.</small>
            </span>
          </label>
          <p>
            Space works when you’re playing, and leaves inputs and other
            controls alone.
          </p>
          <button
            className="secondary"
            disabled={running}
            onClick={onCreateRoom}
          >
            Play with friends <ArrowRight size={17} />
          </button>
        </aside>
      </div>
      <section className="practice-history">
        <div className="section-heading">
          <h2>Recent attempts</h2>
          {best !== null && (
            <span className="muted">
              Closest of these attempts: {seconds(best)}s away
            </span>
          )}
        </div>
        {history.length ? (
          <>
            <ol>
              {history.map((a, i) => (
                <li key={a.number}>
                  <span>{i === 0 ? "Latest" : `Attempt ${a.number}`}</span>
                  <strong>{seconds(a.elapsed)}s</strong>
                  <span>Target {seconds(a.target)}s</span>
                  <span>
                    {a.elapsed === a.target
                      ? "On target"
                      : `${seconds(Math.abs(a.elapsed - a.target))}s ${a.elapsed > a.target ? "late" : "early"}`}
                    {a.hidden ? " · Hidden" : ""}
                  </span>
                </li>
              ))}
            </ol>
            <button
              className="secondary"
              disabled={running}
              onClick={() => {
                setHistory([]);
                setElapsed(0);
                attemptNumber.current = 0;
              }}
            >
              <RotateCcw size={16} />
              Clear practice session
            </button>
          </>
        ) : (
          <p className="muted">
            Your last ten attempts will appear here. Start whenever you’re
            ready.
          </p>
        )}
      </section>
    </section>
  );
}
