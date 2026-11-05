import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, BookOpen, X } from "lucide-react";
import { gameTitle, type GameId } from "./game-catalog";
import { GAME_RULES, PRACTICE_RULES } from "./game-rules";
import { RuleDemo } from "./RuleDemo";

export function GameRules({
  game,
  compact = false,
  mode = "friends",
}: {
  game: GameId;
  compact?: boolean;
  mode?: "friends" | "computer" | "practice";
}) {
  const [open, setOpen] = useState(false),
    [step, setStep] = useState(0),
    [full, setFull] = useState(false),
    [replay, setReplay] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId(),
    captionId = useId();
  const guide = mode === "practice" ? PRACTICE_RULES : GAME_RULES[game];
  const title =
    mode === "practice" ? "Stop the Clock practice" : gameTitle(game);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      trigger.current?.focus();
    };
  }, [open]);
  function close() {
    setOpen(false);
  }
  return (
    <>
      <button
        ref={trigger}
        className={`rules-launch ${compact ? "rules-launch-compact" : ""}`}
        aria-label={`How to play ${title}`}
        onClick={() => {
          setStep(0);
          setFull(false);
          setOpen(true);
        }}
      >
        <BookOpen size={17} />
        How to play
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            className="tutorial-dialog"
            aria-labelledby={titleId}
            onCancel={(e) => {
              e.preventDefault();
              close();
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if(e.key==='Tab') {
              const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
              const first=buttons[0],last=buttons.at(-1);
              if(e.shiftKey && (document.activeElement===first || document.activeElement===e.currentTarget)) {e.preventDefault();last?.focus();}
              else if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first?.focus();}
            }
          }}
            onKeyUp={(e) => e.stopPropagation()}
          >
            <div className="tutorial-shell">
              <header className="tutorial-header">
                <div>
                  <span className="eyebrow">LEARN BY WATCHING</span>
                  <h2 id={titleId}>{title}</h2>
                </div>
                <button
                  className="secondary icon-button"
                  aria-label="Close instructions"
                  onClick={close}
                  autoFocus
                >
                  <X size={20} />
                </button>
              </header>
              <div
                className="tutorial-tabs"
                role="group"
                aria-label="Instruction view"
              >
                <button aria-pressed={!full} onClick={() => setFull(false)}>
                  Show me how
                </button>
                <button aria-pressed={full} onClick={() => setFull(true)}>
                  All rules
                </button>
              </div>
              <div className="tutorial-scroll">
                {full ? (
                  <div className="tutorial-full">
                    <h3>Your goal</h3>
                    <p>{guide.goal}</p>
                    <h3>Let’s play</h3>
                    <ol>
                      {guide.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                    <h3>Try this example</h3>
                    <p>{guide.example}</p>
                    {guide.more.map((group) => (
                      <section key={group.title}>
                        <h3>{group.title}</h3>
                        <ul>
                          {group.rules.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                ) : (
                  <>
                    <div
                      className="tutorial-progress"
                      aria-label={`Step ${step + 1} of ${guide.steps.length}`}
                    >
                      {guide.steps.map((_, i) => (
                        <button
                          key={i}
                          aria-label={`Go to step ${i + 1}`}
                          aria-current={i === step ? "step" : undefined}
                          onClick={() => setStep(i)}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <div className="tutorial-stage" key={`${step}:${replay}`}>
                      <RuleDemo game={game} step={step} />
                    </div>
                    <div
                      className="tutorial-caption"
                      id={captionId}
                      aria-live="polite"
                    >
                      <span className="eyebrow">
                        STEP {step + 1} OF {guide.steps.length}
                      </span>
                      <h3>{guide.steps[step]}</h3>
                      <p>
                        {step === 4
                          ? guide.goal
                          : step === 0 && mode === "computer"
                            ? "You play against the computer. Choose your difficulty before starting."
                            : step === 0 && mode === "friends"
                              ? "Create a room and share its code, or join a friend’s room."
                              : ""}
                      </p>
                    </div>
                    <button
                      className="tutorial-replay"
                      onClick={() => setReplay((n) => n + 1)}
                    >
                      Replay demonstration
                    </button>
                  </>
                )}
                {(game === "timer" || game === "memory" || game === "fuse") && (
                  <p className="tutorial-time-note">
                    A running clock keeps going while this guide is open. Read
                    before starting.
                  </p>
                )}
                {mode !== "friends" && (
                  <p className="tutorial-time-note">
                    Refreshing or leaving starts this solo session over.
                  </p>
                )}
              </div>
              <footer className="tutorial-footer">
                {!full && (
                  <button
                    className="secondary"
                    disabled={step === 0}
                    onClick={() => setStep((s) => s - 1)}
                  >
                    <ArrowLeft size={17} />
                    Back
                  </button>
                )}
                {!full && step < guide.steps.length - 1 ? (
                  <button
                    className="primary"
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Next
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <button className="primary" onClick={close}>
                    Got it · let’s play
                  </button>
                )}
              </footer>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
