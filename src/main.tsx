import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Copy,
  ArrowLeft,
  Pause,
  Play,
  Hash,
  LockKeyhole,
  MessageCircle,
  Mic,
  MicOff,
  Plus,
  Send,
  Users,
  Volume2,
  X,
} from "lucide-react";
import type { Room } from "livekit-client";
import { StopTheClock, type TimerSnapshot } from "./StopTheClock";
import { SameAnswer, type AnswerSnapshot } from "./SameAnswer";
import { SceneProp } from "./SceneProp";
import "./style.css";
type Player = { id: string; name: string; ready: boolean; secret?: number };
type Snapshot = {
  code: string;
  min: number;
  max: number;
  players: Player[];
  turn: number;
  winner?: string;
  guesses: { player: string; value: number; result: string }[];
  messages: { name: string; text: string }[];
  game?: "number" | "timer" | "answer";
  timer?: TimerSnapshot;
  sameAnswer?: AnswerSnapshot;
};
async function api(path: string, data: unknown) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = (await r.json()) as any;
  if (!r.ok) throw new Error(body.error || "Please try again.");
  return body;
}
function App() {
  const [motionPaused, setMotionPaused] = useState(() => {
    try {
      return localStorage.getItem("playyard-motion") === "off";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("playyard-motion", motionPaused ? "off" : "on");
    } catch {
      /* Storage can be unavailable in private sessions. */
    }
  }, [motionPaused]);
  const initial = new URLSearchParams(location.search).get("room") || "";
  const [modal, setModal] = useState<"create" | "join" | null>(
    initial ? "join" : null,
  );
  const [name, setName] = useState(""),
    [code, setCode] = useState(initial),
    [min, setMin] = useState("0"),
    [max, setMax] = useState("500");
  const [game, setGame] = useState<"number" | "timer" | "answer">("number"),
    [target, setTarget] = useState("10"),
    [hidden, setHidden] = useState(false);
  const [room, setRoom] = useState<Snapshot | null>(null),
    [id, setId] = useState(""),
    [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [connected, setConnected] = useState(false),
    [reconnect, setReconnect] = useState(0);
  const [number, setNumber] = useState(""),
    [chat, setChat] = useState(""),
    [notice, setNotice] = useState("");
  const socket = useRef<WebSocket | null>(null),
    voice = useRef<Room | null>(null),
    audio = useRef<HTMLDivElement>(null);
  const [voiceOn, setVoiceOn] = useState(false),
    [voiceBusy, setVoiceBusy] = useState(false),
    [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!roomCode) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    const ws = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/rooms/${roomCode}/socket`,
    );
    socket.current = ws;
    ws.onopen = () => {
      setConnected(true);
      setError("");
    };
    ws.onmessage = (e) => {
      const event = JSON.parse(e.data);
      if (event.type === "state") setRoom(event.data);
      else setError(event.error);
    };
    ws.onclose = (e) => {
      setConnected(false);
      if (
        !stopped &&
        e.reason !== "Opened in another tab" &&
        e.reason !== "Room expired"
      )
        timer = setTimeout(() => setReconnect((n) => n + 1), 2500);
      else if (!stopped) setError(e.reason);
    };
    return () => {
      stopped = true;
      clearTimeout(timer);
      ws.close();
    };
  }, [roomCode, reconnect]);
  useEffect(
    () => () => {
      void voice.current?.disconnect();
    },
    [],
  );
  function send(data: unknown) {
    setError("");
    if (socket.current?.readyState !== WebSocket.OPEN) {
      setError("Reconnecting. Please wait.");
      return false;
    }
    socket.current.send(JSON.stringify(data));
    return true;
  }
  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api(
        modal === "create"
          ? "/api/rooms"
          : `/api/rooms/${code.toUpperCase()}/join`,
        {
          name,
          min: Number(min),
          max: Number(max),
          game,
          targetMs: Math.round(Number(target) * 1000),
          hidden,
        },
      );
      setId(result.id);
      setRoomCode(result.code);
      history.replaceState({}, "", `?room=${result.code}`);
      setModal(null);
      window.scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggleVoice() {
    if (voiceOn) {
      await voice.current?.disconnect();
      voice.current = null;
      setVoiceOn(false);
      return;
    }
    setVoiceBusy(true);
    setError("");
    let call: Room | undefined;
    try {
      const { Room, RoomEvent, Track } = await import("livekit-client");
      call = new Room();
      voice.current = call;
      const credentials = await api(`/api/rooms/${roomCode}/voice`, {});
      call.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          audio.current?.appendChild(el);
        }
      });
      call.on(RoomEvent.TrackUnsubscribed, (track) =>
        track.detach().forEach((el) => el.remove()),
      );
      call.on(RoomEvent.Disconnected, () => {
        setVoiceOn(false);
        audio.current?.replaceChildren();
      });
      await call.connect(credentials.url, credentials.token);
      await call.startAudio();
      await call.localParticipant.setMicrophoneEnabled(true);
      setVoiceOn(true);
      setMuted(false);
    } catch (e) {
      await call?.disconnect();
      setError(`Voice couldn't connect: ${(e as Error).message}`);
    } finally {
      setVoiceBusy(false);
    }
  }
  const me = room?.players.find((p) => p.id === id),
    opponent = room?.players.find((p) => p.id !== id);
  const ready =
    room?.players.length === 2 && room.players.every((p) => p.ready);
  const myTurn = room?.players[room.turn]?.id === id;
  async function copy(kind: "link" | "code" = "link") {
    try {
      await navigator.clipboard.writeText(
        kind === "code" ? roomCode : location.href,
      );
      setNotice(
        kind === "code" ? "Room code copied" : "Invitation link copied",
      );
      setTimeout(() => setNotice(""), 2500);
    } catch {
      setError(
        kind === "code"
          ? "Copy the room code shown above."
          : "Copy the invitation from your address bar.",
      );
    }
  }
  const theme = roomCode ? room?.game || "number" : "lounge";
  const scenery =
    theme === "number"
      ? "observatory"
      : theme === "timer"
        ? "circuit"
        : theme === "answer"
          ? "cafe"
          : "lounge";
  return (
    <div
      className={`app-shell theme-${theme}`}
      data-motion={motionPaused ? "paused" : "on"}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="scene-layer" aria-hidden="true">
        <picture>
          <source
            media="(max-width: 600px)"
            srcSet={`/art/${scenery}-small.webp`}
          />
          <img src={`/art/${scenery}.webp`} alt="" fetchPriority="high" />
        </picture>
      </div>
      <header className="topbar" inert={Boolean(modal)}>
        <a className="brand" href="/" aria-label="PlayYard home">
          PLAYYARD
        </a>
        <nav aria-label="Main navigation">
          {roomCode ? (
            <a className="back-link" href="/">
              <ArrowLeft size={15} /> Back to lounge
            </a>
          ) : (
            <>
              <a className="nav-active" href="#games">
                The lounge
              </a>
              <a href="#how-to-play">How to play</a>
            </>
          )}
        </nav>
        <div className="header-actions">
          <button
            className="motion-toggle icon-button"
            aria-label={
              motionPaused
                ? "Resume decorative animations"
                : "Pause decorative animations"
            }
            aria-pressed={motionPaused}
            onClick={() => setMotionPaused((v) => !v)}
            title={motionPaused ? "Resume motion" : "Pause motion"}
          >
            {motionPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <span className="beta">
            <span className="dot" /> Private beta
          </span>
        </div>
      </header>
      <main id="main-content" inert={Boolean(modal)}>
        {!roomCode ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="dot" /> YOUR NEXT GAME NIGHT, REIMAGINED
                </div>
                <h1>
                  Good company.
                  <br />
                  Better competition.
                </h1>
                <p>Short games. Real friends. Wherever you are.</p>
                <div className="actions">
                  <button
                    className="primary"
                    onClick={() => {
                      setModal("create");
                      setError("");
                    }}
                  >
                    Create a room <ArrowRight size={18} />
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setModal("join");
                      setError("");
                    }}
                  >
                    Join with a code <Hash size={17} />
                  </button>
                </div>
                <div className="hero-meta">
                  <span>
                    <Users size={14} /> 2-player rooms
                  </span>
                  <span>
                    <Mic size={14} /> Voice + text
                  </span>
                  <span>
                    <LockKeyhole size={14} /> Invite only
                  </span>
                </div>
              </div>
              <div className="scene-caption">
                <span className="caption-line" /> THE ROOFTOP LOUNGE
                <span>Stay for another round.</span>
              </div>
            </section>
            <section id="games" className="games" aria-labelledby="games-title">
              <div className="section-heading">
                <h2 id="games-title">Choose your game</h2>
                <span className="muted">Three ways to settle the score.</span>
              </div>
              <div className="game-grid">
                {[
                  {
                    id: "number" as const,
                    title: "Guess My Number",
                    scene: "observatory",
                    description: "Higher or lower? Find the secret number.",
                    tag: "Logic & instinct",
                  },
                  {
                    id: "timer" as const,
                    title: "Stop the Clock",
                    scene: "circuit",
                    description: "Hit the time. Closest wins.",
                    tag: "Precision & nerve",
                  },
                  {
                    id: "answer" as const,
                    title: "Same Answer",
                    scene: "cafe",
                    description: "Different minds. Same answer.",
                    tag: "Your shared wavelength",
                  },
                ].map((item, index) => (
                  <button
                    key={item.id}
                    className={`game-card game-${item.id}`}
                    onClick={() => {
                      setGame(item.id);
                      setModal("create");
                      setError("");
                    }}
                  >
                    <div className="game-visual">
                      <img
                        src={`/art/${item.scene}-small.webp`}
                        alt=""
                        loading="lazy"
                        width="800"
                        height="450"
                      />
                      <div className="game-art-shade" />
                      <span className="game-index">0{index + 1}</span>
                      <span className="game-world">{item.tag}</span>
                    </div>
                    <div className="game-description">
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                      <span className="play-label">
                        Play <ArrowRight size={17} />
                      </span>
                    </div>
                    <div className="game-tags">
                      <span>
                        <Users size={12} /> 2 players
                      </span>
                      <span>
                        {item.id === "answer" ? "Cooperative" : "Competitive"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
            <section className="how" id="how-to-play">
              <span className="eyebrow">LESS SETUP. MORE PLAY.</span>
              <div>
                <b>
                  01 <span>Make a room</span>
                </b>
                <p>Pick a game, its settings, and a nickname.</p>
              </div>
              <div>
                <b>
                  02 <span>Send the invite</span>
                </b>
                <p>Your friend joins with a link or code.</p>
              </div>
              <div>
                <b>
                  03 <span>Settle the score</span>
                </b>
                <p>Play your round. Find out who wins.</p>
              </div>
            </section>
          </>
        ) : (
          <section className="room">
            <div className="room-heading">
              <div>
                <div className="eyebrow">
                  {room?.game === "answer"
                    ? "THE LISTENING CAFÉ"
                    : room?.game === "timer"
                      ? "THE NIGHT CIRCUIT"
                      : "THE OBSERVATORY"}{" "}
                  / PRIVATE ROOM
                </div>
                <h1>
                  {!room
                    ? "Game room"
                    : room.game === "answer"
                      ? "Same Answer"
                      : room.game === "timer"
                        ? "Stop the Clock"
                        : "Guess My Number"}
                </h1>
                <p className="room-subtitle">
                  {room?.game === "answer"
                    ? "Two minds. One shared score."
                    : room?.game === "timer"
                      ? "Every millisecond has a say."
                      : "Higher or lower? Read between the guesses."}
                </p>
              </div>
              <SceneProp theme={room?.game || "number"} />
              <button className="secondary" onClick={() => void copy("link")}>
                <Copy size={17} /> Copy invite link
              </button>
            </div>
            <section className="room-invite" aria-label="Room invitation">
              <div className="room-code-label">
                <span className="eyebrow">ROOM CODE</span>
                <p>Share it. Type it. You’re in.</p>
              </div>
              <div className="room-code-actions">
                <span
                  className="room-code"
                  aria-label={`Room code: ${roomCode.split("").join(" ")}`}
                >
                  {roomCode}
                </span>
                <button className="secondary" onClick={() => void copy("code")}>
                  <Copy size={17} /> Copy code
                </button>
              </div>
              <span className="invite-notice" role="status" aria-live="polite">
                {notice}
              </span>
            </section>
            <div className="room-layout">
              <div className="board">
                <div className="board-header">
                  <span>
                    <span className={`dot ${connected ? "" : "offline"}`} />
                    {connected ? "Connected" : "Reconnecting…"}
                  </span>
                  <span>
                    {room?.game === "answer"
                      ? `Shared score ${room.sameAnswer!.score} / ${room.sameAnswer!.totalRounds}`
                      : room?.game === "timer"
                        ? `Target ${(room.timer!.targetMs / 1000).toFixed(3)}s`
                        : `Range ${room?.min ?? "…"} — ${room?.max ?? "…"}`}
                  </span>
                </div>
                <div className="players">
                  {[me, opponent].map((p, i) => (
                    <div key={i} className="player">
                      <span className={`avatar avatar-${i}`}>
                        {p?.name.slice(0, 1).toUpperCase() || "?"}
                      </span>
                      <div>
                        <strong>
                          {p?.name ||
                            (i === 0 ? "Joining…" : "Waiting for a friend")}
                        </strong>
                        <small>
                          {p
                            ? room?.game === "answer"
                              ? p.ready
                                ? "Answer locked in"
                                : "Thinking of an answer"
                              : room?.game === "timer"
                                ? p.ready
                                  ? "Time submitted"
                                  : room.timer?.attempts[p.id]?.started
                                    ? "Timer started"
                                    : "Ready to play"
                                : p.ready
                                  ? "Number locked in"
                                  : "Choosing a secret"
                            : "Share your invitation to get started"}
                        </small>
                      </div>
                      {p?.ready && <Check size={18} />}
                    </div>
                  ))}
                </div>
                {!room ? (
                  <div className="round-focus">
                    <h2>Opening your room…</h2>
                    <p>Connecting to the game server.</p>
                  </div>
                ) : room.game === "answer" && room.sameAnswer ? (
                  <SameAnswer
                    key={`${room.sameAnswer.match}:${room.sameAnswer.round}`}
                    game={room.sameAnswer}
                    id={id}
                    players={room.players}
                    connected={connected}
                    send={send}
                  />
                ) : room.game === "timer" && room.timer ? (
                  <StopTheClock
                    timer={room.timer}
                    id={id}
                    players={room.players}
                    winner={room.winner}
                    connected={connected}
                    send={send}
                  />
                ) : room.winner ? (
                  <div className="round-focus">
                    <div className="eyebrow">SPOT ON</div>
                    <h2>
                      {room.winner === id
                        ? "You found it!"
                        : `${opponent?.name} wins!`}
                    </h2>
                    <p>
                      The winning guess was{" "}
                      <strong>{room.guesses.at(-1)?.value}</strong>.
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        send({ type: "rematch" });
                        setNumber("");
                      }}
                    >
                      Play another round <ArrowRight size={18} />
                    </button>
                  </div>
                ) : !me?.ready ? (
                  <div className="round-focus">
                    <div className="eyebrow">YOUR SECRET / THEIR CHALLENGE</div>
                    <h2>Pick your secret number.</h2>
                    <p>
                      Choose a whole number from {room.min} to {room.max}. Your
                      friend won't see it.
                    </p>
                    <form
                      className="number-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        send({ type: "secret", value: Number(number) });
                        setNumber("");
                      }}
                    >
                      <label className="sr-only" htmlFor="secret">
                        Secret number
                      </label>
                      <input
                        id="secret"
                        type="number"
                        inputMode="numeric"
                        required
                        min={room.min}
                        max={room.max}
                        step="1"
                        placeholder="Your secret"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                      />
                      <button className="primary" disabled={!connected}>
                        <LockKeyhole size={17} /> Lock it in
                      </button>
                    </form>
                  </div>
                ) : !ready ? (
                  <div className="round-focus">
                    <LockKeyhole className="large-icon" />
                    <h2>Your secret is safe.</h2>
                    <p>
                      Your number: <b>{me.secret}</b>.{" "}
                      {opponent
                        ? "Waiting for their number."
                        : "Invite a friend to join the room."}
                    </p>
                    <button
                      className="secondary"
                      onClick={() => void copy("link")}
                    >
                      <Copy size={17} /> Copy invitation link
                    </button>
                  </div>
                ) : (
                  <div className="round-focus">
                    <div className="eyebrow">
                      {myTurn ? "YOUR TURN" : "THEIR TURN"}
                    </div>
                    <h2>
                      {myTurn
                        ? `What's ${opponent?.name}'s number?`
                        : `${opponent?.name} is thinking…`}
                    </h2>
                    <p>
                      Your secret: <b>{me?.secret}</b>. First exact guess wins.
                    </p>
                    <form
                      className="number-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        send({ type: "guess", value: Number(number) });
                        setNumber("");
                      }}
                    >
                      <label className="sr-only" htmlFor="guess">
                        Your guess
                      </label>
                      <input
                        id="guess"
                        type="number"
                        inputMode="numeric"
                        required
                        min={room.min}
                        max={room.max}
                        step="1"
                        placeholder="Take a guess"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        disabled={!myTurn || !connected}
                      />
                      <button
                        className="primary"
                        disabled={!myTurn || !connected}
                      >
                        Guess <ArrowRight size={18} />
                      </button>
                    </form>
                  </div>
                )}
                {room && (!room.game || room.game === "number") && (
                  <div className="history">
                    <div className="eyebrow">THE GUESSES</div>
                    {!room?.guesses.length ? (
                      <p className="muted">
                        The suspense starts with the first guess.
                      </p>
                    ) : (
                      <ol>
                        {room.guesses.map((g, i) => (
                          <li key={i}>
                            <span>{g.player}</span>
                            <b>{g.value}</b>
                            <span className={`feedback ${g.result}`}>
                              {g.result === "higher" ? (
                                <ArrowUp size={15} />
                              ) : g.result === "lower" ? (
                                <ArrowDown size={15} />
                              ) : (
                                <Check size={15} />
                              )}{" "}
                              {g.result === "correct"
                                ? "Spot on"
                                : `Go ${g.result}`}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
              <aside className="chat-panel">
                <div className="chat-heading">
                  <MessageCircle size={19} />
                  <h2>Room chat</h2>
                </div>
                <p className="chat-hint">A little banter goes a long way.</p>
                <div className="messages" aria-live="polite">
                  {!room?.messages.length ? (
                    <div className="empty-chat">
                      <MessageCircle size={30} />
                      <p>
                        Break the ice.
                        <br />
                        Say hello to your rival.
                      </p>
                    </div>
                  ) : (
                    room.messages.map((m, i) => (
                      <div className="message" key={i}>
                        <b>{m.name}</b>
                        <p>{m.text}</p>
                      </div>
                    ))
                  )}
                </div>
                <form
                  className="chat-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send({ type: "chat", text: chat });
                    setChat("");
                  }}
                >
                  <label className="sr-only" htmlFor="chat">
                    Chat message
                  </label>
                  <input
                    id="chat"
                    maxLength={240}
                    placeholder="Say something…"
                    value={chat}
                    onChange={(e) => setChat(e.target.value)}
                  />
                  <button
                    className="icon-button"
                    aria-label="Send message"
                    disabled={!chat.trim() || !connected}
                  >
                    <Send size={18} />
                  </button>
                </form>
                <div className="voice-controls">
                  <button
                    className="secondary"
                    disabled={voiceBusy || !connected}
                    onClick={() => void toggleVoice()}
                  >
                    <Volume2 size={17} />
                    {voiceBusy
                      ? "Connecting…"
                      : voiceOn
                        ? "Leave voice"
                        : "Join voice"}
                  </button>
                  {voiceOn && (
                    <button
                      className="icon-button"
                      aria-label={
                        muted ? "Unmute microphone" : "Mute microphone"
                      }
                      onClick={async () => {
                        try {
                          await voice.current?.localParticipant.setMicrophoneEnabled(
                            muted,
                          );
                          setMuted(!muted);
                        } catch {
                          setError("Could not change the microphone.");
                        }
                      }}
                    >
                      {muted ? <MicOff size={19} /> : <Mic size={19} />}
                    </button>
                  )}
                </div>
                <small className="voice-note">
                  Voice is optional. Join only with people you know.
                </small>
              </aside>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div ref={audio} />
          </section>
        )}
      </main>
      <footer inert={Boolean(modal)}>
        <a className="brand footer-brand" href="/">
          PLAYYARD
        </a>
        <span>Good games. Better company.</span>
        <span>Private beta · Play with people you know</span>
      </footer>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <dialog
            open
            className="modal"
            aria-modal="true"
            aria-labelledby="modal-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setModal(null);
                return;
              }
              if (e.key === "Tab") {
                const controls = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]",
                  ),
                ).filter((el) => el.getClientRects().length);
                const first = controls[0],
                  last = controls.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <button
              className="close icon-button"
              aria-label="Close"
              onClick={() => {
                setModal(null);
                setError("");
              }}
            >
              <X />
            </button>
            <div className="modal-icon">
              {modal === "create" ? <Plus /> : <Users />}
            </div>
            <div className="eyebrow">
              {modal === "join"
                ? "PRIVATE GAME ROOM"
                : game === "answer"
                  ? "SAME ANSWER"
                  : game === "timer"
                    ? "STOP THE CLOCK"
                    : "GUESS MY NUMBER"}
            </div>
            <h2 id="modal-title">
              {modal === "create"
                ? game === "answer"
                  ? "Find your shared wavelength."
                  : "Start a friendly rivalry."
                : "Your seat is waiting."}
            </h2>
            <p>
              {modal === "create"
                ? "Make a private room and invite one friend."
                : "Enter your nickname and the eight-character room code."}
            </p>
            <form onSubmit={enter}>
              <label htmlFor="name">Your nickname</label>
              <input
                autoFocus
                id="name"
                required
                maxLength={20}
                autoComplete="nickname"
                placeholder="What should we call you?"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {modal === "create" ? (
                <>
                  <label htmlFor="game">Choose a game</label>
                  <select
                    id="game"
                    value={game}
                    onChange={(e) =>
                      setGame(e.target.value as "number" | "timer" | "answer")
                    }
                  >
                    <option value="number">Guess My Number</option>
                    <option value="timer">Stop the Clock</option>
                    <option value="answer">Same Answer</option>
                  </select>
                  {game === "answer" ? (
                    <div className="answer-settings">
                      <Users size={20} />
                      <p>
                        <b>Five prompts. One shared score.</b>Answer privately,
                        reveal together, and earn a point whenever you match.
                        Both players confirm before moving on.
                      </p>
                    </div>
                  ) : game === "timer" ? (
                    <>
                      <label htmlFor="target">Target time (seconds)</label>
                      <input
                        id="target"
                        type="number"
                        required
                        min="1"
                        max="30"
                        step="0.001"
                        inputMode="decimal"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                      />
                      <label className="checkbox-label" htmlFor="hidden">
                        <input
                          id="hidden"
                          type="checkbox"
                          checked={hidden}
                          onChange={(e) => setHidden(e.target.checked)}
                        />
                        <span>
                          Hide the timer while playing
                          <small>
                            Count in your head for an extra challenge.
                          </small>
                        </span>
                      </label>
                    </>
                  ) : (
                    <div className="range-fields">
                      <div>
                        <label htmlFor="min">Lowest number</label>
                        <input
                          id="min"
                          required
                          type="number"
                          min="0"
                          max="999999"
                          step="1"
                          value={min}
                          onChange={(e) => setMin(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="max">Highest number</label>
                        <input
                          id="max"
                          required
                          type="number"
                          min={Number(min) + 1}
                          max="1000000"
                          step="1"
                          value={max}
                          onChange={(e) => setMax(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label htmlFor="code">Room code</label>
                  <input
                    id="code"
                    required
                    minLength={8}
                    maxLength={8}
                    pattern="[A-Za-z2-9]{8}"
                    placeholder="ABCDEFGH"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary full" disabled={busy}>
                {busy
                  ? "Opening room…"
                  : modal === "create"
                    ? "Create private room"
                    : "Join room"}
                <ArrowRight size={18} />
              </button>
            </form>
            <small>Invite-only beta. No public matchmaking yet.</small>
          </dialog>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
