import { ArrowRight, Hash, Timer, Users } from "lucide-react";
import { GAMES, type GameId } from "./game-catalog";
import { GameCover } from "./GameCover";
export function GameCards({
  onCreate,
  onJoin,
  onPractice,
}: {
  onCreate: (game: GameId) => void;
  onJoin: (game: GameId) => void;
  onPractice: () => void;
}) {
  return (
    <div className="game-grid">
      {GAMES.map((game, index) => (
        <article
          key={game.id}
          className={`game-card game-${game.id}`}
          aria-labelledby={`game-title-${game.id}`}
        >
          <div className="game-visual">
            <img
              src={`/art/${game.scene}-small.webp`}
              alt=""
              loading="lazy"
              width="800"
              height="450"
            />
            <div className="game-art-shade" />
            <GameCover game={game.id} />
            <span className="game-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="game-world">{game.tag}</span>
          </div>
          <div className="game-description">
            <div>
              <h3 id={`game-title-${game.id}`}>{game.title}</h3>
              <p>{game.description}</p>
            </div>
          </div>
          <div className="game-tags">
            <span>
              <Users size={12} />
              {game.players}
            </span>
            <span>{game.id === "answer" ? "Cooperative" : "Competitive"}</span>
          </div>
          <div className="card-actions">
            <button
              className="primary"
              aria-label={`Create ${game.title} room`}
              onClick={() => onCreate(game.id)}
            >
              Create room <ArrowRight size={15} />
            </button>
            <button
              className="secondary"
              aria-label={`Join ${game.title} room`}
              onClick={() => onJoin(game.id)}
            >
              <Hash size={15} />
              Join room
            </button>
          </div>
          {game.id === "timer" && (
            <button className="card-practice" onClick={onPractice}>
              <Timer size={15} />
              Practice solo
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
